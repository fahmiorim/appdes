import "server-only";

import { and, asc, count, desc, eq, isNull, like, ne, or } from "drizzle-orm";

import { db } from "@/db";
import {
  inventaris,
  inventarisDokumen,
  inventarisKategori,
  inventarisMutasi,
  inventarisPemeliharaan,
  inventarisPemeliharaanRiwayat,
  inventarisPenanggungJawabRiwayat,
} from "@/db/schema";
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

/**
 * Lepaskan semua referensi (termasuk barang soft-deleted) dalam transaksi;
 * use-case memvalidasi kategori tidak sedang dipakai barang aktif.
 */
export async function deleteInventarisKategori(villageId: number, id: number) {
  await db.transaction(async (tx) => {
    await tx
      .update(inventaris)
      .set({ kategoriId: null })
      .where(and(eq(inventaris.villageId, villageId), eq(inventaris.kategoriId, id)));
    const [kategori] = await tx
      .delete(inventarisKategori)
      .where(and(eq(inventarisKategori.villageId, villageId), eq(inventarisKategori.id, id)));
    if (kategori.affectedRows === 0) throw notFound("Kategori inventaris tidak ditemukan.");
  });
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
          like(inventaris.merk, `%${search}%`),
          like(inventaris.tipe, `%${search}%`),
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
        akumulasiPenyusutan: inventaris.akumulasiPenyusutan,
        umurManfaatBulan: inventaris.umurManfaatBulan,
        nilaiResidu: inventaris.nilaiResidu,
        tanggalMulaiPenyusutan: inventaris.tanggalMulaiPenyusutan,
        tahunPembelian: inventaris.tahunPembelian,
        tanggalPembelian: inventaris.tanggalPembelian,
        asal: inventaris.asal,
        donatur: inventaris.donatur,
        kondisi: inventaris.kondisi,
        lokasi: inventaris.lokasi,
        keterangan: inventaris.keterangan,
        penanggungJawab: inventaris.penanggungJawab,
        jabatanPenanggungJawab: inventaris.jabatanPenanggungJawab,
        teleponPenanggungJawab: inventaris.teleponPenanggungJawab,
        kategoriNama: inventarisKategori.nama,
        kategoriKode: inventarisKategori.kode,
      })
      .from(inventaris)
      // Predikat desa wajib: join hanya dengan id akan menampilkan nama/kode
      // kategori desa lain pada baris legacy, dan hasil ini diekspor lewat
      // route admin/publik yang aktif.
      .leftJoin(
        inventarisKategori,
        and(
          eq(inventaris.kategoriId, inventarisKategori.id),
          eq(inventarisKategori.villageId, inventaris.villageId),
        ),
      )
      .where(where)
      .orderBy(desc(inventaris.createdAt)),
    db.select({ value: count() }).from(inventaris).where(where),
  ]);

  return { rows, total: total[0]?.value ?? 0 };
}

export async function listInventarisLocations(villageId: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ lokasi: inventaris.lokasi })
    .from(inventaris)
    .where(and(eq(inventaris.villageId, villageId), eq(inventaris.isDeleted, false)));
  return rows
    .map((x) => x.lokasi)
    .filter((x): x is string => Boolean(x))
    .sort((a, b) => a.localeCompare(b, "id"));
}

export async function listInventarisPage(
  villageId: number,
  input: {
    search?: string;
    kategoriId?: number;
    lokasi?: string;
    kondisi?: string;
    page: number;
    pageSize: number;
  },
) {
  const where = and(
    eq(inventaris.villageId, villageId),
    eq(inventaris.isDeleted, false),
    input.search
      ? or(
          like(inventaris.namaBarang, `%${input.search}%`),
          like(inventaris.nomorInventaris, `%${input.search}%`),
          like(inventaris.kodeBarang, `%${input.search}%`),
          like(inventaris.merk, `%${input.search}%`),
          like(inventaris.tipe, `%${input.search}%`),
        )
      : undefined,
    input.kategoriId ? eq(inventaris.kategoriId, input.kategoriId) : undefined,
    input.lokasi ? eq(inventaris.lokasi, input.lokasi) : undefined,
    input.kondisi
      ? eq(inventaris.kondisi, input.kondisi as (typeof inventaris.kondisi.enumValues)[number])
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
        akumulasiPenyusutan: inventaris.akumulasiPenyusutan,
        umurManfaatBulan: inventaris.umurManfaatBulan,
        nilaiResidu: inventaris.nilaiResidu,
        tanggalMulaiPenyusutan: inventaris.tanggalMulaiPenyusutan,
        tahunPembelian: inventaris.tahunPembelian,
        tanggalPembelian: inventaris.tanggalPembelian,
        asal: inventaris.asal,
        donatur: inventaris.donatur,
        kondisi: inventaris.kondisi,
        lokasi: inventaris.lokasi,
        keterangan: inventaris.keterangan,
        penanggungJawab: inventaris.penanggungJawab,
        jabatanPenanggungJawab: inventaris.jabatanPenanggungJawab,
        teleponPenanggungJawab: inventaris.teleponPenanggungJawab,
        kategoriNama: inventarisKategori.nama,
        kategoriKode: inventarisKategori.kode,
      })
      .from(inventaris)
      .leftJoin(
        inventarisKategori,
        and(
          eq(inventaris.kategoriId, inventarisKategori.id),
          eq(inventaris.villageId, inventarisKategori.villageId),
        ),
      )
      .where(where)
      .orderBy(desc(inventaris.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
    db.select({ value: count() }).from(inventaris).where(where),
  ]);
  return { rows, total: total[0]?.value ?? 0 };
}

