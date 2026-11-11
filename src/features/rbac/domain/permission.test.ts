import { describe, expect, it } from "vitest";

import {
  applyParentInheritance,
  fromCrudPermissions,
  levelAllows,
  levelToActions,
  toCrudPermissions,
  type AccessLevel,
  type ModuleNode,
} from "@/features/rbac/domain/permission";

describe("levelAllows", () => {
  it("menolak akses ketika tingkat tidak ada", () => {
    expect(levelAllows(null, "read")).toBe(false);
    expect(levelAllows(undefined, "delete")).toBe(false);
  });

  it("memetakan read -> read, write -> update, manage -> delete", () => {
    expect(levelAllows("read", "read")).toBe(true);
    expect(levelAllows("read", "update")).toBe(false);
    expect(levelAllows("read", "delete")).toBe(false);

    expect(levelAllows("write", "read")).toBe(true);
    expect(levelAllows("write", "update")).toBe(true);
    expect(levelAllows("write", "delete")).toBe(false);

    expect(levelAllows("manage", "read")).toBe(true);
    expect(levelAllows("manage", "update")).toBe(true);
    expect(levelAllows("manage", "delete")).toBe(true);
  });
});

describe("levelToActions", () => {
  it("mengembalikan daftar aksi sesuai tingkat", () => {
    expect(levelToActions(null)).toEqual([]);
    expect(levelToActions("read")).toEqual(["read"]);
    expect(levelToActions("write")).toEqual(["read", "update"]);
    expect(levelToActions("manage")).toEqual(["read", "update", "delete"]);
  });
});

function node(id: number, slug: string, parentId: number | null = null): ModuleNode {
  return { id, slug, parentId };
}

describe("konversi izin CRUD", () => {
  it("mengembalikan null ketika tidak ada akses", () => {
    expect(fromCrudPermissions({ canRead: false, canWrite: false, canManage: false })).toBeNull();
  });

  it("memetakan tingkat ke izin CRUD dan sebaliknya", () => {
    for (const level of ["read", "write", "manage"] as const) {
      expect(fromCrudPermissions(toCrudPermissions(level))).toBe(level);
    }
  });
});

describe("applyParentInheritance", () => {
  const modules: readonly ModuleNode[] = [
    node(1, "kependudukan"),
    node(2, "penduduk", 1),
    node(3, "keluarga", 1),
    node(4, "pengaturan"),
    node(5, "pengguna", 4),
  ];

  it("memberi 'read' pada induk bila salah satu anaknya punya akses", () => {
    const levels = new Map<number, AccessLevel>([[2, "read"]]);
    const effective = applyParentInheritance(modules, levels);

    expect(Object.fromEntries(effective)).toEqual({
      kependudukan: "read",
      penduduk: "read",
    });
  });

  it("tidak menurunkan tingkat eksplisit induk yang lebih luas", () => {
    const levels = new Map<number, AccessLevel>([
      [1, "manage"],
      [2, "read"],
    ]);
    const effective = applyParentInheritance(modules, levels);

    expect(effective.get("kependudukan")).toBe("manage");
  });

  it("tidak menaikkan tingkat anak", () => {
    const levels = new Map<number, AccessLevel>([
      [1, "manage"],
      [3, "read"],
    ]);
    const effective = applyParentInheritance(modules, levels);

    expect(effective.get("keluarga")).toBe("read");
  });

  it("mengabaikan modul & grup tanpa akses sama sekali", () => {
    const effective = applyParentInheritance(modules, new Map<number, AccessLevel>());

    expect(effective.size).toBe(0);
  });

  it("tidak menampilkan grup yang anaknya tidak berakses", () => {
    const levels = new Map<number, AccessLevel>([[2, "write"]]);
    const effective = applyParentInheritance(modules, levels);

    expect(effective.has("pengaturan")).toBe(false);
    expect(effective.has("pengguna")).toBe(false);
  });
});
