import { beforeEach, describe, expect, it, vi } from "vitest";

import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";

import { jalankanApiPublik } from "./public-api";

vi.mock("@/features/publik/api/middleware", () => ({
  getTenantFromRequest: vi.fn(),
}));

vi.mock("@/features/audit/application/audit-use-cases", () => ({
  recordAuditEvent: vi.fn(),
}));
vi.mock("@/features/rate-limit/application/rate-limit", () => ({
  batasiPermintaan: vi.fn(),
}));

const middleware = await import("@/features/publik/api/middleware");
const audit = await import("@/features/audit/application/audit-use-cases");

function permintaan(ip = "10.0.0.1"): Request {
  return new Request("https://desa.example.id/api/publik/informasi", {
    headers: { "x-forwarded-for": ip, "user-agent": "vitest" },
  });
}

describe("jalankanApiPublik", () => {
  beforeEach(() => {
    vi.mocked(batasiPermintaan).mockResolvedValue({ dibatasi: false, sisa: 59, resetMs: 60_000 });
  });

  it("mengembalikan data dan mencatat audit saat berhasil", async () => {
    vi.mocked(middleware.getTenantFromRequest).mockResolvedValueOnce({
      id: 7,
      namaDesa: "Desa Uji",
    } as Awaited<ReturnType<typeof middleware.getTenantFromRequest>>);

    const respons = await jalankanApiPublik(permintaan(), "informasi", async () => ({
      jumlah: 1,
    }));

    expect(respons.status).toBe(200);
    expect(respons.headers.get("Cache-Control")).toBe("no-store");
    expect(await respons.json()).toEqual({ success: true, data: { jumlah: 1 } });
    expect(audit.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        villageId: 7,
        resource: "api-publik",
        resourceId: "informasi",
        ipAddress: "10.0.0.1",
      }),
    );
  });

  it("menambahkan metadata pagination tanpa mengubah data array", async () => {
    vi.mocked(middleware.getTenantFromRequest).mockResolvedValueOnce({
      id: 7,
      namaDesa: "Desa Uji",
    } as Awaited<ReturnType<typeof middleware.getTenantFromRequest>>);

    const respons = await jalankanApiPublik(
      permintaan(),
      "dokumen",
      async () => ({ rows: [{ id: 1 }], total: 21, page: 2, pageSize: 20 }),
      ({ rows, total, page, pageSize }) => ({
        data: rows,
        pagination: { page, pageSize, totalItems: total, totalPages: Math.ceil(total / pageSize) },
      }),
    );

    expect(await respons.json()).toEqual({
      success: true,
      data: [{ id: 1 }],
      pagination: { page: 2, pageSize: 20, totalItems: 21, totalPages: 2 },
    });
  });

  it("membalas 400 saat host tidak dikenali", async () => {
    vi.mocked(middleware.getTenantFromRequest).mockRejectedValueOnce(new Error("invalid host"));

    const respons = await jalankanApiPublik(permintaan(), "informasi", async () => ({}));

    expect(respons.status).toBe(400);
    expect(await respons.json()).toEqual({ success: false, error: "Desa tidak valid" });
    expect(audit.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("membalas 429 saat limiter bersama menolak permintaan", async () => {
    vi.mocked(batasiPermintaan).mockResolvedValueOnce({
      dibatasi: true,
      sisa: 0,
      resetMs: 60_000,
    });

    const respons = await jalankanApiPublik(permintaan("10.9.9.9"), "inventaris", async () => ({}));

    expect(respons.status).toBe(429);
    expect(audit.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("membalas 500 tanpa membocorkan detail saat pengambilan data gagal", async () => {
    vi.mocked(middleware.getTenantFromRequest).mockResolvedValueOnce({
      id: 7,
      namaDesa: "Desa Uji",
    } as Awaited<ReturnType<typeof middleware.getTenantFromRequest>>);
    const galat = vi.spyOn(console, "error").mockImplementation(() => {});

    const respons = await jalankanApiPublik(permintaan(), "dokumen", async () => {
      throw new Error("koneksi DB putus");
    });

    expect(respons.status).toBe(500);
    expect(await respons.json()).toEqual({
      success: false,
      error: "Gagal mengambil data publik",
    });
    galat.mockRestore();
  });
});
