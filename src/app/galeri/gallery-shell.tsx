import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./galeri.module.css";

type GalleryShellProps = {
  villageName: string;
  children?: ReactNode;
};

export function GalleryShell({ villageName, children }: GalleryShellProps) {
  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <Image src="/images/logo.png" alt="" width={42} height={42} />
            <span>
              <strong>{villageName}</strong>
              <small>Galeri Desa</small>
            </span>
          </Link>
          <nav aria-label="Navigasi utama">
            <Link href="/">Beranda</Link>
            <Link href="/profil">Profil Desa</Link>
            <Link href="/berita">Berita</Link>
            <Link href="/agenda">Agenda</Link>
          </nav>
          <Link href="/masuk" className={styles.login}>
            Masuk ↗
          </Link>
        </div>
      </header>

      {children}

      <footer className={styles.footer}>
        <div className={styles.container}>
          <strong>{villageName}</strong>
          <span>© {new Date().getFullYear()} · Didukung FlexiDesa</span>
        </div>
      </footer>
    </main>
  );
}
