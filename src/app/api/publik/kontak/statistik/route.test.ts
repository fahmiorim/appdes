import { beforeEach, describe, expect, it, vi } from "vitest";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikPengunjungPublik } from "@/features/kontak/application/statistik-pengunjung-use-cases";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { alamatIp } from "@/lib/client-ip";

import { GET } from "./route";

vi.mock("@/features/desa/application/resolve-village", () => ({
  getIdentitasFromRequest: vi.fn(),
}));
vi.mock("@/features/kontak/application/statistik-pengunjung-use-cases", () => ({
  getStatistikPengunjungPublik: vi.fn(),
}));
vi.mock("@/features/rate-limit/application/rate-limit", () => ({
  batasiPermintaan: vi.fn(),
}));
vi.mock("@/lib/client-ip", () => ({
  alamatIp: vi.fn(() => "192.0.2.10"),
}));

function request(): Request {
  return new Request("https://desa.example.id/api/publik/kontak/statistik");
}

describe("GET /api/publik/kontak/statistik", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(alamatIp).mockReturnValue("192.0.2.10");
    vi.mocked(batasiPermintaan).mockResolvedValue({
      dibatasi: false,
      sisa: 59,
      resetMs: 60_000,
    });
    vi.mocked(getIdentitasFromRequest).mockResolvedValue({ id: 17 } as never);
    vi.mocked(getStatistikPengunjungPublik).mockResolvedValue({ pengunjung: 12 } as never);
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
    expect(batasiPermintaan).toHaveBeenCalledWith("kontak-statistik:192.0.2.10", {
      batas: 60,
    });
    expect(getIdentitasFromRequest).not.toHaveBeenCalled();
    expect(getStatistikPengunjungPublik).not.toHaveBeenCalled();
  });

  it("returns contact statistics after passing the rate limit", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ stats: { pengunjung: 12 } });
    expect(getStatistikPengunjungPublik).toHaveBeenCalledWith({
      villageId: 17,
      halaman: "kontak",
      jumlahHari: 30,
    });
  });
});
