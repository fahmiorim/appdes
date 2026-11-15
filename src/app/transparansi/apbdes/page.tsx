import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { listLaporanDokumenApbdesPublik } from "@/features/keuangan/application/laporan-dokumen-publik-use-cases";
import { getLaporanApbdesPublik } from "@/features/keuangan/application/laporan-publik-use-cases";
import { formatRupiah } from "@/features/keuangan/domain/keuangan";

import styles from "../../informasi-publik.module.css";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ tahun?: string }> };

export default async function ApbdesPublikPage({ searchParams }: Props) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  const requestedYear = Number(params.tahun);
  const tahun =
    Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
      ? requestedYear
      : undefined;
  const [laporan, dokumen] = await Promise.all([
    getLaporanApbdesPublik(desa.id, tahun),
    listLaporanDokumenApbdesPublik(desa.id),
  ]);
  const years = laporan.tersedia.length ? laporan.tersedia : [laporan.tahun];
  const hasData = Number(laporan.total.anggaran) > 0 || Number(laporan.total.realisasi) > 0;
  const totalAnggaran = Number(laporan.total.anggaran);
  const totalRealisasi = Number(laporan.total.realisasi);
  const persenRealisasi =
    totalAnggaran > 0 ? Math.min(100, Math.round((totalRealisasi / totalAnggaran) * 100)) : 0;

  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <span>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <small>Transparansi Anggaran</small>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Navigasi utama">
            <Link href="/">Beranda</Link>
            <Link href="/profil">Profil Desa</Link>
            <Link href="/dokumen">Dokumen</Link>
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
            <span>Informasi</span>
            <span>/</span>
            <span>APBDes & Transparansi Anggaran</span>
          </div>
          <p className={styles.kicker}>KETERBUKAAN INFORMASI PUBLIK</p>
          <h1>APBDes & Transparansi Anggaran</h1>
          <p>
            Informasi rencana, realisasi, dan laporan keuangan {desa.namaDesa ?? "desa"} secara
            terbuka dan akuntabel.
          </p>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.container}>
          <nav className={styles.statTabs} aria-label="Bagian APBDes">
            <a className={styles.activeTab} href="#apbdes">
              APBDes
            </a>
            <a href="#realisasi">Realisasi Anggaran</a>
            <a href="#laporan">Laporan Keuangan</a>
            <a href="/dokumen">Dokumen & Regulasi</a>
          </nav>

          <form className={styles.filter} action="/transparansi/apbdes" method="get">
            <label htmlFor="tahun-apbdes">Tahun anggaran</label>
            <select id="tahun-apbdes" name="tahun" defaultValue={String(laporan.tahun)}>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button type="submit">Tampilkan</button>
            {hasData ? (
              <a className={styles.downloadButton} href="/dokumen">
                Lihat dokumen terkait ↗
              </a>
            ) : null}
          </form>

          {hasData ? (
            <>
              <section id="apbdes" className={styles.budgetOverview}>
                <div className={styles.budgetMain}>
                  <div className={styles.sectionHead}>
                    <div>
                      <p className={styles.kicker}>RINGKASAN APBDES TAHUN {laporan.tahun}</p>
                      <h2>Rencana anggaran {desa.namaDesa ?? "desa"}</h2>
                    </div>
                  </div>
                  <div className={styles.budgetSummary}>
                    <article className={styles.budgetCard}>
                      <span>Pendapatan desa</span>
                      <strong>{formatRupiah(laporan.total.anggaran)}</strong>
                    </article>
                    <article className={styles.budgetCard}>
                      <span>Belanja dan pembiayaan</span>
                      <strong>{formatRupiah(laporan.total.realisasi)}</strong>
                    </article>
                    <article className={styles.budgetCard}>
                      <span>Realisasi anggaran</span>
                      <strong>{persenRealisasi}%</strong>
                    </article>
                  </div>
                </div>
                <aside className={styles.budgetAside}>
                  <h3>Informasi APBDes</h3>
                  <p>
                    Ringkasan ini bersumber dari data anggaran yang telah dicatat dan dipublikasikan
                    pemerintah desa.
                  </p>
                  <Link href="/dokumen">Dokumen dan regulasi ↗</Link>
                </aside>
              </section>

              <section id="realisasi" className={styles.budgetRows}>
                <div className={styles.sectionHead}>
                  <div>
                    <p className={styles.kicker}>KOMPOSISI DAN REALISASI</p>
                    <h2>Rincian anggaran desa</h2>
                  </div>
                </div>
                {(laporan.bidang ?? []).length ? (
                  <div className={styles.docList}>
                    {laporan.bidang.map((item) => (
                      <article className={styles.budgetRow} key={item.kode}>
                        <div className={styles.budgetHeading}>
                          <div>
                            <h3>{item.uraian}</h3>
                            <p>
                              Anggaran {formatRupiah(item.anggaran)} · Realisasi{" "}
                              {formatRupiah(item.realisasi)}
                            </p>
                          </div>
                          <strong>
                            {item.persen.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%
                          </strong>
                        </div>
                        <div className={styles.budgetProgress}>
                          <span style={{ width: `${Math.min(100, Math.max(0, item.persen))}%` }} />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.empty}>
                    <strong>Rincian anggaran belum tersedia</strong>
                    <p>Rincian bidang akan tampil setelah data APBDes dipublikasikan.</p>
                  </div>
                )}
              </section>
            </>
          ) : (
            <div id="apbdes" className={styles.empty + " " + styles.budgetEmpty}>
              <strong>Data APBDes belum tersedia</strong>
              <p>Ringkasan anggaran akan tampil setelah data tahun anggaran dipublikasikan.</p>
            </div>
          )}

          <section id="laporan" className={styles.documentSection}>
            <p className={styles.kicker}>DOKUMEN RESMI</p>
            <h2>Dokumen laporan APBDes</h2>
            {dokumen.length ? (
              <div className={styles.docList}>
                {dokumen.map((item) => (
                  <article className={styles.doc} key={item.id}>
                    <div>
                      <h3>{item.judul}</h3>
                      <p>
                        {item.tahun} · {item.semesterLabel} · Diserahkan {item.diserahkanPada}
                      </p>
                    </div>
                    <Link href={`/desa/apbdes/dokumen/${item.id}/berkas`}>Unduh dokumen ↗</Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <strong>Belum ada dokumen laporan APBDes</strong>
                <p>Dokumen yang sudah diserahkan dan dipublikasikan akan tersedia di sini.</p>
              </div>
            )}
          </section>
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
