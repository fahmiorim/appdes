import { beforeEach, describe, expect, it, vi } from "vitest";

import * as dal from "@/lib/dal";

import * as repo from "../infrastructure/urutan-menu-repository";
import type { MenuNode } from "./build-menu";
import * as menu from "./get-menu";
import { ambilMenuSidebar, simpanUrutanMenuSidebar } from "./urutan-menu-use-cases";

vi.mock("@/lib/dal", () => ({ requireUser: vi.fn() }));
vi.mock("./get-menu", () => ({ getMenuForUser: vi.fn() }));
vi.mock("../infrastructure/urutan-menu-repository", () => ({
  listUrutanMenu: vi.fn(),
  simpanUrutanMenu: vi.fn(),
}));

const user = { id: "u-1", name: "Operator", villageId: 1 } as never;

function simpul(id: number, slug: string, label: string): MenuNode {
  return { id, slug, label, url: `/${slug}`, icon: null, sortOrder: id, children: [] };
}

const menuUji: MenuNode[] = [
  simpul(1, "beranda", "Beranda"),
  simpul(2, "kependudukan", "Kependudukan"),
  simpul(3, "surat", "Surat"),
  simpul(4, "inventaris", "Inventaris"),
];

describe("urutan menu sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(menu.getMenuForUser).mockResolvedValue(menuUji);
  });

  it("menerapkan urutan tersimpan dan menaruh menu baru di belakang", async () => {
    vi.mocked(repo.listUrutanMenu).mockResolvedValueOnce(["surat", "menu-lama", "beranda"]);

    const hasil = await ambilMenuSidebar(user);

    expect(hasil.menu.map((item) => item.slug)).toEqual([
      "surat",
      "beranda",
      "kependudukan",
      "inventaris",
    ]);
    expect(hasil.terpilih).toEqual(["surat", "beranda", "kependudukan", "inventaris"]);
    expect(hasil.pilihan).toHaveLength(4);
  });

  it("memakai urutan bawaan saat belum ada preferensi", async () => {
    vi.mocked(repo.listUrutanMenu).mockResolvedValueOnce([]);

    const hasil = await ambilMenuSidebar(user);

    expect(hasil.menu.map((item) => item.slug)).toEqual([
      "beranda",
      "kependudukan",
      "surat",
      "inventaris",
    ]);
  });

  it("menyimpan hanya menu tingkat atas yang boleh dibaca akun", async () => {
    vi.mocked(dal.requireUser).mockResolvedValueOnce(user);

    const hasil = await simpanUrutanMenuSidebar(["surat", "surat", "beranda"]);

    expect(repo.simpanUrutanMenu).toHaveBeenCalledWith("u-1", ["surat", "beranda"]);
    expect(hasil).toEqual(["surat", "beranda"]);
  });

  it("menolak slug yang tidak ada pada menu akun", async () => {
    vi.mocked(dal.requireUser).mockResolvedValueOnce(user);

    await expect(simpanUrutanMenuSidebar(["rahasia"])).rejects.toThrow("tidak tersedia");
    expect(repo.simpanUrutanMenu).not.toHaveBeenCalled();
  });
});
