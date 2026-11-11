import { describe, expect, it } from "vitest";

import {
  buildRtmRekapCsv,
  hitungRekapRtm,
  rtmRekapFilename,
  type RtmRekapInput,
} from "@/features/rumah-tangga/domain/rumah-tangga";

const sampleRows: RtmRekapInput[] = [
  { kelasSosial: 1, dusun: "Sukamaju", anggota: 5 },
  { kelasSosial: 2, dusun: "Sukamaju", anggota: 3 },
  { kelasSosial: null, dusun: "Cihaur", anggota: 4 },
  { kelasSosial: 1, dusun: "Cihaur", anggota: 6 },
];

describe("hitungRekapRtm", () => {
  it("menghitung total RTM dan anggota dengan benar", () => {
    const rekap = hitungRekapRtm(sampleRows);
    expect(rekap.totalRtm).toBe(4);
    expect(rekap.totalAnggota).toBe(18);
  });

  it("membagi per kelas sosial", () => {
    const rekap = hitungRekapRtm(sampleRows);
    const kelas1 = rekap.perKelasSosial.find((r) => r.label === "Kelas 1");
    const kelas2 = rekap.perKelasSosial.find((r) => r.label === "Kelas 2");
    const tanpaKelas = rekap.perKelasSosial.find((r) => r.label === "(Belum ada kelas sosial)");

    expect(kelas1?.jumlahRtm).toBe(2);
    expect(kelas1?.jumlahAnggota).toBe(11);
    expect(kelas2?.jumlahRtm).toBe(1);
    expect(kelas2?.jumlahAnggota).toBe(3);
    expect(tanpaKelas?.jumlahRtm).toBe(1);
    expect(tanpaKelas?.jumlahAnggota).toBe(4);
  });

  it("membagi per dusun", () => {
    const rekap = hitungRekapRtm(sampleRows);
    const sukamaju = rekap.perDusun.find((r) => r.label === "Sukamaju");
    const cihaur = rekap.perDusun.find((r) => r.label === "Cihaur");

    expect(sukamaju?.jumlahRtm).toBe(2);
    expect(sukamaju?.jumlahAnggota).toBe(8);
    expect(cihaur?.jumlahRtm).toBe(2);
    expect(cihaur?.jumlahAnggota).toBe(10);
  });

  it("mengembalikan rekap kosong untuk array kosong", () => {
    const rekap = hitungRekapRtm([]);
    expect(rekap.totalRtm).toBe(0);
    expect(rekap.totalAnggota).toBe(0);
    expect(rekap.perKelasSosial).toHaveLength(0);
    expect(rekap.perDusun).toHaveLength(0);
  });
});

describe("buildRtmRekapCsv", () => {
  it("menghasilkan baris header dan total", () => {
    const rekap = hitungRekapRtm(sampleRows);
    const csv = buildRtmRekapCsv({ namaDesa: "Desa Sukamaju", rekap });
    expect(csv).toContain("Laporan Rumah Tangga (RTM)");
    expect(csv).toContain("Desa Sukamaju");
    expect(csv).toContain("Rumah Tangga");
    expect(csv).toContain("18"); // total anggota
  });

  it("menggunakan default desa saat nama kosong", () => {
    const rekap = hitungRekapRtm(sampleRows);
    const csv = buildRtmRekapCsv({ namaDesa: null, rekap });
    expect(csv).toContain("-");
  });
});

describe("rtmRekapFilename", () => {
  it("menghasilkan slug dari nama desa", () => {
    expect(rtmRekapFilename("Desa Sukamaju")).toContain("desa-sukamaju");
  });

  it("mengembalikan desa default untuk input kosong", () => {
    expect(rtmRekapFilename(null)).toContain("desa");
    expect(rtmRekapFilename("")).toContain("desa");
  });
});