export async function inventarisNomorExists(
  villageId: number,
  nomor: string,
  exceptId?: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: inventaris.id })
    .from(inventaris)
    .where(
      and(
        eq(inventaris.villageId, villageId),
        eq(inventaris.nomorInventaris, nomor),
        eq(inventaris.isDeleted, false),
        exceptId === undefined ? undefined : ne(inventaris.id, exceptId),
      ),
    )
    .limit(1);
  return Boolean(row);
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
    akumulasiPenyusutan: input.akumulasiPenyusutan.toFixed(2),
    umurManfaatBulan: input.umurManfaatBulan ?? null,
    nilaiResidu: input.nilaiResidu.toFixed(2),
    tanggalMulaiPenyusutan: input.tanggalMulaiPenyusutan || null,
    tahunPembelian: input.tahunPembelian ?? null,
    tanggalPembelian: input.tanggalPembelian || null,
    asal: input.asal ?? null,
    donatur: teksAtauNull(input.donatur),
    kondisi: input.kondisi,
    lokasi: teksAtauNull(input.lokasi),
    keterangan: teksAtauNull(input.keterangan),
    penanggungJawab: teksAtauNull(input.penanggungJawab),
    jabatanPenanggungJawab: teksAtauNull(input.jabatanPenanggungJawab),
    teleponPenanggungJawab: teksAtauNull(input.teleponPenanggungJawab),
  };
}

export async function createInventaris(
  villageId: number,
  input: InventarisInput,
  actorName: string,
) {
  return db.transaction(async (tx) => {
    const values = nilaiInventaris(input);
    const [row] = await tx
      .insert(inventaris)
      .values({ villageId, ...values })
      .$returningId();
    if (row?.id && !values.nomorInventaris) {
      const nomor = `INV-${String(row.id).padStart(5, "0")}`;
      await tx
        .update(inventaris)
        .set({ nomorInventaris: nomor })
        .where(and(eq(inventaris.villageId, villageId), eq(inventaris.id, row.id)));
    }
    if (
      row?.id &&
      (input.penanggungJawab || input.jabatanPenanggungJawab || input.teleponPenanggungJawab)
    ) {
      await tx.insert(inventarisPenanggungJawabRiwayat).values({
        villageId,
        inventarisId: row.id,
        namaSebelum: null,
        jabatanSebelum: null,
        teleponSebelum: null,
        namaSesudah: input.penanggungJawab || null,
        jabatanSesudah: input.jabatanPenanggungJawab || null,
        teleponSesudah: input.teleponPenanggungJawab || null,
        diubahOleh: actorName,
      });
    }
    return row?.id;
  });
}

export async function updateInventaris(
  villageId: number,
  id: number,
  input: InventarisInput,
  actorName: string,
) {
  await db.transaction(async (tx) => {
    const [before] = await tx
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
    if (!before) throw notFound("Data inventaris tidak ditemukan.");
    const values = nilaiInventaris(input);
    if (!values.nomorInventaris) values.nomorInventaris = before.nomorInventaris;
    const changed =
      before.penanggungJawab !== (input.penanggungJawab || null) ||
      before.jabatanPenanggungJawab !== (input.jabatanPenanggungJawab || null) ||
      before.teleponPenanggungJawab !== (input.teleponPenanggungJawab || null);
    await tx
      .update(inventaris)
      .set(values)
      .where(
        and(
          eq(inventaris.villageId, villageId),
          eq(inventaris.id, id),
          eq(inventaris.isDeleted, false),
        ),
      );
    if (changed) {
      await tx.insert(inventarisPenanggungJawabRiwayat).values({
        villageId,
        inventarisId: id,
        namaSebelum: before.penanggungJawab,
        jabatanSebelum: before.jabatanPenanggungJawab,
        teleponSebelum: before.teleponPenanggungJawab,
        namaSesudah: input.penanggungJawab || null,
        jabatanSesudah: input.jabatanPenanggungJawab || null,
        teleponSesudah: input.teleponPenanggungJawab || null,
        diubahOleh: actorName,
      });
    }
  });
}

