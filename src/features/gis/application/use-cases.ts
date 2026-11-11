import "server-only";

import {
  getIdentitasFromRequest,
  resolveVillageId,
} from "@/features/desa/application/resolve-village";
import {
  AREA_RESOURCE,
  cdesaMutasiSchema,
  cdesaSchema,
  GARIS_RESOURCE,
  PERTANAHAN_RESOURCE,
  POINT_RESOURCE,
  POLYGON_RESOURCE,
  SIMBOL_RESOURCE,
  type AreaDTO,
  type AreaFormInput,
  type CdesaDTO,
  type CdesaMutasiDTO,
  type GarisDTO,
  type GarisFormInput,
  type PersilDTO,
  type PersilFormInput,
  type PointDTO,
  type PointFormInput,
  type PolygonDTO,
  type PolygonFormInput,
  type SimbolDTO,
  type SimbolFormInput,
} from "@/features/gis/domain/gis";
import {
  deleteArea as repoDeleteArea,
  deleteCdesa as repoDeleteCdesa,
  deleteCdesaMutasi as repoDeleteCdesaMutasi,
  deleteGaris as repoDeleteGaris,
  deletePersil as repoDeletePersil,
  deletePoint as repoDeletePoint,
  deletePolygon as repoDeletePolygon,
  deleteSimbol as repoDeleteSimbol,
  findAreaById as repoFindAreaById,
  findCdesaById as repoFindCdesaById,
  findCdesaMutasiById as repoFindCdesaMutasiById,
  findGarisById as repoFindGarisById,
  findPersilById as repoFindPersilById,
  findPolygonById as repoFindPolygonById,
  insertArea as repoInsertArea,
  insertCdesa as repoInsertCdesa,
  insertCdesaMutasi as repoInsertCdesaMutasi,
  insertGaris as repoInsertGaris,
  insertPersil as repoInsertPersil,
  insertPoint as repoInsertPoint,
  insertPolygon as repoInsertPolygon,
  insertSimbol as repoInsertSimbol,
  listAllPolygons as repoListAllPolygons,
  listAreas as repoListAreas,
  listCdesa as repoListCdesa,
  listCdesaMutasi as repoListCdesaMutasi,
  listGaris as repoListGaris,
  listPersil as repoListPersil,
  listPoints as repoListPoints,
  listPolygons as repoListPolygons,
  listSimbol as repoListSimbol,
  updateArea as repoUpdateArea,
  updateCdesa as repoUpdateCdesa,
  updateCdesaMutasi as repoUpdateCdesaMutasi,
  updateGaris as repoUpdateGaris,
  updatePersil as repoUpdatePersil,
  updatePoint as repoUpdatePoint,
  updatePolygon as repoUpdatePolygon,
  updateSimbol as repoUpdateSimbol,
} from "@/features/gis/infrastructure/gis-repository";
import { requirePermission, requireUser } from "@/lib/dal";
import { notFound } from "@/lib/errors";

// --- Polygon ---------------------------------------------------------------

export async function listPolygonUseCases(): Promise<PolygonDTO[]> {
  const user = await requireUser();
  const resolvedVillageId = await resolveVillageId(user);
  await requirePermission(POLYGON_RESOURCE, "read");
  return repoListPolygons(resolvedVillageId);
}

export async function listAllPolygonUseCases(): Promise<PolygonDTO[]> {
  const user = await requireUser();
  const resolvedVillageId = await resolveVillageId(user);
  await requirePermission(POLYGON_RESOURCE, "read");
  return repoListAllPolygons(resolvedVillageId);
}

/** Data peta yang boleh ditampilkan kepada publik; tenant wajib ditentukan host. */
export async function getPetaPublik() {
  const { id: villageId } = await getIdentitasFromRequest();
  const [areas, garises, points, polygons] = await Promise.all([
    repoListAreas(villageId, true),
    repoListGaris(villageId, true),
    repoListPoints(villageId, true),
    repoListPolygons(villageId, true),
  ]);
  return { areas, garises, points, polygons };
}

