/**
 * Adapter Tanda Tangan Elektronik (TTE) / BSrE.
 *
 * OpenSID memanggil server BSRE (`api/sign/pdf`) setelah verifikasi Kepala
 * Desa untuk menimpa berkas PDF surat dengan hasil tanda tangan elektronik.
 *
 * Lapisan ini tidak melakukan I/O implisit: konfigurasi desa dibaca dari
 * `tte_config` oleh pemanggil, kredensial rahasia tetap berasal dari
 * environment (`TTE_PASSWORD`), dan transport jaringan disuntik agar dapat
 * diuji tanpa server BSRE.
 *
 * Hardening jaringan:
 * - URL provider wajib HTTPS, tanpa kredensial/query/fragment, dan tidak boleh
 *   menunjuk alamat internal (lihat `tte-jaringan.ts` / `tte-alamat.ts`).
 * - URL berkas hasil provider wajib satu origin dengan provider.
 * - Alamat IP hasil resolusi dipakai ulang saat koneksi (`TransportTte`) agar
 *   tidak ada resolusi DNS kedua yang dapat berubah (DNS rebinding).
 * - Redirect tidak diikuti, respons dibatasi ukurannya, dan seluruh operasi
 *   tunduk pada satu batas waktu total.
 * - Verifikasi sertifikat TLS tidak dapat dimatikan oleh konfigurasi.
 *
 * Mode `nonaktif` (default) dan `manual` tidak pernah memblokir penerbitan
 * surat. Kegagalan provider juga hanya dicatat; surat tetap terbit.
 */

import { z } from "zod";

import {
  periksaUrlProviderStatis,
  urlDiizinkan,
  validasiUrlBerkas,
  validasiUrlProvider,
  type DependensiTte,
  type PermintaanHttpTte,
  type ResponsTte,
  type UrlProviderTervalidasi,
} from "./tte-jaringan";

/** Mode adapter yang dikenal. `manual` menandai surat setelah ttd basah. */
export type ModeTte = "nonaktif" | "manual" | "bsre";

export interface KonfigTte {
  mode: ModeTte;
  /** Base URL server BSRE, mis. `https://tte.example.go.id`. Wajib HTTPS. */
  api: string;
  username: string;
  /** NIK penanda tangan yang dikirim ke provider BSrE. */
  nik: string;
  /** Passphrase/kredensial — jangan pernah dicetak ke log. */
  password: string;
  /**
   * Batas waktu total satu operasi TTE (termasuk retry dan unduhan) dalam
   * milidetik. Default 30000.
   */
  timeout: number;
}

/**
 * Konfigurasi non-rahasia yang disimpan per desa.
 *
 * Passphrase TIDAK disimpan di basis data; nilainya dibaca dari environment
 * deployment (`TTE_PASSWORD`) agar tidak ikut backup database.
 */
export interface KonfigTteTersimpan {
  provider: "bsre";
  mode: ModeTte;
  api: string;
  username: string;
  nik: string;
  aktif: boolean;
  /** Timeout operasi (ms). Disimpan untuk kompatibilitas; diisi dari env saat runtime. */
  timeout?: number;
}

/**
 * Skema konfigurasi tersimpan. Field `ssl` lama tetap diterima agar baris
 * `tte_config` yang sudah ada tidak rusak, tetapi nilainya **diabaikan**:
 * verifikasi sertifikat TLS selalu aktif.
 */
export const konfigTteTersimpanSchema = z.object({
  provider: z.literal("bsre").default("bsre"),
  mode: z.enum(["nonaktif", "manual", "bsre"]).default("nonaktif"),
  api: z.string().trim().max(300).default(""),
  username: z.string().trim().max(150).default(""),
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK penanda tangan harus 16 digit.")
    .or(z.literal(""))
    .default(""),
  ssl: z.boolean().optional(),
  aktif: z.boolean().default(false),
  timeout: z.number().optional(),
});

