import { describe, expect, it } from "vitest";

import type { KeuanganBarisDTO } from "./keuangan";
import { rekonsiliasiBidang, totalRekonsiliasi, type RekonsiliasiBaris } from "./rekonsiliasi";

function tahunan(
  kode: string,
  uraian: string,
  anggaran: string,
  realisasi: string,
): KeuanganBarisDTO {
  return { templateUuid: kode, uraian, anggaran, realisasi, level: 3 };
}

const TAHUNAN: KeuanganBarisDTO[] = [
  tahunan("5.1", "Bidang Penyelenggaraan Pemerintahan Desa", "10000000.00", "4000000.00"),
  tahunan("5.2", "Bidang Pelaksanaan Pembangunan Desa", "20000000.00", "5000000.00"),
];

const TRIWULAN = [
  {
    kode: "5.1",
    uraian: "Bidang Penyelenggaraan Pemerintahan Desa",
    anggaran: "10000000.00",
    tw1: "1000000.00",
    tw2: "1000000.00",
    tw3: "1000000.00",
    tw4: "1000000.00",
  },
  {
    kode: "5.2",
    uraian: "Bidang Pelaksanaan Pembangunan Desa",
    anggaran: "20000000.00",
    tw1: "1000000.00",
    tw2: "1000000.00",
    tw3: "0.00",
    tw4: "0.00",
  },
];

describe("rekonsiliasiBidang", () => {
  it("menandai bidang yang realisasi tahunan & triwulan sama", () => {
    const baris = rekonsiliasiBidang(TAHUNAN, TRIWULAN);

    expect(baris).toHaveLength(2);
    expect(baris[0]).toMatchObject({
      kode: "5.1",
      realisasiTahunan: "4000000.00",
      realisasiTriwulan: "4000000.00",
      selisih: "0.00",
      cocok: true,
    });
  });

  it("menghitung selisih triwulan − tahunan dan persentasenya", () => {
    const baris = rekonsiliasiBidang(TAHUNAN, TRIWULAN);
    const pembangunan = baris[1];

    expect(pembangunan).toMatchObject({
      kode: "5.2",
      realisasiTahunan: "5000000.00",
      realisasiTriwulan: "2000000.00",
      selisih: "-3000000.00",
      cocok: false,
    });
    expect(pembangunan?.persenTahunan).toBe(25);
    expect(pembangunan?.persenTriwulan).toBe(10);
  });

  it("menampilkan kode yang hanya ada di salah satu sisi dengan nilai nol", () => {
    const baris = rekonsiliasiBidang(TAHUNAN, [
      ...TRIWULAN,
      {
        kode: "5.3",
        uraian: "Bidang Pembinaan Kemasyarakatan",
        anggaran: "3000000.00",
        tw1: "500000.00",
        tw2: "0.00",
        tw3: "0.00",
        tw4: "0.00",
      },
    ]);

    expect(baris.map((item) => item.kode)).toEqual(["5.1", "5.2", "5.3"]);
    expect(baris[2]).toMatchObject({
      uraian: "Bidang Pembinaan Kemasyarakatan",
      anggaran: "3000000.00",
      realisasiTahunan: "0.00",
      realisasiTriwulan: "500000.00",
      selisih: "500000.00",
      cocok: false,
    });
  });

  it("membandingkan nilai sebagai sen (tidak terpengaruh format nol)", () => {
    const baris = rekonsiliasiBidang(
      [tahunan("5.1", "Pemerintahan", "0.00", "1000")],
      [
        {
          kode: "5.1",
          uraian: "Pemerintahan",
          anggaran: "0.00",
          tw1: "1000.00",
          tw2: "0",
          tw3: "0.00",
          tw4: "",
        },
      ],
    );

    expect(baris[0]?.cocok).toBe(true);
    expect(baris[0]?.selisih).toBe("0.00");
  });

  it("mengembalikan daftar kosong bila kedua sisi kosong", () => {
    expect(rekonsiliasiBidang([], [])).toEqual([]);
  });
});

describe("totalRekonsiliasi", () => {
  const baris: RekonsiliasiBaris[] = rekonsiliasiBidang(TAHUNAN, TRIWULAN);

  it("menjumlahkan anggaran, tahunan, triwulan, dan selisih", () => {
    expect(totalRekonsiliasi(baris)).toEqual({
      anggaran: "30000000.00",
      realisasiTahunan: "9000000.00",
      realisasiTriwulan: "6000000.00",
      selisih: "-3000000.00",
      jumlahCocok: 1,
      jumlahBeda: 1,
    });
  });

  it("aman untuk daftar kosong", () => {
    expect(totalRekonsiliasi([])).toEqual({
      anggaran: "0.00",
      realisasiTahunan: "0.00",
      realisasiTriwulan: "0.00",
      selisih: "0.00",
      jumlahCocok: 0,
      jumlahBeda: 0,
    });
  });
});
