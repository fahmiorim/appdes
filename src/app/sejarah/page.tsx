import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { profilDesaPublik } from "@/features/publik/application/konten-publik";

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

export default async function SejarahPage() {
  const desa = await getIdentitasFromRequest();
  const profil = await profilDesaPublik(desa.id);
  return (
    <PublicShell
      villageName={desa.namaDesa ?? "Pemerintah Desa"}
      brandLabel="Sejarah Desa"
      navigation={[
        { href: "/", label: "Beranda" },
        { href: "/profil", label: "Profil Desa" },
        { href: "/profil/visi-misi", label: "Visi & Misi" },
        { href: "/berita", label: "Berita" },
      ]}
    >
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
    </PublicShell>
  );
}
