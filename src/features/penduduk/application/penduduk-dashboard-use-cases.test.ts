import { beforeEach, describe, expect, it, vi } from "vitest";

import * as desa from "@/features/desa/application/resolve-village";
import * as pendudukRepo from "@/features/penduduk/infrastructure/penduduk-repository";
import * as referenceRepo from "@/features/penduduk/infrastructure/reference-repository";
import * as wilayahRepo from "@/features/wilayah/infrastructure/wilayah-repository";
import * as dal from "@/lib/dal";

import {
  getPendudukDetailData,
  getPendudukFilterOptionsData,
  getPendudukFormData,
  getRingkasanPendudukData,
} from "./use-cases";

vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn(), requireUser: vi.fn() }));
vi.mock("@/features/desa/application/resolve-village", () => ({ resolveVillageId: vi.fn() }));
vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/features/keluarga/application/catat-anggota-kk", () => ({
  catatPerubahanAnggotaKk: vi.fn(),
}));
vi.mock("@/features/penduduk/infrastructure/penduduk-repository", () => ({
  deletePenduduk: vi.fn(),
  findPendudukById: vi.fn(),
  findPendudukHidupByNik: vi.fn(),
  findPendudukOptionByNik: vi.fn(),
  getPendudukDetailById: vi.fn(),
  getRingkasanPenduduk: vi.fn(),
  headOfFamilyExists: vi.fn(),
  insertPenduduk: vi.fn(),
  listPenduduk: vi.fn(),
  listPendudukOptions: vi.fn(),
  nationalIdExists: vi.fn(),
  updatePenduduk: vi.fn(),
  validatePendudukTenantReferences: vi.fn(),
}));
vi.mock("@/features/penduduk/infrastructure/reference-repository", () => ({
  getPendudukReferenceData: vi.fn(),
}));
vi.mock("@/features/wilayah/infrastructure/wilayah-repository", () => ({
  listWilayahOptions: vi.fn(),
}));

const admin = { id: "u-admin", villageId: 7 } as never;

const referensiKosong = {
  religions: [],
  educations: [],
  occupations: [],
  maritalStatuses: [],
  familyRelations: [],
  bloodTypes: [],
  citizenships: [],
  families: [],
  regions: [],
  dusun: [],
  rw: [],
  rt: [],
};

describe("use case dashboard penduduk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requirePermission).mockResolvedValue(admin);
    vi.mocked(desa.resolveVillageId).mockResolvedValue(7);
  });

  it("membatasi KPI pada desa dari sesi", async () => {
    vi.mocked(pendudukRepo.getRingkasanPenduduk).mockResolvedValue({
      total: 10,
      lakiLaki: 6,
      perempuan: 4,
      keluarga: 5,
    });

    await expect(getRingkasanPendudukData()).resolves.toEqual({
      total: 10,
      lakiLaki: 6,
      perempuan: 4,
      keluarga: 5,
    });
    expect(dal.requirePermission).toHaveBeenCalledWith("penduduk", "read");
    expect(pendudukRepo.getRingkasanPenduduk).toHaveBeenCalledWith(7);
  });

  it("meneruskan desa sesi dan id ke detail, bukan desa dari pemanggil", async () => {
    vi.mocked(pendudukRepo.getPendudukDetailById).mockResolvedValue(null);

    await expect(getPendudukDetailData(99)).resolves.toBeNull();
    expect(pendudukRepo.getPendudukDetailById).toHaveBeenCalledWith(7, 99);
  });

  it("tidak menyentuh repository bila izin baca ditolak", async () => {
    vi.mocked(dal.requirePermission).mockRejectedValue(new Error("Akses ditolak"));

    await expect(getPendudukDetailData(99)).rejects.toThrow("Akses ditolak");
    expect(pendudukRepo.getPendudukDetailById).not.toHaveBeenCalled();
    expect(pendudukRepo.getRingkasanPenduduk).not.toHaveBeenCalled();
  });

  it("membuka form tambah hanya dengan izin update dan memakai desa sesi", async () => {
    vi.mocked(referenceRepo.getPendudukReferenceData).mockResolvedValue(referensiKosong);

    await expect(getPendudukFormData()).resolves.toEqual({
      references: referensiKosong,
      penduduk: null,
    });
    expect(dal.requirePermission).toHaveBeenCalledWith("penduduk", "create");
    expect(referenceRepo.getPendudukReferenceData).toHaveBeenCalledWith(7);
    expect(pendudukRepo.findPendudukById).not.toHaveBeenCalled();
  });

  it("mengambil data ubah dari desa sesi, bukan id dari klien", async () => {
    vi.mocked(referenceRepo.getPendudukReferenceData).mockResolvedValue(referensiKosong);
    vi.mocked(pendudukRepo.findPendudukById).mockResolvedValue({ id: 99 } as never);

    await expect(getPendudukFormData(99)).resolves.toMatchObject({ penduduk: { id: 99 } });
    expect(pendudukRepo.findPendudukById).toHaveBeenCalledWith(7, 99);
  });

  it("menolak id penduduk milik desa lain sebagai tidak ditemukan", async () => {
    vi.mocked(referenceRepo.getPendudukReferenceData).mockResolvedValue(referensiKosong);
    vi.mocked(pendudukRepo.findPendudukById).mockResolvedValue(null);

    await expect(getPendudukFormData(99)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("tidak menyentuh referensi bila izin update ditolak", async () => {
    vi.mocked(dal.requirePermission).mockRejectedValue(new Error("Akses ditolak"));

    await expect(getPendudukFormData(99)).rejects.toThrow("Akses ditolak");
    expect(pendudukRepo.findPendudukById).not.toHaveBeenCalled();
    expect(referenceRepo.getPendudukReferenceData).not.toHaveBeenCalled();
  });

  it("menyusun opsi wilayah unik dan terurut dari desa sesi", async () => {
    vi.mocked(wilayahRepo.listWilayahOptions).mockResolvedValue([
      { dusun: "Suka Maju", rw: "002", rt: "003" },
      { dusun: "Suka Maju", rw: "001", rt: "001" },
      { dusun: "", rw: "001", rt: "002" },
    ] as never);

    await expect(getPendudukFilterOptionsData()).resolves.toEqual({
      dusun: ["Suka Maju"],
      rw: ["001", "002"],
      rt: ["001", "002", "003"],
    });
    expect(wilayahRepo.listWilayahOptions).toHaveBeenCalledWith(7);
  });
});
