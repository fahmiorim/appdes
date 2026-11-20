import Link from "next/link";
import { getBukuAgendaData } from "@/features/surat/application/buku-agenda-use-cases";
import { hapusSuratKeluarAction } from "../buku-agenda-actions";
export const metadata = { title: "Surat Keluar" };
export default async function SuratKeluarPage({searchParams}:{searchParams:Promise<{q?:string;berhasil?:string}>}) {
 const params=await searchParams; const q=(params.q??"").slice(0,100);
 const {rows}=await getBukuAgendaData("keluar",q);
 return <div className="modul-page"><div className="page-heading"><div><span className="eyebrow">Administrasi Surat</span><h1>Surat Keluar</h1><p>Buku agenda surat yang diterbitkan dan dikirim oleh pemerintah desa.</p></div><Link className="button button-primary" href="/persuratan/surat-keluar/baru">＋ Tambah Surat Keluar</Link></div>
 {params.berhasil?<div className="alert alert-info">Perubahan data surat keluar berhasil.</div>:null}
 <section className="modul-card"><form method="get" className="modul-filter-row"><input name="q" defaultValue={q} placeholder="Cari nomor surat, penerima, ringkasan…"/><button className="button button-secondary">Cari</button></form>
 <div className="modul-scroll"><table className="modul-table"><thead><tr><th>No. Agenda</th><th>Nomor Surat</th><th>Tanggal</th><th>Penerima</th><th>Klasifikasi</th><th>Ringkasan</th><th>Aksi</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.agendaNumber}</td><td className="modul-mono">{row.letterNumber}</td><td>{row.letterDate}</td><td>{row.recipient??"—"}</td><td>{row.classificationName??"—"}</td><td>{row.summary??"—"}</td><td><div style={{display:"flex",gap:8}}><Link className="button button-secondary" href={`/persuratan/surat-keluar/${row.id}/edit`}>Ubah</Link><form action={hapusSuratKeluarAction}><input type="hidden" name="id" value={row.id}/><button className="button button-danger-ghost" type="submit">Hapus</button></form></div></td></tr>)}</tbody></table></div>{rows.length===0?<p className="modul-empty">Belum ada surat keluar.</p>:null}</section></div>;
}