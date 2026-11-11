import { selCsv } from "@/lib/spreadsheet";

/**
 * Keluaran resmi buku administrasi desa (cetak + CSV).
 *
 * Modul ini **murni** (tanpa `db`/sesi/`server-only`) agar dapat diuji sendiri
 * dan dipakai ulang lapisan presentation untuk menyusun kop desa, tabel buku,
 * dan berkas CSV dengan format yang seragam di semua buku (umum, penduduk,
 * tanah kas, pembangunan, sekretariat).
 */

/** Bidang identitas desa yang dibutuhkan untuk menyusun kop cetak. */
export interface KopDesa {
  namaDesa: string | null;
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
  alamatKantor: string | null;
  telepon: string | null;
  emailDesa: string | null;
}

/**
 * Baris judul kop desa, dari atas ke bawah, sesuai kebiasaan tata naskah desa:
 * `PEMERINTAH PROVINSI …`, `KABUPATEN …`, `KECAMATAN …`, `DESA …`.
 * Baris kosong (identitas belum diisi) dibuang; minimal tersisa "PEMERINTAH DESA".
 */
export function kopDesaLines(desa: KopDesa): string[] {
  const lines = [
    desa.namaPropinsi ? `PEMERINTAH PROVINSI ${desa.namaPropinsi.toUpperCase()}` : null,
    desa.namaKabupaten ? `KABUPATEN ${desa.namaKabupaten.toUpperCase()}` : null,
    desa.namaKecamatan ? `KECAMATAN ${desa.namaKecamatan.toUpperCase()}` : null,
    desa.namaDesa ? `DESA ${desa.namaDesa.toUpperCase()}` : "PEMERINTAH DESA",
  ].filter((line): line is string => line !== null);
  return lines;
}

/** Baris alamat kantor untuk di bawah kop (alamat · telp · email), atau `""`. */
export function kopDesaAlamat(desa: KopDesa): string {
  return [desa.alamatKantor, desa.telepon ? `Telp. ${desa.telepon}` : null, desa.emailDesa]
    .filter((bagian): bagian is string => Boolean(bagian))
    .join(" | ");
}

/** Satu nilai sel buku resmi; `null`/`undefined` ditampilkan sebagai kosong. */
export type SelBuku = string | number | null | undefined;

/** Tabel buku resmi siap cetak/ekspor: identitas buku + kolom + baris. */
export interface BukuResmiTabel {
  kodeBuku: string;
  namaBuku: string;
  kolom: readonly string[];
  baris: readonly (readonly SelBuku[])[];
}

/**
 * CSV satu buku resmi dengan BOM UTF-8 dan akhir baris CRLF, agar terbuka rapi
 * di Excel/LibreOffice. Setiap sel dikutip aman lewat `selCsv`.
 */
export function bukuResmiCsv(tabel: BukuResmiTabel): string {
  const header = tabel.kolom.map((kolom) => selCsv(kolom)).join(",");
  const baris = tabel.baris.map((row) => row.map((sel) => selCsv(sel ?? "")).join(","));
  return `\uFEFF${[header, ...baris].join("\r\n")}\r\n`;
}

/** Potongan nama berkas yang aman dari nama desa (huruf kecil, tanpa simbol). */
function slugDesa(namaDesa: string | null): string {
  const slug = (namaDesa ?? "desa")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "desa";
}

/** Nama berkas CSV satu buku: `buku-<kode>-<desa>-<tanggal>.csv`. */
export function namaBerkasBuku(
  kodeBuku: string,
  namaDesa: string | null,
  now: Date = new Date(),
): string {
  const tanggal = now.toISOString().slice(0, 10);
  return `buku-${kodeBuku.toLowerCase()}-${slugDesa(namaDesa)}-${tanggal}.csv`;
}

/** Satu item buku administrasi umum/sekretariat generik. */
export interface ItemBukuBaris {
  nomorUrut: number;
  tanggal: string | null;
  uraian: string;
  keterangan: string | null;
}

/** Kolom standar buku administrasi generik (A1–A8, B1–B5, E1). */
export const KOLOM_ITEM_BUKU = ["No. Urut", "Tanggal", "Uraian", "Keterangan"] as const;

/** Susun tabel resmi dari item buku administrasi generik. */
export function tabelItemBuku(
  kodeBuku: string,
  namaBuku: string,
  items: readonly ItemBukuBaris[],
): BukuResmiTabel {
  return {
    kodeBuku,
    namaBuku,
    kolom: KOLOM_ITEM_BUKU,
    baris: items.map((item) => [
      item.nomorUrut,
      item.tanggal ?? "",
      item.uraian,
      item.keterangan ?? "",
    ]),
  };
}

const BULAN_INDONESIA = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/**
 * Format tanggal ISO (`YYYY-MM-DD`) menjadi `D Bulan YYYY` (mis. `4 November
 * 2026`) untuk blok tanda tangan. Nilai kosong/takvalid dikembalikan apa adanya.
 */
