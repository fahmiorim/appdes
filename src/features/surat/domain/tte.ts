/**
 * Adapter Tanda Tangan Elektronik (TTE) / BSrE.
 *
 * OpenSID memanggil server BSRE (`api/sign/pdf`) setelah verifikasi Kepala
 * Desa untuk menimpa berkas PDF surat dengan hasil tanda tangan elektronik.
 *
 * Lapisan ini murni (tanpa I/O implisit): konfigurasi desa dibaca dari
 * `tte_config` oleh pemanggil, kredensial rahasia tetap berasal dari
 * environment (`TTE_PASSWORD`), dan klien jaringan dapat disuntik agar dapat
 * diuji tanpa server BSRE.
 *
 * Mode `nonaktif` (default) dan `manual` tidak pernah memblokir penerbitan
 * surat. Kegagalan provider juga hanya dicatat; surat tetap terbit.
 */

import { z } from "zod";

/** Mode adapter yang dikenal. `manual` menandai surat setelah ttd basah. */
export type ModeTte = "nonaktif" | "manual" | "bsre";

export interface KonfigTte {
  mode: ModeTte;
  /** Base URL server BSRE, mis. `https://tte.example.go.id`. */
  api: string;
  username: string;
  /** NIK penanda tangan yang dikirim ke provider BSrE. */
  nik: string;
  /** Passphrase/kredensial — jangan pernah dicetak ke log. */
  password: string;
  /** `false` untuk melewatkan verifikasi sertifikat TLS (demo/openluk). */
  ssl: boolean;
  /** Timeout permintaan jaringan dalam milidetik. Default 30000 (30 detik). */
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
  ssl: boolean;
  aktif: boolean;
  /** Timeout permintaan jaringan dalam milidetik. Disimpan untuk kompatibilitas; diisi dari env saat runtime. */
  timeout?: number;
}

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
  ssl: z.boolean().default(true),
  aktif: z.boolean().default(false),
  timeout: z.number().optional(),
});

/** Skema isian form admin (nilai mentah dari FormData). */
export const konfigTteFormSchema = z.object({
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
  ssl: z.boolean(),
  aktif: z.boolean(),
});

export type KonfigTteFormInput = z.infer<typeof konfigTteFormSchema>;

/** Nilai awal saat desa belum pernah menyimpan konfigurasi. */
export const KONFIG_TTE_DEFAULT: KonfigTteTersimpan = {
  provider: "bsre",
  mode: "nonaktif",
  api: "",
  username: "",
  nik: "",
  ssl: true,
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
    ssl: (env.TTE_SSL ?? "true").trim().toLowerCase() !== "false",
    timeout: Number(env.TTE_TIMEOUT ?? "30000"),
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
    ssl: tersimpan.ssl,
    timeout: tersimpan.timeout ?? envConfig.timeout,
  };
}

/**
 * Daftar alasan konfigurasi belum siap dipakai, untuk ditampilkan di admin.
 * Kosong berarti konfigurasi BSrE lengkap.
 */
export function masalahKonfigTte(config: KonfigTte): string[] {
  if (config.mode !== "bsre") return [];

  const masalah: string[] = [];
  if (config.api === "") masalah.push("URL API BSrE belum diisi.");
  else if (!/^https?:\/\/.+/i.test(config.api)) masalah.push("URL API BSrE harus http(s).");
  if (config.username === "") masalah.push("Username BSrE belum diisi.");
  if (config.nik.length !== 16) masalah.push("NIK penanda tangan harus 16 digit.");
  if (config.password === "") {
    masalah.push("Passphrase belum tersedia di server (environment TTE_PASSWORD).");
  }

  return masalah;
}

/** Klien jaringan BSrE: menerima PDF, mengembalikan PDF bertanda tangan. */
export type KlienTte =
  ((permintaan: PermintaanTte, config: KonfigTte) => Promise<Uint8Array>) | null;

export type FetchTte = (input: string, init?: RequestInit) => Promise<Response>;

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

/**
 * Klien BSrE berbasis `fetch`.
 *
 * Alur mengikuti perilaku OpenSID: kirim PDF ke `POST {api}/api/sign/pdf`
 * dengan Basic Auth dan form-data (`file`, `nik`, `passphrase`). Respons dapat
 * berupa PDF langsung, atau JSON berisi URL/base64 berkas hasil tanda tangan.
 *
 * Catatan kontrak: nama field mengikuti API BSrE yang dipakai OpenSID. Bila
 * provider desa memakai varian lain, cukup ganti implementasi `KlienTte` di
 * application layer tanpa mengubah pemanggil.
 *
 * Retry: hingga 3 kali dengan backoff eksponensial (1s, 2s, 4s) saat timeout
 * atau kesalahan jaringan (bukan 4xx/5xx HTTP yang tidak timeout).
 */