/** Skema isian form admin (nilai mentah dari FormData). */
export const konfigTteFormSchema = z
  .object({
    mode: z.enum(["nonaktif", "manual", "bsre"], {
      message: "Pilih mode TTE yang valid.",
    }),
    api: z.string().trim().max(300, "URL API maksimal 300 karakter."),
    username: z.string().trim().max(150, "Username maksimal 150 karakter."),
    nik: z
      .string()
      .trim()
      .regex(/^\d{16}$/, "NIK penanda tangan harus 16 digit.")
      .or(z.literal("")),
    aktif: z.boolean(),
  })
  .superRefine((nilai, ctx) => {
    if (nilai.api === "") return;
    const { masalah } = periksaUrlProviderStatis(nilai.api);
    if (masalah.length > 0) {
      ctx.addIssue({ code: "custom", path: ["api"], message: masalah[0] });
    }
  });

export type KonfigTteFormInput = z.infer<typeof konfigTteFormSchema>;

/** Nilai awal saat desa belum pernah menyimpan konfigurasi. */
export const KONFIG_TTE_DEFAULT: KonfigTteTersimpan = {
  provider: "bsre",
  mode: "nonaktif",
  api: "",
  username: "",
  nik: "",
  aktif: false,
};

export interface PermintaanTte {
  villageId: number;
  suratId: number;
  /** Nomor surat, untuk metadata arsip hasil TTE. */
  nomor: string;
  /** Berkas PDF yang akan ditandatangani. */
  pdf: Uint8Array;
}

/** Hasil percobaan TTE; `ok: false` tidak memblokir penerbitan surat. */
export type HasilTte =
  | { ok: true; mode: "bsre"; suratId: number; pdf: Uint8Array }
  | { ok: false; mode: ModeTte; alasan: string };

/** Batas byte respons PDF hasil tanda tangan (20 MB, sama dengan batas API). */
export const BATAS_RESPONS_PDF = 20 * 1024 * 1024;

/** Batas byte respons JSON metadata provider (1 MB). */
export const BATAS_RESPONS_JSON = 1024 * 1024;

/** Jumlah percobaan ulang tambahan setelah percobaan pertama. */
const MAKS_PERCOBAAN = 3;

/** Jeda dasar backoff eksponensial (1s, 2s, 4s). */
const JEDA_DASAR_MS = 1000;

/** Batas waktu total bawaan bila konfigurasi tidak masuk akal. */
const BATAS_WAKTU_BAWAAN_MS = 30_000;

/** Batas atas batas waktu agar satu permintaan tidak menahan server terlalu lama. */
const BATAS_WAKTU_MAKS_MS = 5 * 60_000;

/** Konfigurasi TTE tidak lengkap untuk mode bsre. */
export function siapTte(config: KonfigTte): boolean {
  return (
    config.mode === "bsre" &&
    config.api !== "" &&
    config.username !== "" &&
    config.nik.length === 16 &&
    config.password !== ""
  );
}

/**
 * Baca konfigurasi TTE dari lingkungan (variabel `TTE_*`). Nilai tak dikenal
 * jatuh aman ke mode `nonaktif` — penerbitan surat tidak pernah gagal karena
 * salah ketik konfigurasi.
 *
 * `TTE_SSL` tidak lagi dibaca: verifikasi sertifikat TLS selalu aktif.
 */
export function parseKonfigTte(env: Readonly<Record<string, string | undefined>>): KonfigTte {
  const modeRaw = (env.TTE_MODE ?? "").trim().toLowerCase();
  const mode: ModeTte =
    modeRaw === "bsre" || modeRaw === "manual" ? (modeRaw as ModeTte) : "nonaktif";

  return {
    mode,
    api: (env.TTE_API ?? "").trim(),
    username: (env.TTE_USERNAME ?? "").trim(),
    nik: (env.TTE_NIK ?? "").trim(),
    password: env.TTE_PASSWORD ?? "",
    timeout: Number(env.TTE_TIMEOUT ?? String(BATAS_WAKTU_BAWAAN_MS)),
  };
}

