import Image from "next/image";
import Link from "next/link";
import { agendaMendatang } from "@/features/agenda/application/agenda-use-cases";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikDesa } from "@/features/desa/application/statistik-desa";
import { daftarBerita, daftarDokumenPublik, profilDesaPublik } from "@/features/publik/application/konten-publik";
import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import styles from "./informasi.module.css";

export const dynamic = "force-dynamic";

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes(".."))) return null;
  const safe = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return "/api/publik/media/" + safe.map(encodeURIComponent).join("/");
}
function plainText(value: string | null | undefined, max = 300): string {
  return (value ?? "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim().slice(0, max);
}
function dateLabel(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "Tanggal belum tersedia";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(date);
}
function number(value: number): string { return new Intl.NumberFormat("id-ID").format(value); }

export async function generateMetadata() {
  const desa = await getIdentitasFromRequest();
  return { title: "Informasi Desa | " + (desa.namaDesa ?? "Pemerintah Desa"), description: "Pusat informasi resmi, dokumen, berita, dan agenda desa." };
}

export default async function InformasiDesaPage() {
  const desa = await getIdentitasFromRequest();
  const [profil, statistik, berita, agenda, dokumen] = await Promise.all([
    profilDesaPublik(desa.id),
    getStatistikDesa(desa.id),
    daftarBerita(desa.id, { limit: 4 }),
    agendaMendatang(desa.id, 4),
    daftarDokumenPublik(desa.id),
  ]);
  const location = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const informationGroups = [
    { title: "Profil Desa", description: "Kenali identitas, sejarah, visi dan misi desa.", href: "/profil", icon: "⌂", tone: "blue" },
    { title: "Pemerintahan Desa", description: "Informasi pemerintah dan perangkat desa.", href: "/pemerintahan", icon: "♙", tone: "purple" },
    { title: "Wilayah Desa", description: "Wilayah administratif dan pembagian dusun.", href: "/wilayah", icon: "⌖", tone: "green" },
    { title: "Data Statistik", description: "Data kependudukan dan gambaran statistik desa.", href: "/statistik", icon: "▥", tone: "orange" },
    { title: "Potensi Desa", description: "Potensi dan sumber daya unggulan desa.", href: "/potensi", icon: "♧", tone: "teal" },
    { title: "APBDes", description: "Transparansi anggaran dan realisasi keuangan.", href: "/transparansi/apbdes", icon: "▤", tone: "pink" },
  ];
  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/informasi" />
      <section className={styles.hero}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb}><Link href="/">Beranda</Link><span>›</span><span>Informasi</span><span>›</span><span>Informasi Desa</span></nav>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}><span className={styles.eyebrow}>PORTAL INFORMASI RESMI</span><h1>Informasi Desa {desa.namaDesa ?? ""}</h1><p>Pusat informasi resmi mengenai profil, pemerintahan, wilayah, data, dokumen, dan perkembangan desa.</p><div className={styles.heroLocation}>⌖　{location || "Informasi wilayah belum dilengkapi"}</div></div>
            <div className={styles.heroVisual}><div className={styles.visualCard}><span>INFORMASI</span><strong>DESA</strong><i>Terbuka · Akurat · Terpercaya</i></div><div className={styles.visualOrb} /></div>
          </div>
        </div>
      </section>
      <div className={styles.container + " " + styles.content}>
        <section className={styles.introCard}><div><span className={styles.kicker}>SELAMAT DATANG</span><h2>Pusat Informasi {desa.namaDesa ?? "Desa"}</h2><p>{plainText(profil?.sambutan, 520) || "Selamat datang di portal informasi resmi " + (desa.namaDesa ?? "desa") + ". Temukan informasi pemerintahan, layanan, data, dokumen, serta kegiatan desa melalui halaman ini."}</p><Link href="/profil" className={styles.primaryLink}>Kenali Desa Kami　→</Link></div><div className={styles.introMark}>⌂</div></section>
        <section className={styles.statsGrid}>
          <article><span className={styles.statIcon}>♙</span><div><small>Jumlah Penduduk</small><strong>{number(statistik.total)}</strong><em>Jiwa</em></div></article>
          <article><span className={styles.statIcon}>⌂</span><div><small>Kepala Keluarga</small><strong>{number(statistik.keluarga)}</strong><em>KK</em></div></article>
          <article><span className={styles.statIcon}>▦</span><div><small>Dusun Terdata</small><strong>{number(statistik.perDusun.filter((item) => item.label !== "Belum diisi").length)}</strong><em>Dusun</em></div></article>
          <article><span className={styles.statIcon}>▤</span><div><small>Dokumen Publik</small><strong>{number(dokumen.length)}</strong><em>Dokumen</em></div></article>
        </section>
        <section className={styles.section}><div className={styles.sectionHeading}><div><span className={styles.kicker}>JELAJAHI DESA</span><h2>Informasi Umum Desa</h2><p>Akses informasi penting tentang {desa.namaDesa ?? "desa"}.</p></div><Link href="/profil">Lihat Profil Desa　→</Link></div><div className={styles.infoGrid}>{informationGroups.map((item) => <Link href={item.href} key={item.href} className={styles.infoCard}><span className={styles[item.tone]}>{item.icon}</span><div><h3>{item.title}</h3><p>{item.description}</p></div><b>›</b></Link>)}</div></section>
        <div className={styles.columns}>
          <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.kicker}>KABAR TERBARU</span><h2>Berita & Pengumuman</h2></div><Link href="/berita">Semua Berita →</Link></div>
            {berita.length ? <div className={styles.newsList}>{berita.map((item) => <article key={item.id}><div className={styles.newsThumb}>{mediaUrl(item.gambar, desa.id) ? <Image src={mediaUrl(item.gambar, desa.id)!} alt="" fill unoptimized sizes="100px" /> : <span>INFO</span>}</div><div><small>{item.kategori ?? "Informasi"}　·　{dateLabel(item.terbitPada ?? item.createdAt)}</small><h3><Link href={item.kategoriSlug === "pengumuman" ? "/pengumuman/" + encodeURIComponent(item.slug) : "/berita/" + encodeURIComponent(item.slug)}>{item.judul}</Link></h3><p>{plainText(item.ringkasan) || "Baca informasi selengkapnya."}</p></div></article>)}</div> : <div className={styles.empty}>Belum ada berita atau pengumuman yang diterbitkan.</div>}
          </section>
          <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.kicker}>JADWAL DESA</span><h2>Agenda Kegiatan</h2></div><Link href="/agenda">Semua Agenda →</Link></div>
            {agenda.length ? <div className={styles.agendaList}>{agenda.map((item) => <Link href={"/agenda/" + item.id} key={item.id}><span className={styles.agendaDate}>{dateLabel(item.mulai)}</span><strong>{item.judul}</strong><small>◷　{item.jamMulai ? item.jamMulai.slice(0, 5) + " WIB" : "Waktu belum ditentukan"}　·　{item.lokasi ?? "Lokasi belum ditentukan"}</small></Link>)}</div> : <div className={styles.empty}>Belum ada agenda yang dipublikasikan.</div>}
          </section>
        </div>
        <section className={styles.panel + " " + styles.documents}><div className={styles.panelHeading}><div><span className={styles.kicker}>TRANSPARANSI INFORMASI</span><h2>Dokumen Publik Desa</h2><p>Dokumen resmi yang dipublikasikan pemerintah desa.</p></div><Link href="/dokumen">Lihat Semua Dokumen →</Link></div>
          {dokumen.length ? <div className={styles.documentList}>{dokumen.slice(0, 5).map((doc) => <article key={doc.id}><span className={styles.docIcon}>▤</span><div><h3>{doc.nama}</h3><small>{doc.kategori}{doc.tahun ? " · " + doc.tahun : ""}{doc.nomor ? " · " + doc.nomor : ""}</small></div>{doc.tautan ? <a href={doc.tautan} target="_blank" rel="noreferrer">Buka ↗</a> : doc.berkas ? <span className={styles.fileLabel}>Berkas tersedia</span> : <span className={styles.fileLabel}>Informasi</span>}</article>)}</div> : <div className={styles.empty}>Belum ada dokumen publik yang tersedia.</div>}
        </section>
        <section className={styles.bottomCta}><div><h2>Butuh Informasi Lebih Lanjut?</h2><p>Hubungi pemerintah {desa.namaDesa ?? "desa"} melalui kanal kontak resmi.</p></div><Link href="/kontak">Hubungi Kami　→</Link></section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
