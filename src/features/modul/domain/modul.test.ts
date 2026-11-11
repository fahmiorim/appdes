import { describe, expect, it } from "vitest";

import { modulFormSchema, parentModulOptions, type ModulDTO } from "@/features/modul/domain/modul";
import { NO_SELECTION } from "@/lib/forms";

const minimal = {
  name: "Kependudukan",
  slug: "kependudukan",
  parentId: NO_SELECTION,
  url: "",
  icon: "",
};

describe("modulFormSchema", () => {
  it("menolak isian wajib yang kosong", () => {
    expect(modulFormSchema.safeParse({ ...minimal, name: "" }).success).toBe(false);
    expect(modulFormSchema.safeParse({ ...minimal, slug: "" }).success).toBe(false);
    expect(modulFormSchema.safeParse({ ...minimal, name: "   " }).success).toBe(false);
  });

  it("menangani induk modul (induk-anak) via select sentinel", () => {
    const induk = modulFormSchema.parse({ ...minimal, parentId: "5" });
    expect(induk.parentId).toBe("5");

    const tanpaInduk = modulFormSchema.parse({ ...minimal, parentId: NO_SELECTION });
    expect(tanpaInduk.parentId).toBe(NO_SELECTION);

    const kosong = modulFormSchema.parse({ ...minimal });
    expect(kosong.parentId).toBe(NO_SELECTION);
  });

  it("mengubah urutan menjadi bilangan bulat", () => {
    expect(modulFormSchema.parse({ ...minimal, sortOrder: "3" }).sortOrder).toBe(3);
    expect(modulFormSchema.parse({ ...minimal, sortOrder: "" }).sortOrder).toBe(0);
    expect(modulFormSchema.safeParse({ ...minimal, sortOrder: "-1" }).success).toBe(false);
  });

  it("menangani bendera grup dan status aktif", () => {
    const grup = modulFormSchema.parse({ ...minimal, isGroup: true, isActive: false });
    expect(grup.isGroup).toBe(true);
    expect(grup.isActive).toBe(false);

    const defaults = modulFormSchema.parse(minimal);
    expect(defaults.isGroup).toBe(false);
    expect(defaults.isActive).toBe(true);
  });
});

describe("parentModulOptions", () => {
  const roots: ModulDTO[] = [
    {
      id: 1,
      parentId: null,
      slug: "penduduk-grup",
      name: "Kependudukan",
      url: null,
      icon: null,
      isGroup: true,
      isActive: true,
      sortOrder: 1,
      isHidden: false,
    },
  ];
  const child: ModulDTO = {
    id: 2,
    parentId: 1,
    slug: "penduduk",
    name: "Data Penduduk",
    url: "/penduduk",
    icon: null,
    isGroup: false,
    isActive: true,
    sortOrder: 2,
    isHidden: false,
  };

  it("hanya modul tanpa induk yang menjadi kandidat induk", () => {
    const moduls = [...roots, child];
    expect(parentModulOptions(moduls)).toEqual([{ value: "1", label: "Kependudukan" }]);
  });

  it("mengkecualikan modul itu sendiri agar tidak menjadi induk dirinya", () => {
    expect(parentModulOptions(roots, 1)).toEqual([]);
    expect(parentModulOptions(roots, 99)).toEqual([{ value: "1", label: "Kependudukan" }]);
  });

  it("menghasilkan opsi kosong untuk daftar kosong", () => {
    expect(parentModulOptions([])).toEqual([]);
  });
});
