import { beforeEach, describe, expect, it, vi } from "vitest";

import * as dal from "@/lib/dal";

import * as repo from "../infrastructure/shortcut-repository";
import type { MenuNode } from "./build-menu";
import * as menu from "./get-menu";
import { ambilShortcutBeranda, simpanShortcutBeranda } from "./shortcut-use-cases";

vi.mock("@/lib/dal", () => ({ requireUser: vi.fn() }));
vi.mock("./get-menu", () => ({ getMenuForUser: vi.fn() }));
vi.mock("../infrastructure/shortcut-repository", () => ({
  listShortcut: vi.fn(),
  simpanShortcut: vi.fn(),
  hapusShortcut: vi.fn(),
}));

const user = { id: "u-1", name: "Operator", villageId: 1 } as never;

function simpul(
  id: number,
  label: string,
  url: string | null,
  children: MenuNode[] = [],
): MenuNode {
  return { id, slug: `s-${id}`, label, url, icon: null, sortOrder: id, children };
}

const menuUji: MenuNode[] = [
  simpul(1, "Beranda", "/beranda"),
  simpul(2, "Kependudukan", null, [
    simpul(3, "Data Penduduk", "/penduduk"),
    simpul(4, "Kartu Keluarga", "/keluarga"),
  ]),
  simpul(5, "Surat", "/surat"),
  simpul(6, "Inventaris", "/inventaris"),
];

describe("shortcut use cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(menu.getMenuForUser).mockResolvedValue(menuUji);
  });

  it("memakai tiga tujuan pertama di luar beranda saat belum ada pilihan", async () => {
    vi.mocked(repo.listShortcut).mockResolvedValueOnce([]);

    const hasil = await ambilShortcutBeranda(user);

    expect(hasil.shortcut.map((item) => item.href)).toEqual(["/penduduk", "/keluarga", "/surat"]);
    expect(hasil.tujuan).toHaveLength(4);
  });

  it("mempertahankan urutan tersimpan dan membuang menu yang tidak lagi boleh dibaca", async () => {
    vi.mocked(repo.listShortcut).mockResolvedValueOnce(["/surat", "/menu-lama", "/penduduk"]);

    const hasil = await ambilShortcutBeranda(user);

    expect(hasil.shortcut).toEqual([
      { href: "/surat", label: "Surat" },
      { href: "/penduduk", label: "Data Penduduk" },
    ]);
  });

  it("menyimpan hanya tujuan yang boleh dibaca akun", async () => {
    vi.mocked(dal.requireUser).mockResolvedValueOnce(user);

    const hasil = await simpanShortcutBeranda(["/penduduk", "/surat"]);

    expect(dal.requireUser).toHaveBeenCalled();
    expect(repo.simpanShortcut).toHaveBeenCalledWith("u-1", ["/penduduk", "/surat"]);
    expect(hasil).toEqual(["/penduduk", "/surat"]);
  });

  it("menolak tujuan yang tidak ada pada menu akun", async () => {
    vi.mocked(dal.requireUser).mockResolvedValueOnce(user);

    await expect(simpanShortcutBeranda(["/rahasia"])).rejects.toThrow("tidak tersedia");
    expect(repo.simpanShortcut).not.toHaveBeenCalled();
  });
});
