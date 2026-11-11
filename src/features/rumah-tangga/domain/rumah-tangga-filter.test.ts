import { describe, expect, it } from "vitest";

import {
  buildRtmRekapCsv,
  filterRtmKeSearchParams,
  filterRtmKosong,
  hitungFilterRtm,
  hitungRekapRtm,
  parseFilterRtm,
  RTM_TANPA_DUSUN,
  RTM_TANPA_KELAS,
  rtmRekapFilename,
} from "./rumah-tangga";

describe("parseFilterRtm", () => {
  it("mengembalikan filter kosong untuk query kosong", () => {
    expect(parseFilterRtm({})).toEqual(filterRtmKosong());
  });

  it("memetakan seluruh filter yang dikenal", () => {
    expect(
      parseFilterRtm({
        q: " 320101 ",
        kelasSosial: "2",
        dusun: "Sukamaju",
        rw: "01",
        rt: "02",
        bdt: "ada",
      }),
    ).toEqual({
      search: "320101",
      kelasSosial: 2,
      dusun: "Sukamaju",
      rw: "01",
      rt: "02",
      bdt: "ada",
    });
  });

  it("mengabaikan nilai yang tidak valid", () => {
    const filter = parseFilterRtm({ kelasSosial: "abc", bdt: "mungkin" });
    expect(filter.kelasSosial).toBeNull();
    expect(filter.bdt).toBeNull();
  });

  it("menerima kelas sosial 0 dan menolak nilai negatif", () => {
    expect(parseFilterRtm({ kelasSosial: "0" }).kelasSosial).toBe(0);
    expect(parseFilterRtm({ kelasSosial: "-1" }).kelasSosial).toBeNull();
  });
});

describe("filterRtmKeSearchParams & hitungFilterRtm", () => {
  it("hanya menuliskan filter yang terisi", () => {
    const query = filterRtmKeSearchParams({ ...filterRtmKosong(), bdt: "tidak" });
    expect(query.toString()).toBe("bdt=tidak");
  });

  it("bolak-balik query string tetap sama", () => {
    const asli = parseFilterRtm({ q: "001", kelasSosial: "1", dusun: "Mekarsari", bdt: "ada" });
    expect(parseFilterRtm(Object.fromEntries(filterRtmKeSearchParams(asli)))).toEqual(asli);
  });

  it("menghitung filter aktif tanpa pencarian", () => {
    expect(hitungFilterRtm(filterRtmKosong())).toBe(0);
    expect(hitungFilterRtm({ ...filterRtmKosong(), kelasSosial: 1, rw: "02" })).toBe(2);
  });
});

describe("hitungRekapRtm", () => {
  const rows = [
    { kelasSosial: 1, dusun: "Sukamaju", anggota: 4 },
    { kelasSosial: 1, dusun: "Mekarsari", anggota: 2 },
    { kelasSosial: null, dusun: null, anggota: 1 },
  ];

  it("merekap per kelas sosial dan per dusun", () => {
    const rekap = hitungRekapRtm(rows);

    expect(rekap.totalRtm).toBe(3);
    expect(rekap.totalAnggota).toBe(7);
    expect(rekap.perKelasSosial).toEqual([
      { label: RTM_TANPA_KELAS, jumlahRtm: 1, jumlahAnggota: 1, percentage: 33.33 },
      { label: "Kelas 1", jumlahRtm: 2, jumlahAnggota: 6, percentage: 66.67 },
    ]);
    expect(rekap.perDusun.map((row) => row.label)).toEqual([
      RTM_TANPA_DUSUN,
      "Mekarsari",
      "Sukamaju",
    ]);
  });

  it("mengembalikan rekap kosong tanpa data", () => {
    expect(hitungRekapRtm([])).toEqual({
      totalRtm: 0,
      totalAnggota: 0,
      perKelasSosial: [],
      perDusun: [],
    });
  });
});

describe("buildRtmRekapCsv & nama berkas", () => {
  it("menulis dua blok rekap dengan total", () => {
    const csv = buildRtmRekapCsv({
      namaDesa: "Sukamaju",
      rekap: hitungRekapRtm([{ kelasSosial: 1, dusun: "Sukamaju", anggota: 3 }]),
    });

    expect(csv).toContain("Laporan Rumah Tangga (RTM)");
    expect(csv).toContain("Menurut Kelas Sosial");
    expect(csv).toContain("Menurut Dusun");
    expect(csv).toContain("Kelas 1;1;3;100%");
  });

  it("menyusun nama berkas yang aman", () => {
    expect(rtmRekapFilename("Sukamaju")).toBe("laporan-rumah-tangga-sukamaju.csv");
    expect(rtmRekapFilename(null)).toBe("laporan-rumah-tangga-desa.csv");
  });
});
