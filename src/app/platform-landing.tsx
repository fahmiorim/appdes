import Image from "next/image";
import Link from "next/link";

import styles from "./platform-landing.module.css";

/**
 * Landing page platform pada host induk FlexiDesa.
 * Halaman ini statis dan tidak membaca data tenant.
 */

const PILAR = [
  {
    nomor: "01",
    judul: "Website desa",
    isi: "Publikasikan profil, berita, agenda, galeri, dan informasi transparansi desa melalui portal resmi yang mudah diakses warga.",
    ikon: "⌂",
  },
  {
    nomor: "02",
    judul: "Layanan warga",
    isi: "Bantu warga mengajukan layanan administrasi, memantau proses, dan menyampaikan pengaduan secara lebih praktis.",
    ikon: "▤",
  },
  {
    nomor: "03",
    judul: "Administrasi desa",
    isi: "Kelola data kependudukan, surat, keuangan, inventaris, dan aktivitas pemerintahan dalam satu sistem.",
    ikon: "▦",
  },
] as const;

const FITUR = [
  {
    nomor: "01",
    judul: "Data penduduk",
    isi: "Kelola data warga dan keluarga dengan ruang kerja yang terstruktur.",
    ikon: "♙",
    warna: "violet",
  },
  {
    nomor: "02",
    judul: "Layanan surat",
    isi: "Catat pengajuan, proses verifikasi, dan pantau status surat.",
    ikon: "▤",
    warna: "blue",
  },
  {
    nomor: "03",
    judul: "Administrasi desa",
    isi: "Dukung pekerjaan operator melalui modul administrasi terpadu.",
    ikon: "▣",
    warna: "green",
  },
  {
    nomor: "04",
    judul: "Keuangan desa",
    isi: "Sajikan informasi dan pencatatan keuangan desa secara tertata.",
    ikon: "◫",
    warna: "orange",
  },
  {
    nomor: "05",
    judul: "Website publik",
    isi: "Tampilkan profil, berita, agenda, galeri, dan informasi desa.",
    ikon: "⌂",
    warna: "pink",
  },
  {
    nomor: "06",
    judul: "Inventaris",
    isi: "Catat aset dan inventaris desa agar lebih mudah dipantau.",
    ikon: "▧",
    warna: "cyan",
  },
  {
    nomor: "07",
    judul: "Audit aktivitas",
    isi: "Telusuri aktivitas operator melalui jejak audit sistem.",
    ikon: "◷",
    warna: "purple",
  },
  {
    nomor: "08",
    judul: "Multi-tenant",
    isi: "Satu platform untuk banyak desa dengan pemisahan data tiap tenant.",
    ikon: "⬡",
    warna: "indigo",
  },
] as const;

