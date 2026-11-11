import { beforeEach, describe, expect, it, vi } from "vitest";

import * as resolveVillage from "@/features/desa/application/resolve-village";
import {
  createArea,
  createCdesaMutasi,
  createPersil,
  createPoint,
  createPolygon,
  createSimbol,
  deletePersil,
  listAllPolygonUseCases,
  listPolygonUseCases,
  updateCdesa,
  updateCdesaMutasi,
  updateGaris,
} from "@/features/gis/application/use-cases";
import {
  AREA_RESOURCE,
  PERTANAHAN_RESOURCE,
  SIMBOL_RESOURCE,
  type AreaFormInput,
  type CdesaDTO,
  type GarisFormInput,
  type PointFormInput,
  type PolygonDTO,
  type PolygonFormInput,
} from "@/features/gis/domain/gis";
import * as gisRepo from "@/features/gis/infrastructure/gis-repository";
import * as dal from "@/lib/dal";
import type { CurrentUser } from "@/lib/dal";

vi.mock("@/lib/dal", () => ({
  requireUser: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: vi.fn(),
  getIdentitasFromRequest: vi.fn(),
}));

vi.mock("@/features/gis/infrastructure/gis-repository", () => ({
  listPolygons: vi.fn(),
  listAllPolygons: vi.fn(),
  findPolygonById: vi.fn(),
  insertPolygon: vi.fn(),
  updatePolygon: vi.fn(),
  deletePolygon: vi.fn(),
  listAreas: vi.fn(),
  findAreaById: vi.fn(),
  insertArea: vi.fn(),
  updateArea: vi.fn(),
  deleteArea: vi.fn(),
  listGaris: vi.fn(),
  findGarisById: vi.fn(),
  insertGaris: vi.fn(),
  updateGaris: vi.fn(),
  deleteGaris: vi.fn(),
  listPoints: vi.fn(),
  findPointById: vi.fn(),
  insertPoint: vi.fn(),
  updatePoint: vi.fn(),
  deletePoint: vi.fn(),
  listSimbol: vi.fn(),
  insertSimbol: vi.fn(),
  updateSimbol: vi.fn(),
  deleteSimbol: vi.fn(),
  listPersil: vi.fn(),
  findPersilById: vi.fn(),
  insertPersil: vi.fn(),
  updatePersil: vi.fn(),
  deletePersil: vi.fn(),
  listCdesa: vi.fn(),
  findCdesaById: vi.fn(),
  insertCdesa: vi.fn(),
  deleteCdesa: vi.fn(),
  listCdesaMutasi: vi.fn(),
  findCdesaMutasiById: vi.fn(),
  insertCdesaMutasi: vi.fn(),
  updateCdesaMutasi: vi.fn(),
  deleteCdesaMutasi: vi.fn(),
  updateCdesa: vi.fn(),
}));

describe("gis use-cases: polygon", () => {
  const baseUser = {
    id: "1",
    name: "Admin",
    username: null,
    email: "admin@test",
    image: null,
    villageId: null,
    roleId: null,
    residentId: null,
    mustChangePin: false,
    permissions: { isSuperadmin: false, levelByResource: new Map() },
  } as CurrentUser;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requireUser).mockResolvedValue(baseUser);
    vi.mocked(dal.requirePermission).mockResolvedValue({} as never);
    vi.mocked(resolveVillage.resolveVillageId).mockResolvedValue(10);
  });

  it("listPolygonUseCases menerapkan tenant isolation (hanya desa terpilih)", async () => {
    vi.mocked(gisRepo.listPolygons).mockResolvedValue([]);
    const res = await listPolygonUseCases();
    expect(resolveVillage.resolveVillageId).toHaveBeenCalledWith(baseUser);
    expect(gisRepo.listPolygons).toHaveBeenCalledWith(10);
    expect(res).toEqual([]);
  });

  it("listAllPolygonUseCases mengembalikan semua polygon untuk desa", async () => {
    vi.mocked(gisRepo.listAllPolygons).mockResolvedValue([]);
    await listAllPolygonUseCases();
    expect(gisRepo.listAllPolygons).toHaveBeenCalledWith(10);
  });

  it("createPolygon memeriksa parent polygon di desa yang sama", async () => {
    const mockPolygon: PolygonDTO = {
      id: 1,
      villageId: 10,
      nama: "Parent",
      simbol: null,
      color: null,
      tipe: 0,
      parrent: null,
      enabled: 1,
      sortOrder: 0,
    };
    vi.mocked(gisRepo.findPolygonById).mockResolvedValue(mockPolygon);
    vi.mocked(gisRepo.insertPolygon).mockResolvedValue(5);

    const input = {
      nama: "X",
      simbol: null,
      color: null,
      tipe: 0,
      parrent: 1,
      enabled: 1,
      sortOrder: 0,
    } as unknown as PolygonFormInput;
    const res = await createPolygon(input);
    expect(gisRepo.findPolygonById).toHaveBeenCalledWith(10, 1);
    expect(gisRepo.insertPolygon).toHaveBeenCalledWith(10, expect.objectContaining({ nama: "X" }));
    expect(res).toEqual({ id: 5 });
  });
});

