import Link from "next/link";
import { notFound } from "next/navigation";
import { getInventarisDetailPageData } from "@/features/inventaris/application/inventaris-use-cases";
import { formatRupiah } from "@/features/keuangan/domain/keuangan";
import { INVENTARIS_ASAL, INVENTARIS_KONDISI_LABELS, MUTASI_JENIS_LABELS, MUTASI_STATUS_LABELS } from "@/features/inventaris/domain/inventaris";
import styles from "../inventaris.module.css";
import { simpanInventarisAction, hapusInventarisAction } from "../actions";

export const metadata={title:"Pengelolaan Aset"};
type Props={params:Promise<{id:string}>;searchParams:Promise<{edit?:string;saved?:string}>};
const dateLabel=(value:string|null)=>value?new Intl.DateTimeFormat("id-ID",{dateStyle:"long",timeZone:"UTC"}).format(new Date(value+"T00:00:00Z")):"—";
const asalLabel=(value:string|null)=>value?({pembelian:"Pembelian",hibah:"Hibah",bantuan_pemerintah:"Bantuan Pemerintah",sumbangan:"Sumbangan",lainnya:"Lainnya"} as Record<string,string>)[value]??value:"—";

export default async function DetailInventarisPage({params,searchParams}:Props){
  const p=await params; const id=Number(p.id);
  if(!Number.isSafeInteger(id)||id<1) notFound();
  const [data,query]=await Promise.all([getInventarisDetailPageData(id),searchParams]);
  const x=data.item;
  return <main className={styles.page}>
    <header className={styles.heading}><div className={styles.headingIcon}>⬡</div><div><span className={styles.eyebrow}>INVENTARIS &amp; ASET / PENGELOLAAN ASET</span><h1>{x.namaBarang}</h1><p>{x.nomorInventaris??"Nomor inventaris belum ditetapkan"} · Detail informasi, perolehan, kondisi, dan riwayat aset.</p></div></header>
    <nav className={styles.tabs}><Link href="/inventaris">Daftar Inventaris</Link><Link className={styles.active} href={"/inventaris/"+id}>Detail Aset</Link><Link href={"/inventaris/mutasi?inventarisId="+id}>Riwayat Mutasi</Link><Link href="/inventaris/laporan">Laporan &amp; Statistik</Link></nav>
    {query.saved?<p className={styles.notice}>Perubahan inventaris berhasil disimpan.</p>:null}
    <section className={styles.detailGrid}>
      <article className={styles.panel}><div className={styles.panelHead}><div><h2>Informasi Aset</h2><p>Data identitas barang dan klasifikasi.</p></div><span className={`${styles.tag} ${x.kondisi==="baik"?styles.good:x.kondisi==="rusak_ringan"?styles.warn:styles.bad}`}>{INVENTARIS_KONDISI_LABELS[x.kondisi]}</span></div>
        <dl className={styles.detailList}>
          <div><dt>Nama Barang</dt><dd>{x.namaBarang}</dd></div><div><dt>Nomor Inventaris</dt><dd>{x.nomorInventaris??"—"}</dd></div>
          <div><dt>Kategori</dt><dd>{data.kategori.find(k=>k.id===x.kategoriId)?.nama??"Tanpa kategori"}</dd></div><div><dt>Kode Barang</dt><dd>{x.kodeBarang??"—"}</dd></div>
          <div><dt>Merk / Tipe</dt><dd>{[x.merk,x.tipe].filter(Boolean).join(" / ")||"—"}</dd></div><div><dt>Jumlah</dt><dd>{Number(x.jumlah).toLocaleString("id-ID")} {x.satuan}</dd></div>
          <div><dt>Lokasi</dt><dd>{x.lokasi??"—"}</dd></div><div><dt>Kondisi</dt><dd>{INVENTARIS_KONDISI_LABELS[x.kondisi]}</dd></div>
          <div><dt>Spesifikasi</dt><dd>{x.spesifikasi??"—"}</dd></div><div><dt>Keterangan</dt><dd>{x.keterangan??"—"}</dd></div>
        </dl>
      </article>
      <article className={styles.panel}><div className={styles.panelHead}><div><h2>Nilai Aset</h2><p>Nilai perolehan dan nilai tercatat.</p></div></div>
        <div className={styles.statLine}><span>Nilai Perolehan / Satuan</span><strong>{formatRupiah(x.hargaSatuan??"0")}</strong></div>
        <div className={styles.statLine}><span>Jumlah Unit</span><strong>{Number(x.jumlah).toLocaleString("id-ID")}</strong></div>
        <div className={styles.statLine}><span>Nilai Total Aset</span><strong>{formatRupiah(x.nilaiAkhir??"0")}</strong></div>
        <p className={styles.notice} style={{marginTop:12}}>Nilai buku bersih dan akumulasi penyusutan belum tersedia pada skema inventaris saat ini. Nilai yang ditampilkan adalah nilai tercatat.</p>
      </article>
    </section>
    <section className={styles.grid}>
      <article className={styles.panel}><h2>Informasi Perolehan</h2><div className={styles.statLine}><span>Tanggal Perolehan</span><strong>{dateLabel(x.tanggalPembelian)}</strong></div><div className={styles.statLine}><span>Tahun Perolehan</span><strong>{x.tahunPembelian??"—"}</strong></div><div className={styles.statLine}><span>Sumber Dana / Asal</span><strong>{asalLabel(x.asal)}</strong></div><div className={styles.statLine}><span>Penyedia / Donatur</span><strong>{x.donatur??"—"}</strong></div></article>
      <article className={styles.panel}><h2>Riwayat Aset</h2><p style={{marginBottom:12}}>Riwayat perpindahan dan perubahan kondisi yang telah disetujui.</p>
        {data.riwayat.length?<div className={styles.timeline}>{data.riwayat.map(m=><article key={m.id}><strong>{MUTASI_JENIS_LABELS[m.jenis]} · {MUTASI_STATUS_LABELS[m.status]}</strong><small>{dateLabel(m.tanggalMutasi)} · {m.diajukanOleh??"Pengguna"}</small><small>{m.alasan??"Tidak ada catatan"} {m.lokasiBaru?"· Lokasi baru: "+m.lokasiBaru:""}</small></article>)}</div>:<p className={styles.empty}>Belum ada riwayat mutasi aset.</p>}
      </article>
    </section>
    {data.canWrite&&query.edit==="1"?<section className={styles.panel}><div className={styles.panelHead}><div><h2>Edit Aset</h2><p>Perbarui informasi aset desa.</p></div></div><form action={simpanInventarisAction} className={styles.form}>
      <input type="hidden" name="id" value={x.id}/>
      <label>Nama Barang *<input name="namaBarang" defaultValue={x.namaBarang} required/></label><label>Nomor Inventaris<input name="nomorInventaris" defaultValue={x.nomorInventaris??""}/></label><label>Kategori<select name="kategoriId" defaultValue={x.kategoriId??""}><option value="">Tanpa kategori</option>{data.kategori.map(k=><option key={k.id} value={k.id}>{k.nama}</option>)}</select></label>
      <label>Merk<input name="merk" defaultValue={x.merk??""}/></label><label>Tipe<input name="tipe" defaultValue={x.tipe??""}/></label><label>Kode Barang<input name="kodeBarang" defaultValue={x.kodeBarang??""}/></label>
      <label>Jumlah<input name="jumlah" type="number" min="0.01" step="0.01" defaultValue={x.jumlah}/></label><label>Satuan<input name="satuan" defaultValue={x.satuan??"unit"}/></label><label>Harga Satuan<input name="hargaSatuan" type="number" min="0" step="0.01" defaultValue={x.hargaSatuan??""}/></label>
      <label>Tanggal Perolehan<input name="tanggalPembelian" type="date" defaultValue={x.tanggalPembelian??""}/></label><label>Tahun Perolehan<input name="tahunPembelian" type="number" defaultValue={x.tahunPembelian??""}/></label><label>Asal Perolehan<select name="asal" defaultValue={x.asal??""}><option value="">Pilih asal</option>{INVENTARIS_ASAL.map(a=><option key={a} value={a}>{asalLabel(a)}</option>)}</select></label>
      <label>Donatur / Penyedia<input name="donatur" defaultValue={x.donatur??""}/></label><label>Lokasi<input name="lokasi" defaultValue={x.lokasi??""}/></label><label>Kondisi<select name="kondisi" defaultValue={x.kondisi}><option value="baik">Baik</option><option value="rusak_ringan">Rusak Ringan</option><option value="rusak_berat">Rusak Berat</option></select></label>
      <label className={styles.wide}>Spesifikasi<textarea name="spesifikasi" defaultValue={x.spesifikasi??""}/></label><label className={styles.wide}>Keterangan<textarea name="keterangan" defaultValue={x.keterangan??""}/></label><button className={styles.primary}>Simpan Perubahan</button><Link className={styles.secondary} href={"/inventaris/"+id}>Batal</Link>
    </form></section>:null}
    <div className={styles.actions}>{data.canWrite?<Link className={styles.primary} href={"/inventaris/"+id+"?edit=1"}>✎ Edit Aset</Link>:null}<Link className={styles.secondary} href={"/inventaris/mutasi?inventarisId="+id}>＋ Ajukan Mutasi / Perawatan</Link>{data.canDelete?<form action={hapusInventarisAction}><input type="hidden" name="id" value={id}/><button className={styles.secondary}>Hapus Aset</button></form>:null}</div>
  </main>;
}
