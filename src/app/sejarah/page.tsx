import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { profilDesaPublik } from "@/features/publik/application/konten-publik";

import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import styles from "./sejarah.module.css";

export const dynamic = "force-dynamic";

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes("..")))
    return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}

function plainText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function SejarahPage() {
  const desa = await getIdentitasFromRequest();
  const profil = await profilDesaPublik(desa.id);
  const location = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi]
    .filter(Boolean)
    .join(", ");
  const logo = mediaUrl(desa.logo, desa.id);
  const sejarah = plainText(profil?.sejarah);
  const paragraphs = (profil?.sejarah ?? "").split(/\r?\n/).map(plainText).filter(Boolean);
  const heroDescription = `Riwayat berdirinya ${desa.namaDesa ?? "desa"}, perjalanan perkembangan, dan tonggak penting desa.`;

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logo} activePath="/sejarah" />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>›</span>
            <Link href="/profil">Profil Desa</Link>
            <span>›</span>
            <span>Sejarah Desa</span>
          </nav>
          <h1>Sejarah Desa</h1>
          <p>{heroDescription}</p>
        </div>
      </section>

      <div className={styles.container}>
        <nav className={styles.sectionNav} aria-label="Navigasi profil desa">
          <Link className={styles.current} href="/sejarah">
            <span>▱</span> Sejarah Desa
          </Link>
          <Link href="/visi-misi">
            <span>◎</span> Visi & Misi
          </Link>
          <Link href="/wilayah">
            <span>⌖</span> Wilayah Desa
          </Link>
          <Link href="/profil#potensi">
            <span>♧</span> Potensi Desa
          </Link>
        </nav>

        <div className={styles.contentGrid}>
          <div className={styles.mainColumn}>
            <section className={styles.storyCard}>
              <h2>
                <span>▱</span> Sejarah Singkat {desa.namaDesa ?? "Desa"}
              </h2>
              <div className={styles.storyBody}>
                <div className={styles.archiveVisual}>
                  {logo ? (
                    <Image
                      src={logo}
                      alt={`Lambang ${desa.namaDesa ?? "desa"}`}
                      width={94}
                      height={94}
                      unoptimized
                    />
                  ) : (
                    <span aria-hidden="true">▧</span>
                  )}
                  <small>Dokumentasi sejarah desa</small>
                </div>
                <div className={styles.storyText}>
                  {paragraphs.length ? (
                    paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
                  ) : (
                    <p className={styles.muted}>
                      Riwayat sejarah desa belum dipublikasikan oleh pemerintah desa.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className={styles.timelineCard}>
              <h2>
                <span>⚑</span> Tonggak Sejarah Penting
              </h2>
              {sejarah ? (
                <div className={styles.timelineIntro}>
                  Riwayat perjalanan {desa.namaDesa ?? "desa"} berdasarkan informasi yang
                  dipublikasikan pemerintah desa.
                </div>
              ) : null}
              <div className={styles.timelineEmpty}>
                Data tahun dan peristiwa sejarah belum tersedia secara terstruktur. Lengkapi
                kronologi melalui pengelolaan profil desa agar dapat ditampilkan di sini.
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.profileMenu}>
              <h2>
                <span>♙</span> Profil Desa
              </h2>
              <Link className={styles.active} href="/sejarah">
                ▱ <span>Sejarah Desa</span> <b>›</b>
              </Link>
              <Link href="/visi-misi">
                ◎ <span>Visi & Misi</span>
                <b>›</b>
              </Link>
              <Link href="/wilayah">
                ⌖ <span>Wilayah Desa</span>
                <b>›</b>
              </Link>
              <Link href="/profil#potensi">
                ♧ <span>Potensi Desa</span>
                <b>›</b>
              </Link>
              <Link href="/pemerintahan">
                ♧ <span>Struktur Organisasi</span>
                <b>›</b>
              </Link>
              <Link href="/pemerintahan">
                ♙ <span>Perangkat Desa</span>
                <b>›</b>
              </Link>
              <Link href="/pemerintahan">
                ♧ <span>Lembaga Desa</span>
                <b>›</b>
              </Link>
              <Link href="/statistik">
                ▦ <span>Demografi</span>
                <b>›</b>
              </Link>
            </section>
            <section className={styles.quoteCard}>
              <span>“</span>
              <p>
                {sejarah
                  ? `Kisah perjalanan ${desa.namaDesa ?? "desa"} menjadi bagian dari identitas dan kebanggaan bersama.`
                  : `Setiap desa memiliki cerita. Mari lengkapi sejarah ${desa.namaDesa ?? "desa"} bersama.`}
              </p>
              <small>{desa.namaDesa ?? "Pemerintah Desa"}</small>
            </section>
          </aside>
        </div>

        <section className={styles.galleryCard}>
          <div className={styles.galleryHeading}>
            <h2>
              <span>▧</span> Dokumentasi Sejarah
            </h2>
            <Link href="/galeri">Lihat Semua Foto　→</Link>
          </div>
          <div className={styles.galleryEmpty}>
            Foto dan arsip dokumentasi sejarah belum tersedia di galeri publik desa.
          </div>
        </section>

        <section className={styles.callout}>
          <div className={styles.calloutIcon}>▧</div>
          <div>
            <h2>Kenali Lebih Dekat Sejarah Desa Kita</h2>
            <p>
              Telusuri perjalanan panjang {desa.namaDesa ?? "desa"} dari masa ke masa, sebagai
              bagian dari identitas dan kebanggaan bersama.
            </p>
          </div>
          <Link href="/galeri">Galeri Dokumentasi Sejarah　→</Link>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logo} />
    </main>
  );
}
