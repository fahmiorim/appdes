import type { NextConfig } from "next";

/**
 * Domain induk pengembangan (mis. `flexidesa.test`). Dipakai untuk mengizinkan
 * host tenant `<slug>.<domain>` mengambil aset dev.
 */
const domainDev = (process.env.DESA_BASE_DOMAIN ?? "").trim();

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Mengaktifkan `forbidden()` dari `next/navigation` agar halaman dapat
   * merespons 403 dengan UI penjelasan (`src/app/forbidden.tsx`), bukan error
   * boundary generik. Flag ini hanya membuka API; tidak mengubah rute lain.
   */
  experimental: {
    authInterrupts: true,
    serverActions: { bodySizeLimit: "6mb" },
  },

  /**
   * Cache Components dinonaktifkan dengan sengaja.
   *
   * Aplikasi ini adalah sistem administrasi yang menuntut autentikasi: hampir
   * semua rute membaca sesi per-pengguna dan data desa yang dinamis, sehingga
   * model "use cache" nyaris tidak memberi manfaat namun menambah kerumitan
   * (setiap halaman dinamis wajib dibungkus Suspense). Kita memakai model
   * dinamis klasik dan dapat mengaktifkan Cache Components kembali, per rute,
   * untuk permukaan publik yang benar-benar layak di-cache.
   */
  cacheComponents: false,

  /**
   * Kunci root Turbopack ke folder proyek. Tanpa ini, Next menelusuri ke atas
   * dan menemukan lockfile lain di luar repo (mis. D:\laragon\www).
   */
  turbopack: {
    root: process.cwd(),
  },

  /**
   * Next dev hanya mengizinkan aset dev (HMR dan boot client) dari origin
   * server. Tanpa daftar ini, membuka aplikasi lewat host tenant
   * `<slug>.flexidesa.test` membuat React tidak pernah hydrate: HTML tampil
   * tetapi seluruh tombol dan form mati. Hanya berlaku saat `next dev`.
   */
  allowedDevOrigins: domainDev ? [domainDev, `*.${domainDev}`] : [],

  /**
   * Baileys adalah paket Node murni (soket, fs, crypto). Jangan di-bundle;
   * biarkan di-resolve saat runtime oleh proses server yang persisten.
   */
  serverExternalPackages: ["@whiskeysockets/baileys", "pino"],
};

export default nextConfig;
