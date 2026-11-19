import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import {
  daftarAlbumGaleri,
  daftarFotoAlbum,
  daftarSliderBeranda,
  profilDesaPublik,
} from "@/features/publik/application/konten-publik";

import styles from "./sejarah.module.css";
import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";

export const dynamic = "force-dynamic";

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes(".."))) return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}

function plainText(value: string | null | undefined): string {
  return (value ?? "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
}

function locationLabel(desa: { namaKecamatan: string | null; namaKabupaten: string | null; namaPropinsi: string | null }) {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}

export default async function SejarahPage() {
  const desa = await getIdentitasFromRequest();
  const [profil, albums, slides] = await Promise.all([
    profilDesaPublik(desa.id),
    daftarAlbumGaleri(desa.id),
    daftarSliderBeranda(desa.id),
  ]);
  const activeAlbums = albums.filter((album) => album.jumlahFoto > 0);
  const photoGroups = await Promise.all(activeAlbums.slice(0, 4).map((album) => daftarFotoAlbum(desa.id, album.id)));
  const archivePhotos = photoGroups.flat().slice(0, 4);
  const heroImage = mediaUrl(slides[0]?.gambar, desa.id) ?? (archivePhotos[0] ? mediaUrl(archivePhotos[0].gambar, desa.id) : null);
  const storyImage = archivePhotos[0] ? mediaUrl(archivePhotos[0].gambar, desa.id) : null;
  const location = locationLabel(desa);
  const historyParagraphs = (profil?.sejarah ?? "").split(/\r?\n|<br\s*\/?\s*>|<\/p>/i).map(plainText).filter(Boolean);
  const historyMilestones = historyParagraphs.flatMap((paragraph) => {
    const years = [...paragraph.matchAll(/\b(18|19|20)\d{2}\b/g)].map((match) => match[0]);
    return [...new Set(years)].map((year) => ({ year, description: paragraph }));
  }).filter((item, index, items) => items.findIndex((candidate) => candidate.year === item.year) === index).sort((a, b) => Number(a.year) - Number(b.year));

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={mediaUrl(desa.logo, desa.id)} activePath="/sejarah" />
      <section className={styles.hero} style={heroImage ? { backgroundImage: `linear-gradient(90deg,#06396ff0 0%,#07518fc9 48%,#073c6d42 100%),url("${heroImage}")` } : undefined}>
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>›</span><Link href="/profil">Profil Desa</Link><span>›</span><span>Sejarah Desa</span></nav>
          <p className={styles.kicker}>JEJAK PERJALANAN DESA</p>
          <h1>Sejarah Desa</h1>
          <p className={styles.heroDescription}>Riwayat berdirinya {desa.namaDesa ?? "desa"}, perjalanan perkembangan, dan tonggak-tonggak penting desa.</p>
          <div className={styles.heroArchive}>
            {archivePhotos.slice(0, 2).map((photo, index) => {
              const src = mediaUrl(photo.gambar, desa.id);
              return src ? <div className={index === 0 ? styles.archiveFront : styles.archiveBack} key={photo.id}><Image src={src} alt={photo.judul || "Dokumentasi desa"} fill unoptimized sizes="180px"/></div> : null;
            })}
            {!archivePhotos.length ? <div className={styles.archiveFallback}>Arsip foto desa</div> : null}
          </div>
        </div>
      </section>

      <div className={styles.container}>
        <nav className={styles.sectionNav} aria-label="Navigasi profil desa">
          <Link className={styles.selected} href="/sejarah"><span>▱</span>Sejarah Desa</Link>
          <Link href="/visi-misi"><span>◎</span>Visi & Misi</Link>
          <Link href="/wilayah"><span>⌖</span>Wilayah Desa</Link>
          <Link href="/profil#potensi"><span>♧</span>Potensi Desa</Link>
        </nav>

        <div className={styles.columns}>
          <div className={styles.mainColumn}>
            <section className={styles.storyCard}>
              <h2><span>▱</span> Sejarah Singkat {desa.namaDesa ?? "Desa"}</h2>
              <div className={styles.storyContent}>
                <div className={styles.storyImage}>
                  {storyImage ? <Image src={storyImage} alt={archivePhotos[0]?.judul || "Dokumentasi desa"} fill priority unoptimized sizes="(max-width: 700px) 100vw, 35vw"/> : <div className={styles.noImage}>Dokumentasi sejarah belum tersedia</div>}
                </div>
                <div className={styles.storyCopy}>
                  {historyParagraphs.length ? historyParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p className={styles.muted}>Riwayat sejarah desa belum dipublikasikan oleh pemerintah desa.</p>}
                </div>
              </div>
            </section>

            <section className={styles.timelineCard}>
              <h2><span>⚑</span> Tonggak Sejarah Penting</h2>
              {historyMilestones.length ? <ol className={styles.timelineList}>{historyMilestones.map((item, index) => (
                <li className={styles.timelineItem} key={item.year}>
                  <span className={styles.timelineNode} aria-hidden="true" />
                  <time className={styles.timelineYear}>{item.year}</time>
                  <div className={styles.timelineDescription}><strong>{index === 0 ? "Catatan awal perjalanan desa" : "Perkembangan desa"}</strong><p>{item.description}</p></div>
                  <span className={styles.timelineIcon} aria-hidden="true">{index === 0 ? "⌂" : index % 2 ? "⌁" : "♧"}</span>
                </li>
              ))}</ol> : <div className={styles.timelineEmpty}>
                <span>◷</span>
                <div><strong>Jejak waktu dalam sejarah desa</strong><p>Belum ada tahun yang tercantum pada narasi sejarah yang dipublikasikan.</p></div>
              </div>}
            </section>
          </div>

          <aside className={styles.aside}>
            <section className={styles.profileMenu}>
              <h2><span>♙</span> Profil Desa</h2>
              <Link className={styles.active} href="/sejarah"><span>▱</span>Sejarah Desa<b>›</b></Link>
              <Link href="/visi-misi"><span>◎</span>Visi & Misi<b>›</b></Link>
              <Link href="/wilayah"><span>⌖</span>Wilayah Desa<b>›</b></Link>
              <Link href="/profil#potensi"><span>♧</span>Potensi Desa<b>›</b></Link>
              <Link href="/pemerintahan"><span>♧</span>Struktur Organisasi<b>›</b></Link>
              <Link href="/pemerintahan"><span>♙</span>Perangkat Desa<b>›</b></Link>
              <Link href="/pemerintahan"><span>♧</span>Lembaga Desa<b>›</b></Link>
              <Link href="/statistik"><span>▦</span>Demografi<b>›</b></Link>
            </section>
            <section className={styles.quoteCard}>
              <span>“</span><p>Setiap desa memiliki cerita. Sejarah {desa.namaDesa ?? "desa"} adalah bagian dari identitas dan kebanggaan bersama.</p>
              <div className={styles.quoteLandscape} aria-hidden="true"><i/><i/><i/></div>
            </section>
          </aside>
        </div>

        <section className={styles.galleryCard}>
          <div className={styles.galleryHeading}><h2><span>▧</span> Dokumentasi Sejarah</h2><Link href="/galeri">Lihat Semua Foto　→</Link></div>
          {archivePhotos.length ? <div className={styles.galleryGrid}>{archivePhotos.map((photo) => {
            const src = mediaUrl(photo.gambar, desa.id);
            return src ? <Link href="/galeri" key={photo.id}><Image src={src} alt={photo.judul || photo.keterangan || "Dokumentasi desa"} fill unoptimized sizes="(max-width: 640px) 50vw, 25vw"/></Link> : null;
          })}</div> : <div className={styles.galleryEmpty}>Foto dokumentasi belum dipublikasikan di galeri desa.</div>}
        </section>

        <section className={styles.callout}>
          <div className={styles.calloutArtwork} aria-hidden="true"><span>▧</span><b>◷</b></div>
          <div><h2>Kenali Lebih Dekat Sejarah Desa Kita</h2><p>Telusuri perjalanan panjang {desa.namaDesa ?? "desa"} dari masa ke masa, sebagai bagian dari identitas dan kebanggaan bersama.</p></div>
          <Link href="/galeri">Galeri Dokumentasi Sejarah　→</Link>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={mediaUrl(desa.logo, desa.id)} />
    </main>
  );
}
