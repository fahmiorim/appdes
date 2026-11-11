import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticateApiKey } from "@/features/api-eksternal/domain/auth";
import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { tandatanganiPdfTte } from "@/features/surat/application/tte-use-cases";

import { POST } from "./route";

vi.mock("@/features/api-eksternal/domain/auth", () => ({ authenticateApiKey: vi.fn() }));
vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/features/rate-limit/application/rate-limit", () => ({
  batasiPermintaan: vi.fn(async () => ({ dibatasi: false, sisa: 99, resetMs: 60_000 })),
}));
vi.mock("@/features/surat/application/tte-use-cases", () => ({
  tandatanganiPdfTte: vi.fn(),
}));

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

function formPdf(nama = "surat.pdf", isi = PDF): FormData {
  const form = new FormData();
  form.set("berkas", new File([isi], nama, { type: "application/pdf" }));
  form.set("nomor", "001/TTE/2026");
  return form;
}

function permintaan(apiKey: string | null, form: FormData = formPdf()): NextRequest {
  return new NextRequest("http://localhost/api/eksternal/tte/tanda-tangan", {
    method: "POST",
    body: form,
    headers: apiKey ? { "X-API-Key": apiKey } : undefined,
  });
}

describe("POST /api/eksternal/tte/tanda-tangan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateApiKey).mockResolvedValue({
      ok: true,
      apiKey: { id: 4, villageId: 7 },
    } as never);
    vi.mocked(tandatanganiPdfTte).mockResolvedValue({
      ok: true,
      mode: "bsre",
      suratId: 0,
      pdf: PDF,
    });
  });

  it("menolak permintaan tanpa API key", async () => {
    const respons = await POST(permintaan(null));

    expect(respons.status).toBe(401);
    expect(tandatanganiPdfTte).not.toHaveBeenCalled();
  });

  it("menolak API key yang tidak valid", async () => {
    vi.mocked(authenticateApiKey).mockResolvedValueOnce({
      ok: false,
      status: 403,
      message: "Kunci API tidak aktif.",
    });

    const respons = await POST(permintaan("SID_salah"));

    expect(respons.status).toBe(403);
    expect(tandatanganiPdfTte).not.toHaveBeenCalled();
  });

  it("memakai villageId dari API key, bukan input klien", async () => {
    const respons = await POST(permintaan("SID_benar"));

    expect(respons.status).toBe(200);
    expect(respons.headers.get("content-type")).toBe("application/pdf");
    expect(tandatanganiPdfTte).toHaveBeenCalledWith(
      expect.objectContaining({ villageId: 7, nomor: "001/TTE/2026" }),
    );
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ villageId: 7, resource: "surat-tte" }),
    );
  });

  it("menolak berkas yang bukan PDF sebelum memanggil provider", async () => {
    const respons = await POST(
      permintaan("SID_benar", formPdf("surat.txt", new Uint8Array([1, 2, 3]))),
    );

    expect(respons.status).toBe(415);
    expect(tandatanganiPdfTte).not.toHaveBeenCalled();
  });

  it("mengembalikan 422 saat provider TTE menolak", async () => {
    vi.mocked(tandatanganiPdfTte).mockResolvedValueOnce({
      ok: false,
      mode: "bsre",
      alasan: "provider down",
    });

    const respons = await POST(permintaan("SID_benar"));

    expect(respons.status).toBe(422);
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ villageId: 7, details: expect.objectContaining({ ok: false }) }),
    );
  });
});
