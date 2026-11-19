import type { Metadata } from "next";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { listLaporanDokumenApbdesPublik } from "@/features/keuangan/application/laporan-dokumen-publik-use-cases";
import { getLaporanApbdesPublik } from "@/features/keuangan/application/laporan-publik-use-cases";
import { formatRupiah } from "@/features/keuangan/domain/keuangan";
import { PublicSiteFooter, PublicSiteHeader } from "../../public-site-layout";
import { PrintApbdesButton } from "./print-apbdes-button";
import styles from "./apbdes.module.css";

export const metadata: Metadata = { title: "APBDes & Transparansi Anggaran" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ tahun?: string }> };
const palette = ["#1684f5", "#b64bf0", "#16b84b", "#f5a400", "#ed39a8"];

function angka(value: number) { return new Intl.NumberFormat("id-ID").format(value); }
function persen(value: number) { return value.toLocaleString("id-ID", { maximumFractionDigits: 2 }) + "%"; }
function locationLabel(desa: { namaKecamatan: string | null; namaKabupaten: string | null; namaPropinsi: string | null }) {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}
function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes(".."))) return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return "/api/publik/media/" + path.map(encodeURIComponent).join("/");
}
function tanggal(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tanggal tidak tersedia" : new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(date);
}

export default async function ApbdesPublikPage({ searchParams }: Props) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  const requestedYear = Number(params.tahun);
  const tahun = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : undefined;
  const [laporan, semuaDokumen] = await Promise.all([
    getLaporanApbdesPublik(desa.id, tahun),
    listLaporanDokumenApbdesPublik(desa.id),
  ]);
  const dokumen = semuaDokumen.filter((item) => item.tahun === laporan.tahun);
  const pendapatan = laporan.baris.find((row) => row.kode === "4");
  const belanja = laporan.baris.find((row) => row.kode === "5");
  const pembiayaan = laporan.baris.find((row) => row.kode === "6");
  const totalPendapatan = pendapatan?.anggaran ?? "0";
  const totalBelanja = belanja?.anggaran ?? "0";
  const totalPembiayaan = pembiayaan?.anggaran ?? "0";
  const realisasiBelanja = belanja?.realisasi ?? "0";
  const sisaBelanja = Math.max(0, Number(totalBelanja) - Number(realisasiBelanja));
  const persenRealisasi = Number(totalBelanja) > 0 ? Math.min(100, Number(realisasiBelanja) / Number(totalBelanja) * 100) : 0;
  const komposisiTotal = laporan.bidang.reduce((sum, row) => sum + Number(row.anggaran), 0);
  let cursor = 0;
  const donut = laporan.bidang.map((row, index) => {
    const start = cursor;
    cursor += komposisiTotal > 0 ? Number(row.anggaran) / komposisiTotal * 100 : 0;
    return { ...row, color: palette[index % palette.length], start, end: cursor };
  });
  const donutStyle = komposisiTotal > 0
    ? { background: "conic-gradient(" + donut.map((row) => row.color + " " + row.start + "% " + row.end + "%").join(", ") + ")" }
    : undefined;
  const years = laporan.tersedia.length ? laporan.tersedia : [laporan.tahun];
  const location = locationLabel(desa);
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const hasData = Number(totalPendapatan) > 0 || Number(totalBelanja) > 0 || Number(totalPembiayaan) !== 0;
  const maxBar = Math.max(1, ...laporan.bidang.map((row) => Number(row.anggaran)), ...laporan.bidang.map((row) => Number(row.realisasi)));

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/transparansi/apbdes" />
      <section className={styles.hero}><div className={styles.container}>
        <nav className={styles.breadcrumb}><Link href="/">Beranda</Link><span>›</span><span>Informasi</span><span>›</span><span>APBDes &amp; Transparansi Anggaran</span></nav>
        <div className={styles.heroContent}><div><h1>APBDes &amp; Transparansi Anggaran</h1><p>Informasi rencana, realisasi, dan laporan keuangan desa secara terbuka, akuntabel, dan sesuai ketentuan.</p></div><div className={styles.heroArt} aria-hidden="true"><span className={styles.clip}>✓　✓　✓</span><b>APBDes</b><i>▦</i><strong>Rp</strong><strong>Rp</strong></div></div>
      </div></section>
      <div className={styles.container + " " + styles.content}>
        <nav className={styles.tabs} aria-label="Bagian transparansi anggaran"><a className={styles.activeTab} href="#apbdes">▱　APBDes</a><a href="#realisasi">▤　Realisasi Anggaran</a><a href="#laporan">▣　Laporan Keuangan</a><a href="#dokumen">▧　Dokumen &amp; Regulasi</a></nav>
        <form className={styles.filter} action="/transparansi/apbdes" method="get"><label htmlFor="tahun-apbdes">▦　Tahun Anggaran</label><select id="tahun-apbdes" name="tahun" defaultValue={String(laporan.tahun)}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select><button type="submit" className={styles.applyFilter}>Tampilkan</button><span className={styles.filterSpacer}/><PrintApbdesButton /></form>
        {hasData ? (
          <div className={styles.dashboard}>
            <div className={styles.mainColumn}>
              <section id="apbdes" className={styles.panel}>
                <div className={styles.sectionTitle}><span className={styles.titleIcon}>▥</span><div><h2>Ringkasan APBDes Tahun {laporan.tahun}</h2><p>Rencana pendapatan, belanja, dan pembiayaan {desa.namaDesa ?? "desa"}.</p></div></div>
                <div className={styles.summaryCards}><article className={styles.incomeCard}><span>↓</span><div><small>Pendapatan Desa</small><strong>{formatRupiah(totalPendapatan)}</strong></div></article><article className={styles.expenseCard}><span>↑</span><div><small>Belanja Desa</small><strong>{formatRupiah(totalBelanja)}</strong></div></article><article className={styles.financeCard}><span>=</span><div><small>Pembiayaan (Netto)</small><strong>{formatRupiah(totalPembiayaan)}</strong></div></article></div>
              </section>
              <section className={styles.panel}><div className={styles.sectionTitle}><span className={styles.titleIcon}>▱</span><div><h2>Komposisi Belanja Desa</h2><p>Alokasi anggaran berdasarkan bidang belanja.</p></div></div>
                {donut.length ? <div className={styles.composition}><div className={styles.donutWrap}><div className={styles.donut} style={donutStyle}><div><small>Total Belanja</small><strong>{formatRupiah(totalBelanja)}</strong></div></div></div><div className={styles.legend}>{donut.map((row) => <div key={row.kode}><i style={{ background: row.color }}/><span>{row.uraian}</span><strong>{formatRupiah(row.anggaran)}</strong><small>{persen(komposisiTotal ? Number(row.anggaran) / komposisiTotal * 100 : 0)}</small></div>)}</div></div> : <p className={styles.empty}>Rincian bidang belanja belum tersedia untuk tahun anggaran ini.</p>}
              </section>
              <div className={styles.tablesGrid}>
                <section id="laporan" className={styles.panel}><div className={styles.sectionTitle}><span className={styles.titleIcon}>♧</span><div><h2>Rincian Pendapatan Desa</h2><p>Rencana per sumber pendapatan.</p></div></div>
                  {laporan.pendapatan.length ? <div className={styles.tableWrap}><table><thead><tr><th>No</th><th>Sumber Pendapatan</th><th>Rencana (Rp)</th></tr></thead><tbody>{laporan.pendapatan.map((row,index)=><tr key={row.kode}><td>{index+1}</td><td>{row.uraian}</td><td>{formatRupiah(row.anggaran)}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Total Pendapatan Desa</th><th>{formatRupiah(totalPendapatan)}</th></tr></tfoot></table></div> : <p className={styles.empty}>Rincian sumber pendapatan belum diisi pada APBDes.</p>}
                </section>
                <section className={styles.panel}><div className={styles.sectionTitle}><span className={styles.titleIcon}>🛒</span><div><h2>Rincian Belanja Desa</h2><p>Rencana anggaran per bidang.</p></div></div>
                  {laporan.bidang.length ? <div className={styles.tableWrap}><table><thead><tr><th>No</th><th>Bidang Belanja</th><th>Rencana (Rp)</th></tr></thead><tbody>{laporan.bidang.map((row,index)=><tr key={row.kode}><td>{index+1}</td><td>{row.uraian}</td><td>{formatRupiah(row.anggaran)}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Total Belanja Desa</th><th>{formatRupiah(totalBelanja)}</th></tr></tfoot></table></div> : <p className={styles.empty}>Rincian bidang belanja belum diisi pada APBDes.</p>}
                </section>
              </div>
              <section id="realisasi" className={styles.panel}><div className={styles.sectionTitle}><span className={styles.titleIcon}>▥</span><div><h2>Realisasi Anggaran {laporan.tahun}</h2><p>Perbandingan rencana dan realisasi yang telah dicatat pada tahun anggaran ini.</p></div><span className={styles.periodTag}>Tahunan</span></div>
                <div className={styles.realizationCards}><article><span>▤</span><div><small>Realisasi Belanja</small><strong>{formatRupiah(realisasiBelanja)}</strong></div></article><article><span>%</span><div><small>Persentase</small><strong>{persen(persenRealisasi)}</strong></div></article><article><span>◷</span><div><small>Sisa Anggaran</small><strong>{formatRupiah(String(sisaBelanja))}</strong></div></article></div>
                {laporan.bidang.length ? <div className={styles.realizationList}>{laporan.bidang.map((row,index)=><div className={styles.realizationRow} key={row.kode}><span className={styles.rowIcon} style={{color:palette[index%palette.length]}}>✥</span><strong>{row.uraian}</strong><div className={styles.progressTrack}><i style={{width:Math.min(100,Math.max(0,row.persen))+"%",background:palette[index%palette.length]}}/></div><span>{formatRupiah(row.realisasi)} / {formatRupiah(row.anggaran)}</span><b>{persen(row.persen)}</b></div>)}</div> : <p className={styles.empty}>Belum ada rincian realisasi per bidang.</p>}
              </section>
            </div>
            <aside className={styles.sideColumn}>
              <section className={styles.panel + " " + styles.infoPanel}><div className={styles.sectionTitle}><span className={styles.titleIcon}>ⓘ</span><h2>Informasi APBDes</h2></div><p>APBDes merupakan rencana keuangan tahunan pemerintah desa yang ditetapkan melalui peraturan desa dan menjadi dasar pelaksanaan pembangunan serta pelayanan masyarakat.</p>
                <div className={styles.infoItem}><span>⚖</span><div><strong>Dasar Pengelolaan</strong><small>Pengelolaan keuangan desa mengikuti ketentuan peraturan perundang-undangan yang berlaku.</small></div></div>
                <div className={styles.infoItem}><span>▤</span><div><strong>Dokumen Penetapan</strong><small>{dokumen.length ? dokumen.length + " dokumen laporan diserahkan untuk tahun " + laporan.tahun : "Dokumen penetapan belum diunggah atau belum diserahkan."}</small></div></div>
                <div className={styles.infoItem}><span>▦</span><div><strong>Tahun Anggaran</strong><small>{laporan.tahun}</small></div></div>
                <div className={styles.infoItem}><span className={dokumen.length ? styles.ok : styles.pending}>{dokumen.length ? "✓" : "!"}</span><div><strong>Status Dokumen</strong><small>{dokumen.length ? "Terdapat dokumen yang telah diserahkan" : "Belum ada dokumen APBDes yang diserahkan"}</small></div></div>
              </section>
              <section id="dokumen" className={styles.panel + " " + styles.docsPanel}><div className={styles.sectionTitle}><span className={styles.titleIcon}>▱</span><h2>Dokumen Terkait</h2></div>
                {dokumen.length ? <div className={styles.documentList}>{dokumen.map((doc)=><article key={doc.id}><span className={styles.pdfIcon}>PDF</span><div><strong>{doc.judul}</strong><small>{doc.tahun} · {doc.semesterLabel} · Diserahkan {tanggal(doc.diserahkanPada)}</small></div><Link href={"/desa/apbdes/dokumen/"+doc.id+"/berkas"} aria-label={"Unduh "+doc.judul}>↓</Link></article>)}</div> : <p className={styles.empty}>Belum ada dokumen APBDes yang dipublikasikan untuk tahun ini. Dokumen akan muncul setelah Admin Desa mengunggah dan mencatat penyerahannya.</p>}
                <Link className={styles.allDocs} href="/dokumen">Lihat Semua Dokumen　→</Link>
              </section>
              <section className={styles.panel + " " + styles.chartPanel}><div className={styles.sectionTitle}><span className={styles.titleIcon}>◔</span><h2>Grafik Realisasi Belanja</h2></div><div className={styles.chartLegend}><span><i/>Rencana</span><span><i/>Realisasi</span></div>
                {laporan.bidang.length ? <div className={styles.barChart}>{laporan.bidang.map((row,index)=><div className={styles.barGroup} key={row.kode}><div className={styles.bars}><i style={{height:(Number(row.anggaran)/maxBar*100)+"%"}}/><b style={{height:(Number(row.realisasi)/maxBar*100)+"%",background:palette[index%palette.length]}}/></div><small>{row.uraian}</small></div>)}</div> : <p className={styles.empty}>Grafik muncul setelah data bidang belanja tersedia.</p>}
              </section>
            </aside>
          </div>
        ) : <section className={styles.panel + " " + styles.emptyState}><span>▤</span><h2>APBDes Tahun {laporan.tahun} Belum Tersedia</h2><p>Data rencana anggaran akan ditampilkan setelah pemerintah desa mengisi dan menyimpan APBDes pada modul Keuangan Desa.</p><Link href="/kontak">Hubungi Pemerintah Desa</Link></section>}
        <section className={styles.cta}><div className={styles.ctaArt}>✓</div><div><h2>Transparan, Akuntabel, dan Partisipatif</h2><p>Kami berkomitmen menyajikan informasi pengelolaan keuangan desa secara terbuka bagi seluruh masyarakat.</p></div><Link href="#laporan">Lihat Laporan Lengkap　→</Link></section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl}/>
    </main>
  );
}
