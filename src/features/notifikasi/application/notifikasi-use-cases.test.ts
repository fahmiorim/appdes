import { beforeEach, describe, expect, it, vi } from "vitest";

import * as audit from "@/features/audit/application/audit-use-cases";
import * as dal from "@/lib/dal";

import * as repo from "../infrastructure/notifikasi-repository";
import * as kirim from "./kirim-notifikasi";
import { daftarNotifikasiAdmin, kirimNotifikasiManual } from "./notifikasi-use-cases";

vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn() }));
vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: vi.fn(async () => 4),
}));
vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("../infrastructure/notifikasi-repository", () => ({
  listNotifikasi: vi.fn(async () => []),
  ringkasanNotifikasi: vi.fn(async () => ({ total: 3, sukses: 1, gagal: 1, dilewati: 1 })),
}));
vi.mock("./kirim-notifikasi", () => ({ kirimNotifikasi: vi.fn() }));

describe("daftarNotifikasiAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requirePermission).mockResolvedValue({ id: "u-1" } as never);
  });

  it("memeriksa izin baca dan memakai desa sesi", async () => {
    const hasil = await daftarNotifikasiAdmin({ kanal: "email", status: "sukses" });

    expect(dal.requirePermission).toHaveBeenCalledWith("notifikasi", "read");
    expect(repo.listNotifikasi).toHaveBeenCalledWith(4, { kanal: "email", status: "sukses" });
    expect(hasil.ringkasan.total).toBe(3);
  });
});

describe("kirimNotifikasiManual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requirePermission).mockResolvedValue({ id: "u-1" } as never);
  });

  it("menolak pesan terlalu pendek sebelum mengirim", async () => {
    await expect(
      kirimNotifikasiManual({ kanal: "whatsapp", target: "08123456789", pesan: "hai" }),
    ).rejects.toThrow("minimal 5");

    expect(kirim.kirimNotifikasi).not.toHaveBeenCalled();
  });

  it("mengirim lewat kanal terpilih dan mencatat audit", async () => {
    vi.mocked(kirim.kirimNotifikasi).mockResolvedValueOnce({
      sukses: true,
      dilewati: false,
    });

    const hasil = await kirimNotifikasiManual({
      kanal: "email",
      target: "warga@contoh.id",
      subjek: "Pengumuman",
      pesan: "Rapat desa besok pukul 19.00.",
    });

    expect(dal.requirePermission).toHaveBeenCalledWith("notifikasi", "delete");
    expect(kirim.kirimNotifikasi).toHaveBeenCalledWith(
      expect.objectContaining({
        villageId: 4,
        jenis: "manual.broadcast",
        kanal: "email",
        target: "warga@contoh.id",
      }),
    );
    expect(audit.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "notifikasi.kirim", resource: "notifikasi" }),
    );
    expect(hasil.sukses).toBe(true);
  });
});