export function formatTanggalIndonesia(iso: string | null | undefined): string {
  if (!iso) return "";
  const cocok = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!cocok) return iso;
  const tahun = Number(cocok[1]);
  const bulan = Number(cocok[2]);
  const hari = Number(cocok[3]);
  const namaBulan = BULAN_INDONESIA[bulan - 1];
  if (!namaBulan) return iso;
  return `${hari} ${namaBulan} ${tahun}`;
}

/** Kolom buku mutasi penduduk (B3) sesuai format resmi. */
export const KOLOM_MUTASI_PENDUDUK = [
  "No. Urut",
  "Tanggal",
  "Jenis Mutasi",
  "Uraian / Keterangan",
] as const;

/** Baris mutasi penduduk. */
export interface BarisMutasiPenduduk {
  nomorUrut: number;
  tanggal: string | null;
  jenisMutasi: string;
  keterangan: string | null;
}

/** Susun tabel resmi buku mutasi penduduk. */
export function tabelMutasiPenduduk(
  kodeBuku: string,
  namaBuku: string,
  baris: readonly BarisMutasiPenduduk[],
): BukuResmiTabel {
  return {
    kodeBuku,
    namaBuku,
    kolom: KOLOM_MUTASI_PENDUDUK,
    baris: baris.map((item) => [
      item.nomorUrut,
      item.tanggal ?? "",
      item.jenisMutasi,
      item.keterangan ?? "",
    ]),
  };
}

/** Kolom Buku Tanah Kas Desa (E1/A5) - format resmi. */
export const KOLOM_TANAH_KAS = [
  "No. Urut",
  "Nomor Persil",
  "Asal Tanah",
  "Luas (m²)",
  "Letak / Lokasi",
  "Status",
  "Nilai (Rp)",
  "Keterangan",
] as const;

export interface BarisTanahKas {
  nomorUrut: number;
  nomorPersil: string;
  asal: string | null;
  luas: string | number | null;
  lokasi: string | null;
  status: string | null;
  nilai: string | number | null;
  keterangan: string | null;
}

export function tabelTanahKas(
  kodeBuku: string,
  namaBuku: string,
  baris: readonly BarisTanahKas[],
): BukuResmiTabel {
  return {
    kodeBuku,
    namaBuku,
    kolom: KOLOM_TANAH_KAS,
    baris: baris.map((item) => [
      item.nomorUrut,
      item.nomorPersil,
      item.asal ?? "",
      item.luas ?? "",
      item.lokasi ?? "",
      item.status ?? "",
      item.nilai ?? "",
      item.keterangan ?? "",
    ]),
  };
}

/** Kolom mutasi tanah kas. */
export const KOLOM_MUTASI_TANAH_KAS = [
  "No. Urut",
  "Tanggal",
  "Jenis Mutasi",
  "Uraian",
  "Perubahan Luas (m²)",
  "Perubahan Nilai (Rp)",
  "Keterangan",
] as const;

export interface BarisMutasiTanahKas {
  nomorUrut: number;
  tanggal: string;
  jenis: string;
  uraian: string;
  luasPerubahan: string | number | null;
  nilaiPerubahan: string | number | null;
  keterangan: string | null;
}

export function tabelMutasiTanahKas(
  kodeBuku: string,
  namaBuku: string,
  baris: readonly BarisMutasiTanahKas[],
): BukuResmiTabel {
  return {
    kodeBuku,
    namaBuku,
    kolom: KOLOM_MUTASI_TANAH_KAS,
    baris: baris.map((item) => [
      item.nomorUrut,
      item.tanggal,
      item.jenis,
      item.uraian,
      item.luasPerubahan ?? "",
      item.nilaiPerubahan ?? "",
      item.keterangan ?? "",
    ]),
  };
}

/** Kolom Buku Pembangunan. */
export const KOLOM_PEMBANGUNAN = [
  "No. Urut",
  "Tahun",
  "Nama Kegiatan",
  "Lokasi",
  "Volume",
  "Sumber Dana",
  "Biaya (Rp)",
  "Pelaksana",
  "Status",
  "Tanggal Mulai",
  "Tanggal Selesai",
  "Hasil",
  "Keterangan",
] as const;

export interface BarisPembangunan {
  nomorUrut: number;
  tahun: number;
  namaKegiatan: string;
  lokasi: string | null;
  volume: string | null;
  sumberDana: string | null;
  biaya: string | number | null;
  pelaksana: string | null;
  status: string;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  hasil: string | null;
  keterangan: string | null;
}

export function tabelPembangunan(
  kodeBuku: string,
  namaBuku: string,
  baris: readonly BarisPembangunan[],
): BukuResmiTabel {
  return {
    kodeBuku,
    namaBuku,
    kolom: KOLOM_PEMBANGUNAN,
    baris: baris.map((item) => [
      item.nomorUrut,
      item.tahun,
      item.namaKegiatan,
      item.lokasi ?? "",
      item.volume ?? "",
      item.sumberDana ?? "",
      item.biaya ?? "",
      item.pelaksana ?? "",
      item.status,
      item.tanggalMulai ?? "",
      item.tanggalSelesai ?? "",
      item.hasil ?? "",
      item.keterangan ?? "",
    ]),
  };
}

