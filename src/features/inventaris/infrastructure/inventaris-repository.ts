import "server-only";

import { and, asc, count, desc, eq, isNull, like, ne, or } from "drizzle-orm";

import { db } from "@/db";
import { inventaris, inventarisKategori, inventarisMutasi } from "@/db/schema";
import {
  hitungPerubahanAset,
  mutasiLogBeforeStep,
  type InventarisInput,
  type InventarisKategoriInput,
  type InventarisKategoriRow,
  type InventarisMutasiInput,
  type InventarisRow,
  type MutasiRow,
  type MutasiStep,
} from "@/features/inventaris/domain/inventaris";
import { conflict, notFound } from "@/lib/errors";

export async function listInventarisKategori(villageId: number): Promise<InventarisKategoriRow[]> {
  return db
    .select({
      id: inventarisKategori.id,
      kode: inventarisKategori.kode,
      nama: inventarisKategori.nama,
      golongan: inventarisKategori.golongan,
      keterangan: inventarisKategori.keterangan,
    })
    .from(inventarisKategori)
    .where(eq(inventarisKategori.villageId, villageId))
    .orderBy(asc(inventarisKategori.kode));
}

export async function getInventarisKategori(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(inventarisKategori)
    .where(and(eq(inventarisKategori.villageId, villageId), eq(inventarisKategori.id, id)))
    .limit(1);
  return row;
}