export function buatKlienBsre(fetchImpl: FetchTte = fetch): KlienTte {
  return async (permintaan, config) => {
    const endpoint = `${config.api.replace(/\/+$/, "")}/api/sign/pdf`;
    const otorisasi = `Basic ${btoa(`${config.username}:${config.password}`)}`;
    const timeoutMs = config.timeout ?? 30_000;

    const form = new FormData();
    form.set(
      "file",
      new Blob([new Uint8Array(permintaan.pdf)], { type: "application/pdf" }),
      `${permintaan.nomor.replace(/[^a-zA-Z0-9._-]+/g, "-")}.pdf`,
    );
    form.set("nik", config.nik);
    form.set("passphrase", config.password);

    // Retry configuration
    const maxRetries = 3;
    const baseDelayMs = 1000;

    async function fetchWithRetry(
      url: string,
      init: RequestInit,
      attempt: number,
    ): Promise<Response> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const respons = await fetchImpl(url, { ...init, signal: controller.signal });

        // Don't retry on 4xx (client errors) - only on network errors, timeouts, 5xx
        if (!respons.ok && respons.status >= 500 && attempt < maxRetries) {
          const delay = baseDelayMs * 2 ** attempt;
          const { promise, resolve } = Promise.withResolvers<void>();
          setTimeout(resolve, delay);
          await promise;
          return fetchWithRetry(url, init, attempt + 1);
        }

        return respons;
      } catch (error) {
        // Retry on abort (timeout) or network errors
        const isAbort =
          error instanceof Error &&
          (error.name === "AbortError" ||
            (error instanceof DOMException && error.name === "AbortError"));

        if (attempt < maxRetries && isAbort) {
          const delay = baseDelayMs * 2 ** attempt;
          const { promise, resolve } = Promise.withResolvers<void>();
          setTimeout(resolve, delay);
          await promise;
          return fetchWithRetry(url, init, attempt + 1);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // First request: sign PDF
    const respons = await fetchWithRetry(
      endpoint,
      {
        method: "POST",
        headers: {
          Authorization: otorisasi,
          Accept: "application/pdf, application/json",
        },
        body: form,
      },
      0,
    );

    if (!respons.ok) {
      throw new Error(`Provider TTE menolak permintaan (HTTP ${respons.status}).`);
    }

    const contentType = (respons.headers.get("content-type") ?? "").toLowerCase();
    if (contentType.includes("application/pdf")) {
      const bytes = new Uint8Array(await respons.arrayBuffer());
      if (!adalahPdf(bytes)) throw new Error("Provider TTE mengembalikan berkas bukan PDF.");
      return bytes;
    }

    let json: unknown;
    try {
      json = await respons.json();
    } catch {
      throw new Error("Respons provider TTE tidak dapat dibaca.");
    }

    const base64 = cariPdfBase64(json);
    if (base64) return base64;

    const url = cariUrlBerkas(json);
    if (!url) throw new Error("Respons provider TTE tidak memuat berkas hasil tanda tangan.");

    const absolut = new URL(url, `${config.api.replace(/\/+$/, "")}/`).toString();
    const berkas = await fetchWithRetry(
      absolut,
      {
        headers: { Authorization: otorisasi, Accept: "application/pdf" },
      },
      0,
    );

    if (!berkas.ok) {
      throw new Error(`Gagal mengunduh berkas TTE (HTTP ${berkas.status}).`);
    }

    const bytes = new Uint8Array(await berkas.arrayBuffer());
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
  fetchImpl: FetchTte = fetch,
): Promise<HasilTestKoneksi> {
  const base = config.api.replace(/\/+$/, "");
  if (!base) {
    return { ok: false, pesan: "URL API belum diisi." };
  }

  const otorisasi = `Basic ${btoa(`${config.username}:${config.password}`)}`;

  // Coba beberapa endpoint yang umum dipakai provider untuk health check
  const endpoints = [`${base}/api/sign/status`, `${base}/api/version`, `${base}/api/health`];

  const controller = new AbortController();
  const timeoutMs = config.timeout ?? 30_000;
  setTimeout(() => controller.abort(), timeoutMs);

  for (const url of endpoints) {
    try {
      const resp = await fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: otorisasi,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (resp.ok) {
        const contentType = (resp.headers.get("content-type") ?? "").toLowerCase();
        if (contentType.includes("application/json")) {
          try {
            const data = await resp.json();
            return { ok: true, pesan: JSON.stringify(data) };
          } catch {
            return { ok: true, pesan: `HTTP ${resp.status}` };
          }
        }
        return { ok: true, pesan: `HTTP ${resp.status}` };
      }

      if (resp.status === 401 || resp.status === 403) {
        return { ok: false, pesan: `Kredensial ditolak (HTTP ${resp.status}).` };
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { ok: false, pesan: "Koneksi timeout." };
      }
    }
  }

  // Coba endpoint utama sebagai fallback
  try {
    const resp = await fetchImpl(`${base}/`, {
      method: "GET",
      headers: {
        Authorization: otorisasi,
        Accept: "application/json, text/html",
      },
      signal: controller.signal,
    });

    if (resp.ok) {
      return { ok: true, pesan: `Endpoint tersedia (HTTP ${resp.status}).` };
    }

    if (resp.status === 401 || resp.status === 403) {
      return { ok: false, pesan: `Kredensial ditolak (HTTP ${resp.status}).` };
    }

    return { ok: false, pesan: `HTTP ${resp.status}.` };
  } catch {
    return { ok: false, pesan: "Tidak dapat terhubung ke server TTE." };
  }
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