export async function listRiwayatPenanggungJawab(villageId: number, inventarisId: number) {
  return db
    .select()
    .from(inventarisPenanggungJawabRiwayat)
    .where(
      and(
        eq(inventarisPenanggungJawabRiwayat.villageId, villageId),
        eq(inventarisPenanggungJawabRiwayat.inventarisId, inventarisId),
      ),
    )
    .orderBy(desc(inventarisPenanggungJawabRiwayat.createdAt));
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

  // Sama seperti kategori: tanpa predikat desa, mutasi legacy dapat
  // menampilkan nama/nomor barang milik desa lain.
  const tautanInventaris = and(
    eq(inventarisMutasi.inventarisId, inventaris.id),
    eq(inventaris.villageId, inventarisMutasi.villageId),
  );

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
    .leftJoin(inventaris, tautanInventaris)
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
        akumulasiPenyusutan: aset.akumulasiPenyusutan,
        nilaiResidu: aset.nilaiResidu,
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

export async function listPemeliharaan(villageId: number) {
  return db
    .select({
      id: inventarisPemeliharaan.id,
      inventarisId: inventarisPemeliharaan.inventarisId,
      namaBarang: inventaris.namaBarang,
      nomorInventaris: inventaris.nomorInventaris,
      jenis: inventarisPemeliharaan.jenis,
      tanggalRencana: inventarisPemeliharaan.tanggalRencana,
      tanggalSelesai: inventarisPemeliharaan.tanggalSelesai,
      status: inventarisPemeliharaan.status,
      kondisiSetelah: inventarisPemeliharaan.kondisiSetelah,
      biaya: inventarisPemeliharaan.biaya,
      pelaksana: inventarisPemeliharaan.pelaksana,
      deskripsi: inventarisPemeliharaan.deskripsi,
      hasil: inventarisPemeliharaan.hasil,
    })
    .from(inventarisPemeliharaan)
    .leftJoin(
      inventaris,
      and(
        eq(inventaris.id, inventarisPemeliharaan.inventarisId),
        eq(inventaris.villageId, inventarisPemeliharaan.villageId),
      ),
    )
    .where(
      and(
        eq(inventarisPemeliharaan.villageId, villageId),
        eq(inventarisPemeliharaan.isDeleted, false),
      ),
    )
    .orderBy(desc(inventarisPemeliharaan.tanggalRencana));
}

export async function createPemeliharaan(
  villageId: number,
  input: {
    inventarisId: number;
    jenis: string;
    tanggalRencana: string;
    biaya: string;
    pelaksana: string | null;
    deskripsi: string | null;
  },
  actorName: string,
) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(inventarisPemeliharaan)
      .values({ villageId, ...input, status: "terjadwal" })
      .$returningId();
    if (row?.id)
      await tx.insert(inventarisPemeliharaanRiwayat).values({
        villageId,
        pemeliharaanId: row.id,
        inventarisId: input.inventarisId,
        aksi: "dibuat",
        statusSebelum: null,
        statusSesudah: "terjadwal",
        ringkasan: input.jenis,
        dilakukanOleh: actorName,
      });
    return row?.id;
  });
}

export async function updateStatusPemeliharaan(
  villageId: number,
  id: number,
  input: {
    status: "terjadwal" | "dalam_proses" | "selesai" | "dibatalkan";
    kondisiSetelah?: "baik" | "rusak_ringan" | "rusak_berat" | "dalam_perbaikan" | null;
    jenis?: string;
    tanggalRencana?: string;
    biaya?: string;
    pelaksana?: string | null;
    deskripsi?: string | null;
    tanggalSelesai: string | null;
    hasil: string | null;
  },
  actorName: string,
) {
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(inventarisPemeliharaan)
      .where(
        and(
          eq(inventarisPemeliharaan.villageId, villageId),
          eq(inventarisPemeliharaan.id, id),
          eq(inventarisPemeliharaan.isDeleted, false),
        ),
      )
      .limit(1);
    if (!before) throw notFound("Jadwal pemeliharaan tidak ditemukan.");
    if (before.status === "selesai" || before.status === "dibatalkan")
      throw conflict("Jadwal yang sudah selesai atau dibatalkan tidak dapat diubah lagi.");
    await tx
      .update(inventarisPemeliharaan)
      .set(input)
      .where(
        and(eq(inventarisPemeliharaan.villageId, villageId), eq(inventarisPemeliharaan.id, id)),
      );
    if (input.status === "selesai" && input.kondisiSetelah) {
      await tx
        .update(inventaris)
        .set({ kondisi: input.kondisiSetelah })
        .where(
          and(
            eq(inventaris.villageId, villageId),
            eq(inventaris.id, before.inventarisId),
            eq(inventaris.isDeleted, false),
          ),
        );
    }
    await tx.insert(inventarisPemeliharaanRiwayat).values({
      villageId,
      pemeliharaanId: id,
      inventarisId: before.inventarisId,
      aksi: "diperbarui",
      statusSebelum: before.status,
      statusSesudah: input.status,
      ringkasan: [
        input.hasil ?? input.deskripsi ?? input.jenis ?? "Data pemeliharaan diperbarui",
        input.kondisiSetelah ? "Kondisi aset: " + input.kondisiSetelah : "",
      ]
        .filter(Boolean)
        .join(" · "),
      dilakukanOleh: actorName,
    });
  });
}

