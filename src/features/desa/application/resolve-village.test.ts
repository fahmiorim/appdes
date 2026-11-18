import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveVillageByHost } from "./resolve-village";

const state = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;404"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  }),
  listVillageDomains: vi.fn(),
  getIdentitasDesa: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: state.notFound }));
vi.mock("@/features/desa/application/platform-host", () => ({
  hostPlatform: ["flexidesa.test"],
}));
vi.mock("@/features/desa/infrastructure/desa-repository", () => ({
  getFirstVillageId: vi.fn(),
  getIdentitasDesa: state.getIdentitasDesa,
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
