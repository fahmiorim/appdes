import type { Metadata } from "next";
import { getWebsitePagesData } from "@/features/publik/application/website-admin";
import { WebsiteAdminShell, WebsiteSection } from "../website-admin-shell";

export const metadata: Metadata = { title: "Halaman & Navigasi Website Desa" };

export default async function WebsitePagesPage() {
  const { menu, widget } = await getWebsitePagesData();
  return (
    <WebsiteAdminShell title="Halaman & Navigasi" active="/website/halaman" description="Kelola susunan menu navigasi dan elemen halaman website desa.">
      <div className="website-dashboard-grid">
        <WebsiteSection title="Menu Navigasi">
          {menu.length === 0 ? <p className="modul-empty">Belum ada menu navigasi yang dibuat.</p> : <ol className="website-list">{menu.map((item) => <li key={item.id}><div><strong>{item.nama}</strong><span>{item.link}</span></div><span className={item.aktif ? "website-status" : "website-status website-status-off"}>{item.aktif ? "Aktif" : "Nonaktif"}</span></li>)}</ol>}
        </WebsiteSection>
        <WebsiteSection title="Widget Website">
          {widget.length === 0 ? <p className="modul-empty">Belum ada widget yang dikonfigurasi.</p> : <ul className="website-list">{widget.map((item) => <li key={item.id}><div><strong>{item.judul ?? `Widget ${item.jenis}`}</strong><span>Urutan {item.urut}</span></div><span className={item.aktif ? "website-status" : "website-status website-status-off"}>{item.aktif ? "Aktif" : "Nonaktif"}</span></li>)}</ul>}
        </WebsiteSection>
      </div>
      <p className="website-hint">Daftar ini membaca konfigurasi milik desa yang sedang login. Form tambah, ubah, susun ulang, dan publikasi akan diaktifkan pada tahap pengelolaan berikutnya.</p>
    </WebsiteAdminShell>
  );
}