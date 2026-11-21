import Link from "next/link";
import { getAuditLogPageData } from "@/features/audit/application/audit-use-cases";
import { labelAktivitas } from "@/features/dashboard/domain/aktivitas";
import { waktuRelatif } from "@/features/dashboard/domain/waktu-relatif";
import styles from "./aktivitas.module.css";

export const metadata = { title: "Aktivitas Pengguna" };
export default async function AktivitasPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const data = await getAuditLogPageData({ page, search: params.q });
  return <main className={styles.page}>
    <header><div><small>Pengaturan Desa / Manajemen Pengguna</small><h1>Aktivitas Pengguna</h1><p>Jejak audit perubahan data, autentikasi, dan aktivitas administrasi desa.</p></div><a href="/api/pengaturan/pengguna/aktivitas/ekspor">Unduh CSV</a></header>
    <nav className={styles.tabs}><Link href="/pengaturan/pengguna">Pengguna</Link><Link href="/pengaturan/grup-akses">Peran & Hak Akses</Link><Link aria-current="page" href="/pengaturan/pengguna/aktivitas">Aktivitas Pengguna</Link><Link href="/pengaturan/pengguna/keamanan">Pengaturan Keamanan</Link></nav>
    <section className={styles.card}><div className={styles.summary}><b>{data.total.toLocaleString("id-ID")} aktivitas tercatat</b><span>Halaman {data.page} dari {data.pageCount}</span></div>
      <form className={styles.search}><input name="q" defaultValue={params.q ?? ""} placeholder="Cari pengguna, aktivitas, atau modul..."/><button type="submit">Cari</button></form>
      <div className={styles.tableWrap}><table><thead><tr><th>No.</th><th>Waktu</th><th>Pengguna</th><th>Aktivitas</th><th>Modul</th><th>Detail</th><th>IP Address</th><th>Perangkat</th></tr></thead><tbody>
      {data.rows.map((row,index)=><tr key={row.id}><td>{(page-1)*data.pageSize+index+1}</td><td>{new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(row.createdAt)}</td><td>{row.actorName??"Sistem"}</td><td><span className={styles.event}>{labelAktivitas(row.event)}</span></td><td>{row.resource}</td><td>{row.resourceId??"—"}</td><td>{row.ipAddress??"—"}</td><td>{row.userAgent?.slice(0,80)??"—"}</td></tr>)}
      {data.rows.length===0?<tr><td colSpan={8}>Belum ada aktivitas yang sesuai.</td></tr>:null}
      </tbody></table></div>
      <footer><span>Menampilkan {data.rows.length} dari {data.total} aktivitas</span><div>{page>1?<Link href={`?page=${page-1}&q=${encodeURIComponent(params.q??"")}`}>‹ Sebelumnya</Link>:null}{page<data.pageCount?<Link href={`?page=${page+1}&q=${encodeURIComponent(params.q??"")}`}>Berikutnya ›</Link>:null}</div></footer>
    </section>
  </main>;
}
