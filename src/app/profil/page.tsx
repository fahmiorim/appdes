import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikDesa } from "@/features/desa/application/statistik-desa";
import { profilDesaPublik } from "@/features/publik/application/konten-publik";

import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import styles from "./profil.module.css";

export const dynamic = "force-dynamic";

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const segments = value.split(/[\\/]/).filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === ".." || segment.includes(".."))
  ) {
    return null;
  }
  const path = segments[0] === String(villageId) ? segments : [String(villageId), ...segments];
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

function locationLabel(desa: {
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
}): string {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}

export default async function ProfilDesaPage() {
  const desa = await getIdentitasFromRequest();
  const [profil, statistik] = await Promise.all([
    profilDesaPublik(desa.id),
    getStatistikDesa(desa.id),
  ]);

  const lokasi = locationLabel(desa);
  const logo = mediaUrl(desa.logo, desa.id);
  const sejarah = plainText(profil?.sejarah);
  const visi = plainText(profil?.visi);
  const misi = plainText(profil?.misi)
    .split(/\\r?\\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const koordinat = profil?.koordinat?.match(
    /^(-?\\d{1,3}(?:\\.\\d+)?)\\s*,\\s*(-?\\d{1,3}(?:\\.\\d+)?)$/,
  );
  const petaUrl = koordinat
    ? `https://www.google.com/maps?q=${encodeURIComponent(profil?.koordinat ?? "")}`
    : null;
  const intro =
    plainText(profil?.sambutan) ||
    `Informasi umum ${desa.namaDesa ?? "desa"} belum dilengkapi oleh pemerintah desa.`;
  const number = (value: number) => new Intl.NumberFormat("id-ID").format(value);

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={lokasi} logoUrl={logo} activePath="/profil" />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>›</span>
            <span>Profil Desa</span>
          </nav>
          <h1>Profil Desa</h1>
          <p>
            Informasi lengkap tentang sejarah, visi misi, wilayah, potensi, dan kondisi umum{" "}
            {desa.namaDesa ?? "desa"}.
          </p>
        </div>
      </section>
      <div className={styles.container}>
        <div className={styles.topGrid}>
          <aside className={styles.sidebar}>
            <h2>
              <span>▤</span> Profil Desa
            </h2>
            <nav aria-label="Menu profil desa">
              <a className={styles.selected} href="#tentang">
                ▣ <span>Tentang Desa</span>
              </a>
              <a href="#sejarah">
                ✿ <span>Sejarah Desa</span>
              </a>
              <a href="#visi-misi">
                ♡ <span>Visi & Misi</span>
              </a>
              <a href="#wilayah">
                ⌖ <span>Wilayah Desa</span>
              </a>
              <a href="#potensi">
                ♧ <span>Potensi Desa</span>
              </a>
              <a href="#data-umum">
                ▣ <span>Data Umum</span>
              </a>
              <a href="#sarana">
                ♧ <span>Sarana & Prasarana</span>
              </a>
            </nav>
          </aside>
          <section className={styles.aboutCard} id="tentang">
            <h2>Tentang {desa.namaDesa ?? "Desa"}</h2>
            <div className={styles.aboutBody}>
              <div className={styles.villageVisual}>
                {logo ? (
                  <Image src={logo} alt="" width={90} height={90} unoptimized />
                ) : (
                  <span>🏡</span>
                )}
                <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
                <small>{lokasi || "Informasi wilayah desa"}</small>
              </div>
              <p>{intro}</p>
            </div>
            <div className={styles.metrics} id="data-umum">
              <div>
                <span>▦</span>
                <small>Data Penduduk</small>
                <strong>{number(statistik.total)} Jiwa</strong>
              </div>
              <div>
                <span>♧</span>
                <small>Jumlah KK</small>
                <strong>{number(statistik.keluarga)} KK</strong>
              </div>
              <div>
                <span>⌖</span>
                <small>Jumlah Dusun</small>
                <strong>{number(statistik.perDusun.length)} Dusun</strong>
              </div>
              <div>
                <span>⌑</span>
                <small>Wilayah</small>
                <strong>{lokasi || "Belum tersedia"}</strong>
              </div>
            </div>
          </section>
        </div>
        <div className={styles.middleGrid}>
          <div className={styles.leftStack}>
            <section className={styles.panel} id="sejarah">
              <h2>▣　Sejarah Singkat Desa</h2>
              <p>{sejarah || "Informasi sejarah desa belum dipublikasikan."}</p>
              <Link href="/sejarah" className={styles.more}>
                Selengkapnya →
              </Link>
            </section>
            <section className={styles.panel} id="wilayah">
              <h2>⌖　Letak & Wilayah Desa</h2>
              <p>{lokasi || "Informasi lokasi desa belum dilengkapi."}</p>
              {petaUrl ? (
                <a className={styles.more} href={petaUrl} target="_blank" rel="noreferrer">
                  Lihat lokasi di peta ↗
                </a>
              ) : (
                <p className={styles.muted}>Koordinat lokasi belum tersedia.</p>
              )}
            </section>
          </div>
          <section className={styles.visionPanel} id="visi-misi">
            <h2>◎　Visi & Misi Desa</h2>
            <div className={styles.visionQuote}>
              <b>“</b>
              <div>
                <strong>Visi</strong>
                <p>{visi || "Visi desa belum dipublikasikan."}</p>
              </div>
            </div>
            <h3>▣　Misi</h3>
            {misi.length ? (
              <ol>
                {misi.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ol>
            ) : (
              <p className={styles.muted}>Misi desa belum dipublikasikan.</p>
            )}
            <Link href="/visi-misi" className={styles.more}>
              Lihat visi & misi →
            </Link>
          </section>
        </div>
        <section className={styles.widePanel} id="potensi">
          <h2>♧　Potensi Desa</h2>
          <p>Informasi potensi unggulan {desa.namaDesa ?? "desa"}.</p>
          <div className={styles.emptyContent}>
            Data potensi desa belum tersedia untuk ditampilkan.
          </div>
        </section>
        <section className={styles.widePanel} id="sarana">
          <h2>▱　Sarana & Prasarana Desa</h2>
          <p>Fasilitas umum dan infrastruktur pendukung pelayanan serta kegiatan masyarakat.</p>
          <div className={styles.emptyContent}>
            Data sarana dan prasarana desa belum tersedia untuk ditampilkan.
          </div>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={lokasi} logoUrl={logo} />
    </main>
  );
}
