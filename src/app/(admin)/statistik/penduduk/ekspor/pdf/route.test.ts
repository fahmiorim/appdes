import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const { getCurrentUser, getStatistikPendudukUseCase } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getStatistikPendudukUseCase: vi.fn(),
}));

vi.mock("@/lib/dal", () => ({ getCurrentUser }));
vi.mock("@/features/statistik/application/statistik-use-cases", () => ({
  getStatistikPendudukUseCase,
}));
vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: vi.fn(async () => 7),
}));
vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [{ name: "Desa Uji" }] }),
      }),
    }),
  },
}));

const HASIL = {
  rows: [
    { label: "Laki-laki", total: 12, male: 12, female: 0, percentage: 60 },
    { label: "Perempuan", total: 8, male: 0, female: 8, percentage: 40 },
  ],
  summary: { total: 20, male: 12, female: 8 },
};

function permintaan() {
  return new Request("http://desa.test/statistik/penduduk/ekspor/pdf?kind=gender");
}

describe("GET /statistik/penduduk/ekspor/pdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStatistikPendudukUseCase.mockResolvedValue(HASIL);
  });

  it("menolak permintaan tanpa sesi", async () => {
    getCurrentUser.mockResolvedValue(null);

    const respons = await GET(permintaan(), { params: Promise.resolve({}) });

    expect(respons.status).toBe(401);
  });

  it("menolak pengguna tanpa izin laporan penduduk", async () => {
    getCurrentUser.mockResolvedValue({
      permissions: { isSuperadmin: false, levelByResource: new Map() },
    });

    const respons = await GET(permintaan(), { params: Promise.resolve({}) });

    expect(respons.status).toBe(403);
  });

  it("mengembalikan PDF dengan header unduhan", async () => {
    getCurrentUser.mockResolvedValue({
      permissions: { isSuperadmin: true, levelByResource: new Map() },
    });

    const respons = await GET(permintaan(), { params: Promise.resolve({}) });

    expect(respons.status).toBe(200);
    expect(respons.headers.get("content-type")).toBe("application/pdf");
    expect(respons.headers.get("content-disposition")).toContain("statistik-penduduk-gender.pdf");

    const bytes = new Uint8Array(await respons.arrayBuffer());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("memakai kind bawaan bila parameter tidak dikenal", async () => {
    getCurrentUser.mockResolvedValue({
      permissions: { isSuperadmin: true, levelByResource: new Map() },
    });

    const respons = await GET(
      new Request("http://desa.test/statistik/penduduk/ekspor/pdf?kind=tidak-ada"),
      { params: Promise.resolve({}) },
    );

    expect(respons.status).toBe(200);
    expect(getStatistikPendudukUseCase).toHaveBeenCalledWith(7, { kind: "gender", perPage: 100 });
  });
});
