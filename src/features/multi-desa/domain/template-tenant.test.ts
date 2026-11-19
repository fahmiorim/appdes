import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { TENANT_TEMPLATE } from "@/db/templates/tenant-template";
import { ruteTersedia } from "@/features/navigation/domain/menu-tampil";

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

/**
 * Penjaga isi template yang benar-benar dikirim.
 *
 * Kesalahan di sini tidak terlihat saat typecheck karena template adalah data;
 * akibatnya baru muncul sebagai sidebar penuh label "Segera", tautan 404, atau
 * role yang tidak bisa membuka apa pun pada tenant baru.
 */
describe("template bawaan yang dikirim", () => {
  const template = parseTemplateTenant(TENANT_TEMPLATE);

  it("memuat administrator sebagai satu-satunya role sistem", () => {
    expect(template.roles.map((role) => role.slug).sort()).toEqual([
      "administrator",
      "kepala-desa",
      "operator",
      "sekretaris",
    ]);
    expect(template.roles.filter((role) => role.isSystem).map((role) => role.slug)).toEqual([
      ROLE_ADMINISTRATOR,
    ]);
  });

  it("memberi setiap role minimal satu grant dan hanya administrator memegang manage", () => {
    for (const role of template.roles) {
      const punyaGrant = template.akses.some((grant) => grant.roleSlug === role.slug);
      expect(punyaGrant, `Role "${role.slug}" tidak memiliki grant apa pun`).toBe(true);
    }

    const pemegangManage = new Set(
      template.akses.filter((grant) => grant.access === "manage").map((grant) => grant.roleSlug),
    );
    expect([...pemegangManage]).toEqual([ROLE_ADMINISTRATOR]);
  });

  it("menyediakan lima modul Website Desa dengan hak kelola administrator", () => {
    const expected = ["website-dashboard", "website-pengaturan", "website-halaman", "website-konten", "website-dokumen"];
    for (const slug of expected) {
      expect(template.modules.some((module) => module.slug === slug)).toBe(true);
      expect(template.akses).toContainEqual({ roleSlug: ROLE_ADMINISTRATOR, moduleSlug: slug, access: "manage" });
    }
    expect(template.modules.find((module) => module.slug === "website-desa")).toMatchObject({ isGroup: true, url: null });
  });

  it("menyediakan menu penduduk dengan akses baca untuk role non-admin", () => {
    const penduduk = template.modules.find((modul) => modul.slug === "penduduk");
    expect(penduduk).toMatchObject({
      name: "Data Penduduk",
      url: "/penduduk",
      isActive: true,
      parentSlug: null,
    });

    const akses = template.akses
      .filter((grant) => grant.moduleSlug === "penduduk")
      .map((grant) => `${grant.roleSlug}:${grant.access}`)
      .sort();
    expect(akses).toEqual([
      "administrator:manage",
      "kepala-desa:read",
      "operator:read",
      "sekretaris:read",
    ]);
  });

  it("hanya menautkan modul aktif ke rute admin yang sudah tersedia", () => {
    for (const modul of template.modules) {
      if (modul.url === null || !modul.isActive) continue;
      expect(
        ruteTersedia(modul.url),
        `Modul "${modul.slug}" menunjuk ${modul.url} yang belum terdaftar di RUTE_ADMIN_TERSEDIA`,
      ).toBe(true);
    }
  });

  it("menu publik hanya menunjuk halaman yang ada, tanpa duplikat", () => {
    const nama = template.menuPublik.map((menu) => menu.nama);
    expect(new Set(nama).size).toBe(nama.length);

    const urutan = template.menuPublik.map((menu) => menu.urut);
    expect([...urutan].sort((a, b) => a - b)).toEqual(urutan);

    for (const menu of template.menuPublik) {
      if (menu.linkTipe !== "internal") continue;
      const berkas = menu.link === "/" ? "page.tsx" : `${menu.link.replace(/^\//, "")}/page.tsx`;
      expect(
        existsSync(join(process.cwd(), "src", "app", berkas)),
        `Menu "${menu.nama}" menunjuk ${menu.link} tetapi src/app/${berkas} tidak ada`,
      ).toBe(true);
    }
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
