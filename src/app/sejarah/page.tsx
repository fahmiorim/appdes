import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { profilDesaPublik } from "@/features/publik/application/konten-publik";

import styles from "../informasi-publik.module.css";

export const dynamic = "force-dynamic";

export default async function SejarahPage() {
  const desa = await getIdentitasFromRequest();
  const profil = await profilDesaPublik(desa.id);
  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <Image src="/images/flexidesa-mark.svg" alt="" width={42} height={42} />
            <span>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <small>Sejarah Desa</small>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Navigasi utama">
            <Link href="/">Beranda</Link>
            <Link href="/profil">Profil Desa</Link>
            <Link href="/profil/visi-misi">Visi & Misi</Link>
            <Link href="/berita">Berita</Link>
          </nav>
          <Link href="/masuk" className={styles.login}>
            Masuk ↗
          </Link>
        </div>
      </header>
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.crumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <Link href="/profil">Profil Desa</Link>
            <span>/</span>
            <span>Sejarah</span>
          </div>
          <p className={styles.kicker}>JEJAK PERJALANAN DESA</p>
          <h1>Sejarah {desa.namaDesa ?? "Desa"}</h1>
          <p>
            Mengenal perjalanan, asal-usul, dan perkembangan {desa.namaDesa ?? "desa"} dari masa ke
            masa.
          </p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          <article className={styles.panel}>
            <p className={styles.kicker}>CERITA DESA</p>
            <h2>Perjalanan dan asal-usul</h2>
            {profil?.sejarah?.trim() ? (
              <div className={styles.copy}>{profil.sejarah}</div>
            ) : (
              <p className={styles.muted}>
                Informasi sejarah desa belum dipublikasikan oleh pemerintah desa.
              </p>
            )}
          </article>
        </div>
      </section>
      <footer className={styles.footer}>
        <div className={styles.container + " " + styles.footerInner}>
          <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
          <span>© {new Date().getFullYear()} · Didukung FlexiDesa</span>
        </div>
      </footer>
    </main>
  );
}
