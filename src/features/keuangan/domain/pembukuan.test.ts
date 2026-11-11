import { describe, expect, it } from "vitest";

import {
  hitungRingkasPembukuan,
  isoKeTanggalLokal,
  pembukuanFormSchema,
  tanggalIsoLokal,
  urutkanPembukuan,
  type PembukuanBaris,
} from "./pembukuan";

function baris(
  id: number,
  tanggal: string,
  jenis: PembukuanBaris["jenis"],
  jumlah: string,
  keterangan = `Transaksi ${id}`,
): PembukuanBaris {
  return { id, tanggal, keterangan, jumlah, jenis };
}

describe("pembukuanFormSchema", () => {
  it("menerima isian yang lengkap dan valid", () => {
    const parsed = pembukuanFormSchema.safeParse({
      tanggal: "2026-10-30",
      keterangan: "Penjualan lapak pasar desa",
      jumlah: "150000",
      jenis: "pendapatan",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.jumlah).toBe(150000);
  });

  it("menolak tanggal bukan format ISO", () => {
    const parsed = pembukuanFormSchema.safeParse({
      tanggal: "30/10/2026",
      keterangan: "Pembelian alat",
      jumlah: "50000",
      jenis: "belanja",
    });

    expect(parsed.success).toBe(false);
  });

  it("menolak keterangan terlalu pendek", () => {
    const parsed = pembukuanFormSchema.safeParse({
      tanggal: "2026-10-30",
      keterangan: "ab",
      jumlah: "50000",
      jenis: "belanja",
    });

    expect(parsed.success).toBe(false);
  });

  it("menolak jumlah nol atau negatif", () => {
    for (const jumlah of ["0", "-1000"]) {
      const parsed = pembukuanFormSchema.safeParse({
        tanggal: "2026-10-30",
        keterangan: "Pembelian alat",
        jumlah,
        jenis: "belanja",
      });

      expect(parsed.success).toBe(false);
    }
  });

  it("menolak jenis di luar pendapatan/belanja", () => {
    const parsed = pembukuanFormSchema.safeParse({
      tanggal: "2026-10-30",
      keterangan: "Pembelian alat",
      jumlah: "50000",
      jenis: "pembiayaan",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("hitungRingkasPembukuan", () => {
  it("menjumlahkan pendapatan, belanja, dan saldo", () => {
    const rows = [
      baris(1, "2026-10-01", "pendapatan", "1000000.00"),
      baris(2, "2026-10-02", "pendapatan", "250000.50"),
      baris(3, "2026-10-03", "belanja", "300000.00"),
    ];

    const ringkas = hitungRingkasPembukuan(rows);

    expect(ringkas.totalPendapatan).toBe("1250000.50");
    expect(ringkas.totalBelanja).toBe("300000.00");
    expect(ringkas.saldo).toBe("950000.50");
    expect(ringkas.jumlah).toBe(3);
  });

  it("menghasilkan saldo nol untuk daftar kosong", () => {
    const ringkas = hitungRingkasPembukuan([]);

    expect(ringkas).toEqual({
      totalPendapatan: "0.00",
      totalBelanja: "0.00",
      saldo: "0.00",
      jumlah: 0,
    });
  });

  it("menandai saldo negatif bila belanja melebihi pendapatan", () => {
    const rows = [
      baris(1, "2026-10-01", "pendapatan", "100000.00"),
      baris(2, "2026-10-02", "belanja", "250000.00"),
    ];

    const ringkas = hitungRingkasPembukuan(rows);

    expect(ringkas.saldo).toBe("-150000.00");
    expect(ringkas.saldo.startsWith("-")).toBe(true);
  });
});

describe("urutkanPembukuan", () => {
  it("mengurutkan tanggal terbaru dulu dengan id menurun sebagai pengikat", () => {
    const rows = [
      baris(1, "2026-10-01", "pendapatan", "1000.00"),
      baris(3, "2026-10-03", "belanja", "2000.00"),
      baris(2, "2026-10-03", "pendapatan", "500.00"),
    ];

    const sorted = urutkanPembukuan(rows);

    expect(sorted.map((row) => row.id)).toEqual([3, 2, 1]);
  });

  it("tidak mengubah daftar masukan", () => {
    const rows = [
      baris(1, "2026-10-01", "pendapatan", "1000.00"),
      baris(2, "2026-10-02", "belanja", "500.00"),
    ];

    urutkanPembukuan(rows);

    expect(rows.map((row) => row.id)).toEqual([1, 2]);
  });
});

describe("tanggalIsoLokal & isoKeTanggalLokal", () => {
  it("berputar bolak-balik tanpa menggeser tanggal", () => {
    const iso = "2026-10-30";
    expect(tanggalIsoLokal(isoKeTanggalLokal(iso))).toBe(iso);
  });

  it("membentuk Date tengah malam waktu lokal", () => {
    const date = isoKeTanggalLokal("2026-01-05");

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(5);
    expect(date.getHours()).toBe(0);
  });
});
