import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikPublik } from "@/features/desa/application/statistik-publik";

import styles from "./statistik.module.css";

export const dynamic = "force-dynamic";

function angka(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}
function rupiah(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(parsed)
    : "Rp0";
}

export default async function StatistikPage() {
  const desa = await getIdentitasFromRequest();
  const data = await getStatistikPublik(desa.id);
  const totalGender = data.lakiLaki + data.perempuan;
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
            <span>Statistik Desa</span>
          </div>
          <p className={styles.kicker}>DATA TERBUKA DESA</p>
          <h1>Statistik {desa.namaDesa ?? "Desa"}</h1>
          <p>
            Ringkasan data kependudukan, kewilayahan, bantuan, dan informasi keuangan desa yang
            telah tersedia untuk publik.
          </p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>GAMBARAN UMUM</p>
              <h2>Desa dalam angka</h2>
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
              <span>Kepala keluarga</span>
              <strong>{angka(data.keluarga)}</strong>
              <small>Keluarga terdata</small>
            </article>
            <article className={styles.metric}>
              <span>Laki-laki</span>
              <strong>{angka(data.lakiLaki)}</strong>
              <small>
                {totalGender ? Math.round((data.lakiLaki / totalGender) * 100) : 0}% dari data
                gender
              </small>
            </article>
            <article className={styles.metric}>
              <span>Perempuan</span>
              <strong>{angka(data.perempuan)}</strong>
              <small>
                {totalGender ? Math.round((data.perempuan / totalGender) * 100) : 0}% dari data
                gender
              </small>
            </article>
          </div>
          <div className={styles.twoCol}>
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <div>
                  <p className={styles.kicker}>SEBARAN PENDUDUK</p>
                  <h2>Berdasarkan dusun</h2>
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
                <p className={styles.muted}>Data sebaran penduduk belum tersedia.</p>
              )}
            </section>
            <section className={styles.panel}>
              <div className={styles.panelHead}>
                <div>
                  <p className={styles.kicker}>PROGRAM SOSIAL</p>
                  <h2>Bantuan masyarakat</h2>
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
          </div>
          <section className={styles.panel + " " + styles.finance}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.kicker}>TRANSPARANSI ANGGARAN</p>
                <h2>Ringkasan APBDes {data.keuangan.tahun}</h2>
              </div>
              <span>Tahun anggaran</span>
            </div>
            <div className={styles.financeGrid}>
              <div>
                <span>Anggaran pendapatan</span>
                <strong>{rupiah(data.keuangan.pendapatan)}</strong>
              </div>
              <div>
                <span>Anggaran belanja</span>
                <strong>{rupiah(data.keuangan.belanja)}</strong>
              </div>
              <div>
                <span>Realisasi belanja</span>
                <strong>{rupiah(data.keuangan.realisasiBelanja)}</strong>
              </div>
            </div>
            {data.periode.length ? (
              <div className={styles.periodList}>
                {data.periode.map((item) => (
                  <div key={item.triwulan}>
                    <span>{item.label}</span>
                    <strong>{rupiah(item.realisasi)}</strong>
                    <small>{item.persen}%</small>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
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
