import { and, asc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { bumindesBuku, bumindesItem, residentMutations, residents } from "@/db/schema";
import { BUKU_INTI } from "@/features/bumindes/domain/bumindes";
import type { MutationType } from "@/features/penduduk/domain/riwayat-penduduk";

/**
 * Repository buku administrasi desa.
 *
 * Hanya lapisan ini yang menyentuh `db`. Otorisasi dan aturan bisnis ada di use
 * case; repository tidak memutuskan apakah baris "tidak ditemukan" itu galat.
 */

interface ItemBukuValues {
  bukuId: number;
  nomorUrut: number;
  tanggal: string | null;
  uraian: string;
  keterangan: string | null;
}

/**
 * Pastikan setiap desa memiliki seluruh buku inti.
 *
 * Desa lama di-seed dengan kode kategori yang belum baku (mis. `C1` untuk Buku
 * Agenda). Baris bawaan itu ditata ulang ke kode barunya lebih dulu, baru buku
 * yang belum ada ditambahkan — item yang sudah tercatat tetap menempel pada
 * baris buku yang sama. Idempoten: pemanggilan berikutnya tidak mengubah apa pun.
 */
export async function seedBumindesBuku(villageId: number): Promise<void> {
  const existing = await db
    .select({
      id: bumindesBuku.id,
      kodeBuku: bumindesBuku.kodeBuku,
      namaBuku: bumindesBuku.namaBuku,
    })
    .from(bumindesBuku)
    .where(eq(bumindesBuku.villageId, villageId));

  if (existing.length === 0) {
    await db.insert(bumindesBuku).values(
      BUKU_INTI.map((buku) => ({
        villageId,
        kodeBuku: buku.kodeBuku,
        namaBuku: buku.namaBuku,
        uraian: buku.uraian,
      })),
    );
    return;
  }

  const terpakai = new Set(existing.map((buku) => buku.kodeBuku));

  await db.transaction(async (tx) => {
    // 1. Tata ulang buku bawaan lama (kode + nama harus sama persis agar buku
    //    kustom tidak ikut tersentuh).
    for (const buku of BUKU_INTI) {
      if (!buku.kodeLama) continue;

      const lama = existing.find(
        (row) => row.kodeBuku === buku.kodeLama?.kode && row.namaBuku === buku.kodeLama.nama,
      );
      if (!lama || terpakai.has(buku.kodeBuku)) continue;

      await tx
        .update(bumindesBuku)
        .set({ kodeBuku: buku.kodeBuku, namaBuku: buku.namaBuku, uraian: buku.uraian })
        .where(and(eq(bumindesBuku.villageId, villageId), eq(bumindesBuku.id, lama.id)));

      terpakai.delete(lama.kodeBuku);
      terpakai.add(buku.kodeBuku);
    }

    // 2. Tambahkan buku inti yang belum ada.
    const belumAda = BUKU_INTI.filter((buku) => !terpakai.has(buku.kodeBuku));
    if (belumAda.length === 0) return;

    await tx.insert(bumindesBuku).values(
      belumAda.map((buku) => ({
        villageId,
        kodeBuku: buku.kodeBuku,
        namaBuku: buku.namaBuku,
        uraian: buku.uraian,
      })),
    );
  });
}

/** Daftar buku desa, terurut menurut kode. */
export async function listBumindesBuku(villageId: number) {
  return db
    .select({
      id: bumindesBuku.id,
      kodeBuku: bumindesBuku.kodeBuku,
      namaBuku: bumindesBuku.namaBuku,
      uraian: bumindesBuku.uraian,
    })
    .from(bumindesBuku)
    .where(eq(bumindesBuku.villageId, villageId))
    .orderBy(asc(bumindesBuku.kodeBuku));
}

/** Seed (bila perlu) lalu kembalikan daftar buku desa. */
export async function ensureBumindesBuku(villageId: number) {
  await seedBumindesBuku(villageId);
  return listBumindesBuku(villageId);
}

/** Satu buku milik desa ini, atau `null`. */
export async function getBumindesBuku(villageId: number, bukuId: number) {
  const [buku] = await db
    .select({
      id: bumindesBuku.id,
      kodeBuku: bumindesBuku.kodeBuku,
      namaBuku: bumindesBuku.namaBuku,
      uraian: bumindesBuku.uraian,
    })
    .from(bumindesBuku)
    .where(and(eq(bumindesBuku.villageId, villageId), eq(bumindesBuku.id, bukuId)))
    .limit(1);
  return buku ?? null;
}

/** Item satu buku, terurut nomor urut lalu id. */
export async function listBumindesItem(villageId: number, bukuId: number) {
  return db
    .select({
      id: bumindesItem.id,
      bukuId: bumindesItem.bukuId,
      nomorUrut: bumindesItem.nomorUrut,
      tanggal: bumindesItem.tanggal,
      uraian: bumindesItem.uraian,
      keterangan: bumindesItem.keterangan,
    })
    .from(bumindesItem)
    .where(and(eq(bumindesItem.villageId, villageId), eq(bumindesItem.bukuId, bukuId)))
    .orderBy(asc(bumindesItem.nomorUrut), asc(bumindesItem.id));
}

/** Satu item milik desa ini, atau `null`. */
export async function getBumindesItem(villageId: number, itemId: number) {
  const [item] = await db
    .select({
      id: bumindesItem.id,
      bukuId: bumindesItem.bukuId,
      nomorUrut: bumindesItem.nomorUrut,
      tanggal: bumindesItem.tanggal,
      uraian: bumindesItem.uraian,
      keterangan: bumindesItem.keterangan,
    })
    .from(bumindesItem)
    .where(and(eq(bumindesItem.villageId, villageId), eq(bumindesItem.id, itemId)))
    .limit(1);
  return item ?? null;
}

/** Apakah nomor urut sudah dipakai pada buku yang sama (kecuali `excludeId`). */
export async function nomorUrutTerpakai(
  villageId: number,
  bukuId: number,
  nomorUrut: number,
  excludeId: number | null,
): Promise<boolean> {
  const kondisi = [
    eq(bumindesItem.villageId, villageId),
    eq(bumindesItem.bukuId, bukuId),
    eq(bumindesItem.nomorUrut, nomorUrut),
  ];
  if (excludeId !== null) kondisi.push(ne(bumindesItem.id, excludeId));

  const [row] = await db
    .select({ id: bumindesItem.id })
    .from(bumindesItem)
    .where(and(...kondisi))
    .limit(1);
  return Boolean(row);
}

/** Tambah item buku; mengembalikan id baris baru. */
export async function insertBumindesItem(
  villageId: number,
  values: ItemBukuValues,
): Promise<number> {
  const [row] = await db
    .insert(bumindesItem)
    .values({ villageId, ...values })
    .$returningId();

  if (!row) throw new Error("Gagal menyimpan item buku administrasi.");
  return row.id;
}

/** Ubah item buku milik desa ini; `false` bila tidak ada baris yang cocok. */
export async function updateBumindesItem(
  villageId: number,
  itemId: number,
  values: Omit<ItemBukuValues, "bukuId">,
): Promise<boolean> {
  const [result] = await db
    .update(bumindesItem)
    .set(values)
    .where(and(eq(bumindesItem.villageId, villageId), eq(bumindesItem.id, itemId)));

  return result.affectedRows > 0;
}

/** Hapus item buku milik desa ini; `false` bila tidak ada baris yang cocok. */
export async function deleteBumindesItem(villageId: number, itemId: number): Promise<boolean> {
  const [result] = await db
    .delete(bumindesItem)
    .where(and(eq(bumindesItem.villageId, villageId), eq(bumindesItem.id, itemId)));

  return result.affectedRows > 0;
}

/**
 * Bahan sinkronisasi ringkasan buku inti dari data penduduk.
 *
 * Repository hanya mengambil kolom yang dibutuhkan; penghitungan dan keputusan
 * buku mana yang diperbarui tetap di use case.
 */
export async function ambilDataSinkronisasiPenduduk(villageId: number): Promise<{
  penduduk: {
    gender: string;
    lifeStatus: string;
    residenceStatus: string | null;
    familyId: number | null;
    nationalId: string | null;
  }[];
  mutasi: { type: MutationType }[];
}> {
  const [penduduk, mutasi] = await Promise.all([
    db
      .select({
        gender: residents.gender,
        lifeStatus: residents.lifeStatus,
        residenceStatus: residents.residenceStatus,
        familyId: residents.familyId,
        nationalId: residents.nationalId,
      })
      .from(residents)
      .where(eq(residents.villageId, villageId)),
    db
      .select({ type: residentMutations.type })
      .from(residentMutations)
      .where(eq(residentMutations.villageId, villageId)),
  ]);

  return { penduduk, mutasi };
}
