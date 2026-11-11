import { describe, expect, it } from "vitest";

import { buildTriwulanRows, totalTriwulan } from "./laporan-triwulan";
import { buildTriwulanCsv, triwulanCsvFilename } from "./laporan-triwulan-csv";

const BARIS = buildTriwulanRows([
  {
    kode: "5.1",
    uraian: "Bidang Pendidikan",
    anggaran: "1000000.00",
    tw1: "250000.00",
    tw2: "250000.00",
    tw3: "0.00",
    tw4: "100000.00",
  },
  {
    kode: "5.2",
    uraian: "Bidang Kesehatan",
    anggaran: "2000000.00",
    tw1: "0.00",
    tw2: "500000.00",
    tw3: "0.00",
    tw4: "0.00",
  },
]);

const TOTAL = totalTriwulan(BARIS);

describe("buildTriwulanCsv", () => {
  it("menghasilkan pra-sampul + header + baris + jumlah", () => {
    const csv = buildTriwulanCsv({
      namaDesa: "Sukamaju",
      kecamatan: "Contoh",
      tahun: 2026,
      baris: BARIS,
      total: TOTAL,
    });

    // BOM UTF-8 di awal berkas — lepas sebelum cek konten baris pertama.
    const baris = csv.replace(/^\uFEFF/, "").split("\r\n");
    expect(baris[0]).toBe("Laporan Realisasi APBDes Per Triwulan");
    expect(baris[1]).toBe("Desa;Sukamaju;Kecamatan;Contoh;Tahun Anggaran;2026");
    expect(baris[3]).toBe("Kode;Bidang;Anggaran;TW I;TW II;TW III;TW IV;Realisasi;%");
    expect(baris[4]).toContain("5.1;Bidang Pendidikan");
    expect(baris[4]).toContain("600000.00");
    // Baris terakhir (Jumlah) memuat total persen dua desimal.
    const jumlah = baris.at(-1);
    expect(jumlah).toBeDefined();
    expect(jumlah?.startsWith(";Jumlah;")).toBe(true);
  });

  it("memakai BOM UTF-8 agar Excel mengenali encoding", () => {
    const csv = buildTriwulanCsv({
      namaDesa: null,
      kecamatan: null,
      tahun: 2026,
      baris: [],
      total: totalTriwulan([]),
    });

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Desa;-;Kecamatan;-");
  });

  it("nama berkas memakai slug nama desa", () => {
    expect(triwulanCsvFilename("Suka Maju! 2", 2026)).toBe("triwulan-apbdes-suka-maju-2-2026.csv");
    expect(triwulanCsvFilename(null, 2026)).toBe("triwulan-apbdes-desa-2026.csv");
  });
});
