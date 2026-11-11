import { describe, expect, it } from "vitest";

import { hitungSkor, klasifikasiSkor, nilaiJawaban, rekapPerIndikator } from "./skor";

const pilihan = {
  id: 1,
  tipe: "choice",
  bobot: 1,
  skorPilihan: { "Sangat baik": 5, Baik: 4, Cukup: 3, Kurang: 1 },
  indikatorId: 10,
};

describe("skor analisis", () => {
  it("menilai jawaban pilihan sesuai peta skor dan mengabaikan jawaban kosong", () => {
    expect(nilaiJawaban(pilihan, "Baik")).toBe(4);
    expect(nilaiJawaban(pilihan, "Tidak ada")).toBeNull();
    expect(nilaiJawaban(pilihan, "  ")).toBeNull();
  });

  it("membatasi jawaban angka ke skala 0–5", () => {
    const angka = { ...pilihan, id: 2, tipe: "number", skorPilihan: {} };
    expect(nilaiJawaban(angka, "3")).toBe(3);
    expect(nilaiJawaban(angka, "99")).toBe(5);
    expect(nilaiJawaban(angka, "-2")).toBe(0);
    expect(nilaiJawaban(angka, "abc")).toBeNull();
  });

  it("menghitung skor berbobot 0–100", () => {
    const soal = [pilihan, { ...pilihan, id: 2, bobot: 3 }];
    const jawaban = new Map<number, string>([
      [1, "Sangat baik"],
      [2, "Kurang"],
    ]);
    // (5*1 + 1*3) / (5*1 + 5*3) = 8/20 = 40
    expect(hitungSkor(soal, jawaban)).toBe(40);
    expect(klasifikasiSkor(40)).toBe("Cukup");
    expect(klasifikasiSkor(85)).toBe("Sangat Baik");
    expect(klasifikasiSkor(0)).toBe("Kurang");
  });

  it("merata-ratakan skor per indikator", () => {
    const soal = [pilihan, { ...pilihan, id: 2, indikatorId: 20 }];
    const rekap = rekapPerIndikator(soal, [
      {
        respondenId: 1,
        jawaban: new Map([
          [1, "Sangat baik"],
          [2, "Cukup"],
        ]),
      },
      {
        respondenId: 2,
        jawaban: new Map([
          [1, "Baik"],
          [2, "Kurang"],
        ]),
      },
    ]);
    expect(rekap.find((item) => item.indikatorId === 10)?.rataRata).toBe(90);
    expect(rekap.find((item) => item.indikatorId === 20)?.rataRata).toBe(40);
  });
});
