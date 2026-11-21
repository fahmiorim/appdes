import "server-only";

import { and, asc, count, desc, eq, gte, lte, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { denganKunciMysql } from "@/db/kunci-mysql";
import {
  cutiKuota,
  cutiPegawai,
  jabatanPerangkat,
  kehadiranPengaturan,
  kehadiranPerangkat,
  kepegawaianDokumen,
  kepegawaianPegawai,
  kepegawaianRiwayat,
  perangkatDesa,
} from "@/db/schema";

/**
 * Akses data modul Absensi & Kepegawaian.
 *
 * Setiap fungsi wajib dibatasi `village_id` tenant yang sudah diverifikasi di
 * application layer. Aturan bisnis (kuota, periode, status) tetap di use case.
 */

export type PegawaiValues = Omit<
  typeof kepegawaianPegawai.$inferInsert,
  "id" | "villageId" | "createdAt" | "updatedAt"
>;
export type RiwayatValues = Omit<
  typeof kepegawaianRiwayat.$inferInsert,
  "id" | "villageId" | "createdAt"
>;
export type DokumenValues = Omit<
  typeof kepegawaianDokumen.$inferInsert,
  "id" | "villageId" | "createdAt"
>;
export type CutiValues = Omit<typeof cutiPegawai.$inferInsert, "id" | "villageId" | "createdAt">;
export type PengaturanValues = Omit<
  typeof kehadiranPengaturan.$inferInsert,
  "id" | "villageId" | "createdAt" | "updatedAt"
>;
export type AbsensiValues = Omit<
  typeof kehadiranPerangkat.$inferInsert,
  "id" | "villageId" | "createdAt" | "updatedAt"
>;

export async function listPerangkatUntukSinkron(villageId: number) {
  return db
    .select({
      id: perangkatDesa.id,
      nama: perangkatDesa.nama,
      nip: perangkatDesa.nip,
      nik: perangkatDesa.nik,
      jenisKelamin: perangkatDesa.jenisKelamin,
      tempatLahir: perangkatDesa.tempatLahir,
      tanggalLahir: perangkatDesa.tanggalLahir,
      foto: perangkatDesa.foto,
      jabatan: jabatanPerangkat.nama,
      status: perangkatDesa.status,
    })
    .from(perangkatDesa)
    .leftJoin(
      jabatanPerangkat,
      and(
        eq(perangkatDesa.jabatanId, jabatanPerangkat.id),
        eq(jabatanPerangkat.villageId, villageId),
      ),
    )
    .where(eq(perangkatDesa.villageId, villageId));
}

export async function getPegawaiByPerangkatId(villageId: number, perangkatId: number) {
  const [row] = await db
    .select({ id: kepegawaianPegawai.id })
    .from(kepegawaianPegawai)
    .where(
      and(
        eq(kepegawaianPegawai.villageId, villageId),
        eq(kepegawaianPegawai.perangkatId, perangkatId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertPegawai(villageId: number, values: PegawaiValues) {
  const result = await db.insert(kepegawaianPegawai).values({ ...values, villageId });
  return Number(result[0].insertId);
}

export async function updatePegawai(
  villageId: number,
  id: number,
  values: Partial<PegawaiValues>,
) {
  await db
    .update(kepegawaianPegawai)
    .set(values)
    .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.id, id)));
}

export async function listPegawai(villageId: number) {
  return db
    .select()
    .from(kepegawaianPegawai)
    .where(eq(kepegawaianPegawai.villageId, villageId))
    .orderBy(asc(kepegawaianPegawai.status), asc(kepegawaianPegawai.nama));
}

export async function getPegawai(villageId: number, id: number) {
  const [row] = await db
    .select({ id: kepegawaianPegawai.id })
    .from(kepegawaianPegawai)
    .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getPegawaiAktif(villageId: number, id: number) {
  const [row] = await db
    .select({ id: kepegawaianPegawai.id })
    .from(kepegawaianPegawai)
    .where(
      and(
        eq(kepegawaianPegawai.villageId, villageId),
        eq(kepegawaianPegawai.id, id),
        eq(kepegawaianPegawai.status, "aktif"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPegawaiByNip(villageId: number, nip: string, excludeId?: number) {
  const [row] = await db
    .select({ id: kepegawaianPegawai.id })
    .from(kepegawaianPegawai)
    .where(
      and(
        eq(kepegawaianPegawai.villageId, villageId),
        eq(kepegawaianPegawai.nip, nip),
        ...(excludeId ? [ne(kepegawaianPegawai.id, excludeId)] : []),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPegawaiByNik(villageId: number, nik: string, excludeId?: number) {
  const [row] = await db
    .select({ id: kepegawaianPegawai.id })
    .from(kepegawaianPegawai)
    .where(
      and(
        eq(kepegawaianPegawai.villageId, villageId),
        eq(kepegawaianPegawai.nik, nik),
        ...(excludeId ? [ne(kepegawaianPegawai.id, excludeId)] : []),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPegawaiByEmail(villageId: number, email: string, excludeId?: number) {
  const [row] = await db
    .select({ id: kepegawaianPegawai.id })
    .from(kepegawaianPegawai)
    .where(
      and(
        eq(kepegawaianPegawai.villageId, villageId),
        eq(kepegawaianPegawai.email, email),
        ...(excludeId ? [ne(kepegawaianPegawai.id, excludeId)] : []),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPegawaiByPerangkat(
  villageId: number,
  perangkatId: number,
  excludeId?: number,
) {
  const [row] = await db
    .select({ id: kepegawaianPegawai.id })
    .from(kepegawaianPegawai)
    .where(
      and(
        eq(kepegawaianPegawai.villageId, villageId),
        eq(kepegawaianPegawai.perangkatId, perangkatId),
        ...(excludeId ? [ne(kepegawaianPegawai.id, excludeId)] : []),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listPegawaiAktif(villageId: number) {
  return db
    .select()
    .from(kepegawaianPegawai)
    .where(
      and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.status, "aktif")),
    );
}

export async function listPegawaiAktifRingkas(villageId: number) {
  return db
    .select({
      id: kepegawaianPegawai.id,
      nama: kepegawaianPegawai.nama,
      jabatan: kepegawaianPegawai.jabatan,
    })
    .from(kepegawaianPegawai)
    .where(
      and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.status, "aktif")),
    )
    .orderBy(asc(kepegawaianPegawai.nama));
}

export async function getPegawaiByUserEmail(villageId: number, email: string) {
  const [row] = await db
    .select({ id: kepegawaianPegawai.id, nama: kepegawaianPegawai.nama })
    .from(kepegawaianPegawai)
    .where(
      and(
        eq(kepegawaianPegawai.villageId, villageId),
        eq(kepegawaianPegawai.status, "aktif"),
        eq(kepegawaianPegawai.email, email),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listPerangkatAktifDenganJabatan(villageId: number) {
  return db
    .select({ id: perangkatDesa.id, nama: perangkatDesa.nama, jabatan: jabatanPerangkat.nama })
    .from(perangkatDesa)
    .leftJoin(
      jabatanPerangkat,
      and(
        eq(perangkatDesa.jabatanId, jabatanPerangkat.id),
        eq(jabatanPerangkat.villageId, villageId),
      ),
    )
    .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.status, "aktif")));
}

export async function listPerangkatTerhubung(villageId: number) {
  return db
    .select({ perangkatId: kepegawaianPegawai.perangkatId })
    .from(kepegawaianPegawai)
    .where(eq(kepegawaianPegawai.villageId, villageId));
}

export async function listRiwayatPegawai(villageId: number, pegawaiId: number) {
  return db
    .select()
    .from(kepegawaianRiwayat)
    .where(
      and(
        eq(kepegawaianRiwayat.villageId, villageId),
        eq(kepegawaianRiwayat.pegawaiId, pegawaiId),
      ),
    )
    .orderBy(desc(kepegawaianRiwayat.mulai));
}

export async function getRiwayatPegawai(villageId: number, id: number, pegawaiId: number) {
  const [row] = await db
    .select({ id: kepegawaianRiwayat.id })
    .from(kepegawaianRiwayat)
    .where(
      and(
        eq(kepegawaianRiwayat.villageId, villageId),
        eq(kepegawaianRiwayat.id, id),
        eq(kepegawaianRiwayat.pegawaiId, pegawaiId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertRiwayatPegawai(villageId: number, values: RiwayatValues) {
  await db.insert(kepegawaianRiwayat).values({ ...values, villageId });
}

export async function updateRiwayatPegawai(
  villageId: number,
  id: number,
  values: Omit<RiwayatValues, "pegawaiId">,
) {
  await db
    .update(kepegawaianRiwayat)
    .set(values)
    .where(
      and(eq(kepegawaianRiwayat.villageId, villageId), eq(kepegawaianRiwayat.id, id)),
    );
}

export async function deleteRiwayatPegawai(villageId: number, id: number) {
  await db
    .delete(kepegawaianRiwayat)
    .where(and(eq(kepegawaianRiwayat.villageId, villageId), eq(kepegawaianRiwayat.id, id)));
}

export async function listDokumenPegawai(villageId: number, pegawaiId: number) {
  return db
    .select()
    .from(kepegawaianDokumen)
    .where(
      and(
        eq(kepegawaianDokumen.villageId, villageId),
        eq(kepegawaianDokumen.pegawaiId, pegawaiId),
      ),
    )
    .orderBy(desc(kepegawaianDokumen.createdAt));
}

export async function getDokumenPegawai(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(kepegawaianDokumen)
    .where(and(eq(kepegawaianDokumen.villageId, villageId), eq(kepegawaianDokumen.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertDokumenPegawai(villageId: number, values: DokumenValues) {
  await db.insert(kepegawaianDokumen).values({ ...values, villageId });
}

export async function deleteDokumenPegawai(villageId: number, id: number) {
  await db
    .delete(kepegawaianDokumen)
    .where(and(eq(kepegawaianDokumen.villageId, villageId), eq(kepegawaianDokumen.id, id)));
}

export async function listCutiTahun(villageId: number, tahun: number) {
  return db
    .select({
      id: cutiPegawai.id,
      pegawaiId: kepegawaianPegawai.id,
      nama: kepegawaianPegawai.nama,
      jabatan: kepegawaianPegawai.jabatan,
      jenis: cutiPegawai.jenis,
      mulai: cutiPegawai.mulai,
      selesai: cutiPegawai.selesai,
      durasi: cutiPegawai.durasi,
      alasan: cutiPegawai.alasan,
      lampiran: cutiPegawai.lampiran,
      status: cutiPegawai.status,
      catatan: cutiPegawai.catatan,
    })
    .from(cutiPegawai)
    .innerJoin(
      kepegawaianPegawai,
      and(
        eq(cutiPegawai.villageId, kepegawaianPegawai.villageId),
        eq(cutiPegawai.pegawaiId, kepegawaianPegawai.id),
      ),
    )
    .where(
      and(
        eq(cutiPegawai.villageId, villageId),
        gte(cutiPegawai.mulai, `${tahun}-01-01`),
        lte(cutiPegawai.mulai, `${tahun}-12-31`),
      ),
    )
    .orderBy(desc(cutiPegawai.createdAt));
}

export async function getCuti(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(cutiPegawai)
    .where(and(eq(cutiPegawai.villageId, villageId), eq(cutiPegawai.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getLampiranCuti(villageId: number, id: number) {
  const [row] = await db
    .select({ lampiran: cutiPegawai.lampiran })
    .from(cutiPegawai)
    .where(and(eq(cutiPegawai.villageId, villageId), eq(cutiPegawai.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getCutiBertabrakan(
  villageId: number,
  pegawaiId: number,
  mulai: string,
  selesai: string,
) {
  const [row] = await db
    .select({ id: cutiPegawai.id })
    .from(cutiPegawai)
    .where(
      and(
        eq(cutiPegawai.villageId, villageId),
        eq(cutiPegawai.pegawaiId, pegawaiId),
        lte(cutiPegawai.mulai, selesai),
        gte(cutiPegawai.selesai, mulai),
        ne(cutiPegawai.status, "ditolak"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertCuti(villageId: number, values: CutiValues) {
  await db.insert(cutiPegawai).values({ ...values, villageId });
}

export async function updateStatusCuti(
  villageId: number,
  id: number,
  values: {
    status: "disetujui" | "ditolak";
    catatan: string | null;
    diputuskanOleh: string;
    diputuskanAt: Date;
  },
) {
  await db
    .update(cutiPegawai)
    .set(values)
    .where(and(eq(cutiPegawai.villageId, villageId), eq(cutiPegawai.id, id)));
}

export async function sumCutiTahunanDisetujui(
  villageId: number,
  pegawaiId: number,
  tahun: number,
) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${cutiPegawai.durasi}),0)` })
    .from(cutiPegawai)
    .where(
      and(
        eq(cutiPegawai.villageId, villageId),
        eq(cutiPegawai.pegawaiId, pegawaiId),
        eq(cutiPegawai.jenis, "cuti_tahunan"),
        eq(cutiPegawai.status, "disetujui"),
        gte(cutiPegawai.mulai, `${tahun}-01-01`),
        lte(cutiPegawai.selesai, `${tahun}-12-31`),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function getKuotaCuti(villageId: number, pegawaiId: number, tahun: number) {
  const [row] = await db
    .select({ total: cutiKuota.total })
    .from(cutiKuota)
    .where(
      and(
        eq(cutiKuota.villageId, villageId),
        eq(cutiKuota.pegawaiId, pegawaiId),
        eq(cutiKuota.tahun, tahun),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function upsertKuotaCuti(
  villageId: number,
  pegawaiId: number,
  tahun: number,
  total: number,
) {
  const [existing] = await db
    .select({ id: cutiKuota.id })
    .from(cutiKuota)
    .where(
      and(
        eq(cutiKuota.villageId, villageId),
        eq(cutiKuota.pegawaiId, pegawaiId),
        eq(cutiKuota.tahun, tahun),
      ),
    )
    .limit(1);
  if (existing) {
    await db
      .update(cutiKuota)
      .set({ total })
      .where(and(eq(cutiKuota.villageId, villageId), eq(cutiKuota.id, existing.id)));
    return;
  }
  await db.insert(cutiKuota).values({ villageId, pegawaiId, tahun, total });
}

export async function getPengaturanKehadiran(villageId: number) {
  const [row] = await db
    .select()
    .from(kehadiranPengaturan)
    .where(eq(kehadiranPengaturan.villageId, villageId))
    .limit(1);
  return row ?? null;
}

export async function upsertPengaturanKehadiran(
  villageId: number,
  values: PengaturanValues,
) {
  const [existing] = await db
    .select({ id: kehadiranPengaturan.id })
    .from(kehadiranPengaturan)
    .where(eq(kehadiranPengaturan.villageId, villageId))
    .limit(1);
  if (existing) {
    await db
      .update(kehadiranPengaturan)
      .set(values)
      .where(and(eq(kehadiranPengaturan.villageId, villageId), eq(kehadiranPengaturan.id, existing.id)));
    return;
  }
  await db.insert(kehadiranPengaturan).values({ ...values, villageId });
}

export async function countKehadiranHarian(villageId: number, tanggal: string) {
  return db
    .select({ status: kehadiranPerangkat.status, total: count() })
    .from(kehadiranPerangkat)
    .where(
      and(eq(kehadiranPerangkat.villageId, villageId), eq(kehadiranPerangkat.tanggal, tanggal)),
    )
    .groupBy(kehadiranPerangkat.status);
}

export async function countCutiAktif(villageId: number, tanggal: string) {
  return db
    .select({ status: cutiPegawai.status, total: count() })
    .from(cutiPegawai)
    .where(
      and(
        eq(cutiPegawai.villageId, villageId),
        lte(cutiPegawai.mulai, tanggal),
        gte(cutiPegawai.selesai, tanggal),
      ),
    )
    .groupBy(cutiPegawai.status);
}

export async function listAbsensiDashboard(villageId: number, tanggal: string, limit: number) {
  return db
    .select({
      pegawai: kepegawaianPegawai.nama,
      foto: kepegawaianPegawai.foto,
      jabatan: kepegawaianPegawai.jabatan,
      jamMasuk: kehadiranPerangkat.jamMasuk,
      jamKeluar: kehadiranPerangkat.jamKeluar,
      status: kehadiranPerangkat.status,
    })
    .from(kepegawaianPegawai)
    .leftJoin(
      kehadiranPerangkat,
      and(
        eq(kehadiranPerangkat.villageId, villageId),
        eq(kehadiranPerangkat.pegawaiId, kepegawaianPegawai.id),
        eq(kehadiranPerangkat.tanggal, tanggal),
      ),
    )
    .where(
      and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.status, "aktif")),
    )
    .orderBy(asc(kepegawaianPegawai.nama))
    .limit(limit);
}

export async function listTrenKehadiran(villageId: number, dari: string, sampai: string) {
  return db
    .select({ tanggal: kehadiranPerangkat.tanggal, total: count() })
    .from(kehadiranPerangkat)
    .where(
      and(
        eq(kehadiranPerangkat.villageId, villageId),
        gte(kehadiranPerangkat.tanggal, dari),
        lte(kehadiranPerangkat.tanggal, sampai),
        eq(kehadiranPerangkat.status, "hadir"),
      ),
    )
    .groupBy(kehadiranPerangkat.tanggal)
    .orderBy(asc(kehadiranPerangkat.tanggal));
}

export async function listAbsensiTanggal(villageId: number, tanggal: string) {
  return db
    .select({
      id: kehadiranPerangkat.id,
      pegawaiId: kepegawaianPegawai.id,
      nama: kepegawaianPegawai.nama,
      jabatan: kepegawaianPegawai.jabatan,
      jamMasuk: kehadiranPerangkat.jamMasuk,
      jamKeluar: kehadiranPerangkat.jamKeluar,
      status: kehadiranPerangkat.status,
      fotoMasuk: kehadiranPerangkat.fotoMasuk,
      catatan: kehadiranPerangkat.catatan,
    })
    .from(kepegawaianPegawai)
    .leftJoin(
      kehadiranPerangkat,
      and(
        eq(kehadiranPerangkat.villageId, villageId),
        eq(kehadiranPerangkat.pegawaiId, kepegawaianPegawai.id),
        eq(kehadiranPerangkat.tanggal, tanggal),
      ),
    )
    .where(
      and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.status, "aktif")),
    )
    .orderBy(asc(kepegawaianPegawai.nama));
}

export async function listCatatanAbsensiRentang(
  villageId: number,
  mulai: string,
  selesai: string,
) {
  return db
    .select({
      pegawaiId: kehadiranPerangkat.pegawaiId,
      tanggal: kehadiranPerangkat.tanggal,
      jamMasuk: kehadiranPerangkat.jamMasuk,
      jamKeluar: kehadiranPerangkat.jamKeluar,
      status: kehadiranPerangkat.status,
      catatan: kehadiranPerangkat.catatan,
    })
    .from(kehadiranPerangkat)
    .where(
      and(
        eq(kehadiranPerangkat.villageId, villageId),
        gte(kehadiranPerangkat.tanggal, mulai),
        lte(kehadiranPerangkat.tanggal, selesai),
      ),
    );
}

export async function getAbsensiHarian(
  villageId: number,
  pegawaiId: number,
  tanggal: string,
) {
  const [row] = await db
    .select()
    .from(kehadiranPerangkat)
    .where(
      and(
        eq(kehadiranPerangkat.villageId, villageId),
        eq(kehadiranPerangkat.pegawaiId, pegawaiId),
        eq(kehadiranPerangkat.tanggal, tanggal),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Serialisasi absensi mandiri per pegawai per hari agar check-in/out tidak balapan. */
export async function denganKunciAbsensiHarian<T>(
  villageId: number,
  pegawaiId: number,
  tanggal: string,
  fn: () => Promise<T>,
): Promise<T> {
  return denganKunciMysql(`absensi:${villageId}:${pegawaiId}:${tanggal}`, fn);
}

export async function insertAbsensi(villageId: number, values: AbsensiValues) {
  await db.insert(kehadiranPerangkat).values({ ...values, villageId });
}

export async function updateAbsensi(
  villageId: number,
  id: number,
  values: Partial<AbsensiValues>,
) {
  await db
    .update(kehadiranPerangkat)
    .set(values)
    .where(
      and(eq(kehadiranPerangkat.villageId, villageId), eq(kehadiranPerangkat.id, id)),
    );
}

export async function listKehadiranBulanan(
  villageId: number,
  mulai: string,
  akhir: string,
) {
  return db
    .select({
      tanggal: kehadiranPerangkat.tanggal,
      status: kehadiranPerangkat.status,
      total: sql<number>`count(*)`,
    })
    .from(kehadiranPerangkat)
    .where(
      and(
        eq(kehadiranPerangkat.villageId, villageId),
        gte(kehadiranPerangkat.tanggal, mulai),
        lte(kehadiranPerangkat.tanggal, akhir),
      ),
    )
    .groupBy(kehadiranPerangkat.tanggal, kehadiranPerangkat.status)
    .orderBy(asc(kehadiranPerangkat.tanggal));
}

export async function getBuktiAbsensi(villageId: number, id: number) {
  const [row] = await db
    .select({ foto: kehadiranPerangkat.fotoMasuk, email: kepegawaianPegawai.email })
    .from(kehadiranPerangkat)
    .innerJoin(
      kepegawaianPegawai,
      and(
        eq(kehadiranPerangkat.villageId, kepegawaianPegawai.villageId),
        eq(kehadiranPerangkat.pegawaiId, kepegawaianPegawai.id),
      ),
    )
    .where(and(eq(kehadiranPerangkat.villageId, villageId), eq(kehadiranPerangkat.id, id)))
    .limit(1);
  return row ?? null;
}
