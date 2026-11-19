import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getWebsiteDashboardData } from "@/features/publik/application/website-admin";
import { WebsiteAdminShell, WebsiteMetric, WebsiteSection } from "./website-admin-shell";

export const metadata: Metadata = { title: "Dashboard Website Desa" };

export default async function WebsiteDashboardPage() {
  const data = await getWebsiteDashboardData();
  const desa = data.identitas;
  const namaDesa = desa?.namaDesa ?? "Desa";
  const max = Math.max(1, ...data.trenKunjungan.map((item) => item.total));
  const points = data.trenKunjungan.map((item, index) => ({ x: 30 + index * 104, y: 130 - (item.total / max) * 104 }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L ${points.at(-1)?.x ?? 550} 142 L 30 142 Z`;
  const domain = desa?.domain ? `https://${desa.domain}` : desa?.website?.startsWith("http") ? desa.website : null;
  const kelengkapan = [desa?.namaDesa, desa?.alamatKantor, desa?.emailDesa, desa?.telepon, desa?.logo].filter(Boolean).length;
  const beritaTayang = data.berita.filter((item) => item.status === "published");
  return (
    <WebsiteAdminShell title="Website Desa" active="/website" description={`Kelola website resmi ${namaDesa}, publikasikan informasi, dan berikan layanan digital kepada masyarakat.`} action={domain ? <Link className="website-button website-button-outline" href={domain} target="_blank" rel="noreferrer">↗ Lihat Website</Link> : undefined}>
      <div className="website-dashboard-metrics">
        <article className="website-metric website-metric-primary"><span>Total Kunjungan</span><strong>{data.totalKunjungan.toLocaleString("id-ID")}</strong><small>{data.kunjunganBulan.toLocaleString("id-ID")} kunjungan bulan ini</small></article>
        <WebsiteMetric label="Halaman Statis" value={data.pages.length} note={`${data.pages.filter((x)=>x.aktif).length} aktif`}/>
        <WebsiteMetric label="Menu Navigasi" value={data.menu.length} note={`${data.menu.filter((x)=>x.aktif).length} aktif`}/>
        <WebsiteMetric label="Berita Tayang" value={beritaTayang.length} note={`${data.berita.length - beritaTayang.length} draft`}/>
        <WebsiteMetric label="Agenda" value={data.agenda.length}/>
        <WebsiteMetric label="Album Galeri" value={data.album.length}/>
        <WebsiteMetric label="Dokumen Publik" value={data.dokumen.length}/>
      </div>
      <div className="website-dashboard-main-grid">
        <div className="website-dashboard-left">
          <WebsiteSection title="Preview Website" action={domain ? <Link href={domain} target="_blank" rel="noreferrer">Buka Website ↗</Link> : null}>
            <div className="website-preview-card"><div className="website-preview-header">{desa?.logo ? <Image src={`/api/publik/media/${desa.logo.split("/").map(encodeURIComponent).join("/")}`} alt="" width={44} height={44} unoptimized/> : <span className="website-preview-logo">F</span>}<div><strong>{namaDesa}</strong><small>{desa?.namaKecamatan ?? "Kecamatan belum diisi"} · {desa?.namaKabupaten ?? "Kabupaten belum diisi"}</small></div><span className="website-preview-online">{domain?"Domain terpasang":"Belum online"}</span></div><div className="website-preview-hero"><span>WEBSITE RESMI DESA</span><strong>{namaDesa}</strong><p>{desa?.alamatKantor ?? "Lengkapi identitas desa untuk menampilkan profil publik."}</p>{domain ? <Link href={domain} target="_blank" rel="noreferrer">Kunjungi Website →</Link> : <Link href="/website/pengaturan">Atur identitas website →</Link>}</div><div className="website-preview-nav">{data.menu.filter((x)=>x.aktif).slice(0,6).map((item)=><span key={item.id}>{item.nama}</span>)}</div></div>
          </WebsiteSection>
          <WebsiteSection title="Konten Terbaru" action={<Link href="/website/konten">Lihat Semua →</Link>}>
            {beritaTayang.length===0 ? <p className="modul-empty">Belum ada berita yang dipublikasikan.</p> : <div className="website-recent-content">{beritaTayang.slice(0,3).map((item)=><article key={item.id}>{item.gambar?<Image src={`/api/publik/media/${item.gambar.split("/").map(encodeURIComponent).join("/")}`} alt="" width={88} height={62} unoptimized/>:<span className="website-image-placeholder">FD</span>}<div><strong>{item.judul}</strong><small>{item.kategori??"Berita"} · {item.terbitPada?new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric"}).format(item.terbitPada):"Terbit"}</small></div><span className="website-status">Tayang</span></article>)}</div>}
          </WebsiteSection>
          <WebsiteSection title="Akses Cepat"><div className="website-shortcuts"><Link href="/website/pengaturan">⚙ Pengaturan Website</Link><Link href="/website/halaman">☷ Kelola Halaman</Link><Link href="/website/konten">▤ Kelola Konten</Link><Link href="/website/dokumen">▧ Upload Dokumen</Link></div></WebsiteSection>
        </div>
        <div className="website-dashboard-right">
          <WebsiteSection title="Statistik Kunjungan"><div className="website-chart-summary"><strong>{data.totalKunjungan.toLocaleString("id-ID")}</strong><span>Total kunjungan tercatat</span></div><svg className="website-visits-chart" viewBox="0 0 590 170" role="img" aria-label="Tren kunjungan enam bulan terakhir"><defs><linearGradient id="websiteVisitArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8b35f5" stopOpacity=".32"/><stop offset="100%" stopColor="#8b35f5" stopOpacity=".02"/></linearGradient></defs>{[30,65,100,135].map((y)=><line key={y} x1="25" y1={y} x2="570" y2={y} stroke="#e8eafa" strokeDasharray="4 4"/>)}<path d={area} fill="url(#websiteVisitArea)"/><path d={line} fill="none" stroke="#781df0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.map((point,index)=><circle key={index} cx={point.x} cy={point.y} r="5" fill="#781df0" stroke="white" strokeWidth="2"/>)}{data.trenKunjungan.map((item,index)=><text key={item.label} x={30+index*104} y="162" textAnchor="middle" fill="#5f6d8d" fontSize="11">{item.label}</text>)}</svg><small className="website-chart-note">Data berdasarkan log kunjungan halaman yang tercatat.</small></WebsiteSection>
          <WebsiteSection title="Statistik Konten"><div className="website-stat-rows"><div><span>Berita dipublikasikan</span><strong>{beritaTayang.length}</strong></div>
          <div><span>Agenda kegiatan</span><strong>{data.agenda.length}</strong></div>
          <div><span>Halaman statis</span><strong>{data.pages.length}</strong></div><div><span>Album galeri aktif</span><strong>{data.album.length}</strong></div><div><span>Menu navigasi aktif</span><strong>{data.menu.filter((x)=>x.aktif).length}</strong></div><div><span>Dokumen publik aktif</span><strong>{data.dokumen.length}</strong></div></div></WebsiteSection>
          <WebsiteSection title="Status & Rekomendasi"><div className="website-check-list"><div><span>{domain?"✓":"!"}</span><p><strong>{domain?"Domain website tersedia":"Domain website belum dipetakan"}</strong><small>{domain??"Minta Super Admin mengatur domain tenant."}</small></p></div><div><span>{kelengkapan>=4?"✓":"!"}</span><p><strong>Identitas website</strong><small>{kelengkapan} dari 5 informasi dasar sudah tersedia.</small></p></div><div><span>{data.menu.some((x)=>x.aktif)?"✓":"!"}</span><p><strong>Navigasi publik</strong><small>{data.menu.filter((x)=>x.aktif).length} menu aktif untuk pengunjung.</small></p></div><div><span>{beritaTayang.length>0?"✓":"!"}</span><p><strong>Informasi terbaru</strong><small>{beritaTayang.length>0?"Sudah ada berita yang dipublikasikan.":"Belum ada berita yang tayang."}</small></p></div>
          <div><span>{data.temaAktif?"✓":"!"}</span><p><strong>Template website</strong><small>{data.temaAktif?.nama ?? "Belum ada tema aktif; siapkan dari katalog platform."}</small></p></div></div></WebsiteSection>
        </div>
      </div>
    </WebsiteAdminShell>
  );
}