describe("gis use-cases: layer & pertanahan", () => {
  const baseUser = {
    id: "1",
    name: "Admin",
    username: null,
    email: "admin@test",
    image: null,
    villageId: null,
    roleId: null,
    residentId: null,
    mustChangePin: false,
    permissions: { isSuperadmin: false, levelByResource: new Map() },
  } as CurrentUser;

  const polygonRow: PolygonDTO = {
    id: 1,
    villageId: 10,
    nama: "Permukiman",
    simbol: null,
    color: "#3b82f6",
    tipe: 0,
    parrent: null,
    enabled: 1,
    sortOrder: 0,
  };

  const cdesaRow: CdesaDTO = {
    id: 7,
    villageId: 10,
    nomor: "C-01",
    nomorPersil: "P-01",
    nomorSertifikat: null,
    tanggal: null,
    namaPemegang: "Budi",
    luas: 100,
    keterangan: null,
    sortOrder: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requireUser).mockResolvedValue(baseUser);
    vi.mocked(dal.requirePermission).mockResolvedValue({} as never);
    vi.mocked(resolveVillage.resolveVillageId).mockResolvedValue(10);
  });

  it("createArea memvalidasi polygon rujukan di desa sendiri", async () => {
    vi.mocked(gisRepo.findPolygonById).mockResolvedValue(polygonRow);
    vi.mocked(gisRepo.insertArea).mockResolvedValue(21);

    const input: AreaFormInput = {
      nama: "Blok A",
      refPolygon: 1,
      path: null,
      foto: null,
      desk: null,
      sortOrder: 0,
    };

    await expect(createArea(input)).resolves.toEqual({ id: 21 });
    expect(gisRepo.findPolygonById).toHaveBeenCalledWith(10, 1);
    expect(gisRepo.insertArea).toHaveBeenCalledWith(10, input);
    expect(dal.requirePermission).toHaveBeenCalledWith(AREA_RESOURCE, "update");
  });

  it("createArea menolak polygon yang tidak ditemukan", async () => {
    vi.mocked(gisRepo.findPolygonById).mockResolvedValue(null);

    await expect(
      createArea({
        nama: "Blok",
        refPolygon: 99,
        path: null,
        foto: null,
        desk: null,
        sortOrder: 0,
      }),
    ).rejects.toThrow();
    expect(gisRepo.insertArea).not.toHaveBeenCalled();
  });

  it("updateGaris menolak garis menjadi induk dirinya sendiri", async () => {
    vi.mocked(gisRepo.findGarisById).mockResolvedValue({
      id: 5,
      villageId: 10,
      refLine: null,
      nama: "Jalan",
      path: null,
      foto: null,
      desk: null,
      enabled: 1,
      sortOrder: 0,
    });

    const input: GarisFormInput = {
      nama: "Jalan",
      refLine: 5,
      path: null,
      foto: null,
      desk: null,
      sortOrder: 0,
    };

    await expect(updateGaris(5, input)).rejects.toThrow();
    expect(gisRepo.updateGaris).not.toHaveBeenCalled();
  });

  it("createPoint memvalidasi layer polygon", async () => {
    vi.mocked(gisRepo.findPolygonById).mockResolvedValue(null);
    const input: PointFormInput = {
      nama: "Kantor",
      simbol: null,
      tipe: 0,
      parrent: 3,
      path: null,
    };

    await expect(createPoint(input)).rejects.toThrow();
    expect(gisRepo.insertPoint).not.toHaveBeenCalled();
  });

  it("createSimbol memakai izin katalog simbol", async () => {
    vi.mocked(gisRepo.insertSimbol).mockResolvedValue(9);

    await expect(createSimbol({ simbol: "Balai Desa", desk: null, sortOrder: 0 })).resolves.toEqual(
      { id: 9 },
    );
    expect(dal.requirePermission).toHaveBeenCalledWith(SIMBOL_RESOURCE, "update");
  });

  it("createPersil menyimpan untuk desa pengguna", async () => {
    vi.mocked(gisRepo.insertPersil).mockResolvedValue(31);
    const input = {
      nomor: "P-01",
      nomorCdesa: null,
      luas: 100,
      status: "milik",
      path: null,
      keterangan: null,
    };

    await expect(createPersil(input)).resolves.toEqual({ id: 31 });
    expect(gisRepo.insertPersil).toHaveBeenCalledWith(10, input);
    expect(dal.requirePermission).toHaveBeenCalledWith(PERTANAHAN_RESOURCE, "update");
  });

  it("deletePersil menolak persil yang tidak ada di desa", async () => {
    vi.mocked(gisRepo.findPersilById).mockResolvedValue(null);

    await expect(deletePersil(99)).rejects.toThrow();
    expect(gisRepo.deletePersil).not.toHaveBeenCalled();
  });

  it("updateCdesa memeriksa kepemilikan lalu memperbarui", async () => {
    vi.mocked(gisRepo.findCdesaById).mockResolvedValue(cdesaRow);
    vi.mocked(gisRepo.updateCdesa).mockResolvedValue(true);

    await updateCdesa(7, {
      nomor: "C-01",
      nomorPersil: "P-01",
      nomorSertifikat: "S-01",
      tanggal: "2026-02-01",
      namaPemegang: "Budi",
      luas: 100,
      keterangan: null,
      sortOrder: 0,
    });

    expect(gisRepo.findCdesaById).toHaveBeenCalledWith(10, 7);
    expect(gisRepo.updateCdesa).toHaveBeenCalledWith(
      10,
      7,
      expect.objectContaining({ nomor: "C-01", nomorSertifikat: "S-01" }),
    );
  });

  it("updateCdesa menolak Cdesa desa lain", async () => {
    vi.mocked(gisRepo.findCdesaById).mockResolvedValue(null);

    await expect(updateCdesa(7, { nomor: "C-01", luas: 1 })).rejects.toThrow();
    expect(gisRepo.updateCdesa).not.toHaveBeenCalled();
  });

  it("createCdesaMutasi memvalidasi Cdesa induk", async () => {
    vi.mocked(gisRepo.findCdesaById).mockResolvedValue(null);

    await expect(
      createCdesaMutasi({
        cdesaId: 7,
        nomor: "M-01",
        tanggal: "2026-03-01",
        tipe: "jual",
      }),
    ).rejects.toThrow();
    expect(gisRepo.insertCdesaMutasi).not.toHaveBeenCalled();
  });

  it("createCdesaMutasi menyimpan dengan villageId sesi", async () => {
    vi.mocked(gisRepo.findCdesaById).mockResolvedValue(cdesaRow);
    vi.mocked(gisRepo.insertCdesaMutasi).mockResolvedValue(41);

    await expect(
      createCdesaMutasi({
        cdesaId: 7,
        nomor: "M-01",
        tanggal: "2026-03-01",
        tipe: "jual",
        sortOrder: 0,
      }),
    ).resolves.toEqual({ id: 41 });
    expect(gisRepo.insertCdesaMutasi).toHaveBeenCalledWith(
      expect.objectContaining({ villageId: 10, cdesaId: 7, nomor: "M-01" }),
    );
  });

  it("updateCdesaMutasi menolak mutasi yang tidak ditemukan", async () => {
    vi.mocked(gisRepo.findCdesaMutasiById).mockResolvedValue(null);

    await expect(
      updateCdesaMutasi(41, {
        cdesaId: 7,
        nomor: "M-01",
        tanggal: "2026-03-01",
        tipe: "jual",
      }),
    ).rejects.toThrow();
    expect(gisRepo.updateCdesaMutasi).not.toHaveBeenCalled();
  });
});
