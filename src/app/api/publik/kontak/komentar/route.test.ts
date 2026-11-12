import { beforeEach, describe, expect, it, vi } from "vitest";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { daftarKomentarPublik } from "@/features/kontak/application/kontak-use-cases";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { alamatIp } from "@/lib/client-ip";

import { GET } from "./route";

vi.mock("@/features/desa/application/resolve-village", () => ({
  getIdentitasFromRequest: vi.fn(),
}));
vi.mock("@/features/kontak/application/kontak-use-cases", () => ({
  daftarKomentarPublik: vi.fn(),
  kirimKomentarPublik: vi.fn(),
}));
vi.mock("@/features/pengaturan/application/pengaturan-use-cases", () => ({
  bacaPengaturan: vi.fn(),
}));
vi.mock("@/features/rate-limit/application/rate-limit", () => ({
  batasiPermintaan: vi.fn(),
}));
vi.mock("@/lib/client-ip", () => ({
  alamatIp: vi.fn(() => "192.0.2.11"),
}));

function request(query = ""): Request {
  return new Request(`https://desa.example.id/api/publik/kontak/komentar${query}`);
}

describe("GET /api/publik/kontak/komentar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(alamatIp).mockReturnValue("192.0.2.11");
    vi.mocked(batasiPermintaan).mockResolvedValue({
      dibatasi: false,
      sisa: 59,
      resetMs: 60_000,
    });
    vi.mocked(getIdentitasFromRequest).mockResolvedValue({ id: 18 } as never);
    vi.mocked(daftarKomentarPublik).mockResolvedValue({
      data: [{ id: 3, isi: "Komentar publik" }],
      total: 1,
    } as never);
  });

  it("limits reads by client IP before resolving the village", async () => {
    vi.mocked(batasiPermintaan).mockResolvedValue({
      dibatasi: true,
      sisa: 0,
      resetMs: 10_000,
    });

    const response = await GET(request());

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Terlalu banyak permintaan. Coba lagi beberapa saat.",
    });
    expect(batasiPermintaan).toHaveBeenCalledWith("komentar-publik-baca:192.0.2.11", {
      batas: 60,
    });
    expect(getIdentitasFromRequest).not.toHaveBeenCalled();
    expect(daftarKomentarPublik).not.toHaveBeenCalled();
  });

  it("returns the requested comment page after passing the rate limit", async () => {
    const response = await GET(request("?page=2"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [{ id: 3, isi: "Komentar publik" }],
      total: 1,
    });
    expect(daftarKomentarPublik).toHaveBeenCalledWith({
      villageId: 18,
      filter: { halaman: "kontak", page: 2, pageSize: 10 },
    });
  });
});
