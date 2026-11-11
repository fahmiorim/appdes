import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticateApiKey } from "@/features/api-eksternal/domain/auth";
import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { ajukanSuratEksternalData } from "@/features/layanan-mandiri/application/eksternal-use-cases";
import { notFound } from "@/lib/errors";

import { POST } from "./route";

vi.mock("@/features/api-eksternal/domain/auth", () => ({ authenticateApiKey: vi.fn() }));
vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/features/rate-limit/application/rate-limit", () => ({
  batasiPermintaan: vi.fn(async () => ({ dibatasi: false, sisa: 99, resetMs: 60_000 })),
}));
vi.mock("@/features/layanan-mandiri/application/eksternal-use-cases", async (importOriginal) => {
  const asli = await importOriginal<Record<string, unknown>>();
  return { ...asli, ajukanSuratEksternalData: vi.fn() };
});

function permintaan(apiKey: string | null, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/eksternal/surat", {
    method: "POST",
    headers: { ...(apiKey ? { "X-API-Key": apiKey } : {}), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const BODY_VALID = {
  nik: "3201010101010001",
  letterTypeId: 3,
  isian: {},
  noHpAktif: "08123456789",
  keterangan: "Permohonan mitra",
  // Klien tidak boleh menentukan desa; route harus memakai desa dari API key.
  villageId: 999,
};

describe("POST /api/eksternal/surat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateApiKey).mockResolvedValue({
      ok: true,
      apiKey: { id: 4, villageId: 7 },
    } as never);
    vi.mocked(ajukanSuratEksternalData).mockResolvedValue({ id: 12, noAntrian: "A-012" });
  });

  it("menolak permintaan tanpa API key", async () => {
    const respons = await POST(permintaan(null, BODY_VALID));

    expect(respons.status).toBe(401);
    expect(ajukanSuratEksternalData).not.toHaveBeenCalled();
  });

  it("menolak API key tidak valid", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValueOnce({
      ok: false,
      status: 403,
      message: "Kunci API tidak aktif.",
    });

    const respons = await POST(permintaan("SID_salah", BODY_VALID));

    expect(respons.status).toBe(403);
    expect(ajukanSuratEksternalData).not.toHaveBeenCalled();
  });

  it("memakai villageId dari API key dan mengabaikan villageId klien", async () => {
    const respons = await POST(permintaan("SID_benar", BODY_VALID));

    expect(respons.status).toBe(201);
    expect(ajukanSuratEksternalData).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ nik: "3201010101010001", letterTypeId: 3 }),
      expect.any(Map),
    );
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ villageId: 7, resource: "permohonan-surat", resourceId: "12" }),
    );
  });

  it("menolak NIK yang bukan 16 angka", async () => {
    const respons = await POST(permintaan("SID_benar", { ...BODY_VALID, nik: "123" }));

    expect(respons.status).toBe(400);
    expect(ajukanSuratEksternalData).not.toHaveBeenCalled();
  });

  it("memetakan jenis surat yang tidak ditemukan menjadi 404", async () => {
    vi.mocked(ajukanSuratEksternalData).mockRejectedValueOnce(notFound("Jenis surat tidak ada."));

    const respons = await POST(permintaan("SID_benar", BODY_VALID));

    expect(respons.status).toBe(404);
  });
});
