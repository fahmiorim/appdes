import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import {
  daftarAlbumGaleri,
  daftarFotoAlbum,
  daftarSliderBeranda,
  profilDesaPublik,
} from "@/features/publik/application/konten-publik";

import styles from "./visi-misi.module.css";
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

function splitMisi(value: string | null | undefined): string[] {
  return (value ?? "").split(/\r?\n|<br\s*\/?\s*>|<\/p>/i).map(plainText).filter(Boolean);
}

export default async function VisiMisiPage() {
  const desa = await getIdentitasFromRequest();
  const [profil, albums, slides] = await Promise.all([
    profilDesaPublik(desa.id),
    daftarAlbumGaleri(desa.id),
    daftarSliderBeranda(desa.id),
  ]);
  const location = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const visi = plainText(profil?.visi);
  const misi = splitMisi(profil?.misi);
  const panorama = mediaUrl(slides[0]?.gambar, desa.id);
  const photoAlbums = await Promise.all(albums.filter((album) => album.jumlahFoto > 0).slice(0, 2).map((album) => daftarFotoAlbum(desa.id, album.id)));
  const villagePhoto = photoAlbums.flat().map((photo) => mediaUrl(photo.gambar, desa.id)).find(Boolean) ?? null;

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/visi-misi" />
      <section className={styles.hero} style={panorama ? { backgroundImage: `linear-gradient(90deg,#06396ff2 0%,#07518fc9 48%,#073c6d42 100%),url("${panorama}")` } : undefined}>
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>›</span><Link href="/profil">Profil Desa</Link><span>›</span><span>Visi &amp; Misi</span></nav>
          <p className={styles.kicker}>ARAH PEMBANGUNAN DESA</p>
          <h1>Visi &amp; Misi Desa</h1>
          <p>Arah, tujuan, dan komitmen pembangunan {desa.namaDesa ?? "desa"} untuk masyarakat yang lebih maju, mandiri, dan sejahtera.</p>
          <div className={styles.heroArtwork} aria-hidden="true"><span>◎</span><i>✓</i><i>✓</i><i>✓</i></div>
        </div>
      </section>

      <div className={styles.container}>
        <nav className={styles.sectionNav} aria-label="Navigasi profil desa">
          <Link href="/sejarah"><span>▱</span>Sejarah Desa</Link>
          <Link className={styles.selected} href="/visi-misi"><span>◎</span>Visi &amp; Misi</Link>
          <Link href="/wilayah"><span>⌖</span>Wilayah Desa</Link>
          <Link href="/profil#potensi"><span>♧</span>Potensi Desa</Link>
        </nav>

        <div className={styles.columns}>
          <section className={styles.primaryCard}>
            <h2><span>◎</span> Visi Desa {desa.namaDesa ?? ""}</h2>
            <div className={styles.visionBanner} style={villagePhoto ? { backgroundImage: `linear-gradient(90deg,#ffffff12,#ffffff20),url("${villagePhoto}")` } : undefined}>
              <div className={styles.visionQuote}><b>“</b>{visi || <span className={styles.muted}>Visi desa belum dipublikasikan.</span>}<i/></div>
            </div>
            <div className={styles.missionHeading}><h2><span>⚑</span> Misi Desa {desa.namaDesa ?? ""}</h2><p>Langkah strategis yang ditempuh untuk mewujudkan visi desa.</p></div>
            {misi.length ? <ol className={styles.missionList}>{misi.map((item, index) => <li key={index}><b>{String(index + 1).padStart(2, "0")}</b><span className={styles.missionIcon} aria-hidden="true">{["♧","♢","⌁","♙","❀"][index % 5]}</span><p>{item}</p></li>)}</ol> : <div className={styles.emptyState}>Misi desa belum dipublikasikan oleh pemerintah desa.</div>}
          </section>

          <aside className={styles.sideColumn}>
            <section className={styles.sideCard + " " + styles.meaningCard}>
              <h2><span>ⓘ</span> Makna Visi</h2>
              <p>Visi menjadi gambaran kondisi desa yang ingin diwujudkan bersama. Pernyataan visi di atas merupakan arah dan cita-cita pembangunan yang menjadi pedoman dalam pelaksanaan misi desa.</p>
            </section>
            <section className={styles.sideCard}>
              <h2><span>◎</span> Tujuan Pembangunan</h2>
              <p className={styles.sideIntro}>Tujuan pembangunan yang ditetapkan pemerintah desa.</p>
              <div className={styles.emptySide}>Tujuan pembangunan khusus belum ditampilkan. Lihat butir misi di sebelah kiri sebagai langkah strategis yang telah dipublikasikan desa.</div>
            </section>
            <section className={styles.sideCard}>
              <h2><span>◇</span> Nilai-Nilai Dasar</h2>
              <p className={styles.sideIntro}>Prinsip dasar penyelenggaraan pemerintahan dan pembangunan desa.</p>
              <div className={styles.valueEmpty}><span aria-hidden="true">◇</span><p>Nilai-nilai dasar resmi belum dipublikasikan oleh pemerintah desa.</p></div>
            </section>
          </aside>
        </div>

        <section className={styles.policyCard}>
          <div className={styles.policyImage} style={panorama ? { backgroundImage: `url("${panorama}")` } : undefined} />
          <div className={styles.policyContent}><h2><span>▱</span> Arah Kebijakan Pembangunan</h2><p>Fokus kebijakan pembangunan jangka menengah yang ditetapkan pemerintah desa.</p><div className={styles.policyEmpty}><span aria-hidden="true">▱</span><p>Arah kebijakan pembangunan jangka menengah belum dipublikasikan oleh pemerintah desa.</p></div></div>
        </section>

        <section className={styles.callout}>
          <div className={styles.target} aria-hidden="true">◎<b>➤</b></div>
          <div><h2>Bersama Wujudkan Desa {desa.namaDesa ?? ""}</h2><p>Dukungan dan partisipasi seluruh warga menjadi kunci tercapainya visi dan misi pembangunan desa.</p></div>
          <Link href="/informasi">Lihat Informasi Desa　→</Link>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
