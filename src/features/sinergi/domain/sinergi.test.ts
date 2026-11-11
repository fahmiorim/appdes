import { describe, expect, it } from "vitest";

import { buatCsvSinergi, formatPeriodeSinergi, sinergiSchema, type SinergiDTO } from "./sinergi";

const contoh: SinergiDTO = {
  id: 1,
  villageId: 7,
  nama: "Pelatihan digitalisasi BUMDes",
  mitra: "Universitas Negeri",
  tahun: 2026,
  tanggalMulai: "2026-03-01",
  tanggalSelesai: "2026-04-30",
  keterangan: "Pendampingan penyusunan katalog produk",
};

describe("sinergiSchema", () => {
  it("menerima data lengkap", () => {
    const hasil = sinergiSchema.safeParse({
      nama: "  Pelatihan digitalisasi BUMDes  ",
      mitra: "Universitas Negeri",
      tahun: "2026",
      tanggalMulai: "2026-03-01",
      tanggalSelesai: "2026-04-30",
      keterangan: "",
    });

    expect(hasil.success).toBe(true);
    if (!hasil.success) return;
    expect(hasil.data.nama).toBe("Pelatihan digitalisasi BUMDes");
    expect(hasil.data.tahun).toBe(2026);
  });

  it("menerima data minimal tanpa tahun dan tanggal", () => {
    const hasil = sinergiSchema.safeParse({
      nama: "Kerja sama antar desa",
      mitra: "",
      tahun: null,
      tanggalMulai: "",
      tanggalSelesai: "",
      keterangan: "",
    });

    expect(hasil.success).toBe(true);
    if (!hasil.success) return;
    expect(hasil.data.tahun ?? null).toBeNull();
  });

  it("menolak nama kosong", () => {
    const hasil = sinergiSchema.safeParse({ nama: "   " });

    expect(hasil.success).toBe(false);
    if (hasil.success) return;
    expect(hasil.error.issues[0]?.message).toContain("Nama program wajib diisi");
  });

  it("menolak tahun di luar rentang", () => {
    const hasil = sinergiSchema.safeParse({ nama: "Program", tahun: "1999" });

    expect(hasil.success).toBe(false);
    if (hasil.success) return;
    expect(hasil.error.issues[0]?.message).toContain("Tahun minimal 2000");
  });

  it("menolak tanggal selesai mendahului tanggal mulai", () => {
    const hasil = sinergiSchema.safeParse({
      nama: "Program",
      tanggalMulai: "2026-05-10",
      tanggalSelesai: "2026-05-01",
    });

    expect(hasil.success).toBe(false);
    if (hasil.success) return;
    expect(hasil.error.issues[0]?.path).toEqual(["tanggalSelesai"]);
  });
});

describe("buatCsvSinergi", () => {
  it("menulis header dan baris data", () => {
    const csv = buatCsvSinergi([contoh]);
    const baris = csv.trimEnd().split("\r\n");

    expect(baris).toHaveLength(2);
    expect(baris[0]).toBe(
      '"Nama Program","Mitra","Tahun","Tanggal Mulai","Tanggal Selesai","Keterangan"',
    );
    expect(baris[1]).toContain('"Pelatihan digitalisasi BUMDes"');
    expect(baris[1]).toContain('"2026"');
  });

  it("mengosongkan nilai null", () => {
    const csv = buatCsvSinergi([{ ...contoh, mitra: null, tahun: null, keterangan: null }]);
    const data = csv.trimEnd().split("\r\n")[1];

    expect(data).toBe('"Pelatihan digitalisasi BUMDes","","","2026-03-01","2026-04-30",""');
  });

  it("meng-escape tanda kutip di dalam nilai", () => {
    const csv = buatCsvSinergi([{ ...contoh, nama: 'Program "Desa Cerdas"' }]);

    expect(csv).toContain('"Program ""Desa Cerdas"""');
  });
});

describe("formatPeriodeSinergi", () => {
  it("menampilkan rentang tanggal", () => {
    expect(formatPeriodeSinergi(contoh)).toBe("2026-03-01 – 2026-04-30");
  });

  it("menampilkan satu tanggal bila hanya satu diisi", () => {
    expect(formatPeriodeSinergi({ tanggalMulai: "2026-03-01", tanggalSelesai: null })).toBe(
      "2026-03-01",
    );
  });

  it("memberi tanda hubung bila keduanya kosong", () => {
    expect(formatPeriodeSinergi({ tanggalMulai: null, tanggalSelesai: null })).toBe("-");
  });
});
