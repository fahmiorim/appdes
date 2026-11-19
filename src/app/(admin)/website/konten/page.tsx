import type { Metadata } from "next";
import { getWebsiteContentData } from "@/features/publik/application/website-admin";
import { WebsiteAdminShell, WebsiteMetric, WebsiteSection } from "../website-admin-shell";

export const metadata: Metadata = { title: "Konten & Publikasi Website Desa" };

export default async function WebsiteContentPage() {
  const { berita, album, slider } = await getWebsiteContentData();
  return (
    <WebsiteAdminShell title="Konten & Publikasi" active="/website/konten" description="Ringkasan berita, galeri, dan materi sorotan website desa.">
      <div className="website-metrics"><WebsiteMetric label="Berita Tayang" value={berita.length} /><WebsiteMetric label="Pengumuman" value="—" note="Belum ada sumber terpisah" /><WebsiteMetric label="Album Galeri" value={album.length} /><WebsiteMetric label="Slider" value={slider.length} /></div>
      <div className="website-dashboard-grid">
        <WebsiteSection title="Berita Terbaru">
          {berita.length === 0 ? <p className="modul-empty">Belum ada berita yang dipublikasikan.</p> : <ul className="website-list">{berita.slice(0, 20).map((item) => <li key={item.id}><div><strong>{item.judul}</strong><span>{item.kategori ?? "Umum"} · {item.terbitPada ? new Intl.DateTimeFormat("id-ID",{dateStyle:"medium"}).format(item.terbitPada) : "Belum dijadwalkan"}</span></div><span className="website-status">Tayang</span></li>)}</ul>}
        </WebsiteSection>
        <WebsiteSection title="Galeri Foto">
          {album.length === 0 ? <p className="modul-empty">Belum ada album galeri.</p> : <ul className="website-list">{album.map((item) => <li key={item.id}><div><strong>{item.nama}</strong><span>{item.keterangan ?? "Tanpa keterangan"}</span></div><span className="website-status">{item.jumlahFoto} foto</span></li>)}</ul>}
        </WebsiteSection>
      </div>
    </WebsiteAdminShell>
  );
}