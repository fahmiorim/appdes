import { describe, expect, it } from "vitest";

import {
  evaluasiEkspresiIsian,
  formatAngkaEkspresi,
  isiTerbilangDanHitung,
  terbilang,
  terbilangIsi,
  terbilangRupiah,
} from "./terbilang";

describe("terbilang", () => {
  it("membaca angka baku", () => {
    expect(terbilang(0)).toBe("nol");
    expect(terbilang(7)).toBe("tujuh");
    expect(terbilang(15)).toBe("lima belas");
    expect(terbilang(20)).toBe("dua puluh");
    expect(terbilang(21)).toBe("dua puluh satu");
    expect(terbilang(100)).toBe("seratus");
    expect(terbilang(110)).toBe("seratus sepuluh");
    expect(terbilang(111)).toBe("seratus sebelas");
  });

  it("mengikuti konvensi seribu & seratus", () => {
    expect(terbilang(1000)).toBe("seribu");
    expect(terbilang(1100)).toBe("seribu seratus");
    expect(terbilang(1111)).toBe("seribu seratus sebelas");
    expect(terbilang(2_000_000)).toBe("dua juta");
    expect(terbilang(1_000_000_000)).toBe("satu miliar");
  });

  it("membaca angka keras & negatif", () => {
    expect(terbilang(12_345)).toBe("dua belas ribu tiga ratus empat puluh lima");
    expect(terbilang(-42)).toBe("minus empat puluh dua");
    expect(terbilang("3,5")).toBe("tiga koma lima");
  });

  it("mengganti input tidak valid dengan nol", () => {
    expect(terbilang("")).toBe("nol");
    expect(terbilang("abc")).toBe("nol");
    expect(terbilang(Number.NaN)).toBe("nol");
  });

  it("terbilang rupiah menambah satuan", () => {
    expect(terbilangRupiah(25_000)).toBe("dua puluh lima ribu rupiah");
  });
});

describe("formatAngkaEkspresi", () => {
  it("membulat dua desimal dan memangkas nol ikutan", () => {
    expect(formatAngkaEkspresi(5)).toBe("5");
    expect(formatAngkaEkspresi(0.1 + 0.2)).toBe("0,3");
    expect(formatAngkaEkspresi(1 / 3)).toBe("0,33");
  });
});

describe("evaluasiEkspresiIsian", () => {
  const values = { jumlah: "3", tarif: "12500,5", diskon: "0" };

  it("menghitung empat operasi & kurung", () => {
    expect(evaluasiEkspresiIsian("jumlah * (tarif - 500)", values)).toBe(36_001.5);
    expect(evaluasiEkspresiIsian("jumlah + 2", values)).toBe(5);
    expect(evaluasiEkspresiIsian("10 % 4", values)).toBe(2);
    expect(evaluasiEkspresiIsian("-jumlah * 2", values)).toBe(-6);
  });

  it("menolak ekspresi ilegal", () => {
    expect(evaluasiEkspresiIsian("jumlah / 0", values)).toBe(null);
    expect(evaluasiEkspresiIsian("jumlah +", values)).toBe(null);
    expect(evaluasiEkspresiIsian("TIDAK_SAH; rm -rf", values)).toBe(null);
    expect(evaluasiEkspresiIsian("isian_kosong + 1", values)).toBe(null);
  });
});

describe("isiTerbilangDanHitung", () => {
  it("mengisi token terbilang & terbilang_rupiah", () => {
    const hasil = isiTerbilangDanHitung(
      "Uang sebesar [terbilang:donasi] untuk [terbilang_rupiah:donasi].",
      { donasi: "1250" },
    );
    expect(hasil).toBe(
      "Uang sebesar seribu dua ratus lima puluh untuk seribu dua ratus lima puluh rupiah.",
    );
  });

  it("mengevaluasi token hitung", () => {
    expect(isiTerbilangDanHitung("Biaya [hitung:jumlah * 1500].", { jumlah: "2" })).toBe(
      "Biaya 3000.",
    );
  });

  it("membiarkan token bila nilai belum lengkap", () => {
    expect(isiTerbilangDanHitung("Rp [terbilang:x].", {})).toBe("Rp [terbilang:x].");
    expect(isiTerbilangDanHitung("Rp [hitung:a*2].", { a: "kosong" })).toBe("Rp [hitung:a*2].");
  });
});

describe("terbilangIsi", () => {
  it("memetakan isian angka ke pasangan <kode>_terbilang", () => {
    const hasil = terbilangIsi({ jumlah: "3", minut: "bukan angka", jalan: "5,5" });
    expect(hasil).toEqual({ jumlah_terbilang: "tiga", jalan_terbilang: "lima koma lima" });
  });
});
