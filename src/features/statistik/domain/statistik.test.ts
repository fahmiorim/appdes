import { describe, expect, it } from "vitest";

import {
  STATISTIK_LABELS,
  STATISTIK_PENDUDUK_KINDS,
  statistikPendudukParamsSchema,
  type StatistikPendudukKind,
} from "@/features/statistik/domain/statistik";

describe("STATISTIK_PENDUDUK_KINDS", () => {
  it("memuat semua kategori yang diharapkan", () => {
    const expected: StatistikPendudukKind[] = [
      "gender",
      "age_group",
      "age_range",
      "rentan",
      "religion",
      "education",
      "occupation",
      "marital_status",
      "dusun",
    ];
    for (const kind of expected) {
      expect(STATISTIK_PENDUDUK_KINDS).toContain(kind);
    }
    expect(STATISTIK_PENDUDUK_KINDS).toHaveLength(expected.length);
  });
});

describe("STATISTIK_LABELS", () => {
  it("memberi label Indonesia untuk setiap kind", () => {
    expect(STATISTIK_LABELS.gender).toBe("Jenis Kelamin");
    expect(STATISTIK_LABELS.age_group).toBe("Kelompok Umur");
    expect(STATISTIK_LABELS.age_range).toBe("Rentang Umur");
    expect(STATISTIK_LABELS.rentan).toBe("Kelompok Rentan");
    expect(STATISTIK_LABELS.religion).toBe("Agama");
    expect(STATISTIK_LABELS.education).toBe("Pendidikan");
    expect(STATISTIK_LABELS.occupation).toBe("Pekerjaan");
    expect(STATISTIK_LABELS.marital_status).toBe("Status Kawin");
    expect(STATISTIK_LABELS.dusun).toBe("Dusun");
  });
});

describe("statistikPendudukParamsSchema", () => {
  it("menerima input valid lengkap", () => {
    const result = statistikPendudukParamsSchema.parse({
      kind: "gender",
      search: "budi",
      page: 2,
      perPage: 20,
    });
    expect(result.kind).toBe("gender");
    expect(result.search).toBe("budi");
    expect(result.page).toBe(2);
    expect(result.perPage).toBe(20);
  });

  it("menerima input valid tanpa opsional", () => {
    const result = statistikPendudukParamsSchema.parse({ kind: "dusun" });
    expect(result.kind).toBe("dusun");
    expect(result.search).toBeUndefined();
    expect(result.page).toBeUndefined();
    expect(result.perPage).toBeUndefined();
  });

  it("menolak kind tidak valid", () => {
    expect(() =>
      statistikPendudukParamsSchema.parse({ kind: "entah" as StatistikPendudukKind }),
    ).toThrow();
  });

  it("menerima semua kind valid tanpa error", () => {
    for (const kind of STATISTIK_PENDUDUK_KINDS) {
      const result = statistikPendudukParamsSchema.parse({ kind });
      expect(result.kind).toBe(kind);
    }
  });

  it("menolak page kurang dari 1", () => {
    expect(() => statistikPendudukParamsSchema.parse({ kind: "gender", page: 0 })).toThrow();
    expect(() => statistikPendudukParamsSchema.parse({ kind: "gender", page: -1 })).toThrow();
  });
});