export function PlatformLanding() {
  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="FlexiDesa beranda">
            <Image
              src="/images/flexidesa-mark.svg"
              alt=""
              width={46}
              height={46}
              className={styles.brandMark}
              priority
            />
            <span className={styles.brandCopy}>
              <strong>FlexiDesa<span>.id</span></strong>
              <small>Sistem Informasi Desa Modern</small>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Navigasi utama">
            <a className={styles.navActive} href="#beranda">Beranda</a>
            <a href="#fitur">Fitur</a>
            <a href="#pilar">Solusi</a>
            <a href="#akses">Akses</a>
          </nav>

          <div className={styles.headerActions}>
            <Link className={styles.loginButton} href="/masuk">Login</Link>
            <Link className={styles.demoButton} href="/masuk">Coba Demo <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </header>

      <section className={styles.hero} id="beranda">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.container + " " + styles.heroGrid}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}><i /> PLATFORM DIGITAL DESA</span>
            <h1>
              Sistem Informasi Desa
              <br />
              <em>Modern, Terpadu,</em> dan
              <br />
              Mudah Digunakan.
            </h1>
            <p className={styles.heroDescription}>
              FlexiDesa membantu pemerintah desa mengelola data penduduk, layanan surat,
              administrasi, dan informasi desa dalam satu platform yang terintegrasi.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/masuk">Coba FlexiDesa <span aria-hidden="true">↗</span></Link>
              <a className={styles.secondaryButton} href="#fitur"><span aria-hidden="true">▦</span> Jelajahi fitur</a>
            </div>
            <div className={styles.trustPoints}>
              <span><i>✓</i> Mudah digunakan</span>
              <span><i>✓</i> Data terisolasi</span>
              <span><i>✓</i> Akses berbasis peran</span>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.visualAura} aria-hidden="true" />
            <Image
              src="/images/platform-dashboard-preview.svg"
              alt="Ilustrasi dashboard FlexiDesa pada laptop dan ponsel"
              width={1120}
              height={760}
              priority
              className={styles.dashboardPreview}
            />
            <div className={styles.floatingNote}>
              <span className={styles.floatingIcon}>✓</span>
              <span><strong>Terintegrasi</strong><small>Website dan administrasi desa</small></span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.valueBand} aria-label="Keunggulan platform">
        <div className={styles.container + " " + styles.valueGrid}>
          <div className={styles.valueIntro}>
            <span className={styles.kicker}>SATU EKOSISTEM</span>
            <strong>Dirancang untuk kebutuhan desa</strong>
          </div>
          <div className={styles.valueItem}><b>01</b><span><strong>Multi-desa</strong><small>Satu platform terpusat</small></span></div>
          <div className={styles.valueItem}><b>02</b><span><strong>Domain sendiri</strong><small>Identitas digital tiap desa</small></span></div>
          <div className={styles.valueItem}><b>03</b><span><strong>Data terpisah</strong><small>Ruang data tiap tenant</small></span></div>
          <div className={styles.valueItem}><b>04</b><span><strong>Berbasis peran</strong><small>Akses sesuai tanggung jawab</small></span></div>
        </div>
      </section>

      <section className={styles.section} id="pilar">
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.kicker}>SATU PLATFORM, BANYAK KEMUDAHAN</span>
              <h2>Seluruh kebutuhan desa,<br /><em>dalam satu alur kerja.</em></h2>
            </div>
            <p>Mulai dari informasi publik hingga pekerjaan administrasi harian, terhubung dalam satu ekosistem digital.</p>
          </div>
          <div className={styles.pilarGrid}>
            {PILAR.map((item) => (
              <article className={styles.pilarCard} key={item.nomor}>
                <div className={styles.pilarTop}><span className={styles.pilarIcon}>{item.ikon}</span><span>{item.nomor}</span></div>
                <h3>{item.judul}</h3>
                <p>{item.isi}</p>
                <a href="#fitur">Pelajari fitur <span aria-hidden="true">→</span></a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.featureSection} id="fitur">
        <div className={styles.container}>
          <div className={styles.centerHeading}>
            <span className={styles.kicker}>FITUR UNGGULAN FLEXIDESA</span>
            <h2>Lebih praktis untuk <em>melayani warga.</em></h2>
            <p>Modul yang mendukung tata kelola pemerintahan desa secara lebih efektif dan transparan.</p>
          </div>
          <div className={styles.featureGrid}>
            {FITUR.map((item) => (
              <article className={styles.featureCard} key={item.nomor}>
                <span className={styles.featureIcon} data-tone={item.warna}>{item.ikon}</span>
                <span className={styles.featureNumber}>{item.nomor}</span>
                <h3>{item.judul}</h3>
                <p>{item.isi}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.accessSection} id="akses">
        <div className={styles.container}>
          <div className={styles.accessPanel}>
            <div className={styles.accessCopy}>
              <span className={styles.kicker}>AKSES FLEXIDESA</span>
              <h2>Satu aplikasi.<br /><em>Peran yang saling terhubung.</em></h2>
              <p>Setiap pengguna mendapatkan ruang kerja sesuai perannya, sementara data tiap desa tetap terpisah.</p>
            </div>
            <div className={styles.accessCards}>
              <article><span>♙</span><h3>Warga desa</h3><p>Ajukan layanan dan pantau pengajuan.</p><Link href="/masuk">Masuk layanan warga ↗</Link></article>
              <article><span>▦</span><h3>Operator desa</h3><p>Kelola data dan administrasi desa.</p><Link href="/masuk">Masuk staf desa ↗</Link></article>
              <article><span>⬡</span><h3>Pengelola platform</h3><p>Kelola tenant dan domain desa.</p><Link href="/super-admin">Masuk Super Admin ↗</Link></article>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaBanner}>
            <Image src="/images/platform-village-landscape.svg" alt="" fill sizes="100vw" className={styles.ctaImage} />
            <div className={styles.ctaOverlay} />
            <div className={styles.ctaContent}>
              <span className={styles.kicker}>LANGKAH MENUJU DESA DIGITAL</span>
              <h2>Siap membawa desa<br />melangkah lebih maju?</h2>
              <p>Kenali bagaimana FlexiDesa dapat mendukung pelayanan dan administrasi desa.</p>
              <div className={styles.heroActions}>
                <Link className={styles.ctaPrimary} href="/masuk">Mulai Sekarang <span aria-hidden="true">↗</span></Link>
                <a className={styles.ctaSecondary} href="#fitur">Lihat Fitur</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerMain}>
            <div className={styles.footerBrand}>
              <Link className={styles.brand} href="/">
                <Image src="/images/flexidesa-mark.svg" alt="" width={40} height={40} />
                <span className={styles.brandCopy}><strong>FlexiDesa<span>.id</span></strong><small>Sistem Informasi Desa Modern</small></span>
              </Link>
              <p>Teknologi untuk mendukung pelayanan publik dan tata kelola pemerintahan desa.</p>
            </div>
            <div className={styles.footerLinks}><strong>Jelajahi</strong><a href="#pilar">Solusi</a><a href="#fitur">Fitur</a><a href="#akses">Akses pengguna</a></div>
            <div className={styles.footerLinks}><strong>Akses</strong><Link href="/masuk">Login</Link><Link href="/super-admin">Super Admin</Link></div>
          </div>
          <div className={styles.footerBottom}><span>© {new Date().getFullYear()} FlexiDesa. Seluruh hak cipta dilindungi.</span><span>Platform Sistem Informasi Desa</span></div>
        </div>
      </footer>
    </main>
  );
}
