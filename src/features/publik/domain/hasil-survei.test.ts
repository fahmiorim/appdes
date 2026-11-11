import { describe, expect, it } from "vitest";

import { labelPeriodeSurvei, rekapHasilSurvei, type SoalHasilSurvei } from "./hasil-survei";

const SOAL: SoalHasilSurvei[] = [
  {
    id: 1,
    pertanyaan: "Bagaimana kualitas pelayanan?",
    tipe: "choice",
    pilihan: ["Baik", "Cukup", "Kurang"],
  },
  { id: 2, pertanyaan: "Berapa usia Anda?", tipe: "number", pilihan: [] },
  { id: 3, pertanyaan: "Saran untuk desa", tipe: "text", pilihan: [] },
];

describe("rekapHasilSurvei", () => {
  it("menghitung distribusi pilihan dan persentase", () => {
    const hasil = rekapHasilSurvei(SOAL, [
      { soalId: 1, jawaban: "Baik" },
      { soalId: 1, jawaban: "Baik" },
      { soalId: 1, jawaban: "Cukup" },
      { soalId: 1, jawaban: "Kurang" },
    ]);

    const soal = hasil[0];
    expect(soal?.jumlahJawaban).toBe(4);
    expect(soal?.distribusi).toEqual([
      { label: "Baik", jumlah: 2, persen: 50 },
      { label: "Cukup", jumlah: 1, persen: 25 },
      { label: "Kurang", jumlah: 1, persen: 25 },
    ]);
  });

  it("menyertakan pilihan yang belum dipilih dengan jumlah nol", () => {
    const hasil = rekapHasilSurvei(SOAL, [{ soalId: 1, jawaban: "Baik" }]);
    expect(hasil[0]?.distribusi.find((item) => item.label === "Kurang")).toEqual({
      label: "Kurang",
      jumlah: 0,
      persen: 0,
    });
  });

  it("tetap menghitung jawaban di luar daftar pilihan", () => {
    const hasil = rekapHasilSurvei(SOAL, [
      { soalId: 1, jawaban: "Baik" },
      { soalId: 1, jawaban: "Sangat baik" },
    ]);
    expect(hasil[0]?.distribusi.at(-1)).toEqual({
      label: "Sangat baik",
      jumlah: 1,
      persen: 50,
    });
  });

  it("menghitung rata-rata jawaban angka", () => {
    const hasil = rekapHasilSurvei(SOAL, [
      { soalId: 2, jawaban: "20" },
      { soalId: 2, jawaban: "30" },
      { soalId: 2, jawaban: "25" },
    ]);
    expect(hasil[1]?.rataRata).toBe(25);
    expect(hasil[1]?.jumlahJawaban).toBe(3);
  });

  it("mengabaikan jawaban kosong dan bukan angka", () => {
    const hasil = rekapHasilSurvei(SOAL, [
      { soalId: 2, jawaban: "  " },
      { soalId: 2, jawaban: "bukan angka" },
      { soalId: 2, jawaban: "40" },
    ]);
    expect(hasil[1]?.jumlahJawaban).toBe(1);
    expect(hasil[1]?.rataRata).toBe(40);
  });

  it("tidak menghitung data pribadi untuk soal teks", () => {
    const hasil = rekapHasilSurvei(SOAL, [
      { soalId: 3, jawaban: "Tambah lampu jalan" },
      { soalId: 3, jawaban: "Perbaiki drainase" },
    ]);
    expect(hasil[2]?.tipe).toBe("text");
    expect(hasil[2]?.jumlahJawaban).toBe(2);
    expect(JSON.stringify(hasil[2])).not.toContain("Tambah lampu jalan");
  });

  it("mengembalikan nol jawaban saat belum ada respons", () => {
    const hasil = rekapHasilSurvei(SOAL, []);
    expect(hasil).toHaveLength(3);
    expect(hasil.every((item) => item.jumlahJawaban === 0)).toBe(true);
    expect(hasil[1]?.rataRata).toBeNull();
  });
});

describe("labelPeriodeSurvei", () => {
  it("membedakan seluruh periode dan tahun tertentu", () => {
    expect(labelPeriodeSurvei(null)).toBe("seluruh periode");
    expect(labelPeriodeSurvei(2026)).toBe("tahun 2026");
  });
});
