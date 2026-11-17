import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Akses ditolak",
  robots: { index: false, follow: false },
};

/**
 * Halaman 403 yang dirender `forbidden()` ketika pengguna sudah login tetapi
 * tidak memiliki hak atas halaman yang dibuka.
 *
 * Tidak menampilkan detail peran, permission, atau data tenant agar tidak
 * membocorkan struktur otorisasi. Pengguna diberi dua jalan keluar yang aman.
 */
export default function Forbidden() {
  return (
    <div className="page-container forbidden-page">
      <section className="dashboard-section" aria-labelledby="forbidden-title">
        <span className="eyebrow">403 — Akses ditolak</span>
        <h1 id="forbidden-title">Anda tidak memiliki akses ke halaman ini</h1>
        <p>
          Halaman ini hanya dapat dibuka oleh pengelola platform. Akun Anda tidak memiliki hak yang
          diperlukan. Bila Anda merasa seharusnya berhak, hubungi administrator desa atau pengelola
          platform.
        </p>
        <div className="quick-links">
          <Link className="button button-primary" href="/beranda">
            Kembali ke beranda
          </Link>
          <Link className="button button-secondary" href="/masuk">
            Masuk dengan akun lain
          </Link>
        </div>
      </section>
    </div>
  );
}
