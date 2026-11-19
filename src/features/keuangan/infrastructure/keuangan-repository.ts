import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { denganKunciMysql } from "@/db/kunci-mysql";
import { keuangan, keuanganTemplate, keuanganTriwulan } from "@/db/schema";
import {
  formatMoney,
  kodeLength,
  parentKode,
  toMinor,
  type KeuanganBarisDTO,
} from "@/features/keuangan/domain/keuangan";

// --- Chart of accounts ------------------------------------------------------

export interface TemplateRow {
  uuid: string;
  parentUuid: string | null;
  uraian: string;
}

export async function listTemplate(): Promise<TemplateRow[]> {
  return db
    .select({
      uuid: keuanganTemplate.uuid,
      parentUuid: keuanganTemplate.parentUuid,
      uraian: keuanganTemplate.uraian,
    })
    .from(keuanganTemplate)
    .orderBy(asc(keuanganTemplate.uuid));
}

/** Semua leluhur sebuah kode, dari induk langsung hingga akar. */
export function ancestorsOf(uuid: string): string[] {
  const result: string[] = [];
  let current = parentKode(uuid);
  while (current) {
    result.push(current);
    current = parentKode(current);
  }
  return result;
}

// --- Baris anggaran per tahun ----------------------------------------------

export async function listKeuanganTahun(
  villageId: number,
  tahun: number,
): Promise<KeuanganBarisDTO[]> {
  const [template, rows] = await Promise.all([
    listTemplate(),
    db
      .select({
        templateUuid: keuangan.templateUuid,
        anggaran: keuangan.anggaran,
        realisasi: keuangan.realisasi,
      })
      .from(keuangan)
      .where(and(eq(keuangan.villageId, villageId), eq(keuangan.tahun, tahun))),
  ]);

  const valueByUuid = new Map(rows.map((row) => [row.templateUuid, row]));

  return template.map((item) => {
    const value = valueByUuid.get(item.uuid);
    return {
      templateUuid: item.uuid,
      uraian: item.uraian,
      level: kodeLength(item.uuid),
      anggaran: value?.anggaran ?? "0.00",
      realisasi: value?.realisasi ?? "0.00",
    };
  });
}

/** Daftar tahun anggaran yang sudah memiliki data pada desa ini. */
export async function listKeuanganTahunTersedia(villageId: number): Promise<number[]> {
  const rows = await db
    .selectDistinct({ tahun: keuangan.tahun })
    .from(keuangan)
    .where(eq(keuangan.villageId, villageId))
    .orderBy(asc(keuangan.tahun));

  return rows.map((row) => row.tahun);
}

export interface KeuanganBarisUpsert {
  templateUuid: string;
  anggaran: string;
  realisasi: string;
}

export interface OpsiSimpanKeuangan {
  /**
   * Abaikan `realisasi` pada input dan pertahankan nilai yang sudah tersimpan.
   *
   * Dipakai impor APBDes: berkas hanya membawa pagu, sedangkan realisasi berasal
   * dari pencairan/SPJ. Rekening yang belum punya baris tetap dibuat dengan
   * realisasi `0.00`.
   */
  pertahankanRealisasi?: boolean;
}

/**
 * Simpan nilai daun lalu agregasi ulang ke seluruh induk.
 *
 * Nilai induk dihitung dari penjumlahan anak langsungnya; perhitungan dilakukan
 * di aplikasi (bukan trigger) agar idempoten dan mudah diuji. Penulisan memakai
 * UPSERT keyed pada (village, tahun, template).
 *
 * Baca-ubah-tulis ini tidak aman bila dua penyimpanan berjalan bersamaan:
 * keduanya membaca agregasi lama lalu saling menimpa, sehingga induk bisa
 * tertinggal dari jumlah anaknya. Karena baris tahun anggaran belum tentu ada,
 * `SELECT ... FOR UPDATE` tidak cukup; seluruh blok diserialkan dengan kunci
 * MySQL per (desa, tahun), dan penulisan tetap dalam satu transaksi agar
 * pembaca lain melihat hasil lengkap atau tidak sama sekali.
 *
 * Dengan `opsi.pertahankanRealisasi`, hanya pagu yang diubah dan realisasi
 * tersimpan dipertahankan (lihat `OpsiSimpanKeuangan`).
 */
