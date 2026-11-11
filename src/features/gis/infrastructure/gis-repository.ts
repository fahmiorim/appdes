import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  areas,
  cdesa,
  cdesaMutasi,
  cdesaRincian,
  garis,
  gisSimbol,
  persil,
  points,
  polygons,
} from "@/db/schema";
import type {
  AreaDTO,
  AreaFormInput,
  CdesaDTO,
  CdesaMutasiDTO,
  CdesaMutasiInput,
  CdesaRincianDTO,
  GarisDTO,
  GarisFormInput,
  PersilDTO,
  PersilFormInput,
  PointDTO,
  PointFormInput,
  PolygonDTO,
  PolygonFormInput,
  SimbolDTO,
  SimbolFormInput,
} from "@/features/gis/domain/gis";

// --- Polygon ---------------------------------------------------------------

export async function listPolygons(villageId: number, publicOnly = false): Promise<PolygonDTO[]> {
  const rows = await db
    .select()
    .from(polygons)
    .where(
      publicOnly
        ? and(eq(polygons.villageId, villageId), eq(polygons.enabled, 1))
        : eq(polygons.villageId, villageId),
    )
    .orderBy(asc(polygons.sortOrder), asc(polygons.nama));
  return rows.map((r) => ({
    id: r.id,
    villageId: r.villageId,
    nama: r.nama,
    simbol: r.simbol,
    color: r.color,
    tipe: r.tipe,
    parrent: r.parrent,
    enabled: r.enabled,
    sortOrder: r.sortOrder,
  }));
}

export async function listAllPolygons(villageId: number): Promise<PolygonDTO[]> {
  const rows = await db
    .select()
    .from(polygons)
    .where(eq(polygons.villageId, villageId))
    .orderBy(asc(polygons.sortOrder), asc(polygons.nama));
  return rows.map((r) => ({
    id: r.id,
    villageId: r.villageId,
    nama: r.nama,
    simbol: r.simbol,
    color: r.color,
    tipe: r.tipe,
    parrent: r.parrent,
    enabled: r.enabled,
    sortOrder: r.sortOrder,
  }));
}

export async function insertPolygon(villageId: number, input: PolygonFormInput): Promise<number> {
  const [row] = await db
    .insert(polygons)
    .values({
      villageId,
      nama: input.nama,
      simbol: input.simbol ?? null,
      color: input.color ?? null,
      tipe: input.tipe,
      parrent: input.parrent ?? 1,
      enabled: input.enabled ? 1 : 0,
      sortOrder: input.sortOrder,
    })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan polygon.");
  return row.id;
}

export async function updatePolygon(
  villageId: number,
  id: number,
  input: PolygonFormInput,
): Promise<void> {
  await db
    .update(polygons)
    .set({
      nama: input.nama,
      simbol: input.simbol ?? null,
      color: input.color ?? null,
      tipe: input.tipe,
      parrent: input.parrent ?? 1,
      enabled: input.enabled ? 1 : 0,
      sortOrder: input.sortOrder,
    })
    .where(and(eq(polygons.id, id), eq(polygons.villageId, villageId)));
}

export async function deletePolygon(villageId: number, id: number): Promise<void> {
  await db.delete(polygons).where(and(eq(polygons.id, id), eq(polygons.villageId, villageId)));
}

