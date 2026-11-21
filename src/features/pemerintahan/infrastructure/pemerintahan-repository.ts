import "server-only";

import { and, asc, count, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import {
  areas,
  jabatanPerangkat,
  lembagaAnggota,
  lembagaDesa,
  pemerintahanDokumen,
  perangkatDesa,
  perangkatRiwayatJabatan,
  polygons,
  profilDesa,
  regions,
} from "@/db/schema";

/**
 * Repository modul Pemerintahan Desa.
 *
 * Semua query di sini wajib dibatasi `village_id` tenant yang sudah
 * diverifikasi di application layer. Pemeriksaan aturan bisnis (validasi
 * status, relasi atasan, GeoJSON) tetap berada di use case.
 */

export type PerangkatValues = Omit<
  typeof perangkatDesa.$inferInsert,
  "id" | "villageId" | "createdAt" | "updatedAt"
>;
export type LembagaValues = Omit<
  typeof lembagaDesa.$inferInsert,
  "id" | "villageId" | "createdAt" | "updatedAt"
>;
export type AnggotaValues = Omit<
  typeof lembagaAnggota.$inferInsert,
  "id" | "villageId" | "createdAt" | "updatedAt"
>;
export type RiwayatValues = Omit<
  typeof perangkatRiwayatJabatan.$inferInsert,
  "id" | "villageId" | "createdAt"
>;
export type AreaValues = Omit<typeof areas.$inferInsert, "id" | "villageId">;
export type PolygonValues = Omit<typeof polygons.$inferInsert, "id" | "villageId">;
export type DokumenValues = Omit<
  typeof pemerintahanDokumen.$inferInsert,
  "id" | "villageId" | "createdAt"
>;
export type ProfilWilayahValues = {
  luasWilayah: string | null;
  batasUtara: string | null;
  batasSelatan: string | null;
  batasTimur: string | null;
  batasBarat: string | null;
  ketinggian: string | null;
  suhuRataRata: string | null;
  curahHujan: string | null;
  topografi: string | null;
};

/** Ringkasan dashboard: hitungan status aktif dan daftar struktur. */
export async function getDashboardPemerintahan(villageId: number) {
  const [[perangkat], [lembaga], [bpd], [area]] = await Promise.all([
    db
      .select({ total: count() })
      .from(perangkatDesa)
      .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.status, "aktif"))),
    db
      .select({ total: count() })
      .from(lembagaDesa)
      .where(and(eq(lembagaDesa.villageId, villageId), eq(lembagaDesa.status, "aktif"))),
    db
      .select({ total: count() })
      .from(lembagaAnggota)
      .innerJoin(
        lembagaDesa,
        and(eq(lembagaAnggota.lembagaId, lembagaDesa.id), eq(lembagaAnggota.villageId, villageId)),
      )
      .where(
        and(
          eq(lembagaAnggota.villageId, villageId),
          eq(lembagaAnggota.aktif, true),
          eq(lembagaDesa.status, "aktif"),
          eq(lembagaDesa.jenis, "bpd"),
        ),
      ),
    db
      .select({ total: count() })
      .from(areas)
      .where(and(eq(areas.villageId, villageId), eq(areas.enabled, 1))),
  ]);
  const [officials, institutions, wilayah] = await Promise.all([
    db
      .select({
        id: perangkatDesa.id,
        nama: perangkatDesa.nama,
        jabatan: jabatanPerangkat.nama,
        atasanId: perangkatDesa.atasanId,
        urut: perangkatDesa.urut,
      })
      .from(perangkatDesa)
      .leftJoin(
        jabatanPerangkat,
        and(
          eq(perangkatDesa.jabatanId, jabatanPerangkat.id),
          eq(jabatanPerangkat.villageId, villageId),
        ),
      )
      .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.status, "aktif")))
      .orderBy(asc(perangkatDesa.urut)),
    db
      .select({
        id: lembagaDesa.id,
        nama: lembagaDesa.nama,
        jenis: lembagaDesa.jenis,
        status: lembagaDesa.status,
      })
      .from(lembagaDesa)
      .where(eq(lembagaDesa.villageId, villageId))
      .orderBy(asc(lembagaDesa.urut)),
    db
      .select({ dusun: regions.dusun, rt: regions.rt, rw: regions.rw })
      .from(regions)
      .where(eq(regions.villageId, villageId)),
  ]);
  return {
    totalPerangkat: perangkat?.total ?? 0,
    totalLembaga: lembaga?.total ?? 0,
    totalBpd: bpd?.total ?? 0,
    totalArea: area?.total ?? 0,
    perangkat: officials,
    lembaga: institutions,
    wilayah,
  };
}

