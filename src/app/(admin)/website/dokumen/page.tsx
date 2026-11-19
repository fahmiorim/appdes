import type { Metadata } from "next";
import { getWebsiteDocumentsData } from "@/features/publik/application/website-admin";
import { WebsiteAdminShell, WebsiteMetric, WebsiteSection } from "../website-admin-shell";

export const metadata: Metadata = { title: "Dokumen Publik Website Desa" };

export default async function WebsiteDocumentsPage() {
  const rows = await getWebsiteDocumentsData();
  const aktif = rows.filter((row) => row.aktif);
  const kategori = new Set(rows.map((row) => row.kategori));
  return (
    <WebsiteAdminShell title="Dokumen Publik" active="/website/dokumen" description="Kelola dokumen dan produk hukum yang tersedia untuk diakses masyarakat.">
      <div className="website-metrics"><WebsiteMetric label="Total Dokumen" value={rows.length} /><WebsiteMetric label="Kategori" value={kategori.size} /><WebsiteMetric label="Dokumen Aktif" value={aktif.length} /><WebsiteMetric label="Belum Dipublikasikan" value={rows.length - aktif.length} /></div>
      <WebsiteSection title="Daftar Dokumen">
        {rows.length === 0 ? <p className="modul-empty">Belum ada dokumen publik yang ditambahkan.</p> : <div className="modul-scroll"><table className="modul-table"><thead><tr><th>Nama Dokumen</th><th>Kategori</th><th>Jenis</th><th>Nomor / Tahun</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.nama}</strong>{row.keterangan ? <span className="modul-muted">{row.keterangan}</span> : null}</td><td>{row.kategori}</td><td>{row.jenis ?? "—"}</td><td>{row.nomor ?? "—"} / {row.tahun ?? "—"}</td><td><span className={row.aktif ? "website-status" : "website-status website-status-off"}>{row.aktif ? "Publik" : "Nonaktif"}</span></td></tr>)}</tbody></table></div>}
      </WebsiteSection>
    </WebsiteAdminShell>
  );
}