import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { muatHalamanPublik } from "@/features/publik/application/website-admin";
import { sanitasiHtml } from "@/lib/sanitize";

import { PublicSiteFooter, PublicSiteHeader } from "../../public-site-layout";
import styles from "./halaman-statis.module.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const desa = await getIdentitasFromRequest();
  const halaman = await muatHalamanPublik(desa.id, slug);
  return {
    title: halaman
      ? `${halaman.judul} | ${desa.namaDesa ?? "Website Desa"}`
      : "Halaman tidak ditemukan",
  };
}

export default async function HalamanStatisPage({ params }: Props) {
  const { slug } = await params;
  const desa = await getIdentitasFromRequest();
  const halaman = await muatHalamanPublik(desa.id, slug);
  if (!halaman) notFound();
  const lokasi = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi]
    .filter(Boolean)
    .join(", ");
  const logoUrl = desa.logo
    ? `/api/publik/media/${desa.logo.split("/").map(encodeURIComponent).join("/")}`
    : null;
  return (
    <main className={styles.site}>
      <PublicSiteHeader
        desa={desa}
        location={lokasi}
        logoUrl={logoUrl}
        activePath={`/halaman/${slug}`}
      />
      <div className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Beranda</Link>
          <span>›</span>
          <span>{halaman.judul}</span>
        </nav>
        <article className={styles.article}>
          <span className={styles.eyebrow}>Informasi Desa</span>
          <h1>{halaman.judul}</h1>
          <div
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: sanitasiHtml(halaman.isi) }}
          />
        </article>
      </div>
      <PublicSiteFooter desa={desa} location={lokasi} logoUrl={logoUrl} />
    </main>
  );
}