export async function listPerangkat(villageId: number) {
  return db
    .select({
      id: perangkatDesa.id,
      nama: perangkatDesa.nama,
      gelarDepan: perangkatDesa.gelarDepan,
      gelarBelakang: perangkatDesa.gelarBelakang,
      nip: perangkatDesa.nip,
      nik: perangkatDesa.nik,
      jabatanId: perangkatDesa.jabatanId,
      jabatan: jabatanPerangkat.nama,
      jenisKelamin: perangkatDesa.jenisKelamin,
      tempatLahir: perangkatDesa.tempatLahir,
      tanggalLahir: perangkatDesa.tanggalLahir,
      foto: perangkatDesa.foto,
      status: perangkatDesa.status,
      periode: perangkatDesa.periode,
      pendidikan: perangkatDesa.pendidikan,
      telepon: perangkatDesa.telepon,
      email: perangkatDesa.email,
      alamat: perangkatDesa.alamat,
      nomorSkPengangkatan: perangkatDesa.nomorSkPengangkatan,
      tanggalPengangkatan: perangkatDesa.tanggalPengangkatan,
      nomorSkPemberhentian: perangkatDesa.nomorSkPemberhentian,
      tanggalPemberhentian: perangkatDesa.tanggalPemberhentian,
      atasanId: perangkatDesa.atasanId,
      urut: perangkatDesa.urut,
    })
    .from(perangkatDesa)
    .leftJoin(
      jabatanPerangkat,
      and(
        eq(perangkatDesa.jabatanId, jabatanPerangkat.id),
        eq(jabatanPerangkat.villageId, villageId),
      ),
    )
    .where(eq(perangkatDesa.villageId, villageId))
    .orderBy(asc(perangkatDesa.urut), asc(perangkatDesa.id));
}

export async function listJabatanRingkas(villageId: number) {
  return db
    .select({ id: jabatanPerangkat.id, nama: jabatanPerangkat.nama })
    .from(jabatanPerangkat)
    .where(eq(jabatanPerangkat.villageId, villageId))
    .orderBy(asc(jabatanPerangkat.urut));
}

export async function listRiwayatJabatan(villageId: number) {
  return db
    .select()
    .from(perangkatRiwayatJabatan)
    .where(eq(perangkatRiwayatJabatan.villageId, villageId))
    .orderBy(asc(perangkatRiwayatJabatan.mulai));
}

export async function listDokumenPemerintahan(villageId: number) {
  return db
    .select()
    .from(pemerintahanDokumen)
    .where(eq(pemerintahanDokumen.villageId, villageId))
    .orderBy(asc(pemerintahanDokumen.tanggal));
}

