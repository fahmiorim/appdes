import Link from "next/link";
import { getPengajuanPageData } from "@/features/pelayanan/application/pengajuan-use-cases";
export const metadata={title:"Pengajuan Layanan"};
const labels:Record<string,string>={diajukan:"Menunggu",diverifikasi:"Diverifikasi",diproses:"Diproses",selesai:"Selesai",ditolak:"Ditolak"};
const order=["diajukan","diproses","selesai","ditolak"];
export default async function Page({searchParams}:{searchParams:Promise<{status?:string;q?:string;page?:string}>}){
 const p=await searchParams;
 const status=["diajukan","diverifikasi","diproses","selesai","ditolak"].includes(p.status??"")?p.status:undefined;
 const q=(p.q??"").slice(0,100),page=Math.max(1,Math.min(10000,Number(p.page)||1));
 const d=await getPengajuanPageData(status,q,page);
 const countByStatus=new Map(d.statusSummary.map(item=>[item.status,item.total]));
 const total=d.statusSummary.reduce((sum,item)=>sum+item.total,0);
 const query=(next:number)=>"?"+new URLSearchParams({...(status?{status}:{}),...(q?{q}:{}),page:String(next)}).toString();
 return <div className="modul-page"><div className="page-heading"><div><span className="eyebrow">Pelayanan Publik</span><h1>Pengajuan Layanan</h1><p>Kelola seluruh pengajuan masyarakat, verifikasi berkas, proses, dan penyelesaiannya.</p></div></div>
 <div className="dashboard-stats"><article className="modul-card"><span>Total Pengajuan</span><strong>{total.toLocaleString("id-ID")}</strong><small>Seluruh pengajuan layanan</small></article>{order.map(key=><article className="modul-card" key={key}><span>{labels[key]}</span><strong>{(countByStatus.get(key)??0).toLocaleString("id-ID")}</strong><small>{total?((countByStatus.get(key)??0)/total*100).toFixed(1).replace(".",","):"0,0"}% dari total</small></article>)}</div>
 <nav className="quick-actions" aria-label="Filter status pengajuan"><Link className={"button "+(!status?"button-primary":"button-secondary")} href="/pelayanan-publik/pengajuan">Semua Pengajuan</Link>{Object.entries(labels).map(([key,label])=><Link key={key} className={"button "+(status===key?"button-primary":"button-secondary")} href={"/pelayanan-publik/pengajuan?status="+key}>{label}</Link>)}</nav>
 <section className="modul-card"><form method="get" className="modul-filter-row"><label><span>Cari nomor tiket, nama, atau NIK</span><input name="q" defaultValue={q} placeholder="Cari pengajuan…"/></label><label><span>Status</span><select name="status" defaultValue={status??""}><option value="">Semua status</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><input type="hidden" name="page" value="1"/><button className="button button-primary">Filter</button></form>
 <div className="modul-scroll"><table className="modul-table"><thead><tr><th>No. Tiket</th><th>Pemohon</th><th>Layanan</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{d.rows.map(r=><tr key={r.id}><td><strong>{r.nomorTiket}</strong></td><td>{r.namaPemohon}<br/><small>{r.nik??"NIK tidak dicantumkan"}</small></td><td>{r.namaLayanan??"Layanan dihapus"}</td><td>{r.createdAt?.toLocaleDateString("id-ID")??"—"}</td><td>{labels[r.status]??r.status}</td><td><Link className="button button-secondary" href={"/pelayanan-publik/pengajuan/"+r.id}>Detail</Link></td></tr>)}</tbody></table></div>
 {d.rows.length===0?<p className="modul-empty">Tidak ada pengajuan yang sesuai dengan filter.</p>:null}
 <div className="table-pagination"><span>Menampilkan {d.total===0?0:(d.page-1)*d.pageSize+1}–{Math.min(d.page*d.pageSize,d.total)} dari {d.total} pengajuan</span><div className="page-actions"><Link aria-disabled={d.page<=1} className="button button-secondary" href={query(Math.max(1,d.page-1))}>Sebelumnya</Link><span>Halaman {d.page} / {d.totalPages}</span><Link aria-disabled={d.page>=d.totalPages} className="button button-secondary" href={query(Math.min(d.totalPages,d.page+1))}>Berikutnya</Link></div></div>
 </section></div>;
}
