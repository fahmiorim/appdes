import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { profilDesaPublik } from "@/features/publik/application/konten-publik";

import styles from "../informasi-publik.module.css";
import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";

export const dynamic = "force-dynamic";

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const segments = value.split(/[\\\\/]/).filter(Boolean);
  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === ".." || segment.includes(".."))) return null;
  const path = segments[0] === String(villageId) ? segments : [String(villageId), ...segments];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}

function locationLabel(desa: {
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
}): string {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}

function plainText(value: string) {
  return value
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
  const lokasi = locationLabel(desa);
  const logoUrl = mediaUrl(desa.logo, desa.id);
  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={lokasi} logoUrl={logoUrl} activePath="/sejarah" />
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.crumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <Link href="/profil">Profil Desa</Link>
            <span>/</span>
            <span>Sejarah</span>
          </div>
          <p className={styles.kicker}>JEJAK PERJALANAN DESA</p>
          <h1>Sejarah {desa.namaDesa ?? "Desa"}</h1>
          <p>
            Mengenal perjalanan, asal-usul, dan perkembangan {desa.namaDesa ?? "desa"} dari masa ke
            masa.
          </p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          <article className={styles.panel}>
            <p className={styles.kicker}>CERITA DESA</p>
            <h2>Perjalanan dan asal-usul</h2>
            {profil?.sejarah?.trim() ? (
              <div className={styles.copy}>{plainText(profil.sejarah)}</div>
            ) : (
              <p className={styles.muted}>
                Informasi sejarah desa belum dipublikasikan oleh pemerintah desa.
              </p>
            )}
          </article>
        </div>
      </section>
      <PublicSiteFooter desa={desa} location={lokasi} logoUrl={logoUrl} />
    </main>
  );
}
