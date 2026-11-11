import { beforeEach, describe, expect, it, vi } from "vitest";

import * as dal from "@/lib/dal";

import * as repo from "../infrastructure/pengaturan-repository";
import {
  ambilPengaturanAdmin,
  bacaPengaturan,
  simpanPengaturanAdmin,
} from "./pengaturan-use-cases";

vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: vi.fn(async () => 7),
}));

vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn() }));

vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));

vi.mock("../infrastructure/pengaturan-repository", () => ({
  listPengaturan: vi.fn(),
  simpanPengaturan: vi.fn(),
}));

describe("pengaturan use cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requirePermission).mockResolvedValue({ id: "u-1" } as never);
  });

  it("membaca bawaan saat desa belum punya baris", async () => {
    vi.mocked(repo.listPengaturan).mockResolvedValueOnce([]);

    const hasil = await bacaPengaturan(3);

    expect(repo.listPengaturan).toHaveBeenCalledWith(3);
    expect(hasil.beritaBeranda).toBe(5);
    expect(hasil.penomoranSurat).toBe(2);
  });

  it("memeriksa izin baca lalu memakai desa sesi", async () => {
    vi.mocked(repo.listPengaturan).mockResolvedValueOnce([
      { kunci: "web.komentar_aktif", nilai: "false" },
    ]);

    const hasil = await ambilPengaturanAdmin();

    expect(dal.requirePermission).toHaveBeenCalledWith("pengaturan", "read");
    expect(repo.listPengaturan).toHaveBeenCalledWith(7);
    expect(hasil.komentarAktif).toBe(false);
  });

  it("menyimpan nilai tervalidasi setelah izin ubah", async () => {
    const hasil = await simpanPengaturanAdmin({
      komentarAktif: false,
      beritaBeranda: 6,
      pendaftaranWargaAktif: true,
      penomoranSurat: 3,
    });

    expect(dal.requirePermission).toHaveBeenCalledWith("pengaturan", "update");
    expect(repo.simpanPengaturan).toHaveBeenCalledWith(7, [
      { kunci: "web.komentar_aktif", nilai: "false" },
      { kunci: "web.berita_beranda", nilai: "6" },
      { kunci: "mandiri.pendaftaran_warga", nilai: "true" },
      { kunci: "surat.penomoran_mode", nilai: "3" },
    ]);
    expect(hasil.beritaBeranda).toBe(6);
    expect(hasil.penomoranSurat).toBe(3);
  });

  it("menolak nilai di luar batas tanpa menyentuh repository", async () => {
    await expect(
      simpanPengaturanAdmin({
        komentarAktif: true,
        beritaBeranda: 40,
        pendaftaranWargaAktif: true,
        penomoranSurat: 2,
      }),
    ).rejects.toThrow("maksimal 12");

    expect(repo.simpanPengaturan).not.toHaveBeenCalled();
  });

  it("menolak penomoranSurat di luar batas", async () => {
    await expect(
      simpanPengaturanAdmin({
        komentarAktif: true,
        beritaBeranda: 5,
        pendaftaranWargaAktif: true,
        penomoranSurat: 5,
      }),
    ).rejects.toThrow();

    expect(repo.simpanPengaturan).not.toHaveBeenCalled();
  });
});
