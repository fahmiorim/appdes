import { describe, expect, it } from "vitest";

import { TENANT_TEMPLATE } from "@/db/templates/tenant-template";

import {
  parseTemplateTenant,
  ROLE_ADMINISTRATOR,
  templateTenantSchema,
  urutkanModulIndukDulu,
  type TemplateTenant,
} from "./template-tenant";

/** Template valid minimal; setiap test hanya mengubah bagian yang diuji. */
function template(overrides: Partial<TemplateTenant> = {}): TemplateTenant {
  return {
    versi: 1,
    sumber: { jenis: "bawaan", villageId: null, dibuatPada: "2026-11-17" },
    roles: [{ slug: ROLE_ADMINISTRATOR, name: "Administrator", isSystem: true }],
    modules: [
      {
        slug: "penduduk",
        name: "Penduduk",
        url: "/penduduk",
        icon: null,
        isGroup: false,
        isHidden: false,
        isActive: true,
        sortOrder: 1,
        parentSlug: null,
      },
    ],
    akses: [{ roleSlug: ROLE_ADMINISTRATOR, moduleSlug: "penduduk", access: "manage" }],
    tema: { slug: "esensi", nama: "Esensi", versi: "1.0.0", opsi: null },
    menuPublik: [],
    ...overrides,
  };
}

/** Pesan gabungan dari seluruh issue validasi. */
function pesanValidasi(input: unknown): string {
  const hasil = templateTenantSchema.safeParse(input);
  if (hasil.success) return "";
  return hasil.error.issues.map((issue) => issue.message).join(" | ");
}

describe("template bawaan platform", () => {
  it("lolos validasi skema dan memuat role administrator", () => {
    const hasil = parseTemplateTenant(TENANT_TEMPLATE);

    expect(hasil.versi).toBe(1);
    expect(hasil.roles.map((role) => role.slug)).toContain(ROLE_ADMINISTRATOR);
  });
});

describe("validasi template tenant", () => {
  it("menerima template yang konsisten", () => {
    expect(parseTemplateTenant(template()).modules).toHaveLength(1);
  });

  it("menolak template tanpa role administrator", () => {
    const pesan = pesanValidasi({
      ...template(),
      roles: [{ slug: "operator", name: "Operator", isSystem: false }],
      akses: [],
    });

    expect(pesan).toMatch(/administrator/);
  });

  it("menolak slug role ganda", () => {
    const pesan = pesanValidasi({
      ...template(),
      roles: [
        { slug: ROLE_ADMINISTRATOR, name: "Administrator", isSystem: true },
        { slug: ROLE_ADMINISTRATOR, name: "Administrator 2", isSystem: true },
      ],
    });

    expect(pesan).toMatch(/lebih dari sekali/);
  });

  it("menolak slug modul ganda", () => {
    const modul = template().modules[0]!;
    const pesan = pesanValidasi({ ...template(), modules: [modul, { ...modul }] });

    expect(pesan).toMatch(/lebih dari sekali/);
  });

  it("menolak akses yang menunjuk role atau modul di luar template", () => {
    const pesan = pesanValidasi({
      ...template(),
      akses: [{ roleSlug: "operator", moduleSlug: "surat", access: "read" }],
    });

    expect(pesan).toMatch(/Role "operator"/);
    expect(pesan).toMatch(/Modul "surat"/);
  });

  it("menolak induk modul yang tidak ada", () => {
    const pesan = pesanValidasi({
      ...template(),
      modules: [{ ...template().modules[0]!, parentSlug: "tidak-ada" }],
    });

    expect(pesan).toMatch(/Induk "tidak-ada"/);
  });

  it("menolak modul yang menjadi induk dirinya sendiri", () => {
    const pesan = pesanValidasi({
      ...template(),
      modules: [{ ...template().modules[0]!, parentSlug: "penduduk" }],
    });

    expect(pesan).toMatch(/induk dirinya sendiri/);
  });
});

describe("urutkanModulIndukDulu", () => {
  const anak = {
    slug: "penduduk-detail",
    name: "Detail Penduduk",
    url: "/penduduk/detail",
    icon: null,
    isGroup: false,
    isHidden: false,
    isActive: true,
    sortOrder: 2,
    parentSlug: "penduduk",
  };

  it("menempatkan induk sebelum anak meski urutan masukan terbalik", () => {
    const hasil = urutkanModulIndukDulu([anak, ...template().modules]);

    expect(hasil.map((modul) => modul.slug)).toEqual(["penduduk", "penduduk-detail"]);
  });

  it("mempertahankan urutan asli antar simpul selevel", () => {
    const modul = template().modules[0]!;
    const kedua = { ...modul, slug: "surat", name: "Surat", url: "/surat", sortOrder: 2 };

    expect(urutkanModulIndukDulu([modul, kedua]).map((item) => item.slug)).toEqual([
      "penduduk",
      "surat",
    ]);
  });

  it("melempar bila relasi induk melingkar", () => {
    const a = { ...template().modules[0]!, slug: "a", parentSlug: "b" };
    const b = { ...template().modules[0]!, slug: "b", parentSlug: "a" };

    expect(() => urutkanModulIndukDulu([a, b])).toThrow(/melingkar/);
  });
});
