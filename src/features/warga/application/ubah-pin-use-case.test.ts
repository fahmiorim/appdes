import { beforeEach, describe, expect, it, vi } from "vitest";

import { PESAN_PIN_BERGANTI_STATUS_GAGAL, ubahPinWarga } from "./ubah-pin-use-case";

const { changePassword, clearMustChangePin, logError, logWarn } = vi.hoisted(() => ({
  changePassword: vi.fn(),
  clearMustChangePin: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

vi.mock("@/features/warga/infrastructure/warga-repository", () => ({ clearMustChangePin }));

vi.mock("@/lib/auth", () => ({ auth: { api: { changePassword } } }));

vi.mock("@/lib/dal", () => ({
  requireWarga: async () => ({ id: "user-1", residentId: 7, mustChangePin: true }),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "sukamaju.localhost" }),
}));

vi.mock("@/lib/logger", () => ({ logger: { warn: logWarn, error: logError } }));

const INPUT = { pinLama: "123456", pinBaru: "654321", konfirmasiPin: "654321" };

describe("ubahPinWarga", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mengganti PIN lewat better-auth lalu membersihkan penanda PIN sementara", async () => {
    changePassword.mockResolvedValue({ status: true });

    await ubahPinWarga(INPUT);

    expect(changePassword).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          currentPassword: "123456",
          newPassword: "654321",
          revokeOtherSessions: true,
        },
      }),
    );
    expect(clearMustChangePin).toHaveBeenCalledTimes(1);
    expect(clearMustChangePin).toHaveBeenCalledWith("user-1");
    expect(logError).not.toHaveBeenCalled();
  });

  it("menolak PIN lama yang salah tanpa menyentuh penanda PIN sementara", async () => {
    changePassword.mockRejectedValue(new Error("invalid password"));

    await expect(ubahPinWarga(INPUT)).rejects.toMatchObject({
      code: "VALIDATION",
      message: "PIN lama tidak sesuai. Pastikan PIN yang Anda masukkan benar.",
    });
    expect(clearMustChangePin).not.toHaveBeenCalled();
  });

  it("mencoba lagi ketika pembersihan penanda gagal sesaat", async () => {
    changePassword.mockResolvedValue({ status: true });
    clearMustChangePin
      .mockRejectedValueOnce(new Error("koneksi terputus"))
      .mockResolvedValueOnce(undefined);

    await ubahPinWarga(INPUT);

    expect(clearMustChangePin).toHaveBeenCalledTimes(2);
    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logError).not.toHaveBeenCalled();
  });

  it("melaporkan bahwa PIN sudah berganti ketika penanda tetap gagal dibersihkan", async () => {
    changePassword.mockResolvedValue({ status: true });
    clearMustChangePin.mockRejectedValue(new Error("database tidak tersedia"));

    await expect(ubahPinWarga(INPUT)).rejects.toMatchObject({
      code: "INTERNAL",
      message: PESAN_PIN_BERGANTI_STATUS_GAGAL,
    });

    expect(clearMustChangePin).toHaveBeenCalledTimes(3);
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
