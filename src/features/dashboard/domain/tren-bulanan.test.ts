import { describe, expect, it } from "vitest";

import { kunciBulan, susunTrenBulanan } from "./tren-bulanan";

describe("susunTrenBulanan", () => {
  it("mengisi bulan tanpa data dengan nol dan mengurutkan dari tertua", () => {
    const hasil = susunTrenBulanan(
      [
        { bulan: "2026-09", total: 4 },
        { bulan: "2026-11", total: 7 },
      ],
      new Date(2026, 10, 19),
      6,
    );

    expect(hasil.map((titik) => titik.bulan)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(hasil.map((titik) => titik.total)).toEqual([0, 0, 0, 4, 0, 7]);
    expect(hasil[5]).toMatchObject({ label: "Nov", total: 7 });
  });

  it("mengabaikan bulan di luar jendela dan menjumlahkan kunci ganda", () => {
    const hasil = susunTrenBulanan(
      [
        { bulan: "2025-12", total: 99 },
        { bulan: "2026-02", total: 2 },
        { bulan: "2026-02", total: 3 },
        { bulan: "2027-01", total: 50 },
      ],
      new Date(2026, 2, 15),
      3,
    );

    expect(hasil).toEqual([
      { bulan: "2026-01", label: "Jan", total: 0 },
      { bulan: "2026-02", label: "Feb", total: 5 },
      { bulan: "2026-03", label: "Mar", total: 0 },
    ]);
  });

  it("menyeberangi pergantian tahun dan menghormati batas minimal satu bulan", () => {
    const hasil = susunTrenBulanan([{ bulan: "2026-01", total: 3 }], new Date(2026, 0, 5), 3);

    expect(hasil.map((titik) => titik.bulan)).toEqual(["2025-11", "2025-12", "2026-01"]);
    expect(susunTrenBulanan([], new Date(2026, 0, 5), 0)).toHaveLength(1);
  });
});

describe("kunciBulan", () => {
  it("memformat bulan dengan dua digit", () => {
    expect(kunciBulan(new Date(2026, 0, 31))).toBe("2026-01");
    expect(kunciBulan(new Date(2026, 10, 1))).toBe("2026-11");
  });
});
