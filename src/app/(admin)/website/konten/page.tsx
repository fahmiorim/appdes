import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getWebsiteContentData } from "@/features/publik/application/website-admin";
import { WebsiteAdminShell, WebsiteMetric, WebsiteSection } from "../website-admin-shell";

export const metadata: Metadata = { title: "Konten & Publikasi Website Desa" };

export default async function WebsiteContentPage() {
  const { berita, album, slider, agenda } = await getWebsiteContentData();
  const tayang = berita.filter((item)=>item.status==="published");
  const draft = berita.filter((item)=>item.status==="draft");
  const agendaTayang = agenda.filter((item)=>item.tayang);
  const formatTanggal = (value:Date|string|null) => value ? new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value)) : "Belum dijadwalkan";
  return (
    <WebsiteAdminShell title="Konten & Publikasi" active="/website/konten" description="Kelola berita, pengumuman, agenda kegiatan, galeri foto, dan materi publikasi website desa.">
      <div className="website-metrics website-content-metrics"><WebsiteMetric label="Berita" value={berita.length} note={`${draft.length} draft`}/><WebsiteMetric label="Pengumuman" value={berita.filter((item)=>/pengumuman/i.test(item.kategori??"")).length}/><WebsiteMetric label="Agenda" value={agenda.length} note={`${agendaTayang.length} ditayangkan`}/><WebsiteMetric label="Galeri" value={album.length}/><WebsiteMetric label="Slider Beranda" value={slider.length}/></div>
      <nav className="website-settings-tabs website-content-tabs"><a className="is-active" href="#berita">▤ Berita</a><a href="#pengumuman">⚑ Pengumuman</a><a href="#agenda">▦ Agenda</a><a href="#galeri">▧ Galeri</a><a href="#slider">▣ Slider</a></nav>
      <div className="website-content-layout">
        <div className="website-content-primary">
          <WebsiteSection title="Daftar Berita" action={<Link href="/konten/berita">Buka Modul Berita →</Link>}>
            <div id="berita" className="website-table-wrap"><table className="website-table"><thead><tr><th>Judul Berita</th><th>Kategori</th><th>Status</th><th>Tanggal</th><th>Dilihat</th></tr></thead><tbody>{berita.slice(0,10).map((item)=><tr key={item.id}><td><div className="website-content-title">{item.gambar?<Image src={`/api/publik/media/${item.gambar.split("/").map(encodeURIComponent).join("/")}`} alt="" width={58} height={42} unoptimized/>:<span className="website-image-placeholder">FD</span>}<div><strong>{item.judul}</strong><small>{item.slug}</small></div></div></td><td>{item.kategori??"Umum"}</td><td><span className={item.status==="published"?"website-status":"website-status website-status-off"}>{item.status==="published"?"Dipublikasikan":"Draft"}</span></td><td>{formatTanggal(item.terbitPada)}</td><td>{item.hit.toLocaleString("id-ID")}</td></tr>)}</tbody></table>{berita.length===0?<p className="modul-empty">Belum ada berita yang dibuat.</p>:null}</div>
          </WebsiteSection>
          <WebsiteSection title="Agenda Kegiatan" action={<a href="#agenda">Lihat ringkasan ↓</a>}>
            <div id="agenda" className="website-list">{agenda.slice(0,5).map((item)=><div className="website-list-row" key={item.id}><div><strong>{item.judul}</strong><span>{formatTanggal(item.mulai)} · {item.kategori}</span></div><span className={item.tayang?"website-status":"website-status website-status-off"}>{item.tayang?"Tayang":"Disimpan"}</span></div>)}{agenda.length===0?<p className="modul-empty">Belum ada agenda kegiatan.</p>:null}</div>
          </WebsiteSection>
        </div>
        <aside className="website-content-aside">
          <WebsiteSection title="Statistik Konten"><div className="website-stat-rows"><div><span>Berita dipublikasikan</span><strong>{tayang.length}</strong></div><div><span>Berita draft</span><strong>{draft.length}</strong></div><div><span>Agenda ditayangkan</span><strong>{agendaTayang.length}</strong></div><div><span>Album galeri aktif</span><strong>{album.length}</strong></div><div><span>Slider aktif</span><strong>{slider.length}</strong></div></div></WebsiteSection>
          <WebsiteSection title="Konten Terbaru"><div className="website-recent-content compact">{tayang.slice(0,3).map((item)=><article key={item.id}>{item.gambar?<Image src={`/api/publik/media/${item.gambar.split("/").map(encodeURIComponent).join("/")}`} alt="" width={70} height={50} unoptimized/>:<span className="website-image-placeholder">FD</span>}<div><strong>{item.judul}</strong><small>{formatTanggal(item.terbitPada)}</small></div></article>)}</div>{tayang.length===0?<p className="modul-empty">Belum ada konten tayang.</p>:null}</WebsiteSection>
          <WebsiteSection title="Galeri Foto"><div id="galeri" className="website-list">{album.slice(0,6).map((item)=><div className="website-list-row" key={item.id}><div><strong>{item.nama}</strong><span>{item.keterangan??"Album foto desa"}</span></div><span className="website-count">{item.jumlahFoto} foto</span></div>)}{album.length===0?<p className="modul-empty">Belum ada album galeri.</p>:null}</div><Link className="website-text-link" href="/konten/galeri">Buka Modul Galeri →</Link></WebsiteSection>
          <WebsiteSection title="Slider Beranda"><div id="slider" className="website-list">{slider.slice(0,5).map((item)=><div className="website-list-row" key={item.id}><div><strong>{item.judul??"Slide tanpa judul"}</strong><span>Urutan {item.urut}</span></div><span className="website-status">{item.aktif?"Aktif":"Nonaktif"}</span></div>)}{slider.length===0?<p className="modul-empty">Belum ada slider beranda.</p>:null}</div></WebsiteSection>
        </aside>
      </div>
    </WebsiteAdminShell>
  );
}