/**
 * Baca konfigurasi tersimpan (JSON di `tte_config.konfigurasi`).
 *
 * Data rusak atau tidak lengkap menghasilkan `null`; pemanggil memakai nilai
 * default aman. Ini menjaga surat tetap dapat terbit walau baris konfigurasi
 * pernah diubah manual.
 */
export function parseKonfigTteTersimpan(raw: string | null | undefined): KonfigTteTersimpan | null {
  if (!raw || raw.trim() === "") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = konfigTteTersimpanSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/** Serialisasi konfigurasi tersimpan (hanya field non-rahasia). */
export function serializeKonfigTteTersimpan(config: KonfigTteTersimpan): string {
  return JSON.stringify(config);
}

/**
 * Gabungkan konfigurasi desa dengan kredensial lingkungan.
 *
 * Konfigurasi desa menang untuk pilihan mode/API/penanda tangan; passphrase
 * selalu dari environment. Bila desa belum menyimpan konfigurasi, nilai
 * environment dipakai apa adanya (kompatibel dengan deployment lama).
 */
export function gabungKonfigTte(
  envConfig: KonfigTte,
  tersimpan: KonfigTteTersimpan | null,
): KonfigTte {
  if (!tersimpan) return envConfig;
  if (!tersimpan.aktif || tersimpan.mode === "nonaktif") {
    return { ...envConfig, mode: "nonaktif" };
  }

  return {
    mode: tersimpan.mode,
    api: tersimpan.api,
    username: tersimpan.username,
    nik: tersimpan.nik,
    // Passphrase tidak pernah dibaca dari basis data.
    password: envConfig.password,
    timeout: tersimpan.timeout ?? envConfig.timeout,
  };
}

/**
 * Daftar alasan konfigurasi belum siap dipakai, untuk ditampilkan di admin.
 * Kosong berarti konfigurasi BSrE lengkap dan diizinkan platform.
 *
 * Memakai aturan URL yang sama dengan validasi runtime agar konfigurasi yang
 * lolos di form tidak gagal saat surat ditandatangani. `opsi.allowedHosts`
 * diisi hasil `parseAllowlistProvider(env.TTE_ALLOWED_HOSTS)`; bila diberikan,
 * host di luar allowlist dilaporkan sebagai masalah.
 */
export function masalahKonfigTte(
  config: KonfigTte,
  opsi: { allowedHosts?: readonly string[] } = {},
): string[] {
  if (config.mode !== "bsre") return [];

  const masalah: string[] = [];
  if (config.api === "") {
    masalah.push("URL API BSrE belum diisi.");
  } else {
    const statis = periksaUrlProviderStatis(config.api);
    masalah.push(...statis.masalah);
    if (statis.url && opsi.allowedHosts) {
      if (opsi.allowedHosts.length === 0) {
        masalah.push(
          "Allowlist provider TTE belum diatur (TTE_ALLOWED_HOSTS); semua provider ditolak.",
        );
      } else if (!urlDiizinkan(statis.url, opsi.allowedHosts)) {
        masalah.push(
          "Host provider TTE tidak diizinkan oleh allowlist platform (TTE_ALLOWED_HOSTS).",
        );
      }
    }
  }
  if (config.username === "") masalah.push("Username BSrE belum diisi.");
  if (config.nik.length !== 16) masalah.push("NIK penanda tangan harus 16 digit.");
  if (config.password === "") {
    masalah.push("Passphrase belum tersedia di server (environment TTE_PASSWORD).");
  }

  return masalah;
}

/** Alamat tujuan koneksi: alamat pertama hasil validasi DNS/IP.
 *
 * `validasiUrlProvider` sudah menolak daftar kosong; helper ini hanya
 * mempersempit tipe agar indeks tidak diakses tanpa pemeriksaan.
 *
 * Failover ke alamat berikutnya belum diterapkan (F-01, deferred): semua
 * alamat tetap divalidasi publik, tetapi hanya alamat pertama yang dipakai —
 * tidak pernah ada fallback ke alamat yang belum lolos validasi.
 */
function alamatTujuan(daftar: readonly { alamat: string }[]): string {
  const alamat = daftar[0];
  if (!alamat) throw new Error("Host provider TTE tidak dapat diresolusi.");
  return alamat.alamat;
}

/** Klien jaringan BSrE: menerima PDF, mengembalikan PDF bertanda tangan. */
export type KlienTte =
  ((permintaan: PermintaanTte, config: KonfigTte) => Promise<Uint8Array>) | null;

/** Apakah byte diawali tanda tangan berkas PDF (`%PDF-`). */
export function adalahPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function cariUrlBerkas(nilai: unknown, kedalaman = 0): string | null {
  if (kedalaman > 4 || nilai === null || typeof nilai !== "object") return null;

  if (Array.isArray(nilai)) {
    for (const item of nilai) {
      const hasil = cariUrlBerkas(item, kedalaman + 1);
      if (hasil) return hasil;
    }
    return null;
  }

  const obj = nilai as Record<string, unknown>;
  for (const kunci of ["url", "file", "link", "signed_file"]) {
    const kandidat = obj[kunci];
    if (typeof kandidat === "string" && kandidat.trim() !== "") return kandidat.trim();
  }

  for (const item of Object.values(obj)) {
    const hasil = cariUrlBerkas(item, kedalaman + 1);
    if (hasil) return hasil;
  }

  return null;
}

function cariPdfBase64(nilai: unknown, kedalaman = 0): Uint8Array | null {
  if (kedalaman > 4 || nilai === null || typeof nilai !== "object") return null;

  if (Array.isArray(nilai)) {
    for (const item of nilai) {
      const hasil = cariPdfBase64(item, kedalaman + 1);
      if (hasil) return hasil;
    }
    return null;
  }

  const obj = nilai as Record<string, unknown>;
  for (const kunci of ["pdf", "signed_pdf", "berkas"]) {
    const kandidat = obj[kunci];
    if (typeof kandidat === "string" && kandidat.trim() !== "") {
      try {
        const bytes = Uint8Array.from(atob(kandidat.trim()), (c) => c.charCodeAt(0));
        if (adalahPdf(bytes)) return bytes;
      } catch {
        // Bukan base64 yang sah; lanjut mencari di kunci lain.
      }
    }
  }

  for (const item of Object.values(obj)) {
    const hasil = cariPdfBase64(item, kedalaman + 1);
    if (hasil) return hasil;
  }

  return null;
}

function batasWaktuOperasi(config: KonfigTte): number {
  const nilai = Number(config.timeout);
  if (!Number.isFinite(nilai) || nilai <= 0) return BATAS_WAKTU_BAWAAN_MS;
  return Math.min(Math.trunc(nilai), BATAS_WAKTU_MAKS_MS);
}

/** Jeda yang tetap menghormati batas waktu total operasi. */
function tunda(ms: number, batas: AbortSignal): Promise<void> {
  return new Promise<void>((selesai, gagal) => {
    if (batas.aborted) {
      gagal(new Error("Permintaan TTE melewati batas waktu."));
      return;
    }

    const padaAbort = () => {
      clearTimeout(timer);
      gagal(new Error("Permintaan TTE melewati batas waktu."));
    };
    const timer = setTimeout(() => {
      batas.removeEventListener("abort", padaAbort);
      selesai();
    }, ms);

    batas.addEventListener("abort", padaAbort, { once: true });
  });
}

/** Kode kesalahan jaringan yang layak diulang; kegagalan TLS tidak termasuk. */
const KODE_TRANSIEN = new Set(["ECONNRESET", "ECONNABORTED", "ETIMEDOUT", "EPIPE", "EAI_AGAIN"]);

/** Hanya kegagalan transport sementara yang boleh dikirim ulang. */
function bolehDiulang(error: unknown): boolean {
  const kode = (error as NodeJS.ErrnoException | undefined)?.code;
  return typeof kode === "string" && KODE_TRANSIEN.has(kode);
}

/**
 * Baca body respons; bila sinyal sudah aktif, laporkan batas waktu — bukan
 * pesan internal transport (mis. `aborted`) yang membocorkan detail.
 */
async function bacaBody(
  respons: ResponsTte,
  maksByte: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  try {
    return await respons.baca(maksByte);
  } catch (error) {
    if (signal.aborted || (error instanceof Error && error.message === "aborted")) {
      throw new Error("Permintaan TTE melewati batas waktu.");
    }
    throw error;
  }
}

/**
 * Kirim satu permintaan ke alamat yang sudah divalidasi.
 *
 * Redirect tidak pernah diikuti (3xx langsung gagal). Retry hanya untuk 5xx
 * dan kegagalan jaringan yang bersifat sementara; kegagalan TLS/sertifikat
 * tidak diulang agar kredensial tidak dikirim berulang ke provider yang
 * identitasnya tidak dapat diverifikasi. Seluruh percobaan tetap dibatasi
 * sinyal waktu total operasi.
 */
async function kirimTte(
  deps: DependensiTte,
  url: URL,
  permintaan: PermintaanHttpTte,
  alamat: string,
): Promise<ResponsTte> {
  let percobaan = 0;

  for (;;) {
    let respons: ResponsTte;
    try {
      respons = await deps.transport(url, permintaan, alamat);
    } catch (error) {
      if (permintaan.signal.aborted) {
        throw new Error("Permintaan TTE melewati batas waktu.");
      }
      if (bolehDiulang(error) && percobaan < MAKS_PERCOBAAN) {
        await tunda(JEDA_DASAR_MS * 2 ** percobaan, permintaan.signal);
        percobaan += 1;
        continue;
      }
      const kode = (error as NodeJS.ErrnoException | undefined)?.code;
      throw new Error(
        kode ? `Koneksi ke provider TTE gagal (${kode}).` : "Koneksi ke provider TTE gagal.",
      );
    }

    if (respons.status >= 300 && respons.status < 400) {
      throw new Error("Redirect provider TTE ditolak demi keamanan.");
    }

    if (respons.status >= 500 && percobaan < MAKS_PERCOBAAN) {
      await tunda(JEDA_DASAR_MS * 2 ** percobaan, permintaan.signal);
      percobaan += 1;
      continue;
    }

    return respons;
  }
}

/**
 * Klien BSrE berbasis transport HTTPS ter-pin.
 *
 * Alur mengikuti perilaku OpenSID: kirim PDF ke `POST {api}/api/sign/pdf`
 * dengan Basic Auth dan form-data (`file`, `nik`, `passphrase`). Respons dapat
 * berupa PDF langsung, atau JSON berisi URL/base64 berkas hasil tanda tangan.
 *
 * Path prefix pada `api` dipertahankan: `https://host/bsre` menghasilkan
 * endpoint `https://host/bsre/api/sign/pdf`.
 *
 * Catatan kontrak: nama field mengikuti API BSrE yang dipakai OpenSID. Bila
 * provider desa memakai varian lain, cukup ganti implementasi `KlienTte` di
 * application layer tanpa mengubah pemanggil.
 */
export function buatKlienBsre(deps: DependensiTte): KlienTte {
  return async (permintaan, config) => {
    // Batas waktu dibuat SEBELUM validasi URL/DNS: resolusi DNS yang
    // menggantung ikut dibatalkan dan tidak memperpanjang deadline total.
    const batas = AbortSignal.timeout(batasWaktuOperasi(config));
    const provider = await validasiUrlProvider(config.api, deps.resolver, {
      allowedHosts: deps.allowedHosts,
      signal: batas,
    });
    // Base dengan trailing slash agar path prefix provider tidak terbuang.
    const dasar = new URL(
      provider.url.href.endsWith("/") ? provider.url.href : `${provider.url.href}/`,
    );
    const endpoint = new URL("api/sign/pdf", dasar);
    const otorisasi = `Basic ${btoa(`${config.username}:${config.password}`)}`;

    const form = new FormData();
    form.set(
      "file",
      new Blob([new Uint8Array(permintaan.pdf)], { type: "application/pdf" }),
      `${permintaan.nomor.replace(/[^a-zA-Z0-9._-]+/g, "-")}.pdf`,
    );
    form.set("nik", config.nik);
    form.set("passphrase", config.password);

    // Serialisasi multipart memakai Request agar boundary dan header tetap
    // sesuai standar, lalu body dikirim lewat transport ter-pin.
    const rakitan = new Request("https://tte.invalid/", { method: "POST", body: form });
    const tipeKonten = rakitan.headers.get("content-type") ?? "multipart/form-data";
    const isi = new Uint8Array(await rakitan.arrayBuffer());

    const respons = await kirimTte(
      deps,
      endpoint,
      {
        method: "POST",
        headers: {
          Authorization: otorisasi,
          Accept: "application/pdf, application/json",
          "Content-Type": tipeKonten,
          "Content-Length": String(isi.byteLength),
        },
        body: isi,
        signal: batas,
      },
      alamatTujuan(provider.alamat),
    );

    if (respons.status < 200 || respons.status >= 300) {
      throw new Error(`Provider TTE menolak permintaan (HTTP ${respons.status}).`);
    }

    const contentType = (respons.header("content-type") ?? "").toLowerCase();
    if (contentType.includes("application/pdf")) {
      const bytes = await bacaBody(respons, BATAS_RESPONS_PDF, batas);
      if (!adalahPdf(bytes)) throw new Error("Provider TTE mengembalikan berkas bukan PDF.");
      return bytes;
    }

    const isiJson = await bacaBody(respons, BATAS_RESPONS_JSON, batas);
    let json: unknown;
    try {
      json = JSON.parse(new TextDecoder().decode(isiJson));
    } catch {
      throw new Error("Respons provider TTE tidak dapat dibaca.");
    }

    const base64 = cariPdfBase64(json);
    if (base64) return base64;

    const url = cariUrlBerkas(json);
    if (!url) throw new Error("Respons provider TTE tidak memuat berkas hasil tanda tangan.");

    // Origin wajib sama dan alamat tetap yang sudah divalidasi → tidak ada
    // resolusi DNS kedua (DNS rebinding) dan tidak ada Authorization lintas origin.
    const berkas = validasiUrlBerkas(url, provider);
    const responsBerkas = await kirimTte(
      deps,
      berkas.url,
      {
        method: "GET",
        headers: {
          Authorization: otorisasi,
          Accept: "application/pdf",
        },
        signal: batas,
      },
      alamatTujuan(berkas.alamat),
    );

    if (responsBerkas.status < 200 || responsBerkas.status >= 300) {
      throw new Error(`Gagal mengunduh berkas TTE (HTTP ${responsBerkas.status}).`);
    }

    const bytes = await bacaBody(responsBerkas, BATAS_RESPONS_PDF, batas);
    if (!adalahPdf(bytes)) throw new Error("Berkas TTE yang diunduh bukan PDF.");
    return bytes;
  };
}

/**
 * Cek koneksi ke provider BSrE.
 *
 * Mengirim permintaan ringan ke endpoint health/versi provider untuk
 * memverifikasi bahwa kredensial dan URL valid tanpa menandatangani surat.
 */
export interface HasilTestKoneksi {
  ok: boolean;
  /** Respons status provider atau pesan galat. */
  pesan: string;
}

export async function testKoneksi(
  config: KonfigTte,
  deps: DependensiTte,
): Promise<HasilTestKoneksi> {
  const statis = periksaUrlProviderStatis(config.api);
  if (!statis.url) {
    return { ok: false, pesan: statis.masalah[0] ?? "URL API tidak valid." };
  }

  // Deadline dibuat sebelum DNS, sama seperti jalur tanda tangan.
  const batas = AbortSignal.timeout(batasWaktuOperasi(config));
  let provider: UrlProviderTervalidasi;
  try {
    provider = await validasiUrlProvider(config.api, deps.resolver, {
      allowedHosts: deps.allowedHosts,
      signal: batas,
    });
  } catch (error) {
    if (batas.aborted) return { ok: false, pesan: "Koneksi timeout." };
    return {
      ok: false,
      pesan: error instanceof Error ? error.message : "URL API tidak valid.",
    };
  }

  const dasar = new URL(
    provider.url.href.endsWith("/") ? provider.url.href : `${provider.url.href}/`,
  );
  const otorisasi = `Basic ${btoa(`${config.username}:${config.password}`)}`;

  const periksa = async (url: URL): Promise<HasilTestKoneksi | null> => {
    const respons = await deps.transport(
      url,
      {
        method: "GET",
        headers: { Authorization: otorisasi, Accept: "application/json, text/html" },
        signal: batas,
      },
      alamatTujuan(provider.alamat),
    );

    if (respons.status >= 300 && respons.status < 400) {
      return { ok: false, pesan: "Redirect provider TTE ditolak demi keamanan." };
    }
    if (respons.status === 401 || respons.status === 403) {
      return { ok: false, pesan: `Kredensial ditolak (HTTP ${respons.status}).` };
    }
    if (respons.status >= 200 && respons.status < 300) {
      // Body dibaca dengan batas agar respons besar tidak menahan proses.
      try {
        await bacaBody(respons, BATAS_RESPONS_JSON, batas);
      } catch (error) {
        if (batas.aborted) return { ok: false, pesan: "Koneksi timeout." };
        if (error instanceof Error && error.message.includes("melebihi batas ukuran")) {
          return { ok: false, pesan: "Respons provider TTE melebihi batas ukuran." };
        }
      }
      return { ok: true, pesan: `Provider merespons HTTP ${respons.status}.` };
    }
    return null;
  };

  const endpoints = ["api/sign/status", "api/version", "api/health"].map(
    (jalur) => new URL(jalur, dasar),
  );

  for (const url of endpoints) {
    if (batas.aborted) return { ok: false, pesan: "Koneksi timeout." };
    try {
      const hasil = await periksa(url);
      if (hasil) return hasil;
    } catch {
      if (batas.aborted) return { ok: false, pesan: "Koneksi timeout." };
    }
  }

  if (batas.aborted) return { ok: false, pesan: "Koneksi timeout." };

  // Fallback: endpoint utama provider.
  try {
    const hasil = await periksa(new URL("./", dasar));
    if (hasil) return hasil;
  } catch {
    if (batas.aborted) return { ok: false, pesan: "Koneksi timeout." };
    return { ok: false, pesan: "Tidak dapat terhubung ke server TTE." };
  }

  return { ok: false, pesan: "Provider TTE tidak merespons dengan status yang dikenal." };
}

/**
 * Coba tandai surat secara elektronik.
 *
 * Mode `manual` bukan tindakan adapter: surat ditandai setelah Kepala Desa
 * tanda tangan basah (di luar modul ini). Mengembalikan `ok: false` dengan
 * penjelasan; pemanggil mencatat hasilnya tanpa menggagalkan penerbitan.
 */
export async function tandaiTte(
  config: KonfigTte,
  permintaan: PermintaanTte,
  klien: KlienTte,
): Promise<HasilTte> {
  if (config.mode === "manual") {
    return {
      ok: false,
      mode: "manual",
      alasan: "TTE manual: surat ditandai setelah tanda tangan basah Kepala Desa.",
    };
  }

  if (config.mode !== "bsre" || !siapTte(config) || klien === null) {
    const alasan =
      config.mode === "bsre"
        ? `Konfigurasi BSrE belum lengkap: ${masalahKonfigTte(config).join(" ")}`
        : "TTE dinonaktifkan — surat diterbitkan tanpa tanda tangan elektronik.";
    return { ok: false, mode: config.mode, alasan };
  }

  try {
    const pdf = await klien(permintaan, config);
    if (!adalahPdf(pdf)) {
      return { ok: false, mode: "bsre", alasan: "Berkas hasil TTE bukan PDF yang sah." };
    }
    return { ok: true, mode: "bsre", suratId: permintaan.suratId, pdf };
  } catch (error) {
    const pesan = error instanceof Error ? error.message : "Kesalahan tidak diketahui.";
    return { ok: false, mode: "bsre", alasan: pesan };
  }
}
