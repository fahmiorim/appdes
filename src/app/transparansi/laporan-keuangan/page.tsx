import type { Metadata } from "next";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { listLaporanDokumenApbdesPublik } from "@/features/keuangan/application/laporan-dokumen-publik-use-cases";
import {
  getLaporanApbdesPublik,
  getLaporanTriwulanPublik,
} from "@/features/keuangan/application/laporan-publik-use-cases";
import { formatMoney, formatRupiah, toMinor } from "@/features/keuangan/domain/keuangan";

import { PublicSiteFooter, PublicSiteHeader } from "../../public-site-layout";
import styles from "./laporan-keuangan.module.css";

export const metadata: Metadata = { title: "Detail Laporan Keuangan Desa" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ tahun?: string }> };

function persen(value: number) {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + "%";
}

function locationLabel(desa: {
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
}) {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}

function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes("..")))
    return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return "/api/publik/media/" + path.map(encodeURIComponent).join("/");
}

function tanggal(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Tanggal tidak tersedia"
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(date);
}

export default async function LaporanKeuanganPublikPage({ searchParams }: Props) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  const requestedYear = Number(params.tahun);
  const tahunParam =
    Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
      ? requestedYear
      : undefined;
  const laporan = await getLaporanApbdesPublik(desa.id, tahunParam);
  const [triwulan, semuaDokumen] = await Promise.all([
    getLaporanTriwulanPublik(desa.id, laporan.tahun),
    listLaporanDokumenApbdesPublik(desa.id),
  ]);
  const dokumen = semuaDokumen.filter((item) => item.tahun === laporan.tahun);
  const pendapatan = laporan.baris.find((row) => row.kode === "4");
  const belanja = laporan.baris.find((row) => row.kode === "5");
  const pembiayaan = laporan.baris.find((row) => row.kode === "6");
  const totalPendapatan = pendapatan?.anggaran ?? "0";
  const totalBelanja = belanja?.anggaran ?? "0";
  const realisasiBelanja = belanja?.realisasi ?? "0";
  const sisaBelanja = toMinor(totalBelanja) - toMinor(realisasiBelanja);
  const sisaBelanjaTampil = formatRupiah(formatMoney(sisaBelanja > 0n ? sisaBelanja : 0n));
  const serapan =
    Number(totalBelanja) > 0
      ? Math.min(100, (Number(realisasiBelanja) / Number(totalBelanja)) * 100)
      : 0;
  const location = locationLabel(desa);
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const maxQuarter = Math.max(
    1,
    ...[triwulan.total.tw1, triwulan.total.tw2, triwulan.total.tw3, triwulan.total.tw4].map(Number),
  );
  const hasData =
    Number(totalPendapatan) > 0 ||
    Number(totalBelanja) > 0 ||
    Number(pembiayaan?.anggaran ?? 0) !== 0;
  const quarters = [
    { label: "Triwulan I", period: "Jan – Mar", value: triwulan.total.tw1 },
    { label: "Triwulan II", period: "Apr – Jun", value: triwulan.total.tw2 },
    { label: "Triwulan III", period: "Jul – Sep", value: triwulan.total.tw3 },
    { label: "Triwulan IV", period: "Okt – Des", value: triwulan.total.tw4 },
  ];

  return (
    <main className={styles.site}>
      <PublicSiteHeader
        desa={desa}
        location={location}
        logoUrl={logoUrl}
        activePath="/transparansi/laporan-keuangan"
      />
      <section className={styles.hero}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>›</span>
            <span>Informasi</span>
            <span>›</span>
            <Link href="/transparansi/apbdes">Laporan Keuangan</Link>
            <span>›</span>
            <span>Detail Laporan</span>
          </nav>
          <div className={styles.heroContent}>
            <div>
              <h1>Laporan Keuangan Desa</h1>
              <p>
                Transparansi pengelolaan keuangan desa untuk mewujudkan pemerintahan yang akuntabel
                dan partisipatif.
              </p>
            </div>
            <div className={styles.heroArt} aria-hidden="true">
              <span className={styles.clip}>✓　▥　✓</span>
              <b>Rp</b>
              <i>▥</i>
              <strong>Rp</strong>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.container + " " + styles.content}>
        <nav className={styles.tabs} aria-label="Navigasi informasi desa">
          <Link href="/berita">▤　Berita Desa</Link>
          <Link href="/pengumuman">⚑　Pengumuman</Link>
          <Link href="/agenda">▦　Agenda Kegiatan</Link>
          <Link className={styles.activeTab} href="/transparansi/laporan-keuangan">
            ▥　Laporan Keuangan
          </Link>
        </nav>

        <section className={styles.headingPanel}>
          <div className={styles.headingIcon}>▤</div>
          <div className={styles.headingText}>
            <h2>Detail Laporan Keuangan Desa</h2>
            <p>Laporan realisasi APBDes Tahun Anggaran {laporan.tahun}.</p>
          </div>
          <form className={styles.yearFilter} action="/transparansi/laporan-keuangan" method="get">
            <label htmlFor="tahun-laporan">Tahun Anggaran</label>
            <select id="tahun-laporan" name="tahun" defaultValue={String(laporan.tahun)}>
              {(laporan.tersedia.length ? laporan.tersedia : [laporan.tahun]).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button type="submit">Tampilkan</button>
          </form>
        </section>

        {hasData ? (
          <>
            <section className={styles.metaGrid}>
              <article className={styles.documentStatus}>
                <span className={styles.fileIcon}>▤</span>
                <div>
                  <strong>APBDes Tahun {laporan.tahun}</strong>
                  <small className={dokumen.length ? styles.published : styles.pending}>
                    {dokumen.length ? "✓　Dokumen dipublikasikan" : "Belum ada dokumen diserahkan"}
                  </small>
                </div>
              </article>
              <article className={styles.metaItem}>
                <span>▦</span>
                <div>
                  <strong>Periode Laporan</strong>
                  <small>
                    Data tahun anggaran {laporan.tahun}; realisasi triwulan mengikuti pencatatan
                    yang tersedia.
                  </small>
                </div>
              </article>
              <article className={styles.metaItem}>
                <span>▣</span>
                <div>
                  <strong>Dokumen Publik</strong>
                  <small>{dokumen.length} dokumen APBDes telah diserahkan untuk tahun ini.</small>
                </div>
              </article>
            </section>

            <section className={styles.metrics}>
              <article className={styles.income}>
                <span>⇩</span>
                <div>
                  <small>Pendapatan</small>
                  <strong>{formatRupiah(totalPendapatan)}</strong>
                  <em>Anggaran tahun {laporan.tahun}</em>
                </div>
              </article>
              <article className={styles.expense}>
                <span>▣</span>
                <div>
                  <small>Belanja</small>
                  <strong>{formatRupiah(totalBelanja)}</strong>
                  <em>Anggaran tahun {laporan.tahun}</em>
                </div>
              </article>
              <article className={styles.realized}>
                <span>▥</span>
                <div>
                  <small>Realisasi Belanja</small>
                  <strong>{formatRupiah(realisasiBelanja)}</strong>
                  <em>{persen(serapan)} dari anggaran</em>
                </div>
              </article>
              <article className={styles.remaining}>
                <span>⚖</span>
                <div>
                  <small>Sisa Anggaran</small>
                  <strong>{sisaBelanjaTampil}</strong>
                  <em>{persen(Math.max(0, 100 - serapan))} belum terserap</em>
                </div>
              </article>
            </section>

            <div className={styles.dashboard}>
              <div className={styles.mainColumn}>
                <section className={styles.panel}>
                  <div className={styles.sectionTitle}>
                    <span>▥</span>
                    <div>
                      <h2>Realisasi APBDes {laporan.tahun}</h2>
                      <p>Ringkasan pendapatan, belanja, dan pembiayaan desa.</p>
                    </div>
                  </div>
                  <div className={styles.tableWrap}>
                    <table>
                      <thead>
                        <tr>
                          <th>Uraian</th>
                          <th>Anggaran (Rp)</th>
                          <th>Realisasi (Rp)</th>
                          <th>Persentase</th>
                        </tr>
                      </thead>
                      <tbody>
                        {laporan.baris.map((row, index) => (
                          <tr key={row.kode} className={styles["row" + index]}>
                            <td>
                              <span className={styles.rowDot} />
                              {row.uraian}
                            </td>
                            <td>{formatRupiah(row.anggaran)}</td>
                            <td>{formatRupiah(row.realisasi)}</td>
                            <td>{persen(row.persen)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th>Total Pendapatan + Belanja + Pembiayaan</th>
                          <th>{formatRupiah(laporan.total.anggaran)}</th>
                          <th>{formatRupiah(laporan.total.realisasi)}</th>
                          <th>—</th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className={styles.note}>
                    Nilai ditampilkan berdasarkan pencatatan APBDes tenant desa yang sedang diakses.
                  </div>
                </section>

                <section className={styles.panel}>
                  <div className={styles.sectionTitle}>
                    <span>▤</span>
                    <div>
                      <h2>Rincian Belanja per Bidang</h2>
                      <p>Perbandingan anggaran dan realisasi pada setiap bidang belanja.</p>
                    </div>
                  </div>
                  {laporan.bidang.length ? (
                    <div className={styles.budgetRows}>
                      {laporan.bidang.map((row) => (
                        <div className={styles.budgetRow} key={row.kode}>
                          <div>
                            <strong>{row.uraian}</strong>
                            <small>
                              {formatRupiah(row.realisasi)} / {formatRupiah(row.anggaran)}
                            </small>
                          </div>
                          <div className={styles.progress}>
                            <i style={{ width: Math.min(100, Math.max(0, row.persen)) + "%" }} />
                          </div>
                          <b>{persen(row.persen)}</b>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.empty}>Rincian bidang belanja belum tersedia.</p>
                  )}
                </section>

                <section className={styles.panel}>
                  <div className={styles.sectionTitle}>
                    <span>▧</span>
                    <div>
                      <h2>Dokumen Terkait</h2>
                      <p>Dokumen APBDes yang telah diserahkan dan dapat diakses publik.</p>
                    </div>
                  </div>
                  {dokumen.length ? (
                    <div className={styles.documents}>
                      {dokumen.map((doc) => (
                        <article key={doc.id}>
                          <span className={styles.pdf}>PDF</span>
                          <div>
                            <strong>{doc.judul}</strong>
                            <small>
                              {doc.tahun} · {doc.semesterLabel} · Diserahkan{" "}
                              {tanggal(doc.diserahkanPada)}
                            </small>
                          </div>
                          <Link
                            href={"/desa/apbdes/dokumen/" + doc.id + "/berkas"}
                            aria-label={"Unduh " + doc.judul}
                          >
                            ↓
                          </Link>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.empty}>
                      Belum ada dokumen APBDes yang dipublikasikan untuk tahun ini. Dokumen akan
                      muncul setelah Admin Desa mengunggah dan mencatat penyerahannya.
                    </p>
                  )}
                </section>
              </div>

              <aside className={styles.sideColumn}>
                <section className={styles.panel + " " + styles.donutPanel}>
                  <div className={styles.sectionTitle}>
                    <span>◔</span>
                    <div>
                      <h2>Grafik Realisasi Anggaran</h2>
                      <p>Persentase realisasi belanja tahunan.</p>
                    </div>
                  </div>
                  <div
                    className={styles.donut}
                    style={{ background: "conic-gradient(#7528ee " + serapan + "%, #e6d9ff 0)" }}
                  >
                    <div>
                      <small>Realisasi</small>
                      <strong>{persen(serapan)}</strong>
                    </div>
                  </div>
                  <div className={styles.legend}>
                    <span>
                      <i />
                      Realisasi <b>{formatRupiah(realisasiBelanja)}</b>
                    </span>
                    <span>
                      <i />
                      Sisa anggaran <b>{sisaBelanjaTampil}</b>
                    </span>
                  </div>
                </section>

                <section className={styles.panel}>
                  <div className={styles.sectionTitle}>
                    <span>▥</span>
                    <div>
                      <h2>Realisasi Penyerapan per Triwulan</h2>
                      <p>Akumulasi nilai triwulan dibanding pagu anggaran.</p>
                    </div>
                  </div>
                  <div className={styles.quarterChart}>
                    {quarters.map((quarter) => (
                      <div className={styles.quarter} key={quarter.label}>
                        <strong>
                          {persen(
                            Number(totalBelanja) > 0
                              ? (Number(quarter.value) / Number(totalBelanja)) * 100
                              : 0,
                          )}
                        </strong>
                        <div className={styles.barTrack}>
                          <i style={{ height: (Number(quarter.value) / maxQuarter) * 100 + "%" }} />
                        </div>
                        <b>{quarter.label}</b>
                        <small>{quarter.period}</small>
                      </div>
                    ))}
                  </div>
                  <p className={styles.note}>
                    Triwulan tanpa pencatatan ditampilkan sebagai Rp0, bukan estimasi.
                  </p>
                </section>

                <section className={styles.panel + " " + styles.infoPanel}>
                  <div className={styles.sectionTitle}>
                    <span>ⓘ</span>
                    <div>
                      <h2>Informasi Laporan</h2>
                      <p>Keterangan data yang ditampilkan.</p>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>Tahun anggaran</dt>
                      <dd>{laporan.tahun}</dd>
                    </div>
                    <div>
                      <dt>Dokumen diserahkan</dt>
                      <dd>{dokumen.length}</dd>
                    </div>
                    <div>
                      <dt>Realisasi triwulan</dt>
                      <dd>{triwulan.baris.length} bidang</dd>
                    </div>
                  </dl>
                  <Link href={"/transparansi/apbdes?tahun=" + laporan.tahun}>
                    Lihat APBDes lengkap　→
                  </Link>
                </section>
              </aside>
            </div>
          </>
        ) : (
          <section className={styles.emptyState}>
            <span>▤</span>
            <h2>Laporan Keuangan Belum Tersedia</h2>
            <p>
              Data laporan akan ditampilkan setelah pemerintah desa mengisi APBDes dan mencatat
              realisasi keuangan.
            </p>
            <Link href="/kontak">Hubungi Pemerintah Desa</Link>
          </section>
        )}

        <section className={styles.cta}>
          <span>✓</span>
          <div>
            <h2>Transparansi untuk Masyarakat</h2>
            <p>
              Laporan keuangan desa dapat diakses secara terbuka sebagai bentuk akuntabilitas
              pengelolaan keuangan desa.
            </p>
          </div>
          <Link href="/transparansi/apbdes">Lihat Laporan Tahun Lainnya　→</Link>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
