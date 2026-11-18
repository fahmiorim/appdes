import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { profilDesaPublik } from "@/features/publik/application/konten-publik";
import { getNavPublik } from "@/features/publik/application/nav-publik";

import styles from "../informasi-publik.module.css";
import { PublicShell } from "../public-shell";

export const dynamic = "force-dynamic";

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
  const misi = plainText(profil?.misi ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return (
    <PublicShell
      villageName={desa.namaDesa ?? "Pemerintah Desa"}
      brandLabel="Visi & Misi Desa"
      navigation={await getNavPublik(desa.id)}
    >
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
    </PublicShell>
  );
}
