import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveVillageByHost, resolveVillageId } from "./resolve-village";

const state = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  }),
  listVillageDomains: vi.fn(),
  getIdentitasDesa: vi.fn(),
  getSoleVillageId: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: state.notFound }));
vi.mock("@/features/desa/application/platform-host", () => ({
  hostPlatform: ["flexidesa.test"],
}));
vi.mock("@/features/desa/infrastructure/desa-repository", () => ({
  getIdentitasDesa: state.getIdentitasDesa,
  getSoleVillageId: state.getSoleVillageId,
  listVillageDomains: state.listVillageDomains,
}));

describe("resolveVillageByHost — 404 untuk host yang tidak melayani tenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menghasilkan sinyal notFound Next.js untuk host desa tak dikenal", async () => {
    state.listVillageDomains.mockResolvedValue([
      { id: 1, domain: "desa-a.desa.id", slug: "desa-a" },
      { id: 2, domain: "desa-b.desa.id", slug: "desa-b" },
    ]);

    await expect(resolveVillageByHost("asing.example.test")).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    expect(state.notFound).toHaveBeenCalledOnce();
    expect(state.getIdentitasDesa).not.toHaveBeenCalled();
  });

  it("menghasilkan sinyal notFound Next.js untuk host platform tanpa membaca tenant", async () => {
    await expect(resolveVillageByHost("flexidesa.test")).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    expect(state.notFound).toHaveBeenCalledOnce();
    expect(state.listVillageDomains).not.toHaveBeenCalled();
    expect(state.getIdentitasDesa).not.toHaveBeenCalled();
  });
});

describe("resolveVillageId — fallback hanya untuk desa tunggal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("memakai desa dari sesi tanpa membaca fallback", async () => {
    await expect(resolveVillageId({ villageId: 7 } as never)).resolves.toBe(7);
    expect(state.getSoleVillageId).not.toHaveBeenCalled();
  });

  it("memakai desa tunggal untuk akun platform tanpa penugasan", async () => {
    state.getSoleVillageId.mockResolvedValue({ villageId: 3, jumlah: 1 });

    await expect(resolveVillageId({ villageId: null } as never)).resolves.toBe(3);
  });

  it("menolak akun platform saat ada lebih dari satu desa aktif", async () => {
    state.getSoleVillageId.mockResolvedValue({ villageId: null, jumlah: 2 });

    await expect(resolveVillageId({ villageId: null } as never)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("menghasilkan NOT_FOUND saat tidak ada desa aktif", async () => {
    state.getSoleVillageId.mockResolvedValue({ villageId: null, jumlah: 0 });

    await expect(resolveVillageId({ villageId: null } as never)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
