import { describe, expect, it } from "vitest";

import { petakanKolom } from "@/lib/spreadsheet";

import {
  kolomImporPeserta,
  namaBerkasTemplateImporPeserta,
  normalisasiKode,
  rencanaImporPeserta,
  sasaranKolomLabel,
  templateImporPeserta,
  type BarisImporPeserta,
} from "./impor-peserta";

/** Baris impor peserta uji. */
function baris(kode: string, overrides: Partial<BarisImporPeserta> = {}): BarisImporPeserta {
  return { kode, nomorKartu: "", namaKartu: "", ...overrides };
}

describe("kolom impor peserta", () => {
  it("memakai label identitas sesuai jenis sasaran", () => {
    expect(sasaranKolomLabel(1)).toBe("NIK");
    expect(sasaranKolomLabel(2)).toBe("No. KK");
    expect(sasaranKolomLabel(3)).toBe("No. RTM");
    expect(sasaranKolomLabel(4)).toBe("Kode Kelompok");
  });

  it("menandai hanya kolom identitas sebagai wajib", () => {
    for (const sasaran of [1, 2, 3, 4]) {
      const kolom = kolomImporPeserta(sasaran);
      expect(kolom[0]?.wajib).toBe(true);
      expect(kolom.slice(1).every((item) => !item.wajib)).toBe(true);
    }
  });

  it("template setiap sasaran dapat dibaca kembali oleh pemeta kolom", () => {
    for (const sasaran of [1, 2, 3, 4]) {
      const barisTemplate = templateImporPeserta(sasaran)
        .replace(/^\uFEFF/, "")
        .split("\r\n")
        .filter((item) => item !== "")
        .map((item) => item.split(","));

      const hasil = petakanKolom(barisTemplate, kolomImporPeserta(sasaran));

      expect(hasil.galat).toEqual([]);
      expect(hasil.baris).toHaveLength(1);
      expect(hasil.baris[0]?.nilai.sasaran).toBeTruthy();
    }
  });

  it("memberi nama berkas template yang aman", () => {
    expect(namaBerkasTemplateImporPeserta(1)).toBe("template-peserta-nik.csv");
    expect(namaBerkasTemplateImporPeserta(4)).toBe("template-peserta-kode-kelompok.csv");
  });
});

describe("normalisasiKode", () => {
  it("membuang spasi dan menyeragamkan huruf", () => {
    expect(normalisasiKode("  3201 0101 0101 0001 ")).toBe("3201010101010001");
    expect(normalisasiKode("kel-001")).toBe("KEL-001");
  });
});

describe("rencanaImporPeserta", () => {
  const sasaran = [
    { id: 11, kode: "3201010101010001", nama: "Budi" },
    { id: 12, kode: "3201012001000001", nama: "Keluarga Budi" },
    { id: 13, kode: "KEL-001", nama: "Tani Mekar" },
  ];

  it("mencocokkan kode dengan normalisasi spasi dan huruf", () => {
    const rencana = rencanaImporPeserta(
      [baris(" 3201 0101 0101 0001 ", { nomorKartu: " K-01 ", namaKartu: " Budi " })],
      sasaran,
      new Set(),
    );

    expect(rencana.siap).toEqual([
      {
        id: 11,
        kode: "3201010101010001",
        nama: "Budi",
        nomorKartu: "K-01",
        namaKartu: "Budi",
      },
    ]);
    expect(rencana.tidakDitemukan).toEqual([]);
  });

  it("melaporkan kode tak dikenal dan kode ganda tanpa menggagalkan sisanya", () => {
    const rencana = rencanaImporPeserta(
      [baris("kel-001"), baris("kode-tak-ada"), baris("KEL-001")],
      sasaran,
      new Set(),
    );

    expect(rencana.siap.map((item) => item.id)).toEqual([13]);
    expect(rencana.tidakDitemukan).toEqual(["KODE-TAK-ADA"]);
    expect(rencana.ditolak).toHaveLength(1);
    expect(rencana.ditolak[0]?.pesan).toContain("lebih dari sekali");
  });

  it("melewati sasaran yang sudah menjadi peserta", () => {
    const rencana = rencanaImporPeserta(
      [baris("3201012001000001"), baris("3201010101010001")],
      sasaran,
      new Set([12]),
    );

    expect(rencana.siap.map((item) => item.id)).toEqual([11]);
    expect(rencana.sudahTerdaftar).toEqual(["3201012001000001"]);
  });

  it("menolak baris tanpa kode sasaran", () => {
    const rencana = rencanaImporPeserta([baris("   ")], sasaran, new Set());

    expect(rencana.siap).toEqual([]);
    expect(rencana.ditolak[0]?.pesan).toContain("kosong");
  });

  it("mengembalikan rencana kosong tanpa baris", () => {
    expect(rencanaImporPeserta([], sasaran, new Set())).toEqual({
      siap: [],
      ditolak: [],
      tidakDitemukan: [],
      sudahTerdaftar: [],
    });
  });
});
