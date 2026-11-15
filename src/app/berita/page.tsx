import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import {
  daftarBerita,
  daftarKategoriBerita,
} from "@/features/publik/application/konten-publik";
import styles from "./berita.module.css";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; kategori?: string }>;
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

export default async function BeritaPage({ searchParams }: Props) {
  const desa = await getIdentitasFromRequest();
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const kategori = params.kategori?.trim() ?? "";
  const [berita, kategoriBerita] = await Promise.all([
    daftarBerita(desa.id, { limit: 60, cari: q || undefined, kategoriSlug: kategori || undefined }),
    daftarKategoriBerita(desa.id),
  ]);

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
            <Link href="/berita" className={styles.active} aria-current="page">Berita</Link>
          </nav>
          <Link href="/masuk" className={styles.login}>Masuk ↗</Link>
        </div>
      </header>
      <section className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>KABAR DAN INFORMASI TERKINI</p>
          <h1>Berita {desa.namaDesa ?? "Desa"}</h1>
          <p>Ikuti informasi, kegiatan, dan perkembangan terbaru dari pemerintah desa.</p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          <div className={styles.toolbar}>
            <div className={styles.filters}>
              <Link href="/berita" className={kategori ? styles.filter : `${styles.filter} ${styles.filterActive}`}>Semua</Link>
              {kategoriBerita.map((item) => (
                <Link
                  key={item.id}
                  href={`/berita?kategori=${encodeURIComponent(item.slug)}`}
                  className={kategori === item.slug ? `${styles.filter} ${styles.filterActive}` : styles.filter}
                >
                  {item.nama}
                </Link>
              ))}
            </div>
            <form className={styles.search} action="/berita" method="get">
              {kategori ? <input type="hidden" name="kategori" value={kategori} /> : null}
              <input type="search" name="q" defaultValue={q} placeholder="Cari berita..." aria-label="Cari berita" />
              <button type="submit">Cari</button>
            </form>
          </div>
          {berita.length ? (
            <div className={styles.grid}>
              {berita.map((item) => {
                const image = mediaUrl(item.gambar, desa.id);
                const date = item.terbitPada ?? item.createdAt;
                return (
                  <article className={styles.card} key={item.id}>
                    <Link className={styles.cover} href={`/berita/${encodeURIComponent(item.slug)}`} aria-label={`Baca ${item.judul}`}>
                      {image ? <Image src={image} alt="" fill sizes="(max-width: 620px) 116px, (max-width: 850px) 50vw, 33vw" unoptimized /> : <span className={styles.coverFallback}>INFO DESA</span>}
                    </Link>
                    <div className={styles.cardBody}>
                      <div className={styles.meta}>
                        <span className={styles.category}>{item.kategori ?? "Informasi"}</span>
                        <time dateTime={date.toISOString()}>{tanggal(date)}</time>
                      </div>
                      <h2><Link href={`/berita/${encodeURIComponent(item.slug)}`}>{item.judul}</Link></h2>
                      <p className={styles.excerpt}>{item.ringkasan || "Baca informasi selengkapnya dari pemerintah desa."}</p>
                      <Link className={styles.readMore} href={`/berita/${encodeURIComponent(item.slug)}`}>Baca selengkapnya →</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              <strong>{q || kategori ? "Berita tidak ditemukan" : "Belum ada berita yang diterbitkan"}</strong>
              <p>{q || kategori ? "Coba ubah kata kunci atau pilih kategori lain." : "Informasi terbaru desa akan tampil di halaman ini."}</p>
            </div>
          )}
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
