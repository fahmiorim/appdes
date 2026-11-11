import { beforeEach, describe, expect, it, vi } from "vitest";

import { cariPendudukByNikData } from "@/features/penduduk/application/use-cases";
import { getCurrentUser } from "@/lib/dal";
import { AppError } from "@/lib/errors";

import { GET } from "./route";

vi.mock("@/lib/dal", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/penduduk/application/use-cases", () => ({
  cariPendudukByNikData: vi.fn(),
}));

function permintaan(nik?: string): Request {
  const url = new URL("http://localhost/api/penduduk/nik");
  if (nik !== undefined) url.searchParams.set("nik", nik);
  return new Request(url);
}

describe("GET /api/penduduk/nik", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u-1",
      villageId: 7,
      permissions: {},
    } as never);
    vi.mocked(cariPendudukByNikData).mockResolvedValue({
      id: 3,
      name: "Warga Uji",
      nationalId: "3201010101010001",
    });
  });

  it("menolak permintaan tanpa sesi dengan 401, bukan redirect", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const respons = await GET(permintaan("3201010101010001"));

    expect(respons.status).toBe(401);
    expect(cariPendudukByNikData).not.toHaveBeenCalled();
  });

  it("menolak NIK yang bukan 16 angka", async () => {
    const respons = await GET(permintaan("320101010101000X"));

    expect(respons.status).toBe(400);
    expect(cariPendudukByNikData).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 bila NIK tidak ada di desa sesi", async () => {
    vi.mocked(cariPendudukByNikData).mockResolvedValueOnce(null);

    const respons = await GET(permintaan("3201010101019999"));

    expect(respons.status).toBe(404);
  });

  it("mengembalikan data penduduk yang cocok", async () => {
    const respons = await GET(permintaan("3201010101010001"));

    expect(respons.status).toBe(200);
    await expect(respons.json()).resolves.toEqual({
      ok: true,
      resident: { id: 3, name: "Warga Uji", nationalId: "3201010101010001" },
    });
  });

  it("memetakan penolakan izin use case menjadi 403", async () => {
    vi.mocked(cariPendudukByNikData).mockRejectedValueOnce(new AppError("FORBIDDEN"));

    const respons = await GET(permintaan("3201010101010001"));

    expect(respons.status).toBe(403);
  });
});
