import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { halamanStatisPublik } from "@/features/publik/application/konten-publik";

import styles from "../informasi-publik.module.css";

export const dynamic = "force-dynamic";

function plainText(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function PotensiPage() {
  const desa = await getIdentitasFromRequest();
  const halaman = await halamanStatisPublik(desa.id, "potensi");
  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <Image src="/images/flexidesa-mark.svg" alt="" width={42} height={42} />
            <span>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <small>Potensi Desa</small>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Navigasi utama">
            <Link href="/">Beranda</Link>
            <Link href="/profil">Profil Desa</Link>
            <Link href="/wilayah">Wilayah</Link>
            <Link href="/kontak">Kontak</Link>
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
            <span>Potensi Desa</span>
          </div>
          <p className={styles.kicker}>SUMBER DAYA & KEUNGGULAN LOKAL</p>
          <h1>{halaman?.judul ?? `Potensi ${desa.namaDesa ?? "Desa"}`}</h1>
          <p>Mengenal sumber daya, produk unggulan, dan peluang pengembangan desa.</p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          <article className={styles.panel}>
            {halaman?.isi?.trim() ? (
              <div className={styles.copy}>{plainText(halaman.isi)}</div>
            ) : (
              <p className={styles.muted}>
                Informasi potensi desa belum dipublikasikan. Pemerintah desa dapat menambahkan
                halaman dengan slug “potensi” melalui pengelolaan halaman statis.
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
