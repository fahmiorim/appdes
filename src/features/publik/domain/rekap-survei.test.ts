import { describe, expect, it } from "vitest";

import { parsePeriodeTahun, susunRekapSurvei } from "./rekap-survei";

const soal = [
  {
    id: 1,
    pertanyaan: "Kepuasan layanan",
    tipe: "choice",
    pilihan: ["Puas", "Cukup", "Tidak Puas"],
  },
  { id: 2, pertanyaan: "Usia", tipe: "number", pilihan: [] },
  { id: 3, pertanyaan: "Saran", tipe: "text", pilihan: [] },
];

describe("rekap survei publik", () => {
  it("menghitung distribusi pilihan dan persentasenya", () => {
    const rekap = susunRekapSurvei(soal, {
      pilihan: [
        { soalId: 1, label: "Puas", jumlah: 3 },
        { soalId: 1, label: "Cukup", jumlah: 1 },
      ],
      angka: [],
      teks: [],
    });

    const pertama = rekap[0];
    expect(pertama?.dijawab).toBe(4);
    expect(pertama?.distribusi).toEqual([
      { label: "Puas", jumlah: 3, persentase: 75 },
      { label: "Cukup", jumlah: 1, persentase: 25 },
      { label: "Tidak Puas", jumlah: 0, persentase: 0 },
    ]);
  });

  it("menampilkan statistik angka dan jumlah jawaban teks tanpa isinya", () => {
    const rekap = susunRekapSurvei(soal, {
      pilihan: [],
      angka: [{ soalId: 2, dijawab: 4, rataRata: 32.25, terkecil: 18, terbesar: 55 }],
      teks: [{ soalId: 3, dijawab: 5 }],
    });

    expect(rekap[1]).toMatchObject({
      dijawab: 4,
      rataRata: 32.25,
      terkecil: 18,
      terbesar: 55,
      distribusi: [],
    });
    expect(rekap[2]).toMatchObject({ dijawab: 5, rataRata: null, distribusi: [] });
    expect(Object.keys(rekap[2] ?? {})).not.toContain("jawaban");
  });

  it("memberi nilai nol untuk soal tanpa jawaban", () => {
    const rekap = susunRekapSurvei(soal, { pilihan: [], angka: [], teks: [] });

    expect(rekap[0]?.dijawab).toBe(0);
    expect(rekap[0]?.distribusi.every((item) => item.jumlah === 0 && item.persentase === 0)).toBe(
      true,
    );
    expect(rekap[1]).toMatchObject({ dijawab: 0, rataRata: null, terkecil: null, terbesar: null });
  });

  it("mengabaikan pilihan di luar daftar soal", () => {
    const rekap = susunRekapSurvei(soal, {
      pilihan: [{ soalId: 1, label: "Tidak dikenal", jumlah: 7 }],
      angka: [],
      teks: [],
    });

    expect(rekap[0]?.dijawab).toBe(0);
    expect(rekap[0]?.distribusi.map((item) => item.jumlah)).toEqual([0, 0, 0]);
  });

  it("memvalidasi parameter periode", () => {
    expect(parsePeriodeTahun("2026")).toBe(2026);
    expect(parsePeriodeTahun(2026)).toBe(2026);
    expect(parsePeriodeTahun(" 2025 ")).toBe(2025);
    expect(parsePeriodeTahun("1899")).toBeNull();
    expect(parsePeriodeTahun("2101")).toBeNull();
    expect(parsePeriodeTahun("2026.5")).toBeNull();
    expect(parsePeriodeTahun("abc")).toBeNull();
    expect(parsePeriodeTahun(undefined)).toBeNull();
  });
});