export async function getPerangkatByNik(villageId: number, nik: string, excludeId: number | null) {
  const [row] = await db
    .select({ id: perangkatDesa.id })
    .from(perangkatDesa)
    .where(
      and(
        eq(perangkatDesa.villageId, villageId),
        eq(perangkatDesa.nik, nik),
        ...(excludeId ? [ne(perangkatDesa.id, excludeId)] : []),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPerangkatByNip(villageId: number, nip: string, excludeId: number | null) {
  const [row] = await db
    .select({ id: perangkatDesa.id })
    .from(perangkatDesa)
    .where(
      and(
        eq(perangkatDesa.villageId, villageId),
        eq(perangkatDesa.nip, nip),
        ...(excludeId ? [ne(perangkatDesa.id, excludeId)] : []),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPerangkat(villageId: number, id: number) {
  const [row] = await db
    .select({
      id: perangkatDesa.id,
      foto: perangkatDesa.foto,
      atasanId: perangkatDesa.atasanId,
      status: perangkatDesa.status,
    })
    .from(perangkatDesa)
    .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getJabatan(villageId: number, id: number) {
  const [row] = await db
    .select({ id: jabatanPerangkat.id })
    .from(jabatanPerangkat)
    .where(and(eq(jabatanPerangkat.villageId, villageId), eq(jabatanPerangkat.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertPerangkat(villageId: number, values: PerangkatValues) {
  await db.insert(perangkatDesa).values({ ...values, villageId });
}

export async function updatePerangkat(
  villageId: number,
  id: number,
  values: Partial<PerangkatValues>,
) {
  await db
    .update(perangkatDesa)
    .set(values)
    .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.id, id)));
}

export async function clearAtasanPerangkat(villageId: number, atasanId: number) {
  await db
    .update(perangkatDesa)
    .set({ atasanId: null })
    .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.atasanId, atasanId)));
}

export async function deletePerangkat(villageId: number, id: number) {
  await db
    .delete(perangkatDesa)
    .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.id, id)));
}

export async function listBerkasDokumen(
  villageId: number,
  owner: { perangkatId: number } | { lembagaId: number },
) {
  const condition =
    "perangkatId" in owner
      ? eq(pemerintahanDokumen.perangkatId, owner.perangkatId)
      : eq(pemerintahanDokumen.lembagaId, owner.lembagaId);
  return db
    .select({ berkas: pemerintahanDokumen.berkas })
    .from(pemerintahanDokumen)
    .where(and(eq(pemerintahanDokumen.villageId, villageId), condition));
}

export async function listLembaga(villageId: number) {
  return db
    .select()
    .from(lembagaDesa)
    .where(eq(lembagaDesa.villageId, villageId))
    .orderBy(asc(lembagaDesa.urut), asc(lembagaDesa.id));
}

export async function listAnggota(villageId: number) {
  return db
    .select()
    .from(lembagaAnggota)
    .where(eq(lembagaAnggota.villageId, villageId))
    .orderBy(asc(lembagaAnggota.urut), asc(lembagaAnggota.id));
}

export async function getLembaga(villageId: number, id: number) {
  const [row] = await db
    .select({ id: lembagaDesa.id })
    .from(lembagaDesa)
    .where(and(eq(lembagaDesa.villageId, villageId), eq(lembagaDesa.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertLembaga(villageId: number, values: LembagaValues) {
  await db.insert(lembagaDesa).values({ ...values, villageId });
}

export async function updateLembaga(villageId: number, id: number, values: LembagaValues) {
  await db
    .update(lembagaDesa)
    .set(values)
    .where(and(eq(lembagaDesa.villageId, villageId), eq(lembagaDesa.id, id)));
}

export async function deleteLembaga(villageId: number, id: number) {
  await db
    .delete(lembagaDesa)
    .where(and(eq(lembagaDesa.villageId, villageId), eq(lembagaDesa.id, id)));
}

export async function getAnggota(villageId: number, id: number) {
  const [row] = await db
    .select({ id: lembagaAnggota.id, foto: lembagaAnggota.foto })
    .from(lembagaAnggota)
    .where(and(eq(lembagaAnggota.villageId, villageId), eq(lembagaAnggota.id, id)))
    .limit(1);
  return row ?? null;
}

export async function listFotoAnggota(villageId: number, lembagaId: number) {
  return db
    .select({ foto: lembagaAnggota.foto })
    .from(lembagaAnggota)
    .where(and(eq(lembagaAnggota.villageId, villageId), eq(lembagaAnggota.lembagaId, lembagaId)));
}

export async function insertAnggota(villageId: number, values: AnggotaValues) {
  await db.insert(lembagaAnggota).values({ ...values, villageId });
}

export async function updateAnggota(villageId: number, id: number, values: AnggotaValues) {
  await db
    .update(lembagaAnggota)
    .set(values)
    .where(and(eq(lembagaAnggota.villageId, villageId), eq(lembagaAnggota.id, id)));
}

export async function deleteAnggota(villageId: number, id: number) {
  await db
    .delete(lembagaAnggota)
    .where(and(eq(lembagaAnggota.villageId, villageId), eq(lembagaAnggota.id, id)));
}

export async function listRegions(villageId: number) {
  return db
    .select()
    .from(regions)
    .where(eq(regions.villageId, villageId))
    .orderBy(asc(regions.sortOrder), asc(regions.dusun), asc(regions.rw), asc(regions.rt));
}

export async function listArea(villageId: number) {
  return db
    .select({
      id: areas.id,
      nama: areas.nama,
      desk: areas.desk,
      foto: areas.foto,
      enabled: areas.enabled,
      path: areas.path,
      refPolygon: areas.refPolygon,
      sortOrder: areas.sortOrder,
    })
    .from(areas)
    .where(eq(areas.villageId, villageId))
    .orderBy(asc(areas.sortOrder));
}

export async function listPolygon(villageId: number) {
  return db
    .select({
      id: polygons.id,
      nama: polygons.nama,
      color: polygons.color,
      enabled: polygons.enabled,
      sortOrder: polygons.sortOrder,
    })
    .from(polygons)
    .where(eq(polygons.villageId, villageId))
    .orderBy(asc(polygons.sortOrder));
}

export async function listPerangkatWilayah(villageId: number) {
  return db
    .select({
      id: perangkatDesa.id,
      nama: perangkatDesa.nama,
      jabatan: jabatanPerangkat.nama,
      atasanId: perangkatDesa.atasanId,
      status: perangkatDesa.status,
      urut: perangkatDesa.urut,
    })
    .from(perangkatDesa)
    .leftJoin(
      jabatanPerangkat,
      and(
        eq(perangkatDesa.jabatanId, jabatanPerangkat.id),
        eq(jabatanPerangkat.villageId, villageId),
      ),
    )
    .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.status, "aktif")))
    .orderBy(asc(perangkatDesa.urut));
}

export async function getProfilDesa(villageId: number) {
  const [row] = await db
    .select()
    .from(profilDesa)
    .where(eq(profilDesa.villageId, villageId))
    .limit(1);
  return row ?? null;
}

export async function getArea(villageId: number, id: number) {
  const [row] = await db
    .select({ id: areas.id, foto: areas.foto })
    .from(areas)
    .where(and(eq(areas.villageId, villageId), eq(areas.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getPolygon(villageId: number, id: number) {
  const [row] = await db
    .select({ id: polygons.id })
    .from(polygons)
    .where(and(eq(polygons.villageId, villageId), eq(polygons.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertArea(villageId: number, values: AreaValues) {
  await db.insert(areas).values({ ...values, villageId });
}

export async function updateArea(villageId: number, id: number, values: AreaValues) {
  await db
    .update(areas)
    .set(values)
    .where(and(eq(areas.villageId, villageId), eq(areas.id, id)));
}

export async function deleteArea(villageId: number, id: number) {
  await db.delete(areas).where(and(eq(areas.villageId, villageId), eq(areas.id, id)));
}

export async function countAreaByLayer(villageId: number, layerId: number) {
  const [row] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(and(eq(areas.villageId, villageId), eq(areas.refPolygon, layerId)))
    .limit(1);
  return row ?? null;
}

export async function insertPolygon(villageId: number, values: PolygonValues) {
  await db.insert(polygons).values({ ...values, villageId });
}

export async function updatePolygon(villageId: number, id: number, values: PolygonValues) {
  await db
    .update(polygons)
    .set(values)
    .where(and(eq(polygons.villageId, villageId), eq(polygons.id, id)));
}

export async function deletePolygon(villageId: number, id: number) {
  await db.delete(polygons).where(and(eq(polygons.villageId, villageId), eq(polygons.id, id)));
}

export async function getJabatanBySlug(villageId: number, slug: string) {
  const [row] = await db
    .select({ id: jabatanPerangkat.id })
    .from(jabatanPerangkat)
    .where(and(eq(jabatanPerangkat.villageId, villageId), eq(jabatanPerangkat.slug, slug)))
    .limit(1);
  return row ?? null;
}

export async function insertJabatan(
  villageId: number,
  values: { nama: string; slug: string; urut: number },
) {
  await db.insert(jabatanPerangkat).values({ ...values, villageId });
}

export async function updateJabatan(
  villageId: number,
  id: number,
  values: { nama: string; slug: string; urut: number },
) {
  await db
    .update(jabatanPerangkat)
    .set(values)
    .where(and(eq(jabatanPerangkat.villageId, villageId), eq(jabatanPerangkat.id, id)));
}

export async function deleteJabatan(villageId: number, id: number) {
  await db
    .delete(jabatanPerangkat)
    .where(and(eq(jabatanPerangkat.villageId, villageId), eq(jabatanPerangkat.id, id)));
}

export async function countPerangkatByJabatan(villageId: number, jabatanId: number) {
  const [row] = await db
    .select({ id: perangkatDesa.id })
    .from(perangkatDesa)
    .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.jabatanId, jabatanId)))
    .limit(1);
  return row ?? null;
}

export async function getRiwayat(villageId: number, id: number) {
  const [row] = await db
    .select({ id: perangkatRiwayatJabatan.id })
    .from(perangkatRiwayatJabatan)
    .where(
      and(eq(perangkatRiwayatJabatan.villageId, villageId), eq(perangkatRiwayatJabatan.id, id)),
    )
    .limit(1);
  return row ?? null;
}

export async function insertRiwayat(villageId: number, values: RiwayatValues) {
  await db.insert(perangkatRiwayatJabatan).values({ ...values, villageId });
}

export async function updateRiwayat(villageId: number, id: number, values: RiwayatValues) {
  await db
    .update(perangkatRiwayatJabatan)
    .set(values)
    .where(
      and(eq(perangkatRiwayatJabatan.villageId, villageId), eq(perangkatRiwayatJabatan.id, id)),
    );
}

export async function deleteRiwayat(villageId: number, id: number) {
  await db
    .delete(perangkatRiwayatJabatan)
    .where(
      and(eq(perangkatRiwayatJabatan.villageId, villageId), eq(perangkatRiwayatJabatan.id, id)),
    );
}

export async function getDokumen(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(pemerintahanDokumen)
    .where(and(eq(pemerintahanDokumen.villageId, villageId), eq(pemerintahanDokumen.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertDokumen(villageId: number, values: DokumenValues) {
  await db.insert(pemerintahanDokumen).values({ ...values, villageId });
}

export async function updateDokumen(villageId: number, id: number, values: DokumenValues) {
  await db
    .update(pemerintahanDokumen)
    .set(values)
    .where(and(eq(pemerintahanDokumen.villageId, villageId), eq(pemerintahanDokumen.id, id)));
}

export async function deleteDokumen(villageId: number, id: number) {
  await db
    .delete(pemerintahanDokumen)
    .where(and(eq(pemerintahanDokumen.villageId, villageId), eq(pemerintahanDokumen.id, id)));
}

export async function upsertProfilWilayah(villageId: number, values: ProfilWilayahValues) {
  const [existing] = await db
    .select({ id: profilDesa.id })
    .from(profilDesa)
    .where(eq(profilDesa.villageId, villageId))
    .limit(1);
  if (existing) {
    await db
      .update(profilDesa)
      .set(values)
      .where(and(eq(profilDesa.villageId, villageId), eq(profilDesa.id, existing.id)));
    return;
  }
  await db.insert(profilDesa).values({ ...values, villageId });
}

export async function getPerangkatStatus(villageId: number, id: number) {
  const [row] = await db
    .select({ status: perangkatDesa.status })
    .from(perangkatDesa)
    .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.id, id)))
    .limit(1);
  return row ?? null;
}

export async function getLembagaStatusPublik(villageId: number, id: number) {
  const [row] = await db
    .select({ status: lembagaDesa.status, tampilPublik: lembagaDesa.tampilPublik })
    .from(lembagaDesa)
    .where(and(eq(lembagaDesa.villageId, villageId), eq(lembagaDesa.id, id)))
    .limit(1);
  return row ?? null;
}

export async function listLembagaPublik(villageId: number) {
  return db
    .select({
      id: lembagaDesa.id,
      nama: lembagaDesa.nama,
      jenis: lembagaDesa.jenis,
      deskripsi: lembagaDesa.deskripsi,
      tugasFungsi: lembagaDesa.tugasFungsi,
      dasarHukum: lembagaDesa.dasarHukum,
      masaBaktiMulai: lembagaDesa.masaBaktiMulai,
      masaBaktiSelesai: lembagaDesa.masaBaktiSelesai,
    })
    .from(lembagaDesa)
    .where(
      and(
        eq(lembagaDesa.villageId, villageId),
        eq(lembagaDesa.status, "aktif"),
        eq(lembagaDesa.tampilPublik, true),
      ),
    )
    .orderBy(asc(lembagaDesa.urut), asc(lembagaDesa.id));
}

export async function listAnggotaPublik(villageId: number) {
  return db
    .select({
      id: lembagaAnggota.id,
      lembagaId: lembagaAnggota.lembagaId,
      nama: lembagaAnggota.nama,
      jabatan: lembagaAnggota.jabatan,
      foto: lembagaAnggota.foto,
      periodeMulai: lembagaAnggota.periodeMulai,
      periodeSelesai: lembagaAnggota.periodeSelesai,
    })
    .from(lembagaAnggota)
    .where(
      and(
        eq(lembagaAnggota.villageId, villageId),
        eq(lembagaAnggota.aktif, true),
        eq(lembagaAnggota.tampilPublik, true),
      ),
    )
    .orderBy(asc(lembagaAnggota.urut), asc(lembagaAnggota.id));
}

export async function listDokumenPublikByLembaga(villageId: number) {
  return db
    .select({
      id: pemerintahanDokumen.id,
      lembagaId: pemerintahanDokumen.lembagaId,
      judul: pemerintahanDokumen.judul,
      nomor: pemerintahanDokumen.nomor,
      tanggal: pemerintahanDokumen.tanggal,
    })
    .from(pemerintahanDokumen)
    .where(
      and(eq(pemerintahanDokumen.villageId, villageId), eq(pemerintahanDokumen.tampilPublik, true)),
    );
}

export async function listRiwayatPublikByPerangkat(villageId: number, perangkatId: number) {
  return db
    .select({
      id: perangkatRiwayatJabatan.id,
      jabatan: perangkatRiwayatJabatan.jabatan,
      nomorSk: perangkatRiwayatJabatan.nomorSk,
      mulai: perangkatRiwayatJabatan.mulai,
      selesai: perangkatRiwayatJabatan.selesai,
      keterangan: perangkatRiwayatJabatan.keterangan,
    })
    .from(perangkatRiwayatJabatan)
    .where(
      and(
        eq(perangkatRiwayatJabatan.villageId, villageId),
        eq(perangkatRiwayatJabatan.perangkatId, perangkatId),
        eq(perangkatRiwayatJabatan.tampilPublik, true),
      ),
    );
}

export async function listDokumenPublikByPerangkat(villageId: number, perangkatId: number) {
  return db
    .select({
      id: pemerintahanDokumen.id,
      judul: pemerintahanDokumen.judul,
      nomor: pemerintahanDokumen.nomor,
      tanggal: pemerintahanDokumen.tanggal,
    })
    .from(pemerintahanDokumen)
    .where(
      and(
        eq(pemerintahanDokumen.villageId, villageId),
        eq(pemerintahanDokumen.perangkatId, perangkatId),
        eq(pemerintahanDokumen.tampilPublik, true),
      ),
    );
}
