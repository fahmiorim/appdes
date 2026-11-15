import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { profilDesaPublik } from "@/features/publik/application/konten-publik";

import styles from "../informasi-publik.module.css";

export const dynamic = "force-dynamic";

export default async function VisiMisiPage() {
  const desa = await getIdentitasFromRequest();
  const profil = await profilDesaPublik(desa.id);
  const misi = (profil?.misi ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  return (
    <main className={styles.site}>
      <header className={styles.header}><div className={styles.container + " " + styles.headerInner}>
        <Link href="/" className={styles.brand}><Image src="/images/flexidesa-mark.svg" alt="" width={42} height={42}/><span><strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong><small>Visi & Misi Desa</small></span></Link>
        <nav className={styles.nav} aria-label="Navigasi utama"><Link href="/">Beranda</Link><Link href="/profil">Profil Desa</Link><Link href="/sejarah">Sejarah</Link><Link href="/berita">Berita</Link></nav>
        <Link href="/masuk" className={styles.login}>Masuk ↗</Link>
      </div></header>
      <section className={styles.hero}><div className={styles.container}>
        <div className={styles.crumb}><Link href="/">Beranda</Link><span>/</span><Link href="/profil">Profil Desa</Link><span>/</span><span>Visi & Misi</span></div>
        <p className={styles.kicker}>ARAH PEMBANGUNAN DESA</p><h1>Visi & Misi {desa.namaDesa ?? "Desa"}</h1>
        <p>Komitmen dan langkah bersama untuk mewujudkan cita-cita pembangunan desa.</p>
      </div></section>
      <section className={styles.content}><div className={styles.container + " " + styles.grid}>
        <article className={styles.panel}><p className={styles.kicker}>VISI</p><h2>Cita-cita dan tujuan</h2>
          {profil?.visi?.trim() ? <div className={styles.copy}>{profil.visi}</div> : <p className={styles.muted}>Visi desa belum dipublikasikan.</p>}
        </article>
        <article className={styles.panel}><p className={styles.kicker}>MISI</p><h2>Langkah mewujudkan visi</h2>
          {misi.length ? <ol className={styles.copy}>{misi.map((item,index)=><li key={index}>{item}</li>)}</ol> : <p className={styles.muted}>Misi desa belum dipublikasikan.</p>}
        </article>
      </div></section>
      <footer className={styles.footer}><div className={styles.container + " " + styles.footerInner}><strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong><span>© {new Date().getFullYear()} · Didukung FlexiDesa</span></div></footer>
    </main>
  );
}