import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { halamanStatisPublik } from "@/features/publik/application/konten-publik";
import { sanitasiHtml, teksPolos } from "@/lib/sanitize";

import styles from "../informasi-publik.module.css";

export const dynamic = "force-dynamic";

export default async function PotensiPage() {
  const desa = await getIdentitasFromRequest();
  const halaman = await halamanStatisPublik(desa.id, "potensi");
  const isiAman = halaman?.isi ? sanitasiHtml(halaman.isi) : "";
  const ringkasan = halaman?.isi ? teksPolos(halaman.isi) : "";

  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}>
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
            <Link href="/profil">Profil Desa</Link>
            <span>/</span>
            <span>Potensi Desa</span>
          </div>
          <p className={styles.kicker}>SUMBER DAYA &amp; KEUNGGULAN LOKAL</p>
          <h1>{halaman?.judul ?? `Potensi ${desa.namaDesa ?? "Desa"}`}</h1>
          <p>
            Mengenal sumber daya, produk unggulan, dan peluang pengembangan yang telah
            dipublikasikan oleh pemerintah desa.
          </p>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.container}>
          <nav className={styles.potensiTabs} aria-label="Informasi profil desa">
            <Link href="/sejarah">Sejarah Desa</Link>
            <Link href="/visi-misi">Visi &amp; Misi</Link>
            <Link href="/wilayah">Wilayah Desa</Link>
            <span aria-current="page">Potensi Desa</span>
          </nav>

          <div className={styles.potensiLayout}>
            <article className={styles.potensiArticle}>
              <div className={styles.potensiHeading}>
                <span aria-hidden="true">✦</span>
                <div>
                  <p className={styles.kicker}>GAMBARAN POTENSI DESA</p>
                  <h2>Potensi dan keunggulan lokal</h2>
                  <p>
                    Informasi resmi yang disampaikan pemerintah {desa.namaDesa ?? "desa"}.
                  </p>
                </div>
              </div>
              {isiAman ? (
                <div
                  className={styles.potensiRichContent}
                  dangerouslySetInnerHTML={{ __html: isiAman }}
                />
              ) : (
                <div className={styles.potensiEmpty}>
                  <span aria-hidden="true">✦</span>
                  <h3>Informasi potensi belum tersedia</h3>
                  <p>
                    Pemerintah desa belum mempublikasikan uraian potensi lokal. Informasi akan
                    ditampilkan di sini setelah diperbarui melalui pengelolaan halaman desa.
                  </p>
                </div>
              )}
            </article>

            <aside className={styles.potensiAside}>
              <section className={styles.potensiInfoCard}>
                <span aria-hidden="true">ⓘ</span>
                <h2>Informasi publik</h2>
                <p>
                  Halaman ini memuat keterangan potensi yang telah diterbitkan oleh pemerintah
                  desa. Data kategori, luas, hasil produksi, dan jumlah pelaku usaha hanya
                  ditampilkan apabila tersedia dalam sumber data resmi.
                </p>
                {ringkasan ? (
                  <div className={styles.potensiSummary}>
                    <strong>Ringkasan</strong>
                    <p>{ringkasan}</p>
                  </div>
                ) : null}
              </section>
              <section className={styles.potensiContactCard}>
                <span aria-hidden="true">↗</span>
                <h2>Ingin mengetahui lebih lanjut?</h2>
                <p>
                  Hubungi pemerintah desa untuk memperoleh informasi potensi yang lebih lengkap.
                </p>
                <Link href="/kontak">Lihat kontak desa</Link>
              </section>
            </aside>
          </div>
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
