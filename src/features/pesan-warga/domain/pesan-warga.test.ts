import { describe, expect, it } from "vitest";

import {
  labelPengirimPesan,
  PANJANG_MAKS_PESAN,
  pengirimPesan,
  pesanWargaSchema,
  susunPercakapan,
  type PesanPercakapanRow,
} from "./pesan-warga";

describe("pesan warga", () => {
  it("menerima pesan dan membuang spasi di tepi", () => {
    const hasil = pesanWargaSchema.parse({ isi: "  Kapan surat saya selesai?  " });
    expect(hasil.isi).toBe("Kapan surat saya selesai?");
  });

  it("menolak pesan kosong atau hanya spasi", () => {
    expect(pesanWargaSchema.safeParse({ isi: "" }).success).toBe(false);
    expect(pesanWargaSchema.safeParse({ isi: "   \n " }).success).toBe(false);
  });

  it("menolak pesan melebihi batas panjang", () => {
    const panjang = pesanWargaSchema.safeParse({ isi: "a".repeat(PANJANG_MAKS_PESAN) });
    const lebih = pesanWargaSchema.safeParse({ isi: "a".repeat(PANJANG_MAKS_PESAN + 1) });

    expect(panjang.success).toBe(true);
    expect(lebih.success).toBe(false);
  });

  it("memetakan pengirim tak dikenal ke warga", () => {
    expect(pengirimPesan("operator")).toBe("operator");
    expect(pengirimPesan("sistem")).toBe("warga");
    expect(labelPengirimPesan("operator")).toBe("Operator Desa");
    expect(labelPengirimPesan("warga")).toBe("Warga");
  });

  it("menyusun satu percakapan per warga dengan pesan terakhir dan hitungan belum dibaca", () => {
    const rows: PesanPercakapanRow[] = [
      {
        residentId: 7,
        nama: "Budi",
        nik: "3201010101010001",
        pengirim: "warga",
        isi: "Pesan terbaru",
        createdAt: new Date("2026-11-05T10:00:00Z"),
        dibacaOperatorPada: null,
      },
      {
        residentId: 9,
        nama: "Sari",
        nik: null,
        pengirim: "operator",
        isi: "Balasan operator",
        createdAt: new Date("2026-11-05T09:00:00Z"),
        dibacaOperatorPada: null,
      },
      {
        residentId: 7,
        nama: "Budi",
        nik: "3201010101010001",
        pengirim: "warga",
        isi: "Pesan lama",
        createdAt: new Date("2026-11-05T08:00:00Z"),
        dibacaOperatorPada: null,
      },
      {
        residentId: 7,
        nama: "Budi",
        nik: "3201010101010001",
        pengirim: "warga",
        isi: "Sudah dibaca",
        createdAt: new Date("2026-11-05T07:00:00Z"),
        dibacaOperatorPada: new Date("2026-11-05T07:30:00Z"),
      },
    ];

    const hasil = susunPercakapan(rows);

    expect(hasil).toHaveLength(2);
    expect(hasil[0]).toMatchObject({
      residentId: 7,
      nama: "Budi",
      pesanTerakhir: "Pesan terbaru",
      pengirimTerakhir: "warga",
      belumDibaca: 2,
    });
    expect(hasil[1]).toMatchObject({
      residentId: 9,
      nama: "Sari",
      pesanTerakhir: "Balasan operator",
      pengirimTerakhir: "operator",
      belumDibaca: 0,
    });
  });

  it("mengembalikan daftar kosong tanpa pesan", () => {
    expect(susunPercakapan([])).toEqual([]);
  });
});
