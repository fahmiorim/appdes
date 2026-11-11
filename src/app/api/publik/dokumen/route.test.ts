import { beforeEach, describe, expect, it, vi } from "vitest";

import { getTenantFromRequest } from "@/features/publik/api/middleware";
import { cariHalamanDokumenPublik } from "@/features/publik/application/dokumen-publik";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";

import { GET } from "./route";

vi.mock("@/features/rate-limit/application/rate-limit", () => ({
  batasiPermintaan: vi.fn(),
}));
vi.mock("@/features/publik/api/middleware", () => ({
  getTenantFromRequest: vi.fn(),
}));
vi.mock("@/features/audit/application/audit-use-cases", () => ({
  recordAuditEvent: vi.fn(),
}));
vi.mock("@/features/publik/application/dokumen-publik", () => ({
  cariHalamanDokumenPublik: vi.fn(),
}));

function request(query = ""): Request {
  return new Request(`https://desa.example.id/api/publik/dokumen${query}`, {
    headers: { "x-forwarded-for": "192.0.2.8" },
  });
}

describe("GET /api/publik/dokumen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(batasiPermintaan).mockResolvedValue({ dibatasi: false, sisa: 59, resetMs: 60_000 });
    vi.mocked(getTenantFromRequest).mockResolvedValue({ id: 17 } as never);
  });

  it("returns a bounded page with pagination metadata and keeps data as an array", async () => {
    vi.mocked(cariHalamanDokumenPublik).mockResolvedValueOnce({
      rows: [{ id: 3 }],
      total: 21,
      page: 2,
      pageSize: 10,
    } as never);

    const response = await GET(request("?kategori=produk_hukum&page=2&pageSize=10"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: [{ id: 3 }],
      pagination: { page: 2, pageSize: 10, totalItems: 21, totalPages: 3 },
    });
    expect(cariHalamanDokumenPublik).toHaveBeenCalledWith(17, {
      search: "",
      category: "produk_hukum",
      page: 2,
      pageSize: 10,
    });
  });

  it("rejects invalid pagination and categories before querying", async () => {
    const response = await GET(request("?kategori=unknown&page=1&pageSize=101"));

    expect(response.status).toBe(400);
    expect(cariHalamanDokumenPublik).not.toHaveBeenCalled();
  });
});
