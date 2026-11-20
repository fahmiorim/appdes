import Link from "next/link";
import { getPengajuanPageData } from "@/features/pelayanan/application/pengajuan-use-cases";
export const metadata={title:"Pengajuan Layanan"};
const labels:Record<string,string>={diajukan:"Diajukan",diverifikasi:"Diverifikasi",diproses:"Diproses",selesai:"Selesai",ditolak:"Ditolak"};
export default async function Page({searchParams}:{searchParams:Promise<{status?:string}>}){
 const p=await searchParams,status=["diajukan","diverifikasi","diproses","selesai","ditolak"].includes(p.status??"")?p.status:undefined,d=await getPengajuanPageData(status);
 return <div className="modul-page"><div className="page-heading"><div><span className="eyebrow">Pelayanan Publik</span><h1>Pengajuan Layanan</h1><p>Pantau dan tindak lanjuti permohonan layanan masyarakat.</p></div></div>
 <section className="modul-card"><form method="get" className="modul-filter-row"><select name="status" defaultValue={status??""}><option value="">Semua status</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><button className="button button-secondary">Filter</button></form>
 <div className="modul-scroll"><table className="modul-table"><thead><tr><th>No. Tiket</th><th>Pemohon</th><th>Layanan</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{d.rows.map(r=><tr key={r.id}><td><strong>{r.nomorTiket}</strong></td><td>{r.namaPemohon}<br/><small>{r.nik??"NIK tidak dicantumkan"}</small></td><td>{r.namaLayanan??"Layanan dihapus"}</td><td>{r.createdAt?.toLocaleDateString("id-ID")??"—"}</td><td>{labels[r.status]??r.status}</td><td><Link className="button button-secondary" href={"/pelayanan-publik/pengajuan/"+r.id}>Lihat detail</Link></td></tr>)}</tbody></table></div>
 {d.rows.length===0?<p className="modul-empty">Belum ada pengajuan layanan.</p>:null}<p>Menampilkan {d.rows.length} dari {d.total} pengajuan.</p></section></div>;
}
