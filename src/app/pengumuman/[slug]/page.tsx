import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { agendaBulan, agendaMendatang } from "@/features/agenda/application/agenda-use-cases";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { catatKunjunganBerita, daftarBerita, detailBerita } from "@/features/publik/application/konten-publik";
import { sanitasiHtml } from "@/lib/sanitize";

import styles from "./pengumuman-detail.module.css";
import { PublicSiteFooter, PublicSiteHeader } from "../../public-site-layout";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const segments = value.split(/[\\\\/]/).filter(Boolean);
  if (!segments.length || segments.some((part) => part === "." || part === ".." || part.includes(".."))) return null;
  const safe = segments[0] === String(villageId) ? segments : [String(villageId), ...segments];
  return `/api/publik/media/${safe.map(encodeURIComponent).join("/")}`;
}
function tanggal(value: Date, withTime = false) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    timeZone: "Asia/Jakarta",
  }).format(value);
}
function jumlah(value: number) { return new Intl.NumberFormat("id-ID").format(value); }

export async function generateMetadata({ params }: Props) {
  const [{ slug }, desa] = await Promise.all([params, getIdentitasFromRequest()]);
  const item = await detailBerita(desa.id, slug);
  if (!item || item.kategoriSlug !== "pengumuman") return { title: "Pengumuman tidak ditemukan" };
  return {
    title: `${item.judul} | Pengumuman ${desa.namaDesa ?? "Desa"}`,
    description: item.ringkasan ?? `Pengumuman resmi dari Pemerintah ${desa.namaDesa ?? "Desa"}.`,
  };
}

