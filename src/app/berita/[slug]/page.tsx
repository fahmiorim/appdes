import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import {
  catatKunjunganBerita,
  detailBerita,
} from "@/features/publik/application/konten-publik";
import { sanitasiHtml, teksPolos } from "@/lib/sanitize";
import styles from "../berita.module.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

function mediaUrl(value: string | null, villageId: number): string | null {
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

function tanggal(value: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

export async function generateMetadata({ params }: Props) {
  const [{ slug }, desa] = await Promise.all([params, getIdentitasFromRequest()]);
  const berita = await detailBerita(desa.id, slug);
  if (!berita) return { title: "Berita tidak ditemukan" };
  return {
    title: `${berita.judul} | ${desa.namaDesa ?? "Berita Desa"}`,
    description: teksPolos(berita.ringkasan || berita.isi).slice(0, 160),
  };
}

export default async function DetailBeritaPage({ params }: Props) {
  const [{ slug }, desa] = await Promise.all([params, getIdentitasFromRequest()]);
  const berita = await detailBerita(desa.id, slug);
  if (!berita) notFound();

  await catatKunjunganBerita(berita.id);
  const image = mediaUrl(berita.gambar, desa.id);
  const date = berita.terbitPada ?? berita.createdAt;

  return (
    <main className={styles.site}>
      <div className={styles.topline}>
        <div className={styles.container + " " + styles.toplineInner}>
          <span>Website Resmi Pemerintah Desa</span>
          <span>{desa.namaKabupaten ? `Kabupaten ${desa.namaKabupaten}` : "Portal Informasi Desa"}</span>
        </div>
      </div>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">D</span>
            <span className={styles.brandCopy}>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <small>Portal informasi desa</small>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Navigasi utama">
            <Link href="/">Beranda</Link>
            <Link href="/profil">Profil Desa</Link>
            <Link href="/berita" className={styles.active}>Berita</Link>
          </nav>
          <Link href="/masuk" className={styles.login}>Masuk ↗</Link>
        </div>
      </header>
      <section className={styles.articleWrap}>
        <div className={styles.container}>
          <div className={styles.article}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/">Beranda</Link><span>/</span><Link href="/berita">Berita</Link><span>/</span><span aria-current="page">Detail</span>
            </nav>
            <header className={styles.articleHead}>
              <div className={styles.articleMeta}>
                <span className={styles.category}>{berita.kategori ?? "Informasi"}</span>
                <time dateTime={date.toISOString()}>{tanggal(date)}</time>
                <span>{berita.hit + 1} kali dibaca</span>
              </div>
              <h1>{berita.judul}</h1>
              {berita.ringkasan ? <p className={styles.summary}>{berita.ringkasan}</p> : null}
            </header>
            {image ? (
              <div className={styles.articleCover}>
                <Image src={image} alt={berita.judul} fill priority sizes="(max-width: 900px) 100vw, 850px" unoptimized />
              </div>
            ) : null}
            <div className={styles.articleBody} dangerouslySetInnerHTML={{ __html: sanitasiHtml(berita.isi) }} />
            <Link className={styles.backLink} href="/berita">← Kembali ke semua berita</Link>
          </div>
        </div>
      </section>
      <footer className={styles.footer}>
        <div className={styles.container + " " + styles.footerInner}>
          <span>© {new Date().getFullYear()} {desa.namaDesa ?? "Pemerintah Desa"}</span>
          <Link href="/">Kembali ke beranda</Link>
        </div>
      </footer>
    </main>
  );
}
