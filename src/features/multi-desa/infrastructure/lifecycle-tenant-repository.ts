import "server-only";

import { mkdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { desc, eq, lte, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { tenantExports, tenantPurgeArchive, villages } from "@/db/schema";
import { kedaluwarsaEkspor, type RetensiDesa } from "@/features/multi-desa/domain/lifecycle-tenant";
import { akarPenyimpananMedia } from "@/features/publik/infrastructure/media-storage";
import { conflict, notFound } from "@/lib/errors";

/**
 * Ekspor data dan purge tenant (kebijakan retensi Fase 2).
 *
 * Prinsip keamanan:
 * - Setiap query dibatasi `village_id` dari desa yang sedang diproses; tidak ada
 *   operasi lintas tenant.
 * - Purge menghapus baris secara berurutan dari tabel anak ke induk, sehingga
 *   foreign key tetap dihormati. Bila ada relasi `RESTRICT` yang belum ditangani,
 *   transaksi dibatalkan seluruhnya — tidak pernah menyisakan tenant separuh
 *   terhapus.
 * - Daftar tabel diambil dari `information_schema`, bukan daftar manual, agar
 *   tabel tenant baru otomatis tercakup. Nama tabel divalidasi sebelum dipakai
 *   sebagai identifier SQL.
 * - `villages`, `audit_logs`, catatan ekspor, arsip agregat, dan tombstone
 *   sengaja tidak dihapus.
 */

/** Batas baris per ekspor agar tidak menghabiskan memori proses. */
const BATAS_BARIS_EKSPOR = 200_000;

/** Tabel yang dipertahankan saat purge. */
const TABEL_DIPERTAHANKAN = new Set([
  "villages",
  "audit_logs",
  "tenant_exports",
  "tenant_purge_archive",
  "tenant_domain_tombstones",
]);

/** Kolom yang tidak boleh ikut tertulis ke berkas ekspor. */
const POLA_KOLOM_RAHASIA = /(password|token|secret|pin|otp|private_key)/i;

export interface DesaRetensiRow extends RetensiDesa {
  id: number;
  name: string | null;
  slug: string | null;
  domain: string | null;
}

/** Ambil status retensi satu desa; `null` bila tidak ada. */
export async function getDesaRetensi(villageId: number): Promise<DesaRetensiRow | null> {
  const [baris] = await db
    .select({
      id: villages.id,
      name: villages.name,
      slug: villages.slug,
      domain: villages.domain,
      active: villages.active,
      nonaktifSejak: villages.nonaktifSejak,
      purgedAt: villages.purgedAt,
    })
    .from(villages)
    .where(eq(villages.id, villageId))
    .limit(1);

  return baris ?? null;
}

/** Catatan ekspor yang masih berlaku untuk keperluan purge. */
export async function eksporBerlakuTerbaru(
  villageId: number,
  sekarang: Date = new Date(),
): Promise<{ id: number; berkas: string; dibuatPada: Date } | null> {
  const [baris] = await db
    .select({
      id: tenantExports.id,
      berkas: tenantExports.berkas,
      dibuatPada: tenantExports.dibuatPada,
    })
    .from(tenantExports)
    .where(eq(tenantExports.villageId, villageId))
    .orderBy(desc(tenantExports.dibuatPada))
    .limit(1);

  if (!baris) return null;
  if (kedaluwarsaEkspor(baris.dibuatPada).getTime() <= sekarang.getTime()) return null;

  return baris;
}

/**
 * Normalisasi hasil `db.execute` MySQL: SELECT mengembalikan `[rows, fields]`,
 * sedangkan DELETE/UPDATE mengembalikan `[ResultSetHeader, fields]`.
 */
function barisHasil<T>(hasil: unknown): T[] {
  if (Array.isArray(hasil) && Array.isArray(hasil[0])) return hasil[0] as T[];
  return [];
}

function headerHasil(hasil: unknown): { affectedRows: number } {
  const header = Array.isArray(hasil) ? hasil[0] : hasil;
  if (header && typeof header === "object" && "affectedRows" in header) {
    return header as { affectedRows: number };
  }
  return { affectedRows: 0 };
}

async function kueri<T>(query: SQL): Promise<T[]> {
  return barisHasil<T>(await db.execute(query));
}

/** Nama tabel dari `information_schema` wajib berbentuk identifier sederhana. */
function identifierAman(nama: string): string {
  if (!/^[a-z0-9_]+$/.test(nama)) {
    throw conflict(`Nama tabel tidak valid: ${nama}`);
  }
  return nama;
}

/** Seluruh tabel yang memiliki kolom `village_id`. */
async function daftarTabelTenant(): Promise<string[]> {
  const baris = await kueri<{ nama: string }>(sql`
    SELECT table_name AS nama
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND column_name = 'village_id'
  `);

  return baris.map((item) => identifierAman(item.nama));
}

/**
 * Urutan hapus: tabel yang direferensikan tabel lain dihapus terakhir.
 *
 * Graf diambil dari foreign key aktual. Bila tersisa siklus, purge dibatalkan
 * dengan pesan yang jelas alih-alih menonaktifkan pemeriksaan foreign key.
 */
async function urutanHapusTenant(tabel: readonly string[]): Promise<string[]> {
  const himpunan = new Set(tabel);
  const baris = await kueri<{ anak: string; induk: string }>(sql`
    SELECT table_name AS anak, referenced_table_name AS induk
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE()
      AND referenced_table_schema = DATABASE()
      AND referenced_table_name IS NOT NULL
  `);

  /** induk → anak-anaknya */
  const anakDari = new Map<string, Set<string>>();
  for (const { anak, induk } of baris) {
    if (!himpunan.has(anak) || !himpunan.has(induk)) continue;
    const kumpulan = anakDari.get(induk) ?? new Set<string>();
    kumpulan.add(anak);
    anakDari.set(induk, kumpulan);
  }

  const tersisa = new Set(tabel);
  const hasil: string[] = [];

  while (tersisa.size > 0) {
    const siap = [...tersisa].filter((kandidat) => {
      for (const anak of anakDari.get(kandidat) ?? []) {
        if (tersisa.has(anak)) return false;
      }
      return true;
    });

    if (siap.length === 0) {
      throw conflict(
        "Relasi foreign key antar tabel tenant membentuk siklus; purge dibatalkan agar tidak ada data yang tertinggal.",
      );
    }

    for (const nama of siap) {
      hasil.push(nama);
      tersisa.delete(nama);
    }
  }

  return hasil;
}

/** Redaksi kolom sensitif pada baris ekspor. */
function tanpaRahasia(baris: Record<string, unknown>): Record<string, unknown> {
  const hasil: Record<string, unknown> = {};
  for (const [kolom, nilai] of Object.entries(baris)) {
    hasil[kolom] = POLA_KOLOM_RAHASIA.test(kolom) ? null : nilai;
  }
  return hasil;
}

export interface HasilEkspor {
  id: number;
  berkas: string;
  ukuranByte: number;
  jumlahBaris: number;
  kedaluwarsaPada: Date;
}

/**
 * Ekspor seluruh data tenant ke berkas JSON di `storage/exports/<villageId>/`.
 *
 * Ekspor memuat baris mentah semua tabel tenant, termasuk `audit_logs`, agar
 * operator punya salinan sebelum purge. Kolom seperti password/token/pin
 * dikosongkan. Berkas retensinya 30 hari.
 */
export async function eksporDataTenant(
  villageId: number,
  dibuatOleh: string,
): Promise<HasilEkspor> {
  const desa = await getDesaRetensi(villageId);
  if (!desa) throw notFound("Desa tidak ditemukan.");
  if (desa.purgedAt !== null)
    throw conflict("Desa ini sudah di-purge; tidak ada data untuk diekspor.");

  const tabel = (await daftarTabelTenant()).filter((nama) => !TABEL_DIPERTAHANKAN.has(nama));
  const dibuatPada = new Date();
  const isi: Record<string, unknown> = {
    versi: 1,
    dibuatPada: dibuatPada.toISOString(),
    desa: {
      id: desa.id,
      name: desa.name,
      slug: desa.slug,
      domain: desa.domain,
      active: desa.active,
      nonaktifSejak: desa.nonaktifSejak?.toISOString() ?? null,
    },
    tabel: {} as Record<string, Record<string, unknown>[]>,
  };
  const kumpulanTabel = isi.tabel as Record<string, Record<string, unknown>[]>;
  let jumlahBaris = 0;

  for (const nama of tabel) {
    const baris = await kueri<Record<string, unknown>>(sql`
      SELECT * FROM ${sql.identifier(nama)} WHERE village_id = ${villageId}
    `);
    jumlahBaris += baris.length;
    if (jumlahBaris > BATAS_BARIS_EKSPOR) {
      throw conflict(
        `Data desa melebihi ${BATAS_BARIS_EKSPOR} baris. Gunakan dump database (mysqldump) sebagai ekspor.`,
      );
    }
    kumpulanTabel[nama] = baris.map(tanpaRahasia);
  }

  const folder = path.join(process.cwd(), "storage", "exports", String(villageId));
  await mkdir(folder, { recursive: true });
  const namaBerkas = `${dibuatPada.toISOString().replace(/[:.]/g, "-")}.json`;
  const jalurAbsolut = path.join(folder, namaBerkas);
  const berkas = path.relative(process.cwd(), jalurAbsolut).split(path.sep).join("/");

  await writeFile(jalurAbsolut, JSON.stringify(isi, null, 2), "utf8");
  const info = await stat(jalurAbsolut);

  const kedaluwarsaPada = kedaluwarsaEkspor(dibuatPada);
  const [catatan] = await db
    .insert(tenantExports)
    .values({
      villageId,
      dibuatOleh,
      berkas,
      ukuranByte: info.size,
      jumlahBaris,
      dibuatPada,
      kedaluwarsaPada,
    })
    .$returningId();
  if (!catatan) throw conflict("Gagal mencatat ekspor tenant.");

  return {
    id: catatan.id,
    berkas,
    ukuranByte: info.size,
    jumlahBaris,
    kedaluwarsaPada,
  };
}

/** Jumlah baris per tabel tenant, untuk ringkasan agregat sebelum purge. */
async function ringkasanAgregat(villageId: number, tabel: readonly string[]): Promise<string> {
  const ringkasan: Record<string, number> = {};

  for (const nama of tabel) {
    const [baris] = await kueri<{ jumlah: number | string }>(sql`
      SELECT COUNT(*) AS jumlah FROM ${sql.identifier(nama)} WHERE village_id = ${villageId}
    `);
    ringkasan[nama] = Number(baris?.jumlah ?? 0);
  }

  return JSON.stringify({ versi: 1, jumlahBarisPerTabel: ringkasan });
}

export interface HasilPurge {
  villageId: number;
  jumlahBarisDihapus: number;
  tabelDiproses: number;
  mediaDihapus: boolean;
}

/**
 * Hapus data tenant dan tinggalkan tombstone.
 *
 * Pemanggil (use case) wajib sudah memeriksa otorisasi, status retensi, dan
 * keberadaan ekspor. Repository tetap memeriksa ulang status di dalam transaksi
 * agar dua permintaan purge bersamaan tidak berjalan dua kali.
 */
export async function purgeTenant(input: {
  villageId: number;
  actorId: string;
  sekarang?: Date;
}): Promise<HasilPurge> {
  const { villageId, actorId } = input;
  const sekarang = input.sekarang ?? new Date();
  const tabel = (await daftarTabelTenant()).filter((nama) => !TABEL_DIPERTAHANKAN.has(nama));
  const urutan = await urutanHapusTenant(tabel);
  const ringkasan = await ringkasanAgregat(villageId, tabel);

  let jumlahBarisDihapus = 0;

  await db.transaction(async (tx) => {
    // Kunci baris desa: mencegah purge ganda saat dua operator menekan tombol
    // bersamaan.
    const [desa] = barisHasil<{ active: number; purgedAt: Date | null }>(
      await tx.execute(
        sql`SELECT active, purged_at AS purgedAt FROM villages WHERE id = ${villageId} FOR UPDATE`,
      ),
    );

    if (!desa) throw notFound("Desa tidak ditemukan.");
    if (desa.purgedAt !== null) throw conflict("Data desa ini sudah di-purge.");
    if (Number(desa.active) === 1) throw conflict("Desa masih aktif; nonaktifkan lebih dulu.");

    // Tombstone domain sebelum baris domain dihapus, supaya host lama tidak
    // dapat dipakai ulang tanpa keputusan eksplisit.
    await tx.execute(sql`
      INSERT IGNORE INTO tenant_domain_tombstones (domain, village_id, purged_at)
      SELECT domain, village_id, ${sekarang} FROM village_domains WHERE village_id = ${villageId}
    `);

    await tx.insert(tenantPurgeArchive).values({ villageId, ringkasan, dibuatOleh: actorId });

    for (const nama of urutan) {
      const header = headerHasil(
        await tx.execute(sql`DELETE FROM ${sql.identifier(nama)} WHERE village_id = ${villageId}`),
      );
      jumlahBarisDihapus += Number(header.affectedRows);
    }

    await tx
      .update(villages)
      .set({ active: false, purgedAt: sekarang })
      .where(eq(villages.id, villageId));
  });

  // Berkas media dihapus setelah transaksi sukses: kegagalan filesystem tidak
  // boleh membatalkan penghapusan data yang sudah terverifikasi.
  let mediaDihapus = false;
  try {
    await rm(path.join(akarPenyimpananMedia(), String(villageId)), {
      recursive: true,
      force: true,
    });
    mediaDihapus = true;
  } catch {
    mediaDihapus = false;
  }

  return {
    villageId,
    jumlahBarisDihapus,
    tabelDiproses: urutan.length,
    mediaDihapus,
  };
}

/** Hapus berkas dan catatan ekspor yang sudah melewati masa berlaku. */
export async function bersihkanEksporKedaluwarsa(
  sekarang: Date = new Date(),
): Promise<{ dihapus: number }> {
  const kedaluwarsa = await db
    .select({ id: tenantExports.id, berkas: tenantExports.berkas })
    .from(tenantExports)
    .where(lte(tenantExports.kedaluwarsaPada, sekarang));

  const akarEkspor = path.join(process.cwd(), "storage", "exports");

  for (const catatan of kedaluwarsa) {
    const absolut = path.resolve(process.cwd(), catatan.berkas);
    // Cegah penghapusan di luar folder ekspor meski data berkas tidak wajar.
    if (!absolut.startsWith(path.resolve(akarEkspor) + path.sep)) continue;
    await unlink(absolut).catch(() => undefined);
  }

  if (kedaluwarsa.length > 0) {
    await db.delete(tenantExports).where(lte(tenantExports.kedaluwarsaPada, sekarang));
  }

  return { dihapus: kedaluwarsa.length };
}