/** Kolom Buku Kader Pembangunan. */
export const KOLOM_KADER = [
  "No. Urut",
  "Nama",
  "Jabatan",
  "Bidang",
  "Alamat",
  "No. HP",
  "Keterangan",
] as const;

export interface BarisKader {
  nomorUrut: number;
  nama: string;
  jabatan: string | null;
  bidang: string | null;
  alamat: string | null;
  noHp: string | null;
  keterangan: string | null;
}

export function tabelKader(
  kodeBuku: string,
  namaBuku: string,
  baris: readonly BarisKader[],
): BukuResmiTabel {
  return {
    kodeBuku,
    namaBuku,
    kolom: KOLOM_KADER,
    baris: baris.map((item) => [
      item.nomorUrut,
      item.nama,
      item.jabatan ?? "",
      item.bidang ?? "",
      item.alamat ?? "",
      item.noHp ?? "",
      item.keterangan ?? "",
    ]),
  };
}

/** Kolom Buku Peraturan Desa / Keputusan Kades (Sekretariat). */
export const KOLOM_PERATURAN = [
  "No. Urut",
  "Jenis",
  "Nomor",
  "Tahun",
  "Tentang",
  "Tanggal Ditetapkan",
  "Tanggal Diundangkan",
  "Keterangan",
] as const;

export interface BarisPeraturan {
  nomorUrut: number;
  jenis: string;
  nomor: string;
  tahun: number | null;
  tentang: string;
  tanggalDitetapkan: string | null;
  tanggalDiundangkan: string | null;
  keterangan: string | null;
}

export function tabelPeraturan(
  kodeBuku: string,
  namaBuku: string,
  baris: readonly BarisPeraturan[],
): BukuResmiTabel {
  return {
    kodeBuku,
    namaBuku,
    kolom: KOLOM_PERATURAN,
    baris: baris.map((item) => [
      item.nomorUrut,
      item.jenis,
      item.nomor,
      item.tahun ?? "",
      item.tentang,
      item.tanggalDitetapkan ?? "",
      item.tanggalDiundangkan ?? "",
      item.keterangan ?? "",
    ]),
  };
}

/** Kolom Buku Data Aparat Pemerintah Desa. */
export const KOLOM_APARAT = [
  "No. Urut",
  "Nama",
  "NIP",
  "Jabatan",
  "Tempat/Tgl Lahir",
  "Pendidikan",
  "No. SK Pengangkatan",
  "Tgl Pengangkatan",
  "No. SK Pemberhentian",
  "Tgl Pemberhentian",
  "Keterangan",
] as const;

export interface BarisAparat {
  nomorUrut: number;
  nama: string;
  nip: string | null;
  jabatan: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  pendidikan: string | null;
  nomorSkPengangkatan: string | null;
  tanggalPengangkatan: string | null;
  nomorSkPemberhentian: string | null;
  tanggalPemberhentian: string | null;
  keterangan: string | null;
}

export function tabelAparat(
  kodeBuku: string,
  namaBuku: string,
  baris: readonly BarisAparat[],
): BukuResmiTabel {
  return {
    kodeBuku,
    namaBuku,
    kolom: KOLOM_APARAT,
    baris: baris.map((item) => [
      item.nomorUrut,
      item.nama,
      item.nip ?? "",
      item.jabatan,
      [item.tempatLahir, item.tanggalLahir].filter(Boolean).join(", ") || "",
      item.pendidikan ?? "",
      item.nomorSkPengangkatan ?? "",
      item.tanggalPengangkatan ?? "",
      item.nomorSkPemberhentian ?? "",
      item.tanggalPemberhentian ?? "",
      item.keterangan ?? "",
    ]),
  };
}

/** Kolom Buku Agenda (Surat Masuk/Keluar) / Ekspedisi. */
export const KOLOM_AGENDA = [
  "No. Urut",
  "Jenis",
  "Tanggal",
  "Nomor Surat",
  "Asal / Tujuan",
  "Perihal",
  "Keterangan",
] as const;

export interface BarisAgenda {
  nomorUrut: number;
  jenis: string;
  tanggal: string;
  nomorSurat: string | null;
  asalTujuan: string | null;
  perihal: string;
  keterangan: string | null;
}

export function tabelAgenda(
  kodeBuku: string,
  namaBuku: string,
  baris: readonly BarisAgenda[],
): BukuResmiTabel {
  return {
    kodeBuku,
    namaBuku,
    kolom: KOLOM_AGENDA,
    baris: baris.map((item) => [
      item.nomorUrut,
      item.jenis,
      item.tanggal,
      item.nomorSurat ?? "",
      item.asalTujuan ?? "",
      item.perihal,
      item.keterangan ?? "",
    ]),
  };
}
