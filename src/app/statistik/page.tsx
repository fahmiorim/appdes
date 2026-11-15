import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikPublik } from "@/features/desa/application/statistik-publik";
import { formatRupiah } from "@/features/keuangan/domain/keuangan";

import styles from "./statistik.module.css";

export const dynamic = "force-dynamic";

function angka(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export default async function StatistikPage() {
  const desa = await getIdentitasFromRequest();
  const data = await getStatistikPublik(desa.id);
  const totalGender = data.lakiLaki + data.perempuan;
  const lakiPersen = totalGender ? Math.round((data.lakiLaki / totalGender) * 100) : 0;
  const perempuanPersen = totalGender ? 100 - lakiPersen : 0;
  const hasKeuangan =
    Number(data.keuangan.pendapatan) > 0 ||
    Number(data.keuangan.belanja) > 0 ||
    Number(data.keuangan.realisasiBelanja) > 0;

  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.mark}>D</span>
            <span>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <small>Data & Statistik Desa</small>
            </span>
          </Link>
          <nav aria-label="Navigasi utama">
            <Link href="/">Beranda</Link>
            <Link href="/profil">Profil Desa</Link>
            <Link href="/berita">Berita</Link>
            <Link href="/agenda">Agenda</Link>
          </nav>
          <Link href="/masuk" className={styles.login}>
            Masuk ↗
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <span>Informasi</span>
            <span>/</span>
            <span>Statistik Desa</span>
          </div>
          <p className={styles.kicker}>DATA TERBUKA DESA</p>
          <h1>Data Statistik {desa.namaDesa ?? "Desa"}</h1>
          <p>
            Penyajian data kependudukan, sosial, ekonomi, dan wilayah desa secara terbuka
            berdasarkan data yang tersedia.
          </p>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.container}>
          <nav className={styles.statTabs} aria-label="Bagian statistik">
            <a className={styles.activeTab} href="#penduduk">
              Statistik Penduduk
            </a>
            <a href="#sosial">Statistik Sosial</a>
            <a href="#ekonomi">Statistik Ekonomi</a>
            <a href="#wilayah">Data Wilayah</a>
          </nav>

          <section id="penduduk" className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.kicker}>GAMBARAN UMUM</p>
                <h2>Ringkasan data kependudukan</h2>
                <p className={styles.sectionDescription}>
                  Rekapitulasi jumlah penduduk {desa.namaDesa ?? "desa"} berdasarkan data terbaru.
                </p>
              </div>
              <span className={styles.period}>Data tersedia saat ini</span>
            </div>

            <div className={styles.metricGrid}>
              <article className={styles.metric}>
                <span>Total penduduk</span>
                <strong>{angka(data.total)}</strong>
                <small>Jiwa terdata</small>
              </article>
              <article className={styles.metric}>
                <span>Laki-laki</span>
                <strong>{angka(data.lakiLaki)}</strong>
                <small>{lakiPersen}% dari data gender</small>
              </article>
              <article className={styles.metric}>
                <span>Perempuan</span>
                <strong>{angka(data.perempuan)}</strong>
                <small>{perempuanPersen}% dari data gender</small>
              </article>
              <article className={styles.metric}>
                <span>Kepala keluarga</span>
                <strong>{angka(data.keluarga)}</strong>
                <small>Keluarga terdata</small>
              </article>
              <article className={styles.metric}>
                <span>Program bantuan</span>
                <strong>{angka(data.bantuan.program)}</strong>
                <small>Program aktif</small>
              </article>
              <article className={styles.metric}>
                <span>Penerima bantuan</span>
                <strong>{angka(data.bantuan.peserta)}</strong>
                <small>Penerima terdata</small>
              </article>
            </div>

            <div className={styles.chartGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHead}>
                  <div>
                    <p className={styles.kicker}>KOMPOSISI PENDUDUK</p>
                    <h2>Berdasarkan jenis kelamin</h2>
                  </div>
                </div>
                {totalGender ? (
                  <div className={styles.genderLayout}>
                    <div
                      className={styles.genderChart}
                      style={{
                        background: `conic-gradient(#2563eb 0 ${lakiPersen}%, #ec4899 ${lakiPersen}% 100%)`,
                      }}
                      role="img"
                      aria-label={`Laki-laki ${lakiPersen} persen, perempuan ${perempuanPersen} persen`}
                    >
                      <div>
                        <strong>{angka(totalGender)}</strong>
                        <span>Jiwa</span>
                      </div>
                    </div>
                    <div className={styles.genderLegend}>
                      <div>
                        <i className={styles.maleDot} />
                        <span>Laki-laki</span>
                        <strong>
                          {angka(data.lakiLaki)} ({lakiPersen}%)
                        </strong>
                      </div>
                      <div>
                        <i className={styles.femaleDot} />
                        <span>Perempuan</span>
                        <strong>
                          {angka(data.perempuan)} ({perempuanPersen}%)
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className={styles.muted}>Data jenis kelamin belum tersedia.</p>
                )}
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHead}>
                  <div>
                    <p className={styles.kicker}>SEBARAN PENDUDUK</p>
                    <h2>Distribusi penduduk per dusun</h2>
                  </div>
                  <span>{data.perDusun.length} wilayah</span>
                </div>
                {data.perDusun.length ? (
                  <div className={styles.dusunList}>
                    {data.perDusun.map((item) => {
                      const percent = data.total ? Math.round((item.total / data.total) * 100) : 0;
                      return (
                        <div className={styles.dusun} key={item.label}>
                          <div>
                            <strong>{item.label}</strong>
                            <span>
                              {angka(item.total)} jiwa · {percent}%
                            </span>
                          </div>
                          <div className={styles.track}>
                            <i style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles.muted}>Data sebaran penduduk per dusun belum tersedia.</p>
                )}
              </article>
            </div>
          </section>

          <section id="sosial" className={styles.panel + " " + styles.section}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.kicker}>STATISTIK SOSIAL</p>
                <h2>Program bantuan masyarakat</h2>
              </div>
            </div>
            <div className={styles.supportGrid}>
              <div>
                <strong>{angka(data.bantuan.program)}</strong>
                <span>Program aktif</span>
              </div>
              <div>
                <strong>{angka(data.bantuan.peserta)}</strong>
                <span>Penerima terdata</span>
              </div>
            </div>
            <p className={styles.note}>
              Angka mengikuti data program bantuan yang dipublikasikan oleh pemerintah desa.
            </p>
          </section>

          <section id="ekonomi" className={styles.panel + " " + styles.section}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.kicker}>STATISTIK EKONOMI</p>
                <h2>Ringkasan APBDes {data.keuangan.tahun}</h2>
              </div>
              <Link href="/transparansi/apbdes">Lihat laporan lengkap ↗</Link>
            </div>
            {hasKeuangan ? (
              <div className={styles.financeGrid}>
                <div>
                  <span>Anggaran pendapatan</span>
                  <strong>{formatRupiah(data.keuangan.pendapatan)}</strong>
                </div>
                <div>
                  <span>Anggaran belanja</span>
                  <strong>{formatRupiah(data.keuangan.belanja)}</strong>
                </div>
                <div>
                  <span>Realisasi belanja</span>
                  <strong>{formatRupiah(data.keuangan.realisasiBelanja)}</strong>
                </div>
              </div>
            ) : (
              <p className={styles.muted}>Data anggaran untuk tahun ini belum dipublikasikan.</p>
            )}
            {data.periode.length ? (
              <div className={styles.periodList}>
                {data.periode.map((item) => (
                  <div key={item.triwulan}>
                    <span>{item.label}</span>
                    <strong>{formatRupiah(item.realisasi)}</strong>
                    <small>{item.persen}%</small>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section id="wilayah" className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <p className={styles.kicker}>DATA WILAYAH</p>
                <h2>Rekap penduduk per dusun</h2>
              </div>
              <Link href="/wilayah">Lihat struktur wilayah ↗</Link>
            </div>
            {data.perDusun.length ? (
              <div className={styles.regionTable}>
                <div className={styles.regionHeader}>
                  <span>Nama dusun</span>
                  <span>Jumlah penduduk</span>
                  <span>Persentase</span>
                </div>
                {data.perDusun.map((item) => (
                  <div className={styles.regionRow} key={item.label}>
                    <strong>{item.label}</strong>
                    <span>{angka(item.total)} jiwa</span>
                    <span>{data.total ? Math.round((item.total / data.total) * 100) : 0}%</span>
                  </div>
                ))}
                <div className={styles.regionTotal}>
                  <strong>Total</strong>
                  <strong>{angka(data.total)} jiwa</strong>
                  <strong>100%</strong>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                Data wilayah belum tersedia untuk ditampilkan.
              </div>
            )}
          </section>

          <aside className={styles.publicCta}>
            <div>
              <strong>Data desa terbuka & transparan</strong>
              <p>
                Informasi statistik disajikan berdasarkan data yang dikelola dan dipublikasikan
                pemerintah desa.
              </p>
            </div>
            <Link href="/dokumen">Lihat dokumen publik ↗</Link>
          </aside>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
          <span>© {new Date().getFullYear()} · Didukung FlexiDesa</span>
        </div>
      </footer>
    </main>
  );
}
