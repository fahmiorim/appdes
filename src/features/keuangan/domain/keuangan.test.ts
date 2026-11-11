import { describe, expect, it } from "vitest";

import {
  AKUN_LAPORAN,
  formatMoney,
  formatRupiah,
  isAkunLevel1,
  isExcludedAkun,
  isInputRow,
  KODE_LENGTH,
  kodeDepth,
  kodeLength,
  kodeLevel,
  laporanRpApbd,
  listBidangBelanja,
  numberToMoney,
  parentKode,
  realisasiPersen,
  ringkasRpApbd,
  seriGrafik,
  sumMoney,
  toMinor,
  totalLaporan,
} from "./keuangan";

describe("kodeLength / kodeLevel / parentKode", () => {
  it("menghitung level dari panjang string kode (konvensi rujukan)", () => {
    expect(kodeLevel("4")).toBe(KODE_LENGTH.akun);
    expect(kodeLevel("4.1")).toBe(KODE_LENGTH.bidang);
    expect(kodeLevel("4.1.1")).toBe(KODE_LENGTH.kegiatan);
    expect(kodeLevel("4.1.1.01")).toBe(KODE_LENGTH.rincian);
    expect(kodeLevel("  ")).toBe(0);
  });

  it("mengukur panjang kode apa adanya", () => {
    expect(kodeLength("4")).toBe(1);
    expect(kodeLength("5.1")).toBe(3);
    expect(kodeLength("5.1.1")).toBe(5);
    expect(kodeLength("5.1.1.01")).toBe(8);
  });

  it("menghitung kedalaman dari jumlah segmen untuk indentasi", () => {
    expect(kodeDepth("4")).toBe(1);
    expect(kodeDepth("4.1")).toBe(2);
    expect(kodeDepth("4.1.1.01")).toBe(4);
    expect(kodeDepth("  ")).toBe(0);
  });

  it("mengembalikan induk langsung atau null", () => {
    expect(parentKode("4.1.1.01")).toBe("4.1.1");
    expect(parentKode("4.1")).toBe("4");
    expect(parentKode("4")).toBeNull();
  });

  it("mengenali akun level-1", () => {
    expect(isAkunLevel1("5")).toBe(true);
    expect(isAkunLevel1("5.1")).toBe(false);
  });

  it("menandai baris yang boleh diisi (length <= 5)", () => {
    expect(isInputRow("5")).toBe(true);
    expect(isInputRow("5.1")).toBe(true);
    expect(isInputRow("5.1.1")).toBe(true);
    expect(isInputRow("5.1.1.01")).toBe(false);
    expect(isInputRow("")).toBe(false);
  });

  it("mengecualikan akun non-anggaran dari ringkasan", () => {
    expect(isExcludedAkun("1")).toBe(true);
    expect(isExcludedAkun("1.1.1")).toBe(true);
    expect(isExcludedAkun("4")).toBe(false);
    expect(isExcludedAkun("5.2.2.01")).toBe(false);
  });
});

describe("toMinor / formatMoney", () => {
  it("mengubah string desimal menjadi sen", () => {
    expect(toMinor("1500.50")).toBe(150050n);
    expect(toMinor("0")).toBe(0n);
    expect(toMinor("")).toBe(0n);
    expect(toMinor("-2.25")).toBe(-225n);
  });

  it("memangkas pecahan lebih dari dua angka", () => {
    expect(toMinor("1.239")).toBe(123n);
  });

  it("memformat sen kembali menjadi string desimal dua angka", () => {
    expect(formatMoney(150050n)).toBe("1500.50");
    expect(formatMoney(5n)).toBe("0.05");
    expect(formatMoney(-225n)).toBe("-2.25");
  });
});

describe("sumMoney", () => {
  it("menjumlahkan tanpa galat pembulatan floating point", () => {
    expect(sumMoney(["0.10", "0.20"])).toBe("0.30");
    expect(sumMoney(["1000.55", "2000.45", "-0.10"])).toBe("3000.90");
    expect(sumMoney([])).toBe("0.00");
  });
});

describe("realisasiPersen", () => {
  it("menghitung persentase realisasi", () => {
    expect(realisasiPersen("1000.00", "250.00")).toBe(25);
    expect(realisasiPersen("1000.00", "1500.00")).toBe(150);
  });

  it("mengembalikan 0 bila pagu nol", () => {
    expect(realisasiPersen("0.00", "100.00")).toBe(0);
  });
});

describe("ringkasRpApbd", () => {
  const rows = [
    { templateUuid: "4", uraian: "PENDAPATAN", level: 1, anggaran: "1000000.00", realisasi: "0" },
    { templateUuid: "5", uraian: "BELANJA", level: 1, anggaran: "800000.00", realisasi: "0" },
    { templateUuid: "6", uraian: "PEMBIAYAAN", level: 1, anggaran: "100000.00", realisasi: "0" },
  ];

  it("menghitung surplus = pendapatan − belanja + pembiayaan", () => {
    expect(ringkasRpApbd(rows)).toEqual({
      pendapatan: "1000000.00",
      belanja: "800000.00",
      pembiayaan: "100000.00",
      surplus: "300000.00",
    });
  });

  it("memakai nol untuk akun yang absen", () => {
    const result = ringkasRpApbd([rows[0]!]);
    expect(result.surplus).toBe("1000000.00");
    expect(result.belanja).toBe("0.00");
  });
});