export async function deletePemeliharaan(villageId: number, id: number, actorName: string) {
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(inventarisPemeliharaan)
      .where(
        and(
          eq(inventarisPemeliharaan.villageId, villageId),
          eq(inventarisPemeliharaan.id, id),
          eq(inventarisPemeliharaan.isDeleted, false),
        ),
      )
      .limit(1);
    if (!before) throw notFound("Jadwal pemeliharaan tidak ditemukan.");
    await tx
      .update(inventarisPemeliharaan)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(
        and(eq(inventarisPemeliharaan.villageId, villageId), eq(inventarisPemeliharaan.id, id)),
      );
    await tx.insert(inventarisPemeliharaanRiwayat).values({
      villageId,
      pemeliharaanId: id,
      inventarisId: before.inventarisId,
      aksi: "dihapus",
      statusSebelum: before.status,
      statusSesudah: before.status,
      ringkasan: before.jenis,
      dilakukanOleh: actorName,
    });
  });
}

export async function listRiwayatPemeliharaan(villageId: number) {
  return db
    .select({
      id: inventarisPemeliharaanRiwayat.id,
      aksi: inventarisPemeliharaanRiwayat.aksi,
      statusSebelum: inventarisPemeliharaanRiwayat.statusSebelum,
      statusSesudah: inventarisPemeliharaanRiwayat.statusSesudah,
      ringkasan: inventarisPemeliharaanRiwayat.ringkasan,
      dilakukanOleh: inventarisPemeliharaanRiwayat.dilakukanOleh,
      createdAt: inventarisPemeliharaanRiwayat.createdAt,
      namaBarang: inventaris.namaBarang,
      jenis: inventarisPemeliharaan.jenis,
    })
    .from(inventarisPemeliharaanRiwayat)
    .leftJoin(
      inventaris,
      and(
        eq(inventaris.id, inventarisPemeliharaanRiwayat.inventarisId),
        eq(inventaris.villageId, inventarisPemeliharaanRiwayat.villageId),
      ),
    )
    .leftJoin(
      inventarisPemeliharaan,
      and(
        eq(inventarisPemeliharaan.id, inventarisPemeliharaanRiwayat.pemeliharaanId),
        eq(inventarisPemeliharaan.villageId, inventarisPemeliharaanRiwayat.villageId),
      ),
    )
    .where(eq(inventarisPemeliharaanRiwayat.villageId, villageId))
    .orderBy(desc(inventarisPemeliharaanRiwayat.createdAt));
}

export async function listDokumenInventaris(villageId: number, inventarisId: number) {
  return db
    .select({
      id: inventarisDokumen.id,
      nama: inventarisDokumen.nama,
      namaFile: inventarisDokumen.namaFile,
      mime: inventarisDokumen.mime,
      ukuran: inventarisDokumen.ukuran,
      createdAt: inventarisDokumen.createdAt,
    })
    .from(inventarisDokumen)
    .where(
      and(
        eq(inventarisDokumen.villageId, villageId),
        eq(inventarisDokumen.inventarisId, inventarisId),
      ),
    )
    .orderBy(desc(inventarisDokumen.createdAt));
}

export async function getDokumenInventaris(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(inventarisDokumen)
    .where(and(eq(inventarisDokumen.villageId, villageId), eq(inventarisDokumen.id, id)))
    .limit(1);
  return row;
}

export async function createDokumenInventaris(
  villageId: number,
  inventarisId: number,
  input: {
    nama: string;
    namaFile: string;
    mime: string;
    ukuran: number;
    jalurMedia: string;
  },
) {
  const [row] = await db
    .insert(inventarisDokumen)
    .values({ villageId, inventarisId, ...input })
    .$returningId();
  return row?.id;
}

export async function deleteDokumenInventaris(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(inventarisDokumen)
    .where(and(eq(inventarisDokumen.villageId, villageId), eq(inventarisDokumen.id, id)))
    .limit(1);
  if (!row) throw notFound("Dokumen inventaris tidak ditemukan.");
  await db
    .delete(inventarisDokumen)
    .where(and(eq(inventarisDokumen.villageId, villageId), eq(inventarisDokumen.id, id)));
  return row.jalurMedia;
}
