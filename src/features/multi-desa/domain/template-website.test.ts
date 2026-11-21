import { describe, expect, it } from "vitest";

import {
  bandingkanVersi,
  distribusiTemplateSchema,
  websiteTemplateInputSchema,
  websiteTemplateUpdateSchema,
} from "./template-website";

const token = {
  primary: "#2563eb",
  secondary: "#1e40af",
  accent: "#f59e0b",
  background: "#f8fafc",
  surface: "#ffffff",
  text: "#0f172a",
  fontHeading: "serif",
  radius: "sedang",
  style: "terang",
} as const;

const dasar = {
  name: "Esensi Baru",
  slug: "esensi-baru",
  category: "umum",
  description: "Template untuk kebutuhan portal desa dengan tampilan sederhana.",
  version: "1.0.0",
  tags: ["umum", "layanan"],
  tokens: token,
};

describe("websiteTemplateInputSchema", () => {
  it("menerima metadata dan token yang valid", () => {
    const hasil = websiteTemplateInputSchema.parse(dasar);
    expect(hasil.slug).toBe("esensi-baru");
    expect(hasil.tokens.primary).toBe("#2563eb");
  });

  it("menolak slug yang tidak stabil dan warna bukan heksadesimal", () => {
    const hasil = websiteTemplateInputSchema.safeParse({
      ...dasar,
      slug: "Esensi Baru",
      tokens: { ...token, primary: "blue" },
    });

    expect(hasil.success).toBe(false);
    if (hasil.success) return;
    expect(hasil.error.issues.map((issue) => issue.path.join("."))).toEqual([
      "slug",
      "tokens.primary",
    ]);
  });

  it("membuang tag duplikat dan menolak lebih dari enam tag", () => {
    const hasil = websiteTemplateInputSchema.parse({ ...dasar, tags: ["umum", "umum", "desa"] });
    expect(hasil.tags).toEqual(["umum", "desa"]);

    const terlaluBanyak = websiteTemplateInputSchema.safeParse({
      ...dasar,
      tags: ["satu", "dua", "tiga", "empat", "lima", "enam", "tujuh"],
    });
    expect(terlaluBanyak.success).toBe(false);
  });

  it("mengabaikan slug pada pembaruan agar tema tenant tidak terputus", () => {
    const hasil = websiteTemplateUpdateSchema.parse({
      ...dasar,
      id: "12",
      slug: "slug-lain",
      changelog: "",
    });

    expect(hasil.id).toBe(12);
    expect("slug" in hasil).toBe(false);
  });
});

describe("distribusiTemplateSchema", () => {
  it("mengubah id desa dari form menjadi angka positif", () => {
    const hasil = distribusiTemplateSchema.parse({ id: "4", villageIds: ["2", "7"] });
    expect(hasil).toEqual({ id: 4, villageIds: [2, 7] });
  });

  it("menolak distribusi tanpa desa", () => {
    expect(distribusiTemplateSchema.safeParse({ id: 4, villageIds: [] }).success).toBe(false);
  });
});

describe("bandingkanVersi", () => {
  it("membandingkan versi numerik per segmen", () => {
    expect(bandingkanVersi("1.2.0", "1.1.9")).toBeGreaterThan(0);
    expect(bandingkanVersi("1.0.0", "1.0.0")).toBe(0);
    expect(bandingkanVersi("1.0.0", "1.0.1")).toBeLessThan(0);
  });
});