export default async function DetailPengumumanPage({ params }: Props) {
  const [{ slug }, desa] = await Promise.all([params, getIdentitasFromRequest()]);
  const item = await detailBerita(desa.id, slug);
  if (!item || item.kategoriSlug !== "pengumuman") notFound();

  await catatKunjunganBerita(item.id);
  const [all, agenda] = await Promise.all([
    daftarBerita(desa.id, { limit: 30, kategoriSlug: "pengumuman" }),
    agendaMendatang(desa.id, 4),
  ]);
  const others = all.filter((row) => row.id !== item.id).slice(0, 4);
  const date = item.terbitPada ?? item.createdAt;
  const image = mediaUrl(item.gambar, desa.id);
  const document = mediaUrl(item.dokumen, desa.id);
  const logo = mediaUrl(desa.logo, desa.id);
  const location = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
  const sharePath = `/pengumuman/${encodeURIComponent(item.slug)}`;
  const shareText = encodeURIComponent(item.judul);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const monthAgenda = await agendaBulan(desa.id, year, month + 1);
  const agendaDays = new Set(monthAgenda.map((row) => Number(row.mulai.slice(8, 10))));
  const monthName = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(monthStart);
  const calendarCells = [...Array(mondayOffset).fill(0), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  while (calendarCells.length % 7) calendarCells.push(0);

  return <main className={styles.site}>
    <PublicSiteHeader desa={desa} location={location} logoUrl={logo} activePath="/pengumuman"/>
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <nav aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>›</span><Link href="/berita">Informasi</Link><span>›</span><Link href="/pengumuman">Pengumuman</Link><span>›</span><span>Detail Pengumuman</span></nav>
        <h1>Pengumuman Desa</h1>
        <p>Informasi resmi, penting, dan terbaru untuk seluruh masyarakat {desa.namaDesa ?? "desa"}.</p>
        <div className={styles.megaphone} aria-hidden="true">📣</div>
      </div>
    </section>

    <div className={styles.container}>
      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <article className={styles.article}>
            <Link className={styles.back} href="/pengumuman">←　Kembali ke Daftar Pengumuman</Link>
            <span className={styles.label}>♧　Pengumuman</span>
            <h2>{item.judul}</h2>
            <div className={styles.meta}>
              <span>▦　{tanggal(date)}</span><i/><span>◉　{jumlah(item.hit + 1)} kali dibaca</span><i/><span>♙　Pemerintah {desa.namaDesa ?? "Desa"}</span>
            </div>
            {image ? <div className={styles.cover}><Image src={image} alt={item.judul} fill priority unoptimized sizes="(max-width: 900px) 100vw, 65vw"/></div> : <div className={styles.coverFallback}>PENGUMUMAN DESA</div>}
            {item.ringkasan ? <p className={styles.summary}>{item.ringkasan}</p> : null}
            <div className={styles.body} dangerouslySetInnerHTML={{ __html: sanitasiHtml(item.isi) }}/>
            <section className={styles.infoBox}>
              <h3>▦　Informasi Publikasi</h3>
              <dl>
                <div><dt>Kategori</dt><dd>{item.kategori ?? "Pengumuman"}</dd></div>
                <div><dt>Tanggal Publikasi</dt><dd>{tanggal(date)}</dd></div>
                <div><dt>Sumber</dt><dd>Pemerintah {desa.namaDesa ?? "Desa"}</dd></div>
                <div><dt>Status</dt><dd><span className={styles.status}>✓　Aktif</span></dd></div>
              </dl>
            </section>
            {document ? <section className={styles.attachments}><h3>♧　Lampiran Dokumen</h3><a href={document} target="_blank" rel="noreferrer"><span className={styles.pdf}>PDF</span><span><strong>{item.judul}</strong><small>Dokumen lampiran · Buka / unduh</small></span><b>↓</b></a></section> : null}
            <div className={styles.shareRow}><strong>♧　Bagikan Pengumuman</strong><a className={styles.whatsapp} href={`https://wa.me/?text=${shareText}%20${encodeURIComponent(sharePath)}`} target="_blank" rel="noreferrer">WhatsApp</a><a className={styles.facebook} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharePath)}`} target="_blank" rel="noreferrer">Facebook</a><a className={styles.telegram} href={`https://t.me/share/url?url=${encodeURIComponent(sharePath)}&text=${shareText}`} target="_blank" rel="noreferrer">Telegram</a><button type="button" onClick={undefined} className={styles.copyLink} aria-label="Salin tautan">Tautan: {sharePath}</button></div>
          </article>
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.sideCard}><h2><span>ⓘ</span> Informasi Pengumuman</h2><dl className={styles.detailList}><div><dt>Kategori</dt><dd>{item.kategori ?? "Pengumuman"}</dd></div><div><dt>Tanggal Publikasi</dt><dd>{tanggal(date)}</dd></div><div><dt>Sumber</dt><dd>Pemerintah Desa</dd></div><div><dt>Status</dt><dd><span className={styles.status}>✓　Aktif</span></dd></div></dl></section>
          <section className={styles.sideCard}><h2><span>📢</span> Pengumuman Lainnya</h2><div className={styles.otherList}>{others.length ? others.map(row=><Link key={row.id} href={`/pengumuman/${encodeURIComponent(row.slug)}`}><span className={styles.otherThumb}>{mediaUrl(row.gambar,desa.id)?<Image src={mediaUrl(row.gambar,desa.id)!} alt="" fill unoptimized sizes="85px"/>:"📄"}</span><span><strong>{row.judul}</strong><small>▦　{tanggal(row.terbitPada ?? row.createdAt)}</small></span><b>›</b></Link>) : <p className={styles.empty}>Belum ada pengumuman lainnya.</p>}</div></section>
          <section className={styles.sideCard}><h2><span>▦</span> Kalender Kegiatan</h2><div className={styles.calendar}><div className={styles.calendarHead}><strong>{monthName}</strong></div><div className={styles.weekdays}>{["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(day=><span key={day}>{day}</span>)}</div><div className={styles.days}>{calendarCells.map((day,index)=><span key={index} className={day && agendaDays.has(day)?styles.agendaDay:day===now.getDate()?styles.today:undefined}>{day||""}</span>)}</div></div><div className={styles.agendaMini}>{agenda.length?agenda.slice(0,3).map(row=><div key={row.id}><strong>{row.judul}</strong><small>{row.mulai} · {row.lokasi ?? "Lokasi belum ditentukan"}</small></div>):<p className={styles.empty}>Belum ada agenda mendatang.</p>}</div></section>
          <section className={styles.notification}><span>🔔</span><h2>Dapatkan Informasi Terbaru</h2><p>Ikuti perkembangan pengumuman, agenda, dan kegiatan desa secara langsung.</p><Link href="/pengumuman">Lihat Pengumuman Terbaru →</Link></section>
        </aside>
      </div>
    </div>
    <PublicSiteFooter desa={desa} location={location} logoUrl={logo}/>
  </main>;
}
