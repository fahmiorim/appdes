import { describe, expect, it, vi } from "vitest";

import { buildSuratPdf, type SuratPdfInput } from "./surat-pdf";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

vi.mock("@/features/publik/infrastructure/media-storage", () => ({
  bacaMedia: vi.fn(async () => TINY_PNG),
}));

function input(
  jenisNama: string,
  verificationUrl: string | null,
  includeImages = false,
): SuratPdfInput {
  return {
    desa: {
      namaDesa: "Sukamaju",
      kodeDesa: "3201",
      namaKecamatan: "Contoh",
      namaKabupaten: "Contoh",
      namaPropinsi: "Jawa Barat",
      alamatKantor: "Jl. Desa No. 1",
      telepon: "08123456789",
      emailDesa: "desa@example.id",
      namaKepalaDesa: "Budi Santoso",
      nipKepalaDesa: "198001012010011001",
      logo: includeImages ? "logo.png" : null,
      tandaTangan: includeImages ? "ttd.png" : null,
      stempel: includeImages ? "stempel.png" : null,
    },
    jenisNama,
    nomor: "001/SK/2026",
    tanggal: "2026-10-24",
    content: `Yang bertanda tangan di bawah ini Kepala Desa Sukamaju, menerangkan bahwa:\n\nNama: Siti Aminah\nNIK: 3201012001120001\n\nDemikian surat ini dibuat dengan sebenarnya.`,
    verificationUrl,
  };
}

describe("buildSuratPdf", () => {
  it("menghasilkan PDF valid tanpa tautan verifikasi", async () => {
    const pdf = await buildSuratPdf(input("Surat Keterangan Penduduk", null));

    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("menambahkan QR verifikasi sehingga PDF lebih besar", async () => {
    const tanpaQr = await buildSuratPdf(input("Surat Keterangan Penduduk", null));
    const denganQr = await buildSuratPdf(
      input(
        "Surat Keterangan Penduduk",
        "https://desa.example.id/desa/verifikasi-surat/abc123token",
      ),
    );

    expect(Buffer.from(denganQr).subarray(0, 4).toString()).toBe("%PDF");
    expect(denganQr.length).toBeGreaterThan(tanpaQr.length + 100);
  });

  it("merender variasi template jenis surat (Domisili, Usaha, Kurang Mampu, Pengantar)", async () => {
    const jenisSuratList = [
      "Surat Keterangan Domisili",
      "Surat Keterangan Usaha",
      "Surat Keterangan Kurang Mampu",
      "Surat Pengantar Umum",
      "Surat Pengantar SKCK",
    ];

    for (const jenis of jenisSuratList) {
      const pdf = await buildSuratPdf(
        input(
          jenis,
          "https://desa.example.id/desa/verifikasi-surat/token-" +
            jenis.toLowerCase().replace(/\s+/g, "-"),
        ),
      );
      expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
      expect(pdf.length).toBeGreaterThan(1000);
    }
  });

  it("merender elemen visual lengkap: logo, tanda tangan, stempel, dan QR verifikasi", async () => {
    const pdf = await buildSuratPdf(
      input(
        "Surat Keterangan Lengkap",
        "https://desa.example.id/desa/verifikasi-surat/token-lengkap",
        true,
      ),
    );

    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(2000);
  });

  it("menangani isi surat panjang yang membutuhkan multi-halaman", async () => {
    const data = input(
      "Surat Keterangan Multi Halaman",
      "https://desa.example.id/desa/verifikasi-surat/token-multi",
    );
    data.content = Array.from(
      { length: 50 },
      (_, i) =>
        `Paragraf ke-${i + 1}: Ini adalah baris teks uji coba yang sangat panjang untuk menguji fitur multi-halaman pada renderer PDF surat desa.`,
    ).join("\n\n");

    const pdf = await buildSuratPdf(data);

    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(3000);
  });
});
