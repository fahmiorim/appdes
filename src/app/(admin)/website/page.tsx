import type { Metadata } from "next";
import Link from "next/link";
import { getWebsiteDashboardData } from "@/features/publik/application/website-admin";
import { WebsiteAdminShell, WebsiteMetric, WebsiteSection } from "./website-admin-shell";

export const metadata: Metadata = { title: "Dashboard Website Desa" };

export default async function WebsiteDashboardPage() {
  const data = await getWebsiteDashboardData();
  const namaDesa = data.identitas?.namaDesa ?? "Desa";
  return (
    <WebsiteAdminShell title="Website Desa" active="/website" description={`Kelola website resmi ${namaDesa}, konten publik, dan layanan informasi desa.`}>
      <div className="website-metrics">
        <WebsiteMetric label="Total Kunjungan" value={data.totalKunjungan.toLocaleString("id-ID")} note={`${data.kunjunganBulan.toLocaleString("id-ID")} kunjungan bulan ini`} />
        <WebsiteMetric label="Menu Navigasi" value={data.menu.filter((x) => x.aktif).length} />
        <WebsiteMetric label="Berita Tayang" value={data.berita.length} />
        <WebsiteMetric label="Album Galeri" value={data.album.length} />
        <WebsiteMetric label="Dokumen Publik" value={data.dokumen.length} />
      </div>
      <div className="website-dashboard-grid">
        <WebsiteSection title="Konten Terbaru" action={<Link href="/website/konten">Kelola konten →</Link>}>
          {data.berita.length === 0 ? <p className="modul-empty">Belum ada berita yang dipublikasikan.</p> : <ul className="website-list">{data.berita.slice(0, 5).map((item) => <li key={item.id}><div><strong>{item.judul}</strong><span>{item.kategori ?? "Berita"} · {item.terbitPada ? new Intl.DateTimeFormat("id-ID",{dateStyle:"medium"}).format(item.terbitPada) : "Tanggal belum diatur"}</span></div><span className="website-status">Tayang</span></li>)}</ul>}
        </WebsiteSection>
        <WebsiteSection title="Status Website" action={<Link href="/website/pengaturan">Pengaturan →</Link>}>
          <dl className="website-details"><div><dt>Nama Website</dt><dd>{namaDesa}</dd></div><div><dt>Domain</dt><dd>{data.identitas?.domain ?? data.identitas?.website ?? "Belum diatur"}</dd></div><div><dt>Slider Beranda</dt><dd>{data.slider.filter((x) => x.aktif).length} aktif</dd></div><div><dt>Widget</dt><dd>{data.widget.filter((x) => x.aktif).length} aktif</dd></div></dl>
        </WebsiteSection>
        <WebsiteSection title="Akses Cepat">
          <div className="website-shortcuts"><Link href="/website/pengaturan">Pengaturan Website</Link><Link href="/website/halaman">Kelola Halaman & Navigasi</Link><Link href="/website/konten">Konten & Publikasi</Link><Link href="/website/dokumen">Dokumen Publik</Link></div>
        </WebsiteSection>
      </div>
    </WebsiteAdminShell>
  );
}