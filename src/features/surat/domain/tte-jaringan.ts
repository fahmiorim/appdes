/**
 * Kebijakan jaringan adapter TTE: validasi URL provider dan hasil resolusi DNS.
 *
 * Semua pemeriksaan dilakukan sekali di sini, lalu alamat IP yang sudah
 * divalidasi dipakai ulang oleh transport (`TransportTte`) sehingga tidak ada
 * resolusi DNS kedua yang dapat berubah (DNS rebinding). Modul ini tidak
 * melakukan I/O sendiri: resolver dan transport disuntikkan.
 */

import { hostTerlarang, klasifikasiAlamat } from "./tte-alamat";

export interface AlamatDns {
  alamat: string;
  family: number;
}

/** Menyelesaikan hostname menjadi seluruh alamat A/AAAA-nya. */
export type ResolverDns = (hostname: string) => Promise<AlamatDns[]>;

export interface PermintaanHttpTte {
  method: string;
  headers: Record<string, string>;
  body?: Uint8Array;
  /** Batas waktu total operasi; dipakai juga sebagai sinyal pembatalan. */
  signal: AbortSignal;
}

export interface ResponsTte {
  status: number;
  header: (nama: string) => string | null;
  /** Baca body dengan batas byte; melempar bila melebihi `maksByte`. */
  baca: (maksByte: number) => Promise<Uint8Array>;
}

/**
 * Transport HTTP/1.1 ke satu alamat IP yang sudah divalidasi. Implementasi
 * wajib memakai `alamat` sebagai tujuan koneksi (bukan resolusi ulang), tetap
 * mengirim SNI/hostname asli, dan tidak melemahkan verifikasi sertifikat.
 */
export type TransportTte = (
  url: URL,
  permintaan: PermintaanHttpTte,
  alamat: string,
) => Promise<ResponsTte>;

export interface DependensiTte {
  transport: TransportTte;
  resolver: ResolverDns;
}

export interface UrlProviderTervalidasi {
  url: URL;
  /** Seluruh alamat hasil validasi; koneksi memakai `alamat[0]`. */
  alamat: AlamatDns[];
}

export interface PemeriksaanUrl {
  url: URL | null;
  masalah: string[];
}

function normalisasiHostname(hostname: string): string {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  const tanpaKurung = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  return tanpaKurung;
}

/**
 * Pemeriksaan statis (tanpa DNS) untuk satu URL provider TTE. Dipakai bersama
 * oleh validasi runtime, form admin, dan daftar masalah konfigurasi agar pesan
 * serta aturannya identik.
 */
export function periksaUrlProviderStatis(mentah: string): PemeriksaanUrl {
  const teks = mentah.trim();
  if (teks === "") return { url: null, masalah: ["URL API BSrE belum diisi."] };

  let url: URL;
  try {
    url = new URL(teks);
  } catch {
    return { url: null, masalah: ["URL API BSrE tidak valid."] };
  }

  const masalah: string[] = [];
  if (url.protocol !== "https:") masalah.push("URL API BSrE wajib menggunakan HTTPS.");
  if (url.username !== "" || url.password !== "") {
    masalah.push("URL API BSrE tidak boleh memuat kredensial.");
  }
  if (url.search !== "" || url.hash !== "") {
    masalah.push("URL API BSrE tidak boleh memuat query atau fragment.");
  }

  const host = normalisasiHostname(url.hostname);
  if (host === "") {
    masalah.push("URL API BSrE tidak memuat host.");
  } else {
    const kelas = klasifikasiAlamat(host);
    if (kelas.adalahIp && !kelas.publik) {
      masalah.push("URL API BSrE tidak boleh menunjuk alamat IP internal.");
    } else if (!kelas.adalahIp && hostTerlarang(host)) {
      masalah.push("URL API BSrE tidak boleh menunjuk host internal.");
    }
  }

  return { url: masalah.length === 0 ? url : null, masalah };
}

/**
 * Validasi penuh URL provider: aturan statis + resolusi DNS. Seluruh alamat
 * A/AAAA harus publik; satu alamat internal menggagalkan seluruh permintaan.
 */
export async function validasiUrlProvider(
  mentah: string,
  resolver: ResolverDns,
): Promise<UrlProviderTervalidasi> {
  const statis = periksaUrlProviderStatis(mentah);
  if (!statis.url) throw new Error(statis.masalah[0] ?? "URL API BSrE tidak valid.");

  const url = statis.url;
  const host = normalisasiHostname(url.hostname);
  const kelas = klasifikasiAlamat(host);
  if (kelas.adalahIp) {
    return { url, alamat: [{ alamat: host, family: host.includes(":") ? 6 : 4 }] };
  }

  let hasil: AlamatDns[];
  try {
    hasil = await resolver(host);
  } catch {
    throw new Error("Host provider TTE tidak dapat diresolusi.");
  }
  if (hasil.length === 0) throw new Error("Host provider TTE tidak dapat diresolusi.");

  for (const alamat of hasil) {
    const periksa = klasifikasiAlamat(alamat.alamat);
    if (!periksa.adalahIp || !periksa.publik) {
      throw new Error("Host provider TTE menunjuk alamat internal.");
    }
  }

  return { url, alamat: hasil };
}

/**
 * Validasi URL berkas hasil tanda tangan dari respons provider.
 *
 * URL relatif diselesaikan terhadap base provider (path prefix dipertahankan),
 * wajib HTTPS, dan wajib satu origin dengan provider. Alamat IP yang dipakai
 * adalah hasil validasi awal — tanpa resolusi ulang, sehingga DNS rebinding
 * antara permintaan tanda tangan dan unduhan tidak mungkin terjadi.
 */
export function validasiUrlBerkas(
  mentah: string,
  dasar: UrlProviderTervalidasi,
): UrlProviderTervalidasi {
  const dasarUrl = new URL(dasar.url.href.endsWith("/") ? dasar.url.href : `${dasar.url.href}/`);

  let url: URL;
  try {
    url = new URL(mentah, dasarUrl);
  } catch {
    throw new Error("URL berkas hasil TTE tidak valid.");
  }

  if (url.protocol !== "https:") {
    throw new Error("URL berkas hasil TTE wajib menggunakan HTTPS.");
  }
  if (url.username !== "" || url.password !== "") {
    throw new Error("URL berkas hasil TTE tidak boleh memuat kredensial.");
  }
  if (url.origin !== dasarUrl.origin) {
    throw new Error("URL berkas hasil TTE harus berasal dari origin provider yang sama.");
  }

  return { url, alamat: dasar.alamat };
}
