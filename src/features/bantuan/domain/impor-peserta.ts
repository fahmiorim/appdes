/**
 * Impor peserta bantuan dari berkas.
 *
 * Berkas hanya **menautkan sasaran yang sudah ada** (penduduk, KK, RTM, atau
 * kelompok) ke sebuah program; data master tidak dibuat ulang. Kolom identitas
 * menyesuaikan sasaran program sehingga satu template tidak ambigu:
 *
 * - penduduk  → NIK
 * - keluarga  → No. KK
 * - rumah tangga → No. RTM
 * - kelompok  → kode kelompok
 *
 * Seluruh pencocokan di berkas ini murni (tanpa `db`) agar mudah diuji.
 */

import type { KolomImpor } from "@/lib/spreadsheet";

import {
  SASARAN_KELOMPOK,
  SASARAN_KELUARGA,
  SASARAN_RUMAH_TANGGA,
  type SasaranBantuan,
} from "./bantuan";

/** Kunci kolom impor peserta. */
export type KunciImporPeserta = "sasaran" | "nomorKartu" | "namaKartu";

/** Label kolom identitas sasaran menurut jenis sasaran program. */
export function sasaranKolomLabel(sasaran: number): string {
  if (sasaran === SASARAN_KELUARGA) return "No. KK";
  if (sasaran === SASARAN_RUMAH_TANGGA) return "No. RTM";
  if (sasaran === SASARAN_KELOMPOK) return "Kode Kelompok";
  return "NIK";
}

/** Alias header yang tetap diterima untuk kolom identitas sasaran. */
function sasaranKolomAlias(sasaran: number): readonly string[] {
  if (sasaran === SASARAN_KELUARGA) return ["no kk", "nomor kk", "kartu keluarga"];
  if (sasaran === SASARAN_RUMAH_TANGGA) return ["no rtm", "nomor rtm"];
  if (sasaran === SASARAN_KELOMPOK) return ["kode", "kode kelompok"];
  return ["nik", "nomor induk kependudukan"];
}

/**
 * Definisi kolom impor peserta untuk sebuah sasaran.
 *
 * Hanya identitas sasaran yang wajib; nomor & nama kartu boleh kosong dan akan
 * diisi dari data master sebagai nilai awal saat disimpan.
 */
export function kolomImporPeserta(sasaran: number): readonly KolomImpor<KunciImporPeserta>[] {
  return [
    {
      kunci: "sasaran",
      label: sasaranKolomLabel(sasaran),
      alias: sasaranKolomAlias(sasaran),
      wajib: true,
    },
    { kunci: "nomorKartu", label: "No. Kartu", alias: ["nomor kartu"] },
    { kunci: "namaKartu", label: "Nama pada Kartu", alias: ["nama kartu"] },
  ];
}

/** Satu baris impor peserta yang sudah tervalidasi bentuknya. */
export interface BarisImporPeserta {
  kode: string;
  nomorKartu: string;
  namaKartu: string;
}

/** Sasaran yang dapat dicocokkan dengan kode pada berkas. */
export interface SasaranImpor {
  id: number;
  kode: string;
  nama: string;
}

/** Satu peserta yang siap disimpan. */
export interface PesertaImporSiap {
  id: number;
  kode: string;
  nama: string;
  nomorKartu: string;
  namaKartu: string;
}

/** Hasil pencocokan berkas dengan sasaran desa. */
export interface RencanaImporPeserta {
  siap: PesertaImporSiap[];
  /** Baris yang tidak dapat dipakai beserta alasannya. */
  ditolak: Array<{ kode: string; pesan: string }>;
  /** Kode yang tidak ditemukan pada data sasaran desa. */
  tidakDitemukan: string[];
  /** Kode yang sudah menjadi peserta program ini. */
  sudahTerdaftar: string[];
}

/**
 * Normalisasi kode sasaran.
 *
 * Spasi di dalam kode dibuang dan huruf diseragamkan menjadi kapital supaya
 * "3201 0101..." dan "kel-001" tetap cocok dengan data master.
 */
export function normalisasiKode(kode: string): string {
  return kode.trim().replace(/\s+/g, "").toUpperCase();
}

/**
 * Susun rencana impor peserta.
 *
 * Aturan:
 * - kode kosong / ganda pada berkas ditolak dengan pesan;
 * - kode yang tidak ada di data sasaran desa dilaporkan (bukan gagal total);
 * - sasaran yang sudah menjadi peserta dilewati agar impor idempoten.
 */
export function rencanaImporPeserta(
  rows: readonly BarisImporPeserta[],
  sasaran: readonly SasaranImpor[],
  terdaftar: ReadonlySet<number>,
): RencanaImporPeserta {
  const peta = new Map<string, SasaranImpor>();
  for (const item of sasaran) {
    const kode = normalisasiKode(item.kode);
    if (kode !== "" && !peta.has(kode)) peta.set(kode, item);
  }

  const rencana: RencanaImporPeserta = {
    siap: [],
    ditolak: [],
    tidakDitemukan: [],
    sudahTerdaftar: [],
  };
  const terlihat = new Set<string>();

  for (const row of rows) {
    const kode = normalisasiKode(row.kode);

    if (kode === "") {
      rencana.ditolak.push({ kode: row.kode, pesan: "Kode sasaran kosong." });
      continue;
    }

    if (terlihat.has(kode)) {
      rencana.ditolak.push({
        kode,
        pesan: `Kode ${kode} muncul lebih dari sekali pada berkas.`,
      });
      continue;
    }
    terlihat.add(kode);

    const target = peta.get(kode);
    if (!target) {
      rencana.tidakDitemukan.push(kode);
      continue;
    }

    if (terdaftar.has(target.id)) {
      rencana.sudahTerdaftar.push(kode);
      continue;
    }

    rencana.siap.push({
      id: target.id,
      kode,
      nama: target.nama,
      nomorKartu: row.nomorKartu.trim(),
      namaKartu: row.namaKartu.trim(),
    });
  }

  return rencana;
}

/** Satu sel CSV dengan kutip ganda (RFC 4180). */
function sel(nilai: string): string {
  return `"${nilai.replace(/"/g, '""')}"`;
}

/** Contoh kode sasaran pada template menurut jenis sasaran. */
function contohKode(sasaran: number): string {
  if (sasaran === SASARAN_KELUARGA) return "3201012001000001";
  if (sasaran === SASARAN_RUMAH_TANGGA) return "RTM-001";
  if (sasaran === SASARAN_KELOMPOK) return "KEL-001";
  return "3201010101010001";
}

/**
 * Template CSV impor peserta.
 *
 * Header mengikuti `kolomImporPeserta` sehingga berkas hasil unduhan dapat
 * langsung dibaca kembali oleh pemeta kolom yang sama.
 */
export function templateImporPeserta(sasaran: number): string {
  const baris = [
    kolomImporPeserta(sasaran).map((kolom) => kolom.label),
    [contohKode(sasaran), "KARTU-001", "Nama Penerima"],
  ];

  return `\uFEFF${baris.map((row) => row.map(sel).join(",")).join("\r\n")}\r\n`;
}

/** Nama berkas template (aman untuk diunduh). */
export function namaBerkasTemplateImporPeserta(sasaran: SasaranBantuan | number): string {
  const label = sasaranKolomLabel(sasaran)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  return `template-peserta-${label}.csv`;
}
