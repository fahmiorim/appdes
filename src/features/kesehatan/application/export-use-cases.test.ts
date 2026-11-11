import { describe, expect, it, vi } from "vitest";

import * as resolveVillage from "@/features/desa/application/resolve-village";
import {
  exportRekapBulananAnak,
  exportRekapIbuHamil,
} from "@/features/kesehatan/application/export-use-cases";
import * as kesehatanRepo from "@/features/kesehatan/infrastructure/kesehatan-repository";
import type { EffectivePermissions } from "@/features/rbac/application/authorization";
import * as dal from "@/lib/dal";
import type { CurrentUser } from "@/lib/dal";

vi.mock("@/lib/dal", () => ({
  verifySession: vi.fn(),
}));

vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: vi.fn(),
}));

vi.mock("@/features/kesehatan/infrastructure/kesehatan-repository", () => ({
  listIbuHamil: vi.fn(),
  listBulananAnak: vi.fn(),
}));

describe("export-use-cases", () => {
  const superadminPermissions: EffectivePermissions = {
    isSuperadmin: true,
    levelByResource: new Map(),
  };

  it("exportRekapIbuHamil throws when session is missing", async () => {
    vi.mocked(dal.verifySession).mockResolvedValueOnce(null as unknown as CurrentUser);
    await expect(exportRekapIbuHamil()).rejects.toThrow("Sesi Anda telah berakhir.");
  });

  it("exportRekapIbuHamil throws when user lacks permission", async () => {
    vi.mocked(dal.verifySession).mockResolvedValueOnce({
      user: { id: 1, name: "Test" },
      permissions: { isSuperadmin: false, levelByResource: new Map() },
    } as unknown as CurrentUser);

    await expect(exportRekapIbuHamil()).rejects.toThrow("Anda tidak memiliki hak akses.");
  });

  it("exportRekapIbuHamil builds valid CSV header and content", async () => {
    vi.mocked(dal.verifySession).mockResolvedValueOnce({
      user: { id: 1, name: "Test" },
      permissions: superadminPermissions,
    } as unknown as CurrentUser);

    vi.mocked(resolveVillage.resolveVillageId).mockResolvedValueOnce(1);
    vi.mocked(kesehatanRepo.listIbuHamil).mockResolvedValueOnce([
      {
        id: 1,
        villageId: 1,
        posyanduId: 10,
        kiaId: 5,
        statusKehamilan: 1,
        usiaKehamilan: 12,
        tanggalMelahirkan: "2026-11-01",
        pemeriksaanKehamilan: true,
        konsumsiPilFe: true,
        butirPilFe: 30,
        pemeriksaanNifas: false,
        konselingGizi: true,
        kunjunganRumah: false,
        aksesAirBersih: true,
        kepemilikanJamban: true,
        jaminanKesehatan: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await exportRekapIbuHamil();
    expect(result.filename).toContain("rekap-ibu-hamil-");
    expect(result.csv).toContain("Posyandu,Status Kehamilan");
    expect(result.csv).toContain('"10","Normal","12"');
  });

  it("exportRekapBulananAnak builds valid CSV header and content", async () => {
    vi.mocked(dal.verifySession).mockResolvedValueOnce({
      user: { id: 1, name: "Test" },
      permissions: superadminPermissions,
    } as unknown as CurrentUser);

    vi.mocked(resolveVillage.resolveVillageId).mockResolvedValueOnce(1);
    vi.mocked(kesehatanRepo.listBulananAnak).mockResolvedValueOnce([
      {
        id: 1,
        villageId: 1,
        posyanduId: 10,
        kiaId: 5,
        statusGizi: 1,
        umurBulan: 24,
        statusTikar: 4,
        pemberianImunisasiDasar: true,
        pemberianImunisasiCampak: null,
        pengukuranBeratBadan: true,
        beratBadan: 12.5,
        pengukuranTinggiBadan: true,
        tinggiBadan: 85,
        konselingGiziAyah: false,
        konselingGiziIbu: true,
        kunjunganRumah: false,
        airBersih: true,
        kepemilikanJamban: true,
        aktaLahir: true,
        jaminanKesehatan: true,
        pengasuhanPaud: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await exportRekapBulananAnak();
    expect(result.filename).toContain("rekap-bulanan-anak-");
    expect(result.csv).toContain("Posyandu,Umur (bulan)");
    expect(result.csv).toContain('"10","24","Sehat/Normal","Hijau"');
  });
});
