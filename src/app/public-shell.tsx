import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./informasi-publik.module.css";

type PublicNavigationItem = {
  href: string;
  label: string;
  /** Tautan keluar dirender sebagai `<a>`, bukan navigasi klien Next. */
  eksternal?: boolean;
};

type PublicShellProps = {
  villageName: string;
  brandLabel: string;
  navigation: readonly PublicNavigationItem[];
  showMark?: boolean;
  children?: ReactNode;
};

export function PublicShell({
  villageName,
  brandLabel,
  navigation,
  showMark = true,
  children,
}: PublicShellProps) {
  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}>
            {showMark ? <Image src="/images/logo.png" alt="" width={42} height={42} /> : null}
            <span>
              <strong>{villageName}</strong>
              <small>{brandLabel}</small>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Navigasi utama">
            {navigation.map((item) =>
              item.eksternal ? (
                <a key={item.href} href={item.href} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          <Link href="/masuk" className={styles.login}>
            Masuk ↗
          </Link>
        </div>
      </header>

      {children}

      <footer className={styles.footer}>
        <div className={styles.container + " " + styles.footerInner}>
          <strong>{villageName}</strong>
          <span>© {new Date().getFullYear()} · Didukung FlexiDesa</span>
        </div>
      </footer>
    </main>
  );
}
