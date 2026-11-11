import { describe, expect, it } from "vitest";

import {
  dimensiDariKode,
  formatSkor,
  hitungRekapIdm,
  hitungRekapSdgs,
  normalisasiSkor,
  predikatSdgs,
  statusIdm,
  type IdmIndikatorDTO,
  type SdgsDTO,
} from "./idm";

function indikator(overrides: Partial<IdmIndikatorDTO>): IdmIndikatorDTO {
  return {
    id: 1,
    villageId: 1,
    tahun: 2026,
    kode: "I.1",
    nama: "Indikator",
    skor: 0,
    kategori: null,
    keterangan: null,
    ...overrides,
  };
}

function sdgs(overrides: Partial<SdgsDTO>): SdgsDTO {
  return {
    id: 1,
    villageId: 1,
    tahun: 2026,
    goal: 1,
    skor: 0,
    keterangan: null,
    ...overrides,
  };
}

describe("dimensiDariKode", () => {
  it("memetakan prefix romawi dan kode resmi", () => {
    expect(dimensiDariKode("I.1")).toBe("iks");
    expect(dimensiDariKode("II.4")).toBe("ike");
    expect(dimensiDariKode("III.2")).toBe("ikl");
    expect(dimensiDariKode("IKS-01")).toBe("iks");
    expect(dimensiDariKode("ike.3")).toBe("ike");
    expect(dimensiDariKode("ikl 2")).toBe("ikl");
  });

  it("mengembalikan null untuk kode di luar dimensi IDM", () => {
    expect(dimensiDariKode("IV.1")).toBeNull();
    expect(dimensiDariKode("")).toBeNull();
    expect(dimensiDariKode("SDGS-01")).toBeNull();
  });
});

describe("normalisasiSkor", () => {
  it("mengubah skala 0–100 ke 0–1 dan membatasi nilai ekstrem", () => {
    expect(normalisasiSkor(80)).toBe(0.8);
    expect(normalisasiSkor(0)).toBe(0);
    expect(normalisasiSkor(150)).toBe(1);
    expect(normalisasiSkor(-10)).toBe(0);
    expect(normalisasiSkor(null)).toBeNull();
  });
});

describe("statusIdm", () => {
  it("memakai ambang Permendesa", () => {
    expect(statusIdm(0.4)).toBe("Sangat Tertinggal");
    expect(statusIdm(0.4909)).toBe("Tertinggal");
    expect(statusIdm(0.5989)).toBe("Berkembang");
    expect(statusIdm(0.7072)).toBe("Maju");
    expect(statusIdm(0.8155)).toBe("Mandiri");
  });
});

describe("hitungRekapIdm", () => {
  it("menghitung rata-rata per dimensi lalu rata-rata dimensi", () => {
    const rekap = hitungRekapIdm([
      indikator({ id: 1, kode: "I.1", skor: 100 }),
      indikator({ id: 2, kode: "I.2", skor: 50 }),
      indikator({ id: 3, kode: "II.1", skor: 60 }),
      indikator({ id: 4, kode: "III.1", skor: 30 }),
    ]);

    expect(rekap.tahun).toBe(2026);
    expect(rekap.jumlahIndikator).toBe(4);

    const [iks, ike, ikl] = rekap.dimensi;
    expect(iks?.skor).toBe(0.75);
    expect(ike?.skor).toBe(0.6);
    expect(ikl?.skor).toBe(0.3);

    // Rata-rata ketiga dimensi: (0,75 + 0,6 + 0,3) / 3 = 0,55
    expect(rekap.skor).toBe(0.55);
    expect(rekap.status).toBe("Tertinggal");
  });

  it("mengabaikan indikator tanpa skor dan kode non-IDM", () => {
    const rekap = hitungRekapIdm([
      indikator({ id: 1, kode: "I.1", skor: null }),
      indikator({ id: 2, kode: "X.1", skor: 90 }),
      indikator({ id: 3, kode: "III.1", skor: 40 }),
    ]);

    expect(rekap.dimensi[0]?.skor).toBeNull();
    expect(rekap.dimensi[2]?.skor).toBe(0.4);
    expect(rekap.skor).toBe(0.4);
    expect(rekap.jumlahIndikator).toBe(1);
  });

  it("mengembalikan skor null saat belum ada data", () => {
    const rekap = hitungRekapIdm([]);
    expect(rekap.skor).toBeNull();
    expect(rekap.status).toBeNull();
    expect(rekap.tahun).toBeNull();
    expect(rekap.dimensi).toHaveLength(3);
  });
});

describe("hitungRekapSdgs", () => {
  it("merata-ratakan tujuan yang terisi dan memberi predikat", () => {
    const rekap = hitungRekapSdgs([
      sdgs({ id: 1, goal: 1, skor: 80 }),
      sdgs({ id: 2, goal: 2, skor: 40 }),
    ]);

    expect(rekap.jumlahTerisi).toBe(2);
    expect(rekap.skor).toBe(0.6);
    expect(rekap.predikat).toBe("Baik");
  });

  it("mengembalikan nilai kosong saat belum diisi", () => {
    const rekap = hitungRekapSdgs([]);
    expect(rekap.skor).toBeNull();
    expect(rekap.predikat).toBeNull();
    expect(rekap.jumlahTerisi).toBe(0);
  });

  it("membedakan predikat di setiap batas", () => {
    expect(predikatSdgs(0.85)).toBe("Sangat Baik");
    expect(predikatSdgs(0.6)).toBe("Baik");
    expect(predikatSdgs(0.4)).toBe("Cukup");
    expect(predikatSdgs(0.39)).toBe("Kurang");
  });
});

describe("formatSkor", () => {
  it("menampilkan tiga desimal dengan koma", () => {
    expect(formatSkor(0.8)).toBe("0,800");
    expect(formatSkor(0.5555)).toBe("0,556");
    expect(formatSkor(null)).toBe("—");
  });
});