export async function inventarisKategoriKodeExists(
  villageId: number,
  kode: string,
  exceptId?: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: inventarisKategori.id })
    .from(inventarisKategori)
    .where(
      and(
        eq(inventarisKategori.villageId, villageId),
        eq(inventarisKategori.kode, kode),
        exceptId === undefined ? undefined : ne(inventarisKategori.id, exceptId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function countInventarisByKategori(
  villageId: number,
  kategoriId: number,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(inventaris)
    .where(
      and(
        eq(inventaris.villageId, villageId),
        eq(inventaris.kategoriId, kategoriId),
        eq(inventaris.isDeleted, false),
      ),
    );
  return row?.value ?? 0;
}

export async function createInventarisKategori(villageId: number, input: InventarisKategoriInput) {
  const [row] = await db
    .insert(inventarisKategori)
    .values({ villageId, ...input })
    .$returningId();
  return row?.id;
}

export async function updateInventarisKategori(
  villageId: number,
  id: number,
  input: InventarisKategoriInput,
) {
  await db
    .update(inventarisKategori)
    .set(input)
    .where(and(eq(inventarisKategori.villageId, villageId), eq(inventarisKategori.id, id)));
}

export async function deleteInventarisKategori(villageId: number, id: number) {
  const [result] = await db
    .delete(inventarisKategori)
    .where(and(eq(inventarisKategori.villageId, villageId), eq(inventarisKategori.id, id)));
  if (result.affectedRows === 0) throw notFound("Kategori inventaris tidak ditemukan.");
}

export async function listInventaris(
  villageId: number,
  search = "",
): Promise<{
  rows: (InventarisRow & { kategoriNama: string | null; kategoriKode: string | null })[];
  total: number;
}> {
  const where = and(
    eq(inventaris.villageId, villageId),
    eq(inventaris.isDeleted, false),
    search
      ? or(
          like(inventaris.namaBarang, `%${search}%`),
          like(inventaris.nomorInventaris, `%${search}%`),
          like(inventaris.kodeBarang, `%${search}%`),
        )
      : undefined,
  );

  const [rows, total] = await Promise.all([
    db
      .select({
        id: inventaris.id,
        kategoriId: inventaris.kategoriId,
        nomorInventaris: inventaris.nomorInventaris,
        namaBarang: inventaris.namaBarang,
        kodeBarang: inventaris.kodeBarang,
        merk: inventaris.merk,
        tipe: inventaris.tipe,
        spesifikasi: inventaris.spesifikasi,
        jumlah: inventaris.jumlah,
        satuan: inventaris.satuan,
        hargaSatuan: inventaris.hargaSatuan,
        nilaiAkhir: inventaris.nilaiAkhir,
        tahunPembelian: inventaris.tahunPembelian,
        tanggalPembelian: inventaris.tanggalPembelian,
        asal: inventaris.asal,
        donatur: inventaris.donatur,
        kondisi: inventaris.kondisi,
        lokasi: inventaris.lokasi,
        keterangan: inventaris.keterangan,
        kategoriNama: inventarisKategori.nama,
        kategoriKode: inventarisKategori.kode,
      })
      .from(inventaris)
      .leftJoin(inventarisKategori, eq(inventaris.kategoriId, inventarisKategori.id))
      .where(where)
      .orderBy(desc(inventaris.createdAt)),
    db.select({ value: count() }).from(inventaris).where(where),
  ]);

  return { rows, total: total[0]?.value ?? 0 };
}

export async function getInventaris(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(inventaris)
    .where(
      and(
        eq(inventaris.villageId, villageId),
        eq(inventaris.id, id),
        eq(inventaris.isDeleted, false),
      ),
    )
    .limit(1);
  return row;
}

function teksAtauNull(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value.trim() : null;
}

function desimalAtauNull(value: number | undefined): string | null {
  return value === undefined ? null : value.toFixed(2);
}

function nilaiInventaris(input: InventarisInput) {
  return {
    kategoriId: typeof input.kategoriId === "number" ? input.kategoriId : null,
    nomorInventaris: teksAtauNull(input.nomorInventaris),
    namaBarang: input.namaBarang,
    kodeBarang: teksAtauNull(input.kodeBarang),
    merk: teksAtauNull(input.merk),
    tipe: teksAtauNull(input.tipe),
    spesifikasi: teksAtauNull(input.spesifikasi),
    jumlah: input.jumlah.toFixed(2),
    satuan: input.satuan || "buah",
    hargaSatuan: desimalAtauNull(input.hargaSatuan),
    nilaiAkhir:
      input.hargaSatuan === undefined ? null : (input.hargaSatuan * input.jumlah).toFixed(2),
    tahunPembelian: input.tahunPembelian ?? null,
    tanggalPembelian: input.tanggalPembelian || null,
    asal: input.asal ?? null,
    donatur: teksAtauNull(input.donatur),
    kondisi: input.kondisi,
    lokasi: teksAtauNull(input.lokasi),
    keterangan: teksAtauNull(input.keterangan),
  };
}

export async function createInventaris(villageId: number, input: InventarisInput) {
  const [row] = await db
    .insert(inventaris)
    .values({ villageId, ...nilaiInventaris(input) })
    .$returningId();
  return row?.id;
}

export async function updateInventaris(villageId: number, id: number, input: InventarisInput) {
  await db
    .update(inventaris)
    .set(nilaiInventaris(input))
    .where(
      and(
        eq(inventaris.villageId, villageId),
        eq(inventaris.id, id),
        eq(inventaris.isDeleted, false),
      ),
    );
}

export async function softDeleteInventaris(villageId: number, id: number) {
  await db
    .update(inventaris)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(and(eq(inventaris.villageId, villageId), eq(inventaris.id, id)));
}

export async function listMutasi(villageId: number, inventarisId?: number): Promise<MutasiRow[]> {
  const where = inventarisId
    ? and(
        eq(inventarisMutasi.villageId, villageId),
        eq(inventarisMutasi.inventarisId, inventarisId),
      )
    : eq(inventarisMutasi.villageId, villageId);

  return db
    .select({
      id: inventarisMutasi.id,
      inventarisId: inventarisMutasi.inventarisId,
      jenis: inventarisMutasi.jenis,
      status: inventarisMutasi.status,
      tanggalMutasi: inventarisMutasi.tanggalMutasi,
      lokasiBaru: inventarisMutasi.lokasiBaru,
      kondisiBaru: inventarisMutasi.kondisiBaru,
      jumlahMutasi: inventarisMutasi.jumlahMutasi,
      alasan: inventarisMutasi.alasan,
      namaBarang: inventaris.namaBarang,
      nomorInventaris: inventaris.nomorInventaris,
      diajukanOleh: inventarisMutasi.diajukanOleh,
      verifikasiOleh: inventarisMutasi.verifikasiOleh,
      verifikasiSekdes: inventarisMutasi.verifikasiSekdes,
      verifikasiKades: inventarisMutasi.verifikasiKades,
      logVerifikasi: inventarisMutasi.logVerifikasi,
      catatanVerifikasi: inventarisMutasi.catatanVerifikasi,
      catatanPenolakan: inventarisMutasi.catatanPenolakan,
      disetujuiOleh: inventarisMutasi.disetujuiOleh,
      tanggalPersetujuan: inventarisMutasi.tanggalPersetujuan,
    })
    .from(inventarisMutasi)
    .leftJoin(inventaris, eq(inventarisMutasi.inventarisId, inventaris.id))
    .where(where)
    .orderBy(desc(inventarisMutasi.createdAt));
}

export async function getMutasi(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(inventarisMutasi)
    .where(and(eq(inventarisMutasi.villageId, villageId), eq(inventarisMutasi.id, id)))
    .limit(1);
  return row;
}

export async function createMutasi(
  villageId: number,
  input: InventarisMutasiInput,
  pengaju: { id: string; name: string },
) {
  const [row] = await db
    .insert(inventarisMutasi)
    .values({
      villageId,
      inventarisId: input.inventarisId,
      jenis: input.jenis,
      status: "diajukan",
      tanggalMutasi: input.tanggalMutasi,
      lokasiBaru: teksAtauNull(input.lokasiBaru),
      kondisiBaru: input.kondisiBaru ?? null,
      jumlahMutasi: input.jumlahMutasi.toFixed(2),
      alasan: input.alasan,
      keterangan: teksAtauNull(input.keterangan),
      diajukanOleh: pengaju.name,
      diajukanOlehId: pengaju.id,
      logVerifikasi: "diajukan",
    })
    .$returningId();
  return row?.id;
}

/**
 * Setujui satu tahap mutasi secara atomik.
 *
 * Tahap akhir (kepala desa) sekaligus menerapkan perubahan aset. Bila
 * perubahan aset gagal, persetujuan ikut di-rollback. `WHERE` pada kolom tahap
 * mencegah dua permintaan menyetujui tahap yang sama secara bersamaan.
 */
export async function setujuiMutasiTahap(
  villageId: number,
  id: number,
  step: MutasiStep,
  approverName: string,
) {
  await db.transaction(async (tx) => {
    let values: Partial<typeof inventarisMutasi.$inferInsert> = {
      logVerifikasi: step,
      catatanPenolakan: null,
      catatanVerifikasi: null,
    };

    if (step === "operator") values = { ...values, verifikasiOleh: approverName };
    if (step === "sekdes") values = { ...values, verifikasiSekdes: approverName };
    if (step === "kades") {
      values = {
        ...values,
        verifikasiKades: approverName,
        status: "disetujui",
        disetujuiOleh: approverName,
        tanggalPersetujuan: new Date(),
      };
    }

    const stepColumn =
      step === "operator"
        ? inventarisMutasi.verifikasiOleh
        : step === "sekdes"
          ? inventarisMutasi.verifikasiSekdes
          : inventarisMutasi.verifikasiKades;

    const [result] = await tx
      .update(inventarisMutasi)
      .set(values)
      .where(
        and(
          eq(inventarisMutasi.villageId, villageId),
          eq(inventarisMutasi.id, id),
          eq(inventarisMutasi.status, "diajukan"),
          eq(inventarisMutasi.logVerifikasi, mutasiLogBeforeStep(step)),
          isNull(stepColumn),
        ),
      );

    if (result.affectedRows === 0) {
      throw conflict("Tahap mutasi sudah diproses atau urutannya tidak valid.");
    }

    if (step !== "kades") return;

    const [mutasi] = await tx
      .select()
      .from(inventarisMutasi)
      .where(and(eq(inventarisMutasi.villageId, villageId), eq(inventarisMutasi.id, id)))
      .limit(1);
    if (!mutasi) throw notFound("Pengajuan mutasi tidak ditemukan.");

    const [aset] = await tx
      .select()
      .from(inventaris)
      .where(
        and(
          eq(inventaris.villageId, villageId),
          eq(inventaris.id, mutasi.inventarisId),
          eq(inventaris.isDeleted, false),
        ),
      )
      .limit(1);
    if (!aset) throw notFound("Barang inventaris tidak ditemukan atau sudah dihapus.");

    const patch = hitungPerubahanAset(
      {
        jumlah: aset.jumlah,
        hargaSatuan: aset.hargaSatuan,
        nilaiAkhir: aset.nilaiAkhir,
        kondisi: aset.kondisi,
        lokasi: aset.lokasi,
        isDeleted: aset.isDeleted,
      },
      {
        jenis: mutasi.jenis,
        lokasiBaru: mutasi.lokasiBaru,
        kondisiBaru: mutasi.kondisiBaru,
        jumlahMutasi: mutasi.jumlahMutasi,
      },
    );

    await tx
      .update(inventaris)
      .set(patch)
      .where(and(eq(inventaris.villageId, villageId), eq(inventaris.id, mutasi.inventarisId)));
  });
}

export async function tolakMutasi(
  villageId: number,
  id: number,
  catatanPenolakan: string,
  expectedLog: string,
) {
  const [result] = await db
    .update(inventarisMutasi)
    .set({
      status: "ditolak",
      catatanPenolakan,
      catatanVerifikasi: catatanPenolakan,
      logVerifikasi: "ditolak",
    })
    .where(
      and(
        eq(inventarisMutasi.villageId, villageId),
        eq(inventarisMutasi.id, id),
        eq(inventarisMutasi.status, "diajukan"),
        eq(inventarisMutasi.logVerifikasi, expectedLog),
      ),
    );

  if (result.affectedRows === 0) {
    throw conflict("Pengajuan mutasi sudah diproses atau urutannya tidak valid.");
  }
}
