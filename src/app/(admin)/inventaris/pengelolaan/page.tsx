import Link from "next/link";
import { getInventarisPageData } from "@/features/inventaris/application/inventaris-use-cases";
import { formatRupiah } from "@/features/keuangan/domain/keuangan";
import { INVENTARIS_KONDISI_LABELS } from "@/features/inventaris/domain/inventaris";
import styles from "../inventaris.module.css";

export const metadata={title:"Pengelolaan Aset"};

export default async function PengelolaanAsetPage(){
  const data=await getInventarisPageData("");
  const total=data.rows.reduce((s,x)=>s+Number(x.nilaiAkhir??0),0);
  return <main className={styles.page}>
    <header className={styles.heading}><div className={styles.headingIcon}>⬡</div><div><span className={styles.eyebrow}>INVENTARIS &amp; ASET DESA</span><h1>Pengelolaan Aset</h1><p>Kelola informasi perolehan, nilai, dokumen, penanggung jawab, dan riwayat aset desa.</p></div></header>
    <section className={styles.metrics}><article className={`${styles.metric} ${styles.metricPrimary}`}><span>Total Aset</span><strong>{data.total} Barang</strong><small>Catatan aset aktif</small></article><article className={styles.metric}><span>Nilai Aset</span><strong>{formatRupiah(total.toFixed(2))}</strong><small>Nilai tercatat</small></article><article className={styles.metric}><span>Penanggung Jawab</span><strong>{data.rows.filter(x=>x.penanggungJawab).length}</strong><small>Aset memiliki penanggung jawab</small></article><article className={styles.metric}><span>Tanpa Penanggung Jawab</span><strong>{data.rows.filter(x=>!x.penanggungJawab).length}</strong><small>Perlu dilengkapi</small></article></section>
    <nav className={styles.tabs}><Link href="/inventaris/dashboard">Dashboard</Link><Link href="/inventaris">Daftar Inventaris</Link><Link className={styles.active} href="/inventaris/pengelolaan">Pengelolaan Aset</Link><Link href="/inventaris/mutasi">Mutasi &amp; Pemeliharaan</Link></nav>
    <section className={styles.panel}><div className={styles.panelHead}><div><h2>Detail Pengelolaan Aset</h2><p>Pilih aset untuk memperbarui informasi perolehan, penanggung jawab, dokumen, dan riwayatnya.</p></div><Link className={styles.primary} href="/inventaris#tambah">＋ Tambah Aset</Link></div>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Kode Inventaris</th><th>Nama Aset</th><th>Perolehan</th><th>Penanggung Jawab</th><th>Lokasi</th><th>Kondisi</th><th>Nilai Perolehan</th><th>Nilai Buku</th><th>Aksi</th></tr></thead><tbody>{data.rows.map(x=><tr key={x.id}><td>{x.nomorInventaris??"—"}</td><td><strong>{x.namaBarang}</strong><small style={{display:"block"}} className={styles.muted}>{x.merk??""} {x.tipe??""}</small></td><td>{x.tanggalPembelian??x.tahunPembelian??"—"}</td><td>{x.penanggungJawab??"Belum ditetapkan"}<small style={{display:"block"}} className={styles.muted}>{x.jabatanPenanggungJawab??""}</small></td><td>{x.lokasi??"—"}</td><td><span className={`${styles.tag} ${x.kondisi==="baik"?styles.good:x.kondisi==="rusak_berat"?styles.bad:styles.warn}`}>{INVENTARIS_KONDISI_LABELS[x.kondisi]}</span></td><td>{formatRupiah(x.nilaiAkhir??"0")}</td><td>{formatRupiah(x.nilaiBuku??x.nilaiAkhir??"0")}</td><td><div className={styles.actions}><Link href={"/inventaris/"+x.id}>Detail</Link><Link href={"/inventaris/"+x.id+"?edit=1"}>Edit</Link></div></td></tr>)}</tbody></table>{data.rows.length===0?<p className={styles.empty}>Belum ada aset yang tercatat.</p>:null}</div>
    </section>
  </main>;
}
