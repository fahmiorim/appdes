import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getLaporanApbdesPublik } from "@/features/keuangan/application/laporan-publik-use-cases";
import { listLaporanDokumenApbdesPublik } from "@/features/keuangan/application/laporan-dokumen-publik-use-cases";
import { formatRupiah } from "@/features/keuangan/domain/keuangan";

import styles from "../../informasi-publik.module.css";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ tahun?: string }> };

export default async function ApbdesPublikPage({ searchParams }: Props) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  const requestedYear = Number(params.tahun);
  const tahun = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
    ? requestedYear
    : undefined;
  const [laporan, dokumen] = await Promise.all([
    getLaporanApbdesPublik(desa.id, tahun),
    listLaporanDokumenApbdesPublik(desa.id),
  ]);
  const years = laporan.tersedia.length ? laporan.tersedia : [laporan.tahun];

  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <span><strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong><small>Transparansi Anggaran</small></span>
          </Link>
          <nav className={styles.nav} aria-label="Navigasi utama">
            <Link href="/">Beranda</Link><Link href="/profil">Profil Desa</Link><Link href="/dokumen">Dokumen</Link><Link href="/kontak">Kontak</Link>
          </nav>
          <Link href="/masuk" className={styles.login}>Masuk ↗</Link>
        </div>
      </header>
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.crumb}><Link href="/">Beranda</Link><span>/</span><span>Transparansi</span><span>/</span><span>APBDes</span></div>
          <p className={styles.kicker}>KETERBUKAAN INFORMASI PUBLIK</p>
          <h1>Transparansi APBDes</h1>
          <p>Ringkasan anggaran pendapatan, belanja, pembiayaan, dan realisasi {desa.namaDesa ?? "desa"} berdasarkan data yang tersedia.</p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          <form className={styles.filter} action="/transparansi/apbdes" method="get">
            <label htmlFor="tahun-apbdes">Tahun anggaran</label>
            <select id="tahun-apbdes" name="tahun" defaultValue={String(laporan.tahun)}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <button type="submit">Tampilkan</button>
          </form>
          <div className={styles.grid}>
            {laporan.total.anggaran !== "0.00" || laporan.total.realisasi !== "0.00" ? (
              <>
                <article className={styles.contactItem}><span>TOTAL ANGGARAN</span><strong>{formatRupiah(laporan.total.anggaran)}</strong><p className={styles.muted}>Akumulasi pendapatan, belanja, dan pembiayaan</p></article>
                <article className={styles.contactItem}><span>TOTAL REALISASI</span><strong>{formatRupiah(laporan.total.realisasi)}</strong><p className={styles.muted}>Realisasi yang tercatat pada tahun anggaran</p></article>
              </>
            ) : (
              <div className={styles.empty}><strong>Data APBDes belum tersedia</strong><p>Ringkasan anggaran akan tampil setelah data tahun anggaran dipublikasikan.</p></div>
            )}
          </div>
          <div className={styles.docList} style={{ marginTop: 22 }}>
            {laporan.baris.map((item) => (
              <article className={styles.doc} key={item.kode}>
                <div><h3>{item.uraian}</h3><p>Anggaran {formatRupiah(item.anggaran)} · Realisasi {formatRupiah(item.realisasi)}</p></div>
                <strong>{item.persen.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%</strong>
              </article>
            ))}
          </div>
          <section style={{ marginTop: 42 }}>
            <p className={styles.kicker}>DOKUMEN RESMI</p>
            <h2>Dokumen laporan APBDes</h2>
            {dokumen.length ? (
              <div className={styles.docList}>
                {dokumen.map((item) => (
                  <article className={styles.doc} key={item.id}>
                    <div><h3>{item.judul}</h3><p>{item.tahun} · {item.semesterLabel} · Diserahkan {item.diserahkanPada}</p></div>
                    <Link href={`/desa/apbdes/dokumen/${item.id}/berkas`}>Unduh dokumen ↗</Link>
                  </article>
                ))}
              </div>
            ) : <p className={styles.muted}>Belum ada dokumen APBDes yang diserahkan untuk dipublikasikan.</p>}
          </section>
        </div>
      </section>
      <footer className={styles.footer}><div className={styles.container + " " + styles.footerInner}><strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong><span>© {new Date().getFullYear()} · Didukung FlexiDesa</span></div></footer>
    </main>
  );
}
