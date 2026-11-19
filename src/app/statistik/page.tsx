import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikPublik } from "@/features/desa/application/statistik-publik";
import { getRincianStatistikPublik } from "@/features/desa/application/statistik-rinci-publik";
import { formatRupiah } from "@/features/keuangan/domain/keuangan";
import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import { PrintStatisticsButton } from "./print-statistics-button";
import styles from "./statistik.module.css";

export const dynamic = "force-dynamic";

function angka(value: number) { return new Intl.NumberFormat("id-ID").format(value); }
function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes(".."))) return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return "/api/publik/media/" + path.map(encodeURIComponent).join("/");
}
function locationLabel(desa: { namaKecamatan: string | null; namaKabupaten: string | null; namaPropinsi: string | null }) {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}
function BarList({ rows, color = "purple" }: { rows: { label: string; total: number }[]; color?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  return <div className={styles.barList}>{rows.length ? rows.map((row) => <div className={styles.barRow} key={row.label}>
    <span title={row.label}>{row.label}</span><div><i className={styles[color]} style={{ width: (row.total / max * 100) + "%" }} /></div><strong>{angka(row.total)}</strong>
  </div>) : <p className={styles.empty}>Data belum tersedia atau belum diisi pada data kependudukan.</p>}</div>;
}

export default async function StatistikPage() {
  const desa = await getIdentitasFromRequest();
  const [data, rincian] = await Promise.all([getStatistikPublik(desa.id), getRincianStatistikPublik(desa.id)]);
  const totalGender = data.lakiLaki + data.perempuan;
  const lakiPersen = totalGender ? Math.round(data.lakiLaki / totalGender * 100) : 0;
  const perempuanPersen = totalGender ? 100 - lakiPersen : 0;
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const location = locationLabel(desa);
  const hasKeuangan = Number(data.keuangan.pendapatan) > 0 || Number(data.keuangan.belanja) > 0 || Number(data.keuangan.realisasiBelanja) > 0;
  const totalDusun = rincian.perDusun.reduce((sum, row) => sum + row.total, 0);
  const totalAge = rincian.kelompokUsia.reduce((sum, row) => sum + row.total, 0);
  const periodeLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date());

  return <main className={styles.site}>
    <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/statistik" />
    <section className={styles.hero}><div className={styles.container}>
      <nav className={styles.breadcrumb}><Link href="/">Beranda</Link><span>›</span><span>Informasi</span><span>›</span><span>Data Statistik Desa</span></nav>
      <div className={styles.heroContent}><div><h1>Data Statistik Desa</h1><p>Penyajian data kependudukan, sosial, ekonomi, dan wilayah {desa.namaDesa ?? "desa"} secara transparan dan terkini.</p></div><div className={styles.heroArt} aria-hidden="true"><span>▥</span><span>▥</span><span>▥</span><b>◔</b></div></div>
    </div></section>
    <div className={styles.container + " " + styles.content}>
      <nav className={styles.statTabs} aria-label="Bagian statistik"><a className={styles.activeTab} href="#penduduk">▥　Statistik Penduduk</a><a href="#sosial">♧　Statistik Sosial</a><a href="#ekonomi">▱　Statistik Ekonomi</a><a href="#wilayah">⌖　Data Wilayah</a></nav>
      <section id="penduduk" className={styles.summaryPanel}>
        <div className={styles.sectionHead}><div><h2>Ringkasan Data Kependudukan</h2><p>Rekapitulasi jumlah penduduk {desa.namaDesa ?? "desa"} berdasarkan data terbaru.</p></div><span className={styles.period}>Periode data · {periodeLabel}<small>Snapshot data saat ini</small></span></div>
        <div className={styles.metricGrid}>
          <article className={styles.metric}><span className={styles.metricIcon}>♙</span><div><strong>{angka(data.total)}</strong><b>Jiwa</b><small>Total Penduduk</small></div></article>
          <article className={styles.metric}><span className={styles.metricIcon}>♂</span><div><strong>{angka(data.lakiLaki)}</strong><b>Jiwa</b><small>Laki-laki ({lakiPersen}%)</small></div></article>
          <article className={styles.metric}><span className={styles.metricIcon}>♀</span><div><strong>{angka(data.perempuan)}</strong><b>Jiwa</b><small>Perempuan ({perempuanPersen}%)</small></div></article>
          <article className={styles.metric}><span className={styles.metricIcon}>⌂</span><div><strong>{angka(data.keluarga)}</strong><b>KK</b><small>Jumlah Kepala Keluarga</small></div></article>
          <article className={styles.metric}><span className={styles.metricIcon}>⌖</span><div><strong>{rincian.wilayah.length ? angka(rincian.wilayah.length) : "—"}</strong><b>Area</b><small>Area GIS terdata</small></div></article>
          <article className={styles.metric}><span className={styles.metricIcon}>▥</span><div><strong>{totalGender ? angka(Math.round(data.total / Math.max(1, data.keluarga))) : "—"}</strong><b>Jiwa/KK</b><small>Rata-rata anggota KK</small></div></article>
        </div>
      </section>
      <div className={styles.twoCol}>
        <section className={styles.panel}><div className={styles.panelHead}><h2>Komposisi Penduduk Berdasarkan Jenis Kelamin</h2></div>
          {totalGender ? <div className={styles.genderLayout}><div className={styles.genderChart} style={{ background: "conic-gradient(#2878f5 0 " + lakiPersen + "%, #ed4bb5 " + lakiPersen + "% 100%)" }} role="img" aria-label={"Laki-laki "+lakiPersen+" persen, perempuan "+perempuanPersen+" persen"}><div><strong>{angka(totalGender)}</strong><span>Jiwa</span></div></div><div className={styles.genderLegend}><p><i className={styles.maleDot}/>Laki-laki<strong>{angka(data.lakiLaki)} jiwa ({lakiPersen}%)</strong></p><p><i className={styles.femaleDot}/>Perempuan<strong>{angka(data.perempuan)} jiwa ({perempuanPersen}%)</strong></p></div></div> : <p className={styles.empty}>Data jenis kelamin belum tersedia.</p>}
        </section>
        <section className={styles.panel}><div className={styles.panelHead}><h2>Distribusi Penduduk Berdasarkan Kelompok Usia</h2><small>{angka(totalAge)} penduduk dengan tanggal lahir terdata</small></div><BarList rows={rincian.kelompokUsia}/></section>
      </div>
      <div className={styles.twoCol + " " + styles.lowerGrid}>
        <section className={styles.panel}><div className={styles.panelHead}><h2>Tingkat Pendidikan Penduduk</h2><small>Pendidikan terakhir yang tercatat</small></div><BarList rows={rincian.pendidikan} color="green"/></section>
        <section className={styles.panel}><div className={styles.panelHead}><h2>Pekerjaan Penduduk</h2><small>Pekerjaan yang tercatat pada data penduduk</small></div><BarList rows={rincian.pekerjaan} color="blue"/></section>
      </div>
      <div className={styles.twoCol + " " + styles.regionGrid}>
        <section id="wilayah" className={styles.panel}><div className={styles.panelHead}><h2>Rekap Data Penduduk per Dusun</h2><small>Jumlah penduduk dan kepala keluarga setiap dusun.</small></div>
          {rincian.perDusun.length ? <div className={styles.tableWrap}><table><thead><tr><th>No</th><th>Nama Dusun</th><th>Penduduk</th><th>Laki-laki</th><th>Perempuan</th><th>Jumlah KK</th></tr></thead><tbody>{rincian.perDusun.map((row,index)=><tr key={row.label}><td>{index+1}</td><td>{row.label}</td><td>{angka(row.total)}</td><td>{angka(row.lakiLaki)}</td><td>{angka(row.perempuan)}</td><td>{angka(row.keluarga)}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Total</th><th>{angka(totalDusun)}</th><th>{angka(rincian.perDusun.reduce((s,r)=>s+r.lakiLaki,0))}</th><th>{angka(rincian.perDusun.reduce((s,r)=>s+r.perempuan,0))}</th><th>{angka(data.keluarga)}</th></tr></tfoot></table></div> : <p className={styles.empty}>Data dusun belum tersedia. Lengkapi wilayah dan domisili penduduk di Admin Desa.</p>}
        </section>
        <section className={styles.panel}><div className={styles.panelHead}><h2>Peta Wilayah Desa</h2><small>Layer wilayah GIS yang sudah dipublikasikan.</small></div>
          {rincian.wilayah.length ? <div className={styles.mapList}>{rincian.wilayah.map((area,index)=><div key={area.nama}><i>{index+1}</i><strong>{area.nama}</strong><span>{area.tersediaPeta ? "Batas peta tersedia" : "Geometri belum diisi"}</span></div>)}</div> : <div className={styles.mapEmpty}><span>⌖</span><strong>Data peta belum tersedia</strong><p>Tambahkan polygon dan area dusun melalui modul GIS agar batas wilayah dapat ditampilkan.</p><Link href="/wilayah">Lihat informasi wilayah →</Link></div>}
          <Link className={styles.regionLink} href="/wilayah">Lihat detail wilayah desa →</Link>
        </section>
      </div>
      <div className={styles.twoCol + " " + styles.bottomGrid}>
        <section id="sosial" className={styles.panel}><div className={styles.panelHead}><h2>Statistik Sosial</h2><small>Program bantuan masyarakat yang tercatat.</small></div><div className={styles.supportGrid}><div><strong>{angka(data.bantuan.program)}</strong><span>Program bantuan aktif</span></div><div><strong>{angka(data.bantuan.peserta)}</strong><span>Penerima terdata</span></div></div></section>
        <section id="ekonomi" className={styles.panel}><div className={styles.panelHead}><h2>Statistik Ekonomi · APBDes {data.keuangan.tahun}</h2><Link href="/transparansi/apbdes">Laporan lengkap →</Link></div>{hasKeuangan ? <div className={styles.financeGrid}><div><span>Pendapatan</span><strong>{formatRupiah(data.keuangan.pendapatan)}</strong></div><div><span>Belanja</span><strong>{formatRupiah(data.keuangan.belanja)}</strong></div><div><span>Realisasi belanja</span><strong>{formatRupiah(data.keuangan.realisasiBelanja)}</strong></div></div> : <p className={styles.empty}>Data APBDes belum dipublikasikan.</p>}</section>
      </div>
      <section className={styles.publicCta}><div><h2>Data Desa Terbuka &amp; Transparan</h2><p>Data statistik desa disajikan berdasarkan data yang tercatat dan dipublikasikan pemerintah desa. Informasi agregat ini tidak menampilkan identitas pribadi penduduk.</p></div><PrintStatisticsButton/></section>
    </div>
    <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl}/>
  </main>;
}
