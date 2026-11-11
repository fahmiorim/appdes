import { beforeEach, describe, expect, it, vi } from "vitest";

import * as media from "@/features/publik/infrastructure/media-storage";
import * as dal from "@/lib/dal";

import * as repo from "../infrastructure/pelanggan-repository";
import {
  getDokumenKerjasama,
  simpanDokumenKerjasama,
  ubahStatusLangganan,
} from "./pelanggan-use-cases";

vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn() }));

vi.mock("../infrastructure/pelanggan-repository", () => ({
  createPelanggan: vi.fn(),
  deletePelanggan: vi.fn(),
  findPelanggan: vi.fn(),
  listPelanggan: vi.fn(),
  updatePelanggan: vi.fn(),
  updateStatusLangganan: vi.fn(),
}));

vi.mock("@/features/publik/infrastructure/media-storage", () => ({
  simpanUnggahanMedia: vi.fn(),
  bacaMedia: vi.fn(),
  hapusMedia: vi.fn(),
}));

const pelangganDasar = {
  id: 5,
  villageId: 1,
  nama: "Koperasi Desa",
  kontak: null,
  alamat: null,
  keterangan: null,
  statusLangganan: "menunggu",
  tanggalMulai: null,
  tanggalSelesai: null,
  noKerjasama: null,
  keteranganLangganan: null,
  dokumenKerjasama: null,
  dokumenNama: null,
  dokumenMime: null,
};

describe("simpanDokumenKerjasama", () => {
  beforeEach(() => vi.clearAllMocks());

  it("menolak berkas yang bukan PDF/JPG/PNG", async () => {
    await expect(
      simpanDokumenKerjasama(1, 5, {
        nama: "virus.exe",
        mime: "application/x-msdownload",
        isi: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toThrow("PDF, JPG, atau PNG");

    expect(media.simpanUnggahanMedia).not.toHaveBeenCalled();
    expect(repo.updatePelanggan).not.toHaveBeenCalled();
  });

  it("menolak berkas kosong dan yang melebihi 5 MB", async () => {
    await expect(
      simpanDokumenKerjasama(1, 5, {
        nama: "kosong.pdf",
        mime: "application/pdf",
        isi: new Uint8Array(),
      }),
    ).rejects.toThrow("kosong");

    await expect(
      simpanDokumenKerjasama(1, 5, {
        nama: "besar.pdf",
        mime: "application/pdf",
        isi: new Uint8Array(5 * 1024 * 1024 + 1),
      }),
    ).rejects.toThrow("maksimal 5 MB");
  });

  it("menyimpan berkas, mencatat jalur, lalu menghapus dokumen lama", async () => {
    vi.mocked(repo.findPelanggan).mockResolvedValueOnce({
      ...pelangganDasar,
      dokumenKerjasama: "1/umum/lama.pdf",
      dokumenNama: "lama.pdf",
      dokumenMime: "application/pdf",
    });
    vi.mocked(media.simpanUnggahanMedia).mockResolvedValueOnce({
      jalur: "1/umum/baru.pdf",
      mime: "application/pdf",
    });

    const hasil = await simpanDokumenKerjasama(1, 5, {
      nama: "Perjanjian Kerja Sama.pdf",
      mime: "application/pdf",
      isi: new Uint8Array([37, 80, 68, 70]),
    });

    expect(dal.requirePermission).toHaveBeenCalledWith("pelanggan", "update");
    expect(media.simpanUnggahanMedia).toHaveBeenCalledWith(
      1,
      "umum",
      expect.objectContaining({ nama: "Perjanjian Kerja Sama.pdf", mime: "application/pdf" }),
    );
    expect(repo.updatePelanggan).toHaveBeenCalledWith(5, 1, {
      dokumenKerjasama: "1/umum/baru.pdf",
      dokumenNama: "Perjanjian Kerja Sama.pdf",
      dokumenMime: "application/pdf",
    });
    expect(media.hapusMedia).toHaveBeenCalledWith("1/umum/lama.pdf");
    expect(hasil).toEqual({ id: 5, nama: "Perjanjian Kerja Sama.pdf" });
  });

  it("gagal bila pelanggan tidak ada di desa tersebut", async () => {
    vi.mocked(repo.findPelanggan).mockResolvedValueOnce(null);

    await expect(
      simpanDokumenKerjasama(1, 99, {
        nama: "dokumen.pdf",
        mime: "application/pdf",
        isi: new Uint8Array([1]),
      }),
    ).rejects.toThrow("Pelanggan tidak ditemukan");

    expect(media.simpanUnggahanMedia).not.toHaveBeenCalled();
  });
});

describe("getDokumenKerjasama", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mengembalikan isi berkas pemilik desa yang sama", async () => {
    vi.mocked(repo.findPelanggan).mockResolvedValueOnce({
      ...pelangganDasar,
      dokumenKerjasama: "1/umum/baru.pdf",
      dokumenNama: "baru.pdf",
      dokumenMime: "application/pdf",
    });
    vi.mocked(media.bacaMedia).mockResolvedValueOnce(Buffer.from([37, 80, 68, 70]));

    const hasil = await getDokumenKerjasama(1, 5);

    expect(media.bacaMedia).toHaveBeenCalledWith("1/umum/baru.pdf");
    expect(hasil.row.dokumenNama).toBe("baru.pdf");
    expect([...hasil.isi]).toEqual([37, 80, 68, 70]);
  });

  it("melempar notFound bila pelanggan belum punya dokumen", async () => {
    vi.mocked(repo.findPelanggan).mockResolvedValueOnce(pelangganDasar);

    await expect(getDokumenKerjasama(1, 5)).rejects.toThrow("tidak ditemukan");
    expect(media.bacaMedia).not.toHaveBeenCalled();
  });
});

describe("ubahStatusLangganan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mengubah tanggal teks menjadi Date dan mengosongkan yang kosong", async () => {
    await ubahStatusLangganan(1, 5, {
      statusLangganan: "aktif",
      tanggalMulai: "2026-01-31",
      tanggalSelesai: "",
      noKerjasama: "PJ/07/2026",
      keteranganLangganan: "Perpanjangan",
    });

    const tanggal = vi.mocked(repo.updateStatusLangganan).mock.calls[0]?.[2]?.tanggalMulai;
    expect(tanggal).toBeInstanceOf(Date);
    expect((tanggal as Date).toISOString().startsWith("2026-01-31")).toBe(true);
    expect(repo.updateStatusLangganan).toHaveBeenCalledWith(
      5,
      1,
      expect.objectContaining({
        statusLangganan: "aktif",
        tanggalSelesai: null,
        noKerjasama: "PJ/07/2026",
      }),
    );
  });

  it("menolak status di luar empat nilai yang sah", async () => {
    await expect(ubahStatusLangganan(1, 5, { statusLangganan: "ditangguhkan" })).rejects.toThrow();

    expect(repo.updateStatusLangganan).not.toHaveBeenCalled();
  });
});