export async function saveKeuanganNilai(
  villageId: number,
  tahun: number,
  createdBy: string,
  input: KeuanganBarisUpsert[],
  opsi: OpsiSimpanKeuangan = {},
): Promise<void> {
  const template = await listTemplate();
  if (template.length === 0) return;

  await denganKunciMysql(`keuangan:${villageId}:${tahun}`, () =>
    db.transaction(async (tx) => {
      // Nilai eksisting tahun ini, lalu ditimpa oleh input.
      const existing = await tx
        .select({
          templateUuid: keuangan.templateUuid,
          anggaran: keuangan.anggaran,
          realisasi: keuangan.realisasi,
        })
        .from(keuangan)
        .where(and(eq(keuangan.villageId, villageId), eq(keuangan.tahun, tahun)));

      const agg = new Map<string, { anggaran: bigint; realisasi: bigint }>();
      for (const row of existing) {
        agg.set(row.templateUuid, {
          anggaran: toMinor(row.anggaran),
          realisasi: toMinor(row.realisasi),
        });
      }
      for (const row of input) {
        agg.set(row.templateUuid, {
          anggaran: toMinor(row.anggaran),
          realisasi: opsi.pertahankanRealisasi
            ? (agg.get(row.templateUuid)?.realisasi ?? 0n)
            : toMinor(row.realisasi),
        });
      }

      // Hitung ulang induk dari level terdalam ke akar.
      const childrenByParent = new Map<string, string[]>();
      for (const item of template) {
        if (!item.parentUuid) continue;
        const list = childrenByParent.get(item.parentUuid) ?? [];
        list.push(item.uuid);
        childrenByParent.set(item.parentUuid, list);
      }

      const byDepthDesc = [...template].sort(
        (a, b) => b.uuid.split(".").length - a.uuid.split(".").length,
      );

      for (const item of byDepthDesc) {
        const children = childrenByParent.get(item.uuid) ?? [];
        if (children.length === 0) continue;

        let sumA = 0n;
        let sumR = 0n;
        for (const child of children) {
          const value = agg.get(child);
          if (value) {
            sumA += value.anggaran;
            sumR += value.realisasi;
          }
        }

        // Induk yang seluruh anaknya nol tidak perlu ditulis: nilai eksplisit
        // pada baris yang boleh diisi langsung (akun/bidang/kegiatan) tetap
        // dipertahankan, dan kode tanpa nilai cukup dibaca sebagai 0. Menulis
        // nol untuk seluruh chart membuat penyimpanan satu desa menyentuh kode
        // milik subtree lain yang tidak berhubungan.
        if (sumA === 0n && sumR === 0n) continue;

        agg.set(item.uuid, { anggaran: sumA, realisasi: sumR });
      }

      const toWrite = [...agg.entries()].map(([templateUuid, value]) => ({
        villageId,
        tahun,
        templateUuid,
        anggaran: formatMoney(value.anggaran),
        realisasi: formatMoney(value.realisasi),
        createdBy,
      }));

      if (toWrite.length === 0) return;

      await tx
        .insert(keuangan)
        .values(toWrite)
        .onDuplicateKeyUpdate({
          set: {
            anggaran: sql`VALUES(${sql.raw("anggaran")})`,
            realisasi: sql`VALUES(${sql.raw("realisasi")})`,
          },
        });
    }),
  );
}

// --- Realisasi per triwulan ------------------------------------------------

export interface TriwulanRow {
  templateUuid: string;
  tw1: string;
  tw2: string;
  tw3: string;
  tw4: string;
}

/** Realisasi triwulan yang sudah tersimpan untuk satu tahun anggaran. */
export async function listKeuanganTriwulan(
  villageId: number,
  tahun: number,
): Promise<TriwulanRow[]> {
  return db
    .select({
      templateUuid: keuanganTriwulan.templateUuid,
      tw1: keuanganTriwulan.tw1,
      tw2: keuanganTriwulan.tw2,
      tw3: keuanganTriwulan.tw3,
      tw4: keuanganTriwulan.tw4,
    })
    .from(keuanganTriwulan)
    .where(and(eq(keuanganTriwulan.villageId, villageId), eq(keuanganTriwulan.tahun, tahun)));
}

/** Simpan (upsert) realisasi triwulan per bidang. */
export async function saveKeuanganTriwulan(
  villageId: number,
  tahun: number,
  createdBy: string,
  input: TriwulanRow[],
): Promise<void> {
  if (input.length === 0) return;

  await db
    .insert(keuanganTriwulan)
    .values(input.map((row) => ({ ...row, villageId, tahun, createdBy })))
    .onDuplicateKeyUpdate({
      set: {
        tw1: sql`VALUES(${sql.raw("tw1")})`,
        tw2: sql`VALUES(${sql.raw("tw2")})`,
        tw3: sql`VALUES(${sql.raw("tw3")})`,
        tw4: sql`VALUES(${sql.raw("tw4")})`,
        createdBy: sql`VALUES(${sql.raw("created_by")})`,
      },
    });
}

/** Seluruh kode rekening pada template sistem (untuk mencocokkan impor). */
export async function listTemplateUuid(): Promise<Set<string>> {
  const rows = await db.select({ uuid: keuanganTemplate.uuid }).from(keuanganTemplate);
  return new Set(rows.map((row) => row.uuid));
}

/**
 * Impor massal APBDes.
 *
 * Memakai jalur yang sama dengan `saveKeuanganNilai`: kunci per (desa, tahun),
 * satu transaksi, dan agregasi ulang induk. Tanpa itu, impor yang berjalan
 * bersamaan dengan penyimpanan manual dapat meninggalkan nilai induk yang tidak
 * sama dengan jumlah anaknya.
 *
 * Kebijakan realisasi: berkas impor hanya membawa pagu, jadi realisasi yang
 * sudah tersimpan tidak diubah. Rekening baru dibuat dengan realisasi `0.00`.
 * Mengosongkan realisasi saat impor pagu akan menghapus data pencairan/SPJ.
 */
export async function upsertKeuanganBatch(
  villageId: number,
  tahun: number,
  createdBy: string,
  rows: KeuanganBarisUpsert[],
): Promise<void> {
  if (rows.length === 0) return;

  await saveKeuanganNilai(villageId, tahun, createdBy, rows, { pertahankanRealisasi: true });
}
