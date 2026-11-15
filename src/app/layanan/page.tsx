import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { listJenisSuratPublik } from "@/features/surat/application/surat-publik-use-cases";

import styles from "../informasi-publik.module.css";

export const dynamic = "force-dynamic";

export default async function LayananPage() {
  const desa = await getIdentitasFromRequest();
  const layanan = await listJenisSuratPublik(desa.id);

  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}><span><strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong><small>Portal Layanan Warga</small></span></Link>
          <nav className={styles.nav} aria-label="Navigasi utama"><Link href="/">Beranda</Link><Link href="/profil">Profil Desa</Link><Link href="/berita">Berita</Link><Link href="/kontak">Kontak</Link></nav>
          <Link href="/masuk" className={styles.login}>Masuk ↗</Link>
        </div>
      </header>
      <section className={styles.hero}><div className={styles.container}>
        <div className={styles.crumb}><Link href="/">Beranda</Link><span>/</span><span>Layanan Desa</span></div>
        <p className={styles.kicker}>PELAYANAN PUBLIK DIGITAL</p><h1>Layanan {desa.namaDesa ?? "Desa"}</h1>
        <p>Jelajahi layanan administrasi yang tersedia. Pengajuan dan pemantauan permohonan dilakukan melalui akun warga.</p>
      </div></section>
      <section className={styles.content}><div className={styles.container}>
        <div className={styles.sectionHead}>
          <div><p className={styles.kicker}>LAYANAN ADMINISTRASI</p><h2>Layanan surat</h2></div>
          <span className={styles.muted}>{layanan.length} jenis layanan aktif</span>
        </div>
        {layanan.length ? <div className={styles.docList}>
          {layanan.map((item) => <article className={styles.doc} key={item.id}>
            <div><h3>{item.nama}</h3><p>{item.kode} · {item.klasifikasi ?? "Administrasi desa"} · {item.butuhPenduduk ? "Memerlukan data penduduk" : "Layanan umum"}</p></div>
            <Link href="/layanan/surat">Detail layanan ↗</Link>
          </article>)}
        </div> : <div className={styles.empty}><strong>Belum ada layanan aktif</strong><p>Daftar layanan akan ditampilkan setelah pemerintah desa mengaktifkannya.</p></div>}
        <div className={styles.panel} style={{ marginTop: 24 }}>
          <h2>Ajukan layanan secara online</h2>
          <p className={styles.muted}>Masuk menggunakan akun warga untuk mengajukan surat, mengunggah persyaratan, dan memantau status permohonan.</p>
          <Link className={styles.login} href="/masuk">Masuk ke akun warga ↗</Link>
        </div>
      </div></section>
      <footer className={styles.footer}><div className={styles.container + " " + styles.footerInner}><strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong><span>© {new Date().getFullYear()} · Didukung FlexiDesa</span></div></footer>
    </main>
  );
}
