import { describe, expect, it } from "vitest";

import type { ModuleRecord } from "@/features/rbac/infrastructure/rbac-repository";

import { buildMenu } from "./build-menu";

function modul(
  p: Partial<ModuleRecord> & Pick<ModuleRecord, "id" | "slug" | "name">,
): ModuleRecord {
  return {
    id: p.id,
    parentId: p.parentId ?? null,
    slug: p.slug,
    name: p.name,
    url: p.url ?? null,
    icon: p.icon ?? null,
    sortOrder: p.sortOrder ?? 0,
    isGroup: p.isGroup ?? false,
    isHidden: p.isHidden ?? false,
    isActive: p.isActive ?? true,
  };
}

describe("buildMenu", () => {
  it("hanya menampilkan modul aktif dan tidak tersembunyi yang diizinkan", () => {
    const modules = [
      modul({ id: 1, slug: "beranda", name: "Beranda", url: "/beranda" }),
      modul({ id: 2, slug: "tersembunyi", name: "Tersembunyi", url: "/x", isHidden: true }),
      modul({ id: 3, slug: "nonaktif", name: "Nonaktif", url: "/y", isActive: false }),
    ];
    const menu = buildMenu(modules, new Set(["beranda", "tersembunyi", "nonaktif"]));
    expect(menu.map((m) => m.slug)).toEqual(["beranda"]);
  });

  it("membuang grup kosong setelah mempruning anak", () => {
    const modules = [modul({ id: 1, slug: "grup", name: "Grup", url: null, isGroup: true })];
    const menu = buildMenu(modules, new Set(["grup"]));
    expect(menu).toEqual([]);
  });

  it("membangun hierarki dan mengurutkan berdasarkan sortOrder lalu label", () => {
    const modules = [
      modul({
        id: 1,
        slug: "kependudukan",
        name: "Kependudukan",
        url: null,
        sortOrder: 10,
        isGroup: true,
      }),
      modul({
        id: 3,
        slug: "keluarga",
        name: "Keluarga",
        url: "/keluarga",
        parentId: 1,
        sortOrder: 2,
      }),
      modul({
        id: 2,
        slug: "penduduk",
        name: "Data Penduduk",
        url: "/penduduk",
        parentId: 1,
        sortOrder: 1,
      }),
    ];
    const menu = buildMenu(modules, new Set(["kependudukan", "penduduk", "keluarga"]));
    expect(menu[0]?.slug).toBe("kependudukan");
    expect(menu[0]?.children.map((c) => c.slug)).toEqual(["penduduk", "keluarga"]);
  });

  it("menjaga anak meski induk memiliki akses melalui pewarisan izin", () => {
    const modules = [
      modul({ id: 1, slug: "kependudukan", name: "Kependudukan", url: null, isGroup: true }),
      modul({ id: 2, slug: "penduduk", name: "Data Penduduk", url: "/penduduk", parentId: 1 }),
    ];
    const menu = buildMenu(modules, new Set(["kependudukan", "penduduk"]));
    expect(menu.length).toBe(1);
    expect(menu[0]!.children.length).toBe(1);
  });
});
