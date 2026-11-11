import { describe, expect, it } from "vitest";

import { hitungRekapSuara, kandidatSchema, pemilihanSchema, type KandidatDTO } from "./pemilihan";

/** Kandidat uji dengan nilai bawaan. */
function kandidat(overrides: Partial<KandidatDTO> = {}): KandidatDTO {
  return {
    id: 1,
    pemilihanId: 10,
    nomorUrut: 1,
    nama: "Budi",
    keterangan: null,
    jumlahSuara: 0,
    ...overrides,
  };
}

describe("validasi kandidat pemilihan", () => {
  it("menerima isian formulir berupa teks dan mengubahnya menjadi angka", () => {
    const parsed = kandidatSchema.parse({
      nomorUrut: "02",
      nama: "  Siti  ",
      keterangan: "  Calon petahana  ",
      jumlahSuara: "120",
    });

    expect(parsed).toEqual({
      nomorUrut: 2,
      nama: "Siti",
      keterangan: "Calon petahana",
      jumlahSuara: 120,
    });
  });

  it("menolak nomor urut nol dan suara negatif", () => {
    expect(kandidatSchema.safeParse({ nomorUrut: 0, nama: "A", jumlahSuara: 0 }).success).toBe(
      false,
    );
    expect(kandidatSchema.safeParse({ nomorUrut: 1, nama: "A", jumlahSuara: -1 }).success).toBe(
      false,
    );
  });

  it("menolak nama kosong dan nomor urut di atas 99", () => {
    expect(kandidatSchema.safeParse({ nomorUrut: 1, nama: "   " }).success).toBe(false);
    expect(kandidatSchema.safeParse({ nomorUrut: 100, nama: "A" }).success).toBe(false);
  });
});

describe("validasi pemilihan", () => {
  it("menerima tahun dan jenis yang valid", () => {
    const parsed = pemilihanSchema.parse({ tahun: "2026", jenis: "Pilkades" });
    expect(parsed.tahun).toBe(2026);
    expect(parsed.jenis).toBe("Pilkades");
  });

  it("menolak tahun di luar rentang", () => {
    expect(pemilihanSchema.safeParse({ tahun: 1999, jenis: "Pilkades" }).success).toBe(false);
  });
});

describe("hitungRekapSuara", () => {
  it("menghitung total, persentase, dan pemenang", () => {
    const rekap = hitungRekapSuara([
      kandidat({ id: 1, nomorUrut: 1, nama: "Budi", jumlahSuara: 60 }),
      kandidat({ id: 2, nomorUrut: 2, nama: "Siti", jumlahSuara: 40 }),
    ]);

    expect(rekap.totalSuara).toBe(100);
    expect(rekap.rows[0]).toMatchObject({ nama: "Budi", percentage: 60 });
    expect(rekap.rows[1]).toMatchObject({ nama: "Siti", percentage: 40 });
    expect(rekap.pemenang).toBe("Budi");
  });

  it("membulatkan persentase dua desimal dan mengurutkan perolehan suara", () => {
    const rekap = hitungRekapSuara([
      kandidat({ id: 1, nomorUrut: 1, nama: "Budi", jumlahSuara: 1 }),
      kandidat({ id: 2, nomorUrut: 2, nama: "Siti", jumlahSuara: 2 }),
      kandidat({ id: 3, nomorUrut: 3, nama: "Tono", jumlahSuara: 1 }),
    ]);

    expect(rekap.totalSuara).toBe(4);
    expect(rekap.rows.map((row) => row.nama)).toEqual(["Siti", "Budi", "Tono"]);
    expect(rekap.rows[0]?.percentage).toBe(50);
    expect(rekap.rows[1]?.percentage).toBe(25);
    expect(rekap.pemenang).toBe("Siti");
  });

  it("tidak menetapkan pemenang saat seri atau belum ada suara", () => {
    expect(
      hitungRekapSuara([
        kandidat({ id: 1, nama: "Budi", jumlahSuara: 5 }),
        kandidat({ id: 2, nama: "Siti", jumlahSuara: 5 }),
      ]).pemenang,
    ).toBeNull();

    const kosong = hitungRekapSuara([kandidat({ jumlahSuara: 0 })]);
    expect(kosong.totalSuara).toBe(0);
    expect(kosong.pemenang).toBeNull();
    expect(kosong.rows[0]?.percentage).toBe(0);
  });

  it("mengembalikan rekap kosong tanpa kandidat", () => {
    expect(hitungRekapSuara([])).toEqual({ totalSuara: 0, rows: [], pemenang: null });
  });
});
