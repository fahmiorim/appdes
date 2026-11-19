import { describe, expect, it } from "vitest";

import { hitungTrenTenant } from "./tren-tenant";

describe("hitungTrenTenant", () => {
  it("menghitung tenant baru dan total kumulatif per bulan", () => {
    const rows = [
      { createdAt: new Date(2026, 0, 5) },
      { createdAt: new Date(2026, 5, 2) },
      { createdAt: new Date(2026, 5, 20) },
      { createdAt: new Date(2026, 7, 1) },
    ];

    const titik = hitungTrenTenant(rows, new Date(2026, 7, 19), 3);

    expect(titik.map((item) => item.label)).toEqual(["Jun", "Jul", "Agu"]);
    expect(titik.map((item) => item.jumlah)).toEqual([2, 0, 1]);
    // Tenant Januari tetap masuk total walau di luar jendela tiga bulan.
    expect(titik.map((item) => item.total)).toEqual([3, 3, 4]);
    expect(titik.map((item) => item.judul)).toEqual(["Jun 2026", "Jul 2026", "Agu 2026"]);
  });

  it("memakai enam bulan terakhir secara bawaan", () => {
    const titik = hitungTrenTenant([], new Date(2026, 10, 19));

    expect(titik).toHaveLength(6);
    expect(titik.map((item) => item.label)).toEqual(["Jun", "Jul", "Agu", "Sep", "Okt", "Nov"]);
    expect(titik.every((item) => item.total === 0 && item.jumlah === 0)).toBe(true);
  });

  it("membatasi jumlah bulan ke rentang 1–24", () => {
    expect(hitungTrenTenant([], new Date(2026, 10, 19), 0)).toHaveLength(1);
    expect(hitungTrenTenant([], new Date(2026, 10, 19), 40)).toHaveLength(24);
  });
});
