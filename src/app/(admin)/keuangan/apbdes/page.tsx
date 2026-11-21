import Link from "next/link";
import { listKeuangan } from "@/features/keuangan/application/keuangan-use-cases";
import { formatRupiah, isInputRow, kodeDepth, toMinor } from "@/features/keuangan/domain/keuangan";
import styles from "../keuangan.module.css";
import { simpanPaguApbdesAction } from "../actions";

export const metadata = { title: "APBDes" };

type Props = { searchParams: Promise<{ tahun?: string }> };

export default async function ApbdesPage({ searchParams }: Props) {
  const params = await searchParams;
  const tahunParam = Number(params.tahun);
  const tahun = Number.isInteger(tahunParam) && tahunParam >= 2000 && tahunParam <= 2100 ? tahunParam : undefined;
  const data = await listKeuangan(tahun);
  const akun = new Map(data.rows.map((row) => [row.templateUuid, row]));
  const surplus = toMinor(akun.get("4")?.anggaran ?? "0") - toMinor(akun.get("5")?.anggaran ?? "0") + toMinor(akun.get("6")?.anggaran ?? "0");
  return <main className={styles.page}>
    <header className={styles.heading}><div className={styles.headingIcon}>▤</div><div><p className={styles.eyebrow}>KEUANGAN DESA</p><h1>APBDes</h1><p>Kelola Anggaran Pendapatan dan Belanja Desa per tahun anggaran.</p></div></header>
    <nav className={styles.tabs}><Link href="/keuangan">Dashboard</Link><Link className={styles.activeTab} href="/keuangan/apbdes">APBDes</Link><Link href="/keuangan/realisasi">Realisasi Anggaran</Link><Link href="/keuangan/kegiatan">Kegiatan &amp; Pembangunan</Link><Link href="/keuangan/laporan">Laporan Keuangan</Link><Link href="/keuangan/dokumen">Dokumen &amp; Peraturan</Link></nav>
    <section className={styles.metrics}><article className={styles.metricPrimary}><span>Total APBDes {data.tahun}</span><strong>{formatRupiah((akun.get("4")?.anggaran ?? "0"))}</strong><small>Pagu pendapatan desa</small></article><article className={styles.metric}><span>Pendapatan</span><strong>{formatRupiah(akun.get("4")?.anggaran ?? "0")}</strong><small>Rencana pendapatan</small></article><article className={styles.metric}><span>Belanja</span><strong>{formatRupiah(akun.get("5")?.anggaran ?? "0")}</strong><small>Rencana belanja</small></article><article className={styles.metric}><span>Pembiayaan Netto</span><strong>{formatRupiah(akun.get("6")?.anggaran ?? "0")}</strong><small>Anggaran pembiayaan</small></article><article className={styles.metric}><span>Surplus / Defisit Anggaran</span><strong>{formatRupiah((surplus / 100n).toString() + "." + String(surplus % 100n).padStart(2,"0"))}</strong><small>Pendapatan − belanja + pembiayaan</small></article></section>
    <form method="get" className={styles.filterForm}><label htmlFor="tahun-apbdes">Tahun anggaran</label><select id="tahun-apbdes" name="tahun" defaultValue={data.tahun}>{data.tersedia.map((y)=><option key={y} value={y}>{y}</option>)}</select><button className={styles.primaryButton} type="submit">Tampilkan</button></form>
    <form action={simpanPaguApbdesAction} className={styles.panel}><input type="hidden" name="tahun" value={data.tahun}/><div className={styles.panelHeading}><div><h2>Rincian APBDes Tahun Anggaran {data.tahun}</h2><p>Isi pagu pada rekening yang dapat diinput. Nilai induk dihitung otomatis dari rincian.</p></div><button className={styles.primaryButton} type="submit">Simpan APBDes</button></div>
      <div className={styles.tableWrap}><table className={styles.dataTable}><thead><tr><th>Kode</th><th>Uraian</th><th className={styles.number}>Pagu Anggaran (Rp)</th><th className={styles.number}>Realisasi Saat Ini (Rp)</th></tr></thead><tbody>{data.rows.filter((row) => !["1","2","3","7"].includes(row.templateUuid)).map((row) => <tr key={row.templateUuid}><td><b>{row.templateUuid}</b></td><td><span className={kodeDepth(row.templateUuid)===1?styles.accountStrong:undefined} style={{paddingLeft:(kodeDepth(row.templateUuid)-1)*15}}>{row.uraian}</span></td><td className={styles.number}>{isInputRow(row.templateUuid)?<input className={styles.moneyInput} type="number" min="0" step="1" name={"anggaran:"+row.templateUuid} defaultValue={Number(row.anggaran)} aria-label={"Pagu "+row.uraian}/>:formatRupiah(row.anggaran)}</td><td className={styles.number}>{formatRupiah(row.realisasi)}</td></tr>)}</tbody></table></div>
      <div className={styles.formFooter}><span>Perubahan pagu tidak menghapus nilai realisasi yang sudah tercatat.</span><button className={styles.primaryButton} type="submit">Simpan Perubahan</button></div>
    </form>
  </main>;
}