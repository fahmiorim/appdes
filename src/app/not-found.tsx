import type { Metadata } from "next";
import Link from "next/link";

import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
  robots: { index: false, follow: false },
};

/**
 * Halaman 404 global untuk seluruh aplikasi.
 *
 * Sengaja tidak memuat header/footer tenant agar dapat dipakai di host mana pun,
 * termasuk host platform dan host desa yang tidak berhasil diresolusi.
 */
export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.inner} aria-labelledby="not-found-title">
        <div className={styles.art} aria-hidden="true">
          <span className={styles.code}>404</span>
          <svg className={styles.magnifier} viewBox="0 0 96 96" focusable="false">
            <circle cx="42" cy="42" r="26" />
            <path d="M61 61l20 20" />
            <path d="M32 37c3-5 9-8 15-7" className={styles.glint} />
          </svg>
        </div>

        <h1 id="not-found-title">Halaman Tidak Ditemukan</h1>
        <p className={styles.lead}>
          Maaf, halaman yang Anda cari tidak dapat ditemukan atau mungkin telah dipindahkan. Periksa
          kembali alamatnya, lalu kembali ke beranda.
        </p>

        <div className={styles.actions}>
          <Link className={styles.primary} href="/">
            Kembali ke Beranda
          </Link>
          <Link className={styles.secondary} href="/masuk">
            Masuk ke Akun
          </Link>
        </div>
      </section>
    </main>
  );
}