describe("numberToMoney / formatRupiah", () => {
  it("membulatkan bilangan rupiah ke sen", () => {
    expect(numberToMoney(1500.5)).toBe("1500.50");
    expect(numberToMoney(1000)).toBe("1000.00");
  });

  it("memformat ke tampilan rupiah", () => {
    expect(formatRupiah("1500.00")).toBe("Rp 1.500");
    expect(formatRupiah("-250.00")).toBe("-Rp 250");
  });
});

describe("laporanRpApbd", () => {
  const rows = [
    {
      templateUuid: "4",
      uraian: "PENDAPATAN",
      level: 1,
      anggaran: "1000000.00",
      realisasi: "400000.00",
    },
    {
      templateUuid: "5",
      uraian: "BELANJA",
      level: 1,
      anggaran: "800000.00",
      realisasi: "200000.00",
    },
    {
      templateUuid: "6",
      uraian: "PEMBIAYAAN",
      level: 1,
      anggaran: "100000.00",
      realisasi: "50000.00",
    },
  ];

  it("mengemas anggaran, realisasi, selisih, dan persen", () => {
    const baris = laporanRpApbd(rows, AKUN_LAPORAN);
    expect(baris).toEqual([
      {
        kode: "4",
        uraian: "PENDAPATAN",
        anggaran: "1000000.00",
        realisasi: "400000.00",
        selisih: "600000.00",
        persen: 40,
      },
      {
        kode: "5",
        uraian: "BELANJA",
        anggaran: "800000.00",
        realisasi: "200000.00",
        selisih: "600000.00",
        persen: 25,
      },
      {
        kode: "6",
        uraian: "PEMBIAYAAN",
        anggaran: "100000.00",
        realisasi: "50000.00",
        selisih: "50000.00",
        persen: 50,
      },
    ]);
  });

  it("memakai nol untuk akun yang absen", () => {
    const baris = laporanRpApbd([rows[0]!], AKUN_LAPORAN);
    const belanja = baris.find((item) => item.kode === "5");
    expect(belanja?.anggaran).toBe("0.00");
    expect(belanja?.selisih).toBe("0.00");
  });

  it("memberi selisih negatif bila realisasi melebihi pagu", () => {
    const baris = laporanRpApbd(
      [{ templateUuid: "5", uraian: "BELANJA", level: 1, anggaran: "100.00", realisasi: "150.00" }],
      ["5"],
    );
    expect(baris[0]?.selisih).toBe("-50.00");
  });
});

describe("totalLaporan", () => {
  it("menjumlahkan anggaran, realisasi, dan selisih", () => {
    const total = totalLaporan([
      {
        kode: "4",
        uraian: "P",
        anggaran: "1000.00",
        realisasi: "400.00",
        selisih: "600.00",
        persen: 40,
      },
      {
        kode: "5",
        uraian: "B",
        anggaran: "500.00",
        realisasi: "200.00",
        selisih: "300.00",
        persen: 40,
      },
    ]);
    expect(total).toEqual({
      anggaran: "1500.00",
      realisasi: "600.00",
      selisih: "900.00",
    });
  });
});

describe("listBidangBelanja", () => {
  const rows = [
    { templateUuid: "5", uraian: "BELANJA", level: 1, anggaran: "0", realisasi: "0" },
    { templateUuid: "5.2", uraian: "PEMBANGUNAN", level: 3, anggaran: "0", realisasi: "0" },
    { templateUuid: "5.1", uraian: "PEMERINTAHAN", level: 3, anggaran: "0", realisasi: "0" },
    { templateUuid: "5.1.1", uraian: "KEGIATAN", level: 5, anggaran: "0", realisasi: "0" },
    { templateUuid: "4.1", uraian: "PAD", level: 3, anggaran: "0", realisasi: "0" },
  ];

  it("hanya mengambil anak langsung akun 5, terurut", () => {
    expect(listBidangBelanja(rows).map((row) => row.templateUuid)).toEqual(["5.1", "5.2"]);
  });
});

describe("seriGrafik", () => {
  it("mengubah baris laporan menjadi seri grafik (rupiah utuh)", () => {
    const seri = seriGrafik([
      {
        kode: "4",
        uraian: "PENDAPATAN",
        anggaran: "1000.00",
        realisasi: "250.00",
        selisih: "750.00",
        persen: 25,
      },
    ]);
    expect(seri).toEqual([{ kode: "4", label: "PENDAPATAN", anggaran: 1000, realisasi: 250 }]);
  });
});
