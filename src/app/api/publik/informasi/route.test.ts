import { beforeEach, describe, expect, it, vi } from "vitest";

import { getTenantFromRequest } from "@/features/publik/api/middleware";
import { cariHalamanDokumenPublik } from "@/features/publik/application/dokumen-publik";
import { daftarBerita, profilDesaPublik } from "@/features/publik/application/konten-publik";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";

import { GET } from "./route";

vi.mock("@/features/publik/api/middleware", () => ({
  getTenantFromRequest: vi.fn(),
}));
vi.mock("@/features/audit/application/audit-use-cases", () => ({
  recordAuditEvent: vi.fn(),
}));
vi.mock("@/features/publik/application/konten-publik", () => ({
  daftarBerita: vi.fn(),
  profilDesaPublik: vi.fn(),
}));
vi.mock("@/features/publik/application/dokumen-publik", () => ({
  cariHalamanDokumenPublik: vi.fn(),
}));
vi.mock("@/features/rate-limit/application/rate-limit", () => ({
  batasiPermintaan: vi.fn(),
}));

function request(): Request {
  return new Request("https://desa.example.id/api/publik/informasi", {
    headers: { "x-forwarded-for": "192.0.2.9" },
  });
}

describe("GET /api/publik/informasi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(batasiPermintaan).mockResolvedValue({ dibatasi: false, sisa: 59, resetMs: 60_000 });
    vi.mocked(getTenantFromRequest).mockResolvedValue({ id: 18 } as never);
    vi.mocked(daftarBerita).mockResolvedValue([]);
    vi.mocked(profilDesaPublik).mockResolvedValue(null);
    vi.mocked(cariHalamanDokumenPublik).mockResolvedValue({
      rows: [{ id: 4 }],
      total: 25,
      page: 1,
      pageSize: 20,
    } as never);
  });

  it("limits embedded documents and returns page metadata", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        profilDesa: null,
        berita: [],
        dokumen: [{ id: 4 }],
        dokumenPagination: { page: 1, pageSize: 20, totalItems: 25, totalPages: 2 },
      },
    });
    expect(cariHalamanDokumenPublik).toHaveBeenCalledWith(18, {
      search: "",
      category: "semua",
      page: 1,
      pageSize: 20,
    });
  });
});
