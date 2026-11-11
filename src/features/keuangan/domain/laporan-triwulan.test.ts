import { describe, expect, it } from "vitest";

import {
  buildTriwulanRows,
  ringkasRealisasiPeriode,
  totalTriwulan,
  triwulanLabel,
  type TriwulanBarisInput,
} from "./laporan-triwulan";

function bidang(partial: Partial<TriwulanBarisInput> = {}): TriwulanBarisInput {
  return {
    kode: "5.1",
    uraian: "Penyelenggaraan Pemerintahan",
    anggaran: "1000.00",
    tw1: "100.00",
    tw2: "200.00",
    tw3: "300.00",
    tw4: "0.00",
    ...partial,
  };
}

describe("triwulanLabel", () => {
  it("memberi label romawi untuk triwulan 1–4", () => {
    expect(triwulanLabel(1)).toBe("Triwulan I");
    expect(triwulanLabel(2)).toBe("Triwulan II");
    expect(triwulanLabel(3)).toBe("Triwulan III");
    expect(triwulanLabel(4)).toBe("Triwulan IV");
  });

  it("jatuh ke angka biasa di luar 1–4", () => {
    expect(triwulanLabel(5)).toBe("Triwulan 5");
  });
});

describe("ringkasRealisasiPeriode", () => {
  it("mengembalikan empat periode dengan realisasi per triwulan", () => {
    const total = totalTriwulan(buildTriwulanRows([bidang()]));
    const periode = ringkasRealisasiPeriode(total);

    expect(periode).toHaveLength(4);
    expect(periode.map((item) => item.triwulan)).toEqual([1, 2, 3, 4]);
    expect(periode[0]).toMatchObject({ triwulan: 1, label: "Triwulan I", realisasi: "100.00" });
    expect(periode[3]?.realisasi).toBe("0.00");
  });

  it("menghitung porsi realisasi terhadap total anggaran", () => {
    const total = totalTriwulan(buildTriwulanRows([bidang()]));
    const periode = ringkasRealisasiPeriode(total);

    // 200 dari anggaran 1000 = 20%.
    expect(periode[1]?.persen).toBe(20);
  });

  it("menjumlahkan lintas bidang per triwulan", () => {
    const total = totalTriwulan(
      buildTriwulanRows([
        bidang({ kode: "5.1", tw1: "100.00" }),
        bidang({ kode: "5.2", tw1: "150.00", anggaran: "500.00" }),
      ]),
    );
    const periode = ringkasRealisasiPeriode(total);

    expect(periode[0]?.realisasi).toBe("250.00");
  });
});
