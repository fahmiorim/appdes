import Link from "next/link";

import styles from "./platform-landing.module.css";

/**
 * Landing page platform di domain induk (`DESA_BASE_DOMAIN`).
 *
 * Host desa tetap menampilkan beranda desanya masing-masing; halaman ini hanya
 * dirender ketika host permintaan adalah domain platform itu sendiri, sehingga
 * pengunjung apex tidak lagi melihat data desa tertentu.
 */

const PILAR = [
  {
    judul: "Website desa",
    isi: "Profil, berita, agenda, galeri, dan transparansi APBDes untuk setiap desa, lengkap dengan domain sendiri.",
  },
  {
    judul: "Layanan warga",
    isi: "Pengajuan surat, pengaduan, dan layanan mandiri warga dengan alur verifikasi di kantor desa.",
  },
  {
    judul: "Administrasi desa",
    isi: "Data kependudukan, kartu keluarga, inventaris, bantuan, dan indikator IDM dalam satu tempat.",
  },
] as const;

const FITUR = [
  "Isolasi data per desa",
  "Domain dan alias per tenant",
  "Surat dengan tanda tangan elektronik",
  "APBDes dan transparansi anggaran",
  "Indikator IDM dan SDGs desa",
  "Audit log aktivitas operator",
] as const;

export function PlatformLanding() {
  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="FlexiDesa">
            <span className={styles.brandMark} aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none">
                <path
                  d="M7 21.5 24 8l17 13.5v18H7v-18Z"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="2.8"
                />
                <path
                  d="M17 39V25h14v14M12 19h24M20 16h8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.8"
                />
              </svg>
            </span>
            <span className={styles.brandCopy}>
              <strong>FlexiDesa</strong>
              <small>Platform Sistem Informasi Desa</small>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Navigasi platform">
            <a href="#pilar">Pilar</a>
            <a href="#fitur">Fitur</a>
            <a href="#akses">Akses</a>
            <Link className={styles.navButton} href="/super-admin">
              Masuk konsol
            </Link>
          </nav>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container + " " + styles.heroInner}>
          <span className={styles.eyebrow}>
            <span aria-hidden="true" /> PLATFORM MULTI-DESA
          </span>
          <h1>
            Satu platform,
            <br />
            <em>semua desa terlayani.</em>
          </h1>
          <p>
            FlexiDesa menjalankan website publik, layanan warga, dan administrasi desa untuk banyak
            desa sekaligus. Setiap desa memakai domain dan data sendiri; tidak ada data yang
            tercampur antardesa.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/super-admin">
              Masuk konsol platform
            </Link>
            <Link className={styles.secondaryButton} href="/masuk">
              Masuk layanan warga
            </Link>
          </div>
          <p className={styles.heroNote}>
            Mengelola desa? Konsol Super Admin tersedia di halaman masuk platform.
          </p>
        </div>
      </section>

      <section className={styles.section} id="pilar" aria-labelledby="judul-pilar">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>TIGA PILAR</span>
            <h2 id="judul-pilar">Pemerintahan desa dalam satu alur kerja</h2>
          </div>
          <div className={styles.pilarGrid}>
            {PILAR.map((item, index) => (
              <article className={styles.pilarCard} key={item.judul}>
                <span className={styles.pilarNumber}>0{index + 1}</span>
                <h3>{item.judul}</h3>
                <p>{item.isi}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.featureSection} id="fitur" aria-labelledby="judul-fitur">
        <div className={styles.container + " " + styles.featureGrid}>
          <div>
            <span className={styles.kicker}>YANG SUDAH BERJALAN</span>
            <h2 id="judul-fitur">Fondasi operasional, bukan sekadar halaman profil</h2>
            <p>
              Modul inti dipakai sehari-hari oleh operator desa: dari pendataan penduduk sampai
              penerbitan surat dan pelaporan pembangunan.
            </p>
          </div>
          <ul className={styles.featureList}>
            {FITUR.map((item) => (
              <li key={item}>
                <span aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.section} id="akses" aria-labelledby="judul-akses">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <span className={styles.kicker}>AKSES</span>
            <h2 id="judul-akses">Satu aplikasi, peran yang terpisah</h2>
          </div>
          <div className={styles.aksesGrid}>
            <article className={styles.aksesCard}>
              <h3>Warga desa</h3>
              <p>
                Masuk untuk mengajukan layanan, memantau pengajuan, dan mengirim pengaduan ke
                pemerintah desa.
              </p>
              <Link className={styles.textLink} href="/masuk">
                Masuk layanan warga <span aria-hidden="true">→</span>
              </Link>
            </article>
            <article className={styles.aksesCard}>
              <h3>Operator desa</h3>
              <p>
                Administrator desa mengelola data, surat, keuangan, dan konten publik desanya
                sendiri.
              </p>
              <Link className={styles.textLink} href="/masuk">
                Masuk sebagai staf desa <span aria-hidden="true">→</span>
              </Link>
            </article>
            <article className={styles.aksesCard}>
              <h3>Pengelola platform</h3>
              <p>
                Super Admin platform mendaftarkan desa, mengatur domain, dan memantau kondisi semua
                tenant.
              </p>
              <Link className={styles.textLink} href="/super-admin">
                Buka konsol platform <span aria-hidden="true">→</span>
              </Link>
            </article>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container + " " + styles.footerInner}>
          <div>
            <strong>FlexiDesa</strong>
            <p>Platform Sistem Informasi Desa untuk banyak desa.</p>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/masuk">Masuk</Link>
            <Link href="/super-admin">Konsol platform</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
