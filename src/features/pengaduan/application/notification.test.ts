import { describe, expect, it, vi } from "vitest";

import { formatStatusForNotifikasi, notifyStatusChange } from "./notification";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    RESEND_API_KEY: "re_test_key",
    RESEND_FROM: "SID Desa <pengaduan@example.test>",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: mocks.info, warn: mocks.warn },
}));

describe("formatStatusForNotifikasi", () => {
  it("memetakan setiap status domain ke label yang ditampilkan ke pelapor", () => {
    expect(formatStatusForNotifikasi("baru")).toBe("Baru");
    expect(formatStatusForNotifikasi("diproses")).toBe("Diproses");
    expect(formatStatusForNotifikasi("selesai")).toBe("Selesai");
    expect(formatStatusForNotifikasi("ditolak")).toBe("Ditolak");
  });
});

describe("notifyStatusChange", () => {
  it("mengirim label status dan sender yang dikonfigurasi", async () => {
    mocks.send.mockResolvedValue({ data: { id: "email-123" }, error: null });

    const result = await notifyStatusChange(
      "PGD-20261024-0001",
      "warga@example.test",
      "diproses",
      "baru",
    );
    const payload = mocks.send.mock.calls[0]?.[0];

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(payload.from).toBe("SID Desa <pengaduan@example.test>");
    expect(payload.html).toContain("<strong>Dari:</strong> Baru");
    expect(payload.html).toContain("<strong>Menjadi:</strong> Diproses");
  });

  it("melaporkan penolakan provider sebagai kegagalan, bukan sukses", async () => {
    mocks.send.mockResolvedValue({
      data: null,
      error: { message: "Domain belum terverifikasi", name: "invalid_from_address" },
    });

    const result = await notifyStatusChange(
      "PGD-20261024-0002",
      "warga@example.test",
      "ditolak",
      "baru",
    );

    expect(result.success).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.error).toBe("Domain belum terverifikasi");
  });
});