export async function createPolygon(input: PolygonFormInput): Promise<{ id: number }> {
  const user = await requirePermission(POLYGON_RESOURCE, "update");
  const resolvedVillageId = await resolveVillageId(user);
  if (input.parrent !== null && input.parrent !== undefined) {
    const parent = await repoFindPolygonById(resolvedVillageId, input.parrent);
    if (!parent) throw notFound("Layer polygon induk tidak ditemukan.");
  }
  const id = await repoInsertPolygon(resolvedVillageId, input);
  return { id };
}

export async function updatePolygon(id: number, input: PolygonFormInput): Promise<void> {
  const user = await requirePermission(POLYGON_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const polygon = await repoFindPolygonById(villageId, id);
  if (!polygon) throw notFound();
  if (input.parrent !== null && input.parrent !== undefined) {
    if (input.parrent === id)
      throw notFound("Layer polygon tidak dapat menjadi induk dirinya sendiri.");
    const parent = await repoFindPolygonById(villageId, input.parrent);
    if (!parent) throw notFound("Layer polygon induk tidak ditemukan.");
  }
  await repoUpdatePolygon(villageId, id, input);
}

export async function deletePolygon(id: number): Promise<void> {
  const user = await requirePermission(POLYGON_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const polygon = await repoFindPolygonById(villageId, id);
  if (!polygon) throw notFound();
  await repoDeletePolygon(villageId, id);
}

// --- Area ------------------------------------------------------------------

export async function listAreaUseCases(): Promise<AreaDTO[]> {
  const user = await requirePermission(AREA_RESOURCE, "read");
  const resolvedVillageId = await resolveVillageId(user);
  return repoListAreas(resolvedVillageId);
}

export async function createArea(input: AreaFormInput): Promise<{ id: number }> {
  const user = await requireUser();
  const resolvedVillageId = await resolveVillageId(user);
  await requirePermission(AREA_RESOURCE, "update");
  if (input.refPolygon !== null && input.refPolygon !== undefined) {
    const polygon = await repoFindPolygonById(resolvedVillageId, input.refPolygon);
    if (!polygon) throw notFound("Kategori polygon tidak ditemukan.");
  }
  const id = await repoInsertArea(resolvedVillageId, input);
  return { id };
}

export async function updateArea(id: number, input: AreaFormInput): Promise<void> {
  const user = await requireUser();
  await requirePermission(AREA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const area = await repoFindAreaById(villageId, id);
  if (!area) throw notFound();
  if (input.refPolygon !== null && input.refPolygon !== undefined) {
    const polygon = await repoFindPolygonById(villageId, input.refPolygon);
    if (!polygon) throw notFound("Kategori polygon tidak ditemukan.");
  }
  await repoUpdateArea(villageId, id, input);
}

export async function deleteArea(id: number): Promise<void> {
  const user = await requireUser();
  await requirePermission(AREA_RESOURCE, "update");
  const area = await repoFindAreaById(await resolveVillageId(user), id);
  if (!area) throw notFound();
  await repoDeleteArea(await resolveVillageId(user), id);
}

// --- Garis -----------------------------------------------------------------

export async function listGarisUseCases(): Promise<GarisDTO[]> {
  const user = await requirePermission(GARIS_RESOURCE, "read");
  const resolvedVillageId = await resolveVillageId(user);
  return repoListGaris(resolvedVillageId);
}

export async function createGaris(input: GarisFormInput): Promise<{ id: number }> {
  const user = await requirePermission(GARIS_RESOURCE, "update");
  const resolvedVillageId = await resolveVillageId(user);
  if (input.refLine !== null && input.refLine !== undefined) {
    const parent = await repoFindGarisById(resolvedVillageId, input.refLine);
    if (!parent) throw notFound("Garis induk tidak ditemukan.");
  }
  const id = await repoInsertGaris(resolvedVillageId, input);
  return { id };
}

export async function updateGaris(id: number, input: GarisFormInput): Promise<void> {
  const user = await requirePermission(GARIS_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const garis = await repoFindGarisById(villageId, id);
  if (!garis) throw notFound();
  if (input.refLine !== null && input.refLine !== undefined) {
    if (input.refLine === id) throw notFound("Garis tidak dapat menjadi induk dirinya sendiri.");
    const parent = await repoFindGarisById(villageId, input.refLine);
    if (!parent) throw notFound("Garis induk tidak ditemukan.");
  }
  await repoUpdateGaris(villageId, id, input);
}

export async function deleteGaris(id: number): Promise<void> {
  const user = await requirePermission(GARIS_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const garis = await repoFindGarisById(villageId, id);
  if (!garis) throw notFound();
  await repoDeleteGaris(villageId, id);
}

// --- Point -----------------------------------------------------------------

export async function listPointUseCases(): Promise<PointDTO[]> {
  const user = await requirePermission(POINT_RESOURCE, "read");
  const resolvedVillageId = await resolveVillageId(user);
  return repoListPoints(resolvedVillageId);
}

export async function createPoint(input: PointFormInput): Promise<{ id: number }> {
  const user = await requirePermission(POINT_RESOURCE, "update");
  const resolvedVillageId = await resolveVillageId(user);
  if (input.parrent !== null && input.parrent !== undefined) {
    const parent = await repoFindPolygonById(resolvedVillageId, input.parrent);
    if (!parent) throw notFound("Layer polygon tidak ditemukan.");
  }
  const id = await repoInsertPoint(resolvedVillageId, input);
  return { id };
}

export async function updatePoint(id: number, input: PointFormInput): Promise<void> {
  const user = await requirePermission(POINT_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const existing = (await repoListPoints(villageId)).find((point) => point.id === id);
  if (!existing) throw notFound();
  if (input.parrent !== null && input.parrent !== undefined) {
    const parent = await repoFindPolygonById(villageId, input.parrent);
    if (!parent) throw notFound("Layer polygon tidak ditemukan.");
  }
  await repoUpdatePoint(villageId, id, input);
}

export async function deletePoint(id: number): Promise<void> {
  const user = await requirePermission(POINT_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const existing = (await repoListPoints(villageId)).find((point) => point.id === id);
  if (!existing) throw notFound();
  await repoDeletePoint(villageId, id);
}

// --- Simbol ----------------------------------------------------------------

export async function listSimbolUseCases(): Promise<SimbolDTO[]> {
  await requireUser();
  await requirePermission(SIMBOL_RESOURCE, "read");
  return repoListSimbol();
}

export async function createSimbol(input: SimbolFormInput): Promise<{ id: number }> {
  await requireUser();
  await requirePermission(SIMBOL_RESOURCE, "update");
  const id = await repoInsertSimbol(input);
  return { id };
}

export async function updateSimbol(id: number, input: SimbolFormInput): Promise<void> {
  await requireUser();
  await requirePermission(SIMBOL_RESOURCE, "update");
  await repoUpdateSimbol(id, input);
}

export async function deleteSimbol(id: number): Promise<void> {
  await requireUser();
  await requirePermission(SIMBOL_RESOURCE, "update");
  await repoDeleteSimbol(id);
}

// --- Persil & Pertanahan ---------------------------------------------------

export async function listPersilUseCases(): Promise<PersilDTO[]> {
  const user = await requirePermission(PERTANAHAN_RESOURCE, "read");
  const resolvedVillageId = await resolveVillageId(user);
  return repoListPersil(resolvedVillageId);
}

export async function createPersil(input: PersilFormInput): Promise<{ id: number }> {
  const user = await requirePermission(PERTANAHAN_RESOURCE, "update");
  const resolvedVillageId = await resolveVillageId(user);
  const id = await repoInsertPersil(resolvedVillageId, input);
  return { id };
}

export async function updatePersil(id: number, input: PersilFormInput): Promise<void> {
  const user = await requirePermission(PERTANAHAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const persil = await repoFindPersilById(villageId, id);
  if (!persil) throw notFound();
  await repoUpdatePersil(villageId, id, input);
}

export async function deletePersil(id: number): Promise<void> {
  const user = await requirePermission(PERTANAHAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const persil = await repoFindPersilById(villageId, id);
  if (!persil) throw notFound();
  await repoDeletePersil(villageId, id);
}

// --- CDesa (Laporan Pertanahan) -------------------------------------------

export async function listCdesaUseCases(): Promise<CdesaDTO[]> {
  const user = await requirePermission(PERTANAHAN_RESOURCE, "read");
  const resolvedVillageId = await resolveVillageId(user);
  return repoListCdesa(resolvedVillageId);
}

export async function createCdesa(input: unknown): Promise<{ id: number }> {
  const user = await requirePermission(PERTANAHAN_RESOURCE, "update");
  const resolvedVillageId = await resolveVillageId(user);
  const parsed = cdesaSchema.parse(input);
  const id = await repoInsertCdesa(resolvedVillageId, {
    id: 0,
    villageId: resolvedVillageId,
    nomor: parsed.nomor,
    nomorPersil: parsed.nomorPersil ?? null,
    nomorSertifikat: parsed.nomorSertifikat ?? null,
    tanggal: parsed.tanggal ?? null,
    namaPemegang: parsed.namaPemegang ?? null,
    luas: parsed.luas,
    keterangan: parsed.keterangan ?? null,
    sortOrder: parsed.sortOrder,
  });
  return { id };
}

export async function updateCdesa(id: number, input: unknown): Promise<void> {
  const user = await requirePermission(PERTANAHAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const existing = await repoFindCdesaById(villageId, id);
  if (!existing) throw notFound();

  const parsed = cdesaSchema.parse(input);
  const updated = await repoUpdateCdesa(villageId, id, {
    nomor: parsed.nomor,
    nomorPersil: parsed.nomorPersil ?? null,
    nomorSertifikat: parsed.nomorSertifikat ?? null,
    tanggal: parsed.tanggal ?? null,
    namaPemegang: parsed.namaPemegang ?? null,
    luas: parsed.luas,
    keterangan: parsed.keterangan ?? null,
    sortOrder: parsed.sortOrder,
  });
  if (!updated) throw notFound();
}

export async function deleteCdesa(id: number): Promise<void> {
  const user = await requirePermission(PERTANAHAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const cdesa = await repoFindCdesaById(villageId, id);
  if (!cdesa) throw notFound();
  await repoDeleteCdesa(villageId, id);
}

// --- CDesa Mutasi ---------------------------------------------------------

export async function listCdesaMutasiUseCases(): Promise<CdesaMutasiDTO[]> {
  const user = await requirePermission(PERTANAHAN_RESOURCE, "read");
  const resolvedVillageId = await resolveVillageId(user);
  return repoListCdesaMutasi(resolvedVillageId);
}

export async function createCdesaMutasi(input: unknown): Promise<{ id: number }> {
  const user = await requirePermission(PERTANAHAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const parsed = cdesaMutasiSchema.parse(input);
  const cdesa = await repoFindCdesaById(villageId, parsed.cdesaId);
  if (!cdesa) throw notFound("Data Cdesa tidak ditemukan.");
  const id = await repoInsertCdesaMutasi({ ...parsed, villageId });
  return { id };
}

export async function updateCdesaMutasi(id: number, input: unknown): Promise<void> {
  const user = await requirePermission(PERTANAHAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const existing = await repoFindCdesaMutasiById(villageId, id);
  if (!existing) throw notFound();

  const parsed = cdesaMutasiSchema.parse(input);
  const cdesa = await repoFindCdesaById(villageId, parsed.cdesaId);
  if (!cdesa) throw notFound("Data Cdesa tidak ditemukan.");

  const updated = await repoUpdateCdesaMutasi(villageId, id, {
    cdesaId: parsed.cdesaId,
    nomor: parsed.nomor,
    tanggal: parsed.tanggal,
    tipe: parsed.tipe,
    keterangan: parsed.keterangan ?? null,
    sortOrder: parsed.sortOrder,
  });
  if (!updated) throw notFound();
}

export async function deleteCdesaMutasi(id: number): Promise<void> {
  const user = await requirePermission(PERTANAHAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const existing = await repoFindCdesaMutasiById(villageId, id);
  if (!existing) throw notFound();
  await repoDeleteCdesaMutasi(villageId, id);
}