export async function findPolygonById(villageId: number, id: number): Promise<PolygonDTO | null> {
  const [row] = await db
    .select()
    .from(polygons)
    .where(and(eq(polygons.id, id), eq(polygons.villageId, villageId)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    villageId: row.villageId,
    nama: row.nama,
    simbol: row.simbol,
    color: row.color,
    tipe: row.tipe,
    parrent: row.parrent,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
  };
}

// --- Area ------------------------------------------------------------------

export async function listAreas(villageId: number, publicOnly = false): Promise<AreaDTO[]> {
  const rows = await db
    .select()
    .from(areas)
    .where(
      publicOnly
        ? and(eq(areas.villageId, villageId), eq(areas.enabled, 1))
        : eq(areas.villageId, villageId),
    )
    .orderBy(asc(areas.sortOrder), asc(areas.nama));
  return rows.map((r) => ({
    id: r.id,
    villageId: r.villageId,
    refPolygon: r.refPolygon,
    nama: r.nama,
    path: r.path,
    foto: r.foto,
    desk: r.desk,
    enabled: r.enabled,
    sortOrder: r.sortOrder,
  }));
}

export async function insertArea(villageId: number, input: AreaFormInput): Promise<number> {
  const [row] = await db
    .insert(areas)
    .values({
      villageId,
      nama: input.nama,
      refPolygon: input.refPolygon ?? null,
      path: input.path ?? null,
      foto: input.foto ?? null,
      desk: input.desk ?? null,
      sortOrder: input.sortOrder,
    })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan area.");
  return row.id;
}

export async function updateArea(
  villageId: number,
  id: number,
  input: AreaFormInput,
): Promise<void> {
  await db
    .update(areas)
    .set({
      nama: input.nama,
      refPolygon: input.refPolygon ?? null,
      path: input.path ?? null,
      foto: input.foto ?? null,
      desk: input.desk ?? null,
      sortOrder: input.sortOrder,
    })
    .where(and(eq(areas.id, id), eq(areas.villageId, villageId)));
}

export async function deleteArea(villageId: number, id: number): Promise<void> {
  await db.delete(areas).where(and(eq(areas.id, id), eq(areas.villageId, villageId)));
}

export async function findAreaById(villageId: number, id: number): Promise<AreaDTO | null> {
  const [row] = await db
    .select()
    .from(areas)
    .where(and(eq(areas.id, id), eq(areas.villageId, villageId)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    villageId: row.villageId,
    refPolygon: row.refPolygon,
    nama: row.nama,
    path: row.path,
    foto: row.foto,
    desk: row.desk,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
  };
}

// --- Garis -----------------------------------------------------------------

export async function listGaris(villageId: number, publicOnly = false): Promise<GarisDTO[]> {
  const rows = await db
    .select()
    .from(garis)
    .where(
      publicOnly
        ? and(eq(garis.villageId, villageId), eq(garis.enabled, 1))
        : eq(garis.villageId, villageId),
    )
    .orderBy(asc(garis.sortOrder), asc(garis.nama));
  return rows.map((r) => ({
    id: r.id,
    villageId: r.villageId,
    refLine: r.refLine,
    nama: r.nama,
    path: r.path,
    foto: r.foto,
    desk: r.desk,
    enabled: r.enabled,
    sortOrder: r.sortOrder,
  }));
}

export async function insertGaris(villageId: number, input: GarisFormInput): Promise<number> {
  const [row] = await db
    .insert(garis)
    .values({
      villageId,
      nama: input.nama,
      refLine: input.refLine ?? null,
      path: input.path ?? null,
      foto: input.foto ?? null,
      desk: input.desk ?? null,
      sortOrder: input.sortOrder,
    })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan garis.");
  return row.id;
}

export async function updateGaris(
  villageId: number,
  id: number,
  input: GarisFormInput,
): Promise<void> {
  await db
    .update(garis)
    .set({
      nama: input.nama,
      refLine: input.refLine ?? null,
      path: input.path ?? null,
      foto: input.foto ?? null,
      desk: input.desk ?? null,
      sortOrder: input.sortOrder,
    })
    .where(and(eq(garis.id, id), eq(garis.villageId, villageId)));
}

export async function deleteGaris(villageId: number, id: number): Promise<void> {
  await db.delete(garis).where(and(eq(garis.id, id), eq(garis.villageId, villageId)));
}

// --- Point -----------------------------------------------------------------

export async function listPoints(villageId: number, publicOnly = false): Promise<PointDTO[]> {
  const rows = await db
    .select()
    .from(points)
    .where(
      publicOnly
        ? and(eq(points.villageId, villageId), eq(points.enabled, 1))
        : eq(points.villageId, villageId),
    )
    .orderBy(asc(points.nama));
  return rows.map((r) => ({
    id: r.id,
    villageId: r.villageId,
    nama: r.nama,
    simbol: r.simbol,
    tipe: r.tipe,
    parrent: r.parrent,
    path: r.path,
    enabled: r.enabled,
    sortOrder: r.sortOrder,
  }));
}

export async function insertPoint(villageId: number, input: PointFormInput): Promise<number> {
  const [row] = await db
    .insert(points)
    .values({
      villageId,
      nama: input.nama,
      simbol: input.simbol ?? null,
      tipe: input.tipe ?? 0,
      parrent: input.parrent ?? 1,
      path: input.path ?? null,
    })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan titik.");
  return row.id;
}

export async function updatePoint(
  villageId: number,
  id: number,
  input: PointFormInput,
): Promise<void> {
  await db
    .update(points)
    .set({
      nama: input.nama,
      simbol: input.simbol ?? null,
      tipe: input.tipe ?? 0,
      parrent: input.parrent ?? 1,
      path: input.path ?? null,
    })
    .where(and(eq(points.id, id), eq(points.villageId, villageId)));
}

export async function deletePoint(villageId: number, id: number): Promise<void> {
  await db.delete(points).where(and(eq(points.id, id), eq(points.villageId, villageId)));
}

// --- Simbol ----------------------------------------------------------------

export async function listSimbol(): Promise<SimbolDTO[]> {
  const rows = await db.select().from(gisSimbol).orderBy(asc(gisSimbol.sortOrder));
  return rows.map((r) => ({ id: r.id, simbol: r.simbol, desk: r.desk, sortOrder: r.sortOrder }));
}

export async function insertSimbol(input: SimbolFormInput): Promise<number> {
  const [row] = await db
    .insert(gisSimbol)
    .values({
      simbol: input.simbol,
      desk: input.desk ?? null,
      sortOrder: input.sortOrder,
    })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan simbol.");
  return row.id;
}

export async function updateSimbol(id: number, input: SimbolFormInput): Promise<void> {
  await db
    .update(gisSimbol)
    .set({
      simbol: input.simbol,
      desk: input.desk ?? null,
      sortOrder: input.sortOrder,
    })
    .where(eq(gisSimbol.id, id));
}

export async function deleteSimbol(id: number): Promise<void> {
  await db.delete(gisSimbol).where(eq(gisSimbol.id, id));
}

// --- Persil & Pertanahan ---------------------------------------------------

export async function listPersil(villageId: number): Promise<PersilDTO[]> {
  const rows = await db
    .select()
    .from(persil)
    .where(eq(persil.villageId, villageId))
    .orderBy(asc(persil.nomor));
  return rows.map((r) => ({
    id: r.id,
    villageId: r.villageId,
    nomor: r.nomor,
    nomorCdesa: r.nomorCdesa,
    luas: Number(r.luas),
    status: r.status,
    path: r.path,
    keterangan: r.keterangan,
    sortOrder: r.sortOrder,
  }));
}

export async function insertPersil(villageId: number, input: PersilFormInput): Promise<number> {
  const [row] = await db
    .insert(persil)
    .values({
      villageId,
      nomor: input.nomor,
      nomorCdesa: input.nomorCdesa ?? null,
      luas: input.luas.toFixed(2),
      status: input.status ?? "milik",
      path: input.path ?? null,
      keterangan: input.keterangan ?? null,
      sortOrder: 0,
    })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan persil.");
  return row.id;
}

export async function updatePersil(
  villageId: number,
  id: number,
  input: PersilFormInput,
): Promise<void> {
  await db
    .update(persil)
    .set({
      nomor: input.nomor,
      nomorCdesa: input.nomorCdesa ?? null,
      luas: input.luas.toFixed(2),
      status: input.status ?? "milik",
      path: input.path ?? null,
      keterangan: input.keterangan ?? null,
    })
    .where(and(eq(persil.id, id), eq(persil.villageId, villageId)));
}

export async function deletePersil(villageId: number, id: number): Promise<void> {
  await db.delete(persil).where(and(eq(persil.id, id), eq(persil.villageId, villageId)));
}

export async function findPersilById(villageId: number, id: number): Promise<PersilDTO | null> {
  const [row] = await db
    .select()
    .from(persil)
    .where(and(eq(persil.id, id), eq(persil.villageId, villageId)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    villageId: row.villageId,
    nomor: row.nomor,
    nomorCdesa: row.nomorCdesa,
    luas: Number(row.luas),
    status: row.status,
    path: row.path,
    keterangan: row.keterangan,
    sortOrder: row.sortOrder,
  };
}

// --- CDesa (Laporan Pertanahan) -------------------------------------------

export async function listCdesa(villageId: number): Promise<CdesaDTO[]> {
  const rows = await db
    .select()
    .from(cdesa)
    .where(eq(cdesa.villageId, villageId))
    .orderBy(asc(cdesa.nomor), desc(cdesa.id));
  return rows.map((r) => ({
    id: r.id,
    villageId: r.villageId,
    nomor: r.nomor,
    nomorPersil: r.nomorPersil,
    nomorSertifikat: r.nomorSertifikat,
    tanggal: r.tanggal,
    namaPemegang: r.namaPemegang,
    luas: Number(r.luas),
    keterangan: r.keterangan,
    sortOrder: r.sortOrder,
  }));
}

export async function insertCdesa(villageId: number, input: CdesaDTO): Promise<number> {
  const [row] = await db
    .insert(cdesa)
    .values({
      villageId,
      nomor: input.nomor,
      nomorPersil: input.nomorPersil ?? null,
      nomorSertifikat: input.nomorSertifikat ?? null,
      tanggal: input.tanggal ?? null,
      namaPemegang: input.namaPemegang ?? null,
      luas: input.luas.toFixed(2),
      keterangan: input.keterangan ?? null,
      sortOrder: input.sortOrder,
    })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan cdesa.");
  return row.id;
}

export async function updateCdesa(
  villageId: number,
  id: number,
  input: Omit<CdesaDTO, "id" | "villageId">,
): Promise<boolean> {
  const [result] = await db
    .update(cdesa)
    .set({
      nomor: input.nomor,
      nomorPersil: input.nomorPersil ?? null,
      nomorSertifikat: input.nomorSertifikat ?? null,
      tanggal: input.tanggal ?? null,
      namaPemegang: input.namaPemegang ?? null,
      luas: input.luas.toFixed(2),
      keterangan: input.keterangan ?? null,
      sortOrder: input.sortOrder,
    })
    .where(and(eq(cdesa.id, id), eq(cdesa.villageId, villageId)));

  return result.affectedRows > 0;
}

export async function deleteCdesa(villageId: number, id: number): Promise<void> {
  await db.delete(cdesa).where(and(eq(cdesa.id, id), eq(cdesa.villageId, villageId)));
}

export async function findGarisById(villageId: number, id: number): Promise<GarisDTO | null> {
  const [row] = await db
    .select()
    .from(garis)
    .where(and(eq(garis.id, id), eq(garis.villageId, villageId)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    villageId: row.villageId,
    refLine: row.refLine,
    nama: row.nama,
    path: row.path,
    foto: row.foto,
    desk: row.desk,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
  };
}

export async function listCdesaRincian(
  villageId: number,
  cdesaId: number,
): Promise<CdesaRincianDTO[]> {
  const rows = await db
    .select()
    .from(cdesaRincian)
    .where(and(eq(cdesaRincian.villageId, villageId), eq(cdesaRincian.cdesaId, cdesaId)))
    .orderBy(asc(cdesaRincian.id));
  return rows.map((r) => ({
    id: r.id,
    cdesaId: r.cdesaId,
    nama: r.nama,
    alamat: r.alamat,
    dllb: r.dllb,
    sortOrder: r.sortOrder,
  }));
}

// --- CDesa Mutasi ---------------------------------------------------------

export async function listCdesaMutasi(villageId: number): Promise<CdesaMutasiDTO[]> {
  const rows = await db
    .select()
    .from(cdesaMutasi)
    .where(eq(cdesaMutasi.villageId, villageId))
    .orderBy(desc(cdesaMutasi.tanggal));
  return rows.map((r) => ({
    id: r.id,
    villageId: r.villageId,
    cdesaId: r.cdesaId,
    nomor: r.nomor,
    tanggal: r.tanggal,
    tipe: r.tipe,
    keterangan: r.keterangan,
    sortOrder: r.sortOrder,
  }));
}

export async function findCdesaById(villageId: number, id: number): Promise<CdesaDTO | null> {
  const [row] = await db
    .select()
    .from(cdesa)
    .where(and(eq(cdesa.id, id), eq(cdesa.villageId, villageId)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    villageId: row.villageId,
    nomor: row.nomor,
    nomorPersil: row.nomorPersil,
    nomorSertifikat: row.nomorSertifikat,
    tanggal: row.tanggal,
    namaPemegang: row.namaPemegang,
    luas: Number(row.luas),
    keterangan: row.keterangan,
    sortOrder: row.sortOrder,
  };
}

export async function insertCdesaMutasi(input: CdesaMutasiInput): Promise<number> {
  const [row] = await db
    .insert(cdesaMutasi)
    .values({
      villageId: input.villageId,
      cdesaId: input.cdesaId,
      nomor: input.nomor,
      tanggal: input.tanggal,
      tipe: input.tipe,
      keterangan: input.keterangan ?? null,
      sortOrder: input.sortOrder,
    })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan mutasi.");
  return row.id;
}

export async function findCdesaMutasiById(
  villageId: number,
  id: number,
): Promise<CdesaMutasiDTO | null> {
  const [row] = await db
    .select()
    .from(cdesaMutasi)
    .where(and(eq(cdesaMutasi.id, id), eq(cdesaMutasi.villageId, villageId)))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    villageId: row.villageId,
    cdesaId: row.cdesaId,
    nomor: row.nomor,
    tanggal: row.tanggal,
    tipe: row.tipe,
    keterangan: row.keterangan,
    sortOrder: row.sortOrder,
  };
}

export async function updateCdesaMutasi(
  villageId: number,
  id: number,
  input: Omit<CdesaMutasiInput, "villageId">,
): Promise<boolean> {
  const [result] = await db
    .update(cdesaMutasi)
    .set({
      cdesaId: input.cdesaId,
      nomor: input.nomor,
      tanggal: input.tanggal,
      tipe: input.tipe,
      keterangan: input.keterangan ?? null,
      sortOrder: input.sortOrder,
    })
    .where(and(eq(cdesaMutasi.id, id), eq(cdesaMutasi.villageId, villageId)));

  return result.affectedRows > 0;
}

export async function deleteCdesaMutasi(villageId: number, id: number): Promise<void> {
  await db
    .delete(cdesaMutasi)
    .where(and(eq(cdesaMutasi.id, id), eq(cdesaMutasi.villageId, villageId)));
}
