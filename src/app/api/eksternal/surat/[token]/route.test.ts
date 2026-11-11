import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticateApiKey } from "@/features/api-eksternal/domain/auth";
import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { cariSuratEksternal } from "@/features/surat/application/verifikasi-publik";

import { GET } from "./route";

vi.mock("@/features/api-eksternal/domain/auth", () => ({ authenticateApiKey: vi.fn() }));
vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/features/rate-limit/application/rate-limit", () => ({
  batasiPermintaan: vi.fn(async () => ({ dibatasi: false, sisa: 99, resetMs: 60_000 })),
}));
vi.mock("@/features/surat/application/verifikasi-publik", () => ({
  cariSuratEksternal: vi.fn(),
}));

const TOKEN = "a".repeat(64);

function permintaan(token: string, apiKey: string | null = "SID_benar") {
  return new NextRequest(`http://localhost/api/eksternal/surat/${token}`, {
    headers: apiKey ? { "X-API-Key": apiKey } : {},
  });
}

function konteks(token: string) {
  return { params: Promise.resolve({ token }) };
}

describe("GET /api/eksternal/surat/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateApiKey).mockResolvedValue({
      ok: true,
      apiKey: { id: 4, villageId: 7, rateLimit: 100 },
    } as never);
    vi.mocked(cariSuratEksternal).mockResolvedValue(null);
  });

  it("memakai envelope galat yang sama saat API key tidak ada", async () => {
    const respons = await GET(permintaan(TOKEN, null), konteks(TOKEN));

    expect(respons.status).toBe(401);
    expect(await respons.json()).toEqual({ ok: false, error: "API Key missing" });
  });

  it("memakai envelope galat yang sama saat kunci ditolak", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValueOnce({
      ok: false,
      status: 403,
      message: "Kunci API tidak aktif.",
    });

    const respons = await GET(permintaan(TOKEN), konteks(TOKEN));

    expect(respons.status).toBe(403);
    expect(await respons.json()).toEqual({ ok: false, error: "Kunci API tidak aktif." });
  });

  it("menolak format token yang tidak sah dengan 400 berformat galat", async () => {
    const respons = await GET(permintaan("bukan-token"), konteks("bukan-token"));

    expect(respons.status).toBe(400);
    expect(await respons.json()).toEqual({ ok: false, error: "Invalid token format" });
    expect(cariSuratEksternal).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 berformat galat saat surat tidak ditemukan", async () => {
    const respons = await GET(permintaan(TOKEN), konteks(TOKEN));

    expect(respons.status).toBe(404);
    expect(await respons.json()).toEqual({ ok: false, error: "Surat tidak ditemukan" });
  });

  it("mengembalikan metadata surat tanpa data pribadi", async () => {
    vi.mocked(cariSuratEksternal).mockResolvedValueOnce({
      id: 9,
      number: "470/12/2026",
      issuedAt: new Date("2026-11-01T00:00:00.000Z"),
      status: "terbit",
      residentName: "Nama Warga",
    } as never);

    const respons = await GET(permintaan(TOKEN), konteks(TOKEN));

    expect(respons.status).toBe(200);
    expect(await respons.json()).toEqual({
      surat: {
        id: 9,
        nomor: "470/12/2026",
        tanggalTerbit: "2026-11-01T00:00:00.000Z",
        status: "terbit",
      },
    });
    expect(recordAuditEvent).toHaveBeenCalled();
  });
});
