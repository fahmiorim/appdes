import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { profilDesaPublik } from "@/features/publik/application/konten-publik";

import styles from "../informasi-publik.module.css";
import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";

export const dynamic = "force-dynamic";

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const segments = value.split(/[\\\\/]/).filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === ".." || segment.includes(".."))
  )
    return null;
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

export default async function VisiMisiPage() {
  const desa = await getIdentitasFromRequest();
  const profil = await profilDesaPublik(desa.id);
  const lokasi = locationLabel(desa);
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const misi = plainText(profil?.misi ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={lokasi} logoUrl={logoUrl} activePath="/visi-misi" />
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.crumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <Link href="/profil">Profil Desa</Link>
            <span>/</span>
            <span>Visi & Misi</span>
          </div>
          <p className={styles.kicker}>ARAH PEMBANGUNAN DESA</p>
          <h1>Visi & Misi {desa.namaDesa ?? "Desa"}</h1>
          <p>Komitmen dan langkah bersama untuk mewujudkan cita-cita pembangunan desa.</p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container + " " + styles.grid}>
          <article className={styles.panel}>
            <p className={styles.kicker}>VISI</p>
            <h2>Cita-cita dan tujuan</h2>
            {profil?.visi?.trim() ? (
              <div className={styles.copy}>{plainText(profil.visi)}</div>
            ) : (
              <p className={styles.muted}>Visi desa belum dipublikasikan.</p>
            )}
          </article>
          <article className={styles.panel}>
            <p className={styles.kicker}>MISI</p>
            <h2>Langkah mewujudkan visi</h2>
            {misi.length ? (
              <ol className={styles.copy}>
                {misi.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ol>
            ) : (
              <p className={styles.muted}>Misi desa belum dipublikasikan.</p>
            )}
          </article>
        </div>
      </section>
      <PublicSiteFooter desa={desa} location={lokasi} logoUrl={logoUrl} />
    </main>
  );
}
