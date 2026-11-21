import Link from "next/link";
import { notFound } from "next/navigation";
import { getPembangunanDetail } from "@/features/pembangunan/application/use-cases";
import { SUMBER_DANA_PEMBANGUNAN, STATUS_PEMBANGUNAN } from "@/features/pembangunan/domain/pembangunan";
import styles from "../../../keuangan/keuangan.module.css";
import { ubahKegiatanPembangunanAction } from "../../actions";

export const metadata = { title: "Detail Kegiatan Pembangunan" };

export default async function DetailKegiatanPage({params}:{params:Promise<{id:string}>}) {
  const {id:raw}=await params; const id=Number(raw);
  if(!Number.isInteger(id)||id<1) notFound();
  const detail=await getPembangunanDetail(id); const p=detail.proyek;
  return <main className={styles.page}>
    <header className={styles.heading}><div className={styles.headingIcon}>⚒</div><div><p className={styles.eyebrow}>KEGIATAN &amp; PEMBANGUNAN</p><h1>{p.judul}</h1><p>Detail, progres, anggaran, dan informasi pelaksanaan kegiatan.</p></div></header>
    <nav className={styles.tabs}><Link href="/keuangan">Dashboard</Link><Link href="/keuangan/kegiatan">← Kembali ke daftar kegiatan</Link></nav>
    <form action={ubahKegiatanPembangunanAction} className={styles.panel}><input type="hidden" name="id" value={p.id}/><div className={styles.panelHeading}><div><h2>Ubah Data Kegiatan</h2><p>Perubahan akan ikut diperbarui pada halaman publik pembangunan desa.</p></div><button className={styles.primaryButton} type="submit">Simpan Perubahan</button></div>
    <div className={styles.projectForm}><label>Nama kegiatan<input name="judul" required defaultValue={p.judul}/></label><label>Tahun anggaran<input name="tahunAnggaran" type="number" min="2000" max="2100" defaultValue={p.tahunAnggaran}/></label><label>Sumber dana<select name="sumberDana" defaultValue={p.sumberDana??"APBDes"}>{SUMBER_DANA_PEMBANGUNAN.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>Anggaran (Rp)<input name="anggaran" type="number" min="0" step="1" defaultValue={p.anggaran??""}/></label><label>Lokasi<input name="lokasi" defaultValue={p.lokasi??""}/></label><label>Pelaksana<input name="pelaksana" defaultValue={p.pelaksana??""}/></label><label>Tanggal mulai<input name="mulai" type="date" defaultValue={p.mulai??""}/></label><label>Tanggal selesai<input name="selesai" type="date" defaultValue={p.selesai??""}/></label><label>Status<select name="status" defaultValue={p.status}>{STATUS_PEMBANGUNAN.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>Progres (%)<input name="progres" type="number" min="0" max="100" defaultValue={p.progres}/></label><label className={styles.fullField}>Deskripsi<textarea name="deskripsi" rows={4} defaultValue={p.deskripsi??""}/></label><label className={styles.fullField}>Hasil / manfaat<textarea name="hasil" rows={3} defaultValue={p.hasil??""}/></label></div></form>
    <section className={styles.panel}><div className={styles.panelHeading}><div><h2>Dokumentasi Kegiatan ({detail.dokumentasi.length})</h2><p>Dokumentasi foto proyek ditampilkan di website publik desa.</p></div></div>{detail.dokumentasi.length?<ul>{detail.dokumentasi.map(x=><li key={x.id}>{x.judul||x.gambar} — {x.keterangan||"Tanpa keterangan"}</li>)}</ul>:<p className={styles.empty}>Belum ada dokumentasi foto. Pengelolaan unggah foto akan ditambahkan pada tahap berikutnya.</p>}</section>
  </main>;
}