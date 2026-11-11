import { beforeEach, describe, expect, it, vi } from "vitest";

import { kirimNotifikasi } from "./kirim-notifikasi";

const { values, kirimWa } = vi.hoisted(() => ({
  values: vi.fn(),
  kirimWa: vi.fn(),
}));

vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock("@/db", () => ({
  db: { insert: vi.fn(() => ({ values })) },
}));
vi.mock("@/db/schema/notifikasi-terkirim", () => ({ notifikasiTerkirim: {} }));
vi.mock("@/features/notifikasi/infrastructure/whatsapp-baileys", () => ({
  kirimPesanWhatsApp: kirimWa,
}));

beforeEach(() => {
  vi.clearAllMocks();
  values.mockResolvedValue(undefined);
});

describe("kirimNotifikasi WhatsApp (Baileys)", () => {
  it("mendelegasikan pengiriman lalu mencatat bukti sukses", async () => {
    kirimWa.mockResolvedValue({
      sukses: true,
      dilewati: false,
      respons: { id: "wa-1", jid: "628123456789@s.whatsapp.net" },
    });

    const hasil = await kirimNotifikasi({
      villageId: 7,
      residentId: 3,
      jenis: "permohonan.status",
      kanal: "whatsapp",
      target: "08123456789",
      pesan: "Permohonan Anda selesai.",
    });

    expect(kirimWa).toHaveBeenCalledWith("08123456789", "Permohonan Anda selesai.");
    expect(hasil).toEqual({ sukses: true, dilewati: false, error: undefined });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        villageId: 7,
        kanal: "whatsapp",
        target: "08123456789",
        sukses: true,
        dilewati: false,
        responsProvider: JSON.stringify({ id: "wa-1", jid: "628123456789@s.whatsapp.net" }),
      }),
    );
  });

  it("mencatat kegagalan pengiriman tanpa melempar", async () => {
    kirimWa.mockResolvedValue({
      sukses: false,
      dilewati: false,
      respons: null,
      pesanError: "Nomor WhatsApp tidak valid.",
    });

    const hasil = await kirimNotifikasi({
      villageId: 7,
      jenis: "permohonan.status",
      kanal: "whatsapp",
      target: "0812",
      pesan: "Status berubah.",
    });

    expect(hasil).toMatchObject({ sukses: false, dilewati: false });
    expect(hasil.error).toContain("tidak valid");
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ sukses: false, dilewati: false }),
    );
  });

  it("menandai pengiriman dilewati saat WhatsApp belum tertaut", async () => {
    kirimWa.mockResolvedValue({
      sukses: false,
      dilewati: true,
      respons: null,
      pesanError: "WhatsApp belum tertaut.",
    });

    const hasil = await kirimNotifikasi({
      villageId: 7,
      jenis: "permohonan.status",
      kanal: "whatsapp",
      target: "08123456789",
      pesan: "Status berubah.",
    });

    expect(hasil).toMatchObject({ sukses: false, dilewati: true });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ sukses: false, dilewati: true }));
  });

  it("tetap mengembalikan hasil pengiriman saat penyimpanan bukti gagal", async () => {
    kirimWa.mockResolvedValue({ sukses: true, dilewati: false, respons: { id: "wa-2" } });
    values.mockRejectedValueOnce(new Error("database down"));

    await expect(
      kirimNotifikasi({
        villageId: 7,
        jenis: "permohonan.status",
        kanal: "whatsapp",
        target: "08123456789",
        pesan: "Status berubah.",
      }),
    ).resolves.toEqual({ sukses: true, dilewati: false, error: undefined });
  });
});
