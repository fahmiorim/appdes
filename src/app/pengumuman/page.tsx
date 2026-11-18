import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { daftarBerita, daftarKategoriBerita } from "@/features/publik/application/konten-publik";

import styles from "./pengumuman.module.css";

export const dynamic = "force-dynamic";

/**
 * Tanggal publik selalu diformat dalam zona waktu Indonesia Barat.
 * Tanpa `timeZone` eksplisit, hasil bergantung pada TZ server (UTC di CI),
 * sehingga pengumuman yang terbit dini hari bisa tampil dengan tanggal mundur.
 */
const ZONA_WAKTU = "Asia/Jakarta";

type Props = {
  searchParams: Promise<{ q?: string }>;
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
    timeZone: ZONA_WAKTU,
  }).format(value);
}

export async function generateMetadata() {
  const desa = await getIdentitasFromRequest();

  return {
    title: `Pengumuman | ${desa.namaDesa ?? "Pemerintah Desa"}`,
    description: `Pengumuman resmi dan informasi penting dari ${desa.namaDesa ?? "pemerintah desa"}.`,
  };
}

export default async function PengumumanPage({ searchParams }: Props) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  const kategori = await daftarKategoriBerita(desa.id);
  const q = params.q?.trim().slice(0, 100) ?? "";
  const kategoriPengumuman = kategori.find((item) => item.slug === "pengumuman");
  const pengumuman = kategoriPengumuman
    ? await daftarBerita(desa.id, {
        limit: 60,
        kategoriSlug: kategoriPengumuman.slug,
        cari: q || undefined,
      })
    : [];

  const [utama, ...lainnya] = pengumuman;
  const lokasi = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi]
    .filter(Boolean)
    .join(", ");

  return (
    <main className={styles.site}>
      <div className={styles.topline}>
        <div className={`${styles.container} ${styles.toplineInner}`}>
          <span>Website Resmi Pemerintah Desa</span>
          <span>{lokasi || "Portal Informasi Desa"}</span>
        </div>
      </div>

      <header className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <Link href="/" className={styles.brand} aria-label={`Beranda ${desa.namaDesa ?? "desa"}`}>
            {desa.logo ? (
              <Image
                src={mediaUrl(desa.logo, desa.id) ?? "/images/logo.png"}
                alt=""
                width={46}
                height={46}
                className={styles.logo}
                unoptimized
              />
            ) : (
              <span className={styles.logoFallback} aria-hidden="true">
                D
              </span>
            )}
            <span className={styles.brandCopy}>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <small>
                {desa.namaKabupaten ? `Kabupaten ${desa.namaKabupaten}` : "Sistem Informasi Desa"}
              </small>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Navigasi utama">
            <Link href="/">Beranda</Link>
            <Link href="/profil">Profil Desa</Link>
            <Link href="/berita">Berita</Link>
            <Link href="/pengumuman" aria-current="page">
              Pengumuman
            </Link>
          </nav>

          <Link href="/masuk" className={styles.login}>
            Masuk <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>/</span>
            <span>Informasi</span>
            <span>/</span>
            <span aria-current="page">Pengumuman</span>
          </nav>

          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>PUSAT INFORMASI RESMI</span>
            <h1>Pengumuman Desa</h1>
            <p>
              Informasi penting, pemberitahuan, dan agenda resmi yang disampaikan oleh Pemerintah{" "}
              {desa.namaDesa ?? "Desa"}.
            </p>
            {lokasi ? <span className={styles.location}>⌖ {lokasi}</span> : null}
          </div>

          <div className={styles.heroStamp} aria-hidden="true">
            <span>INFO</span>
            <strong>DESA</strong>
            <i>RESMI</i>
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.container}>
          <div className={styles.sectionIntro}>
            <div>
              <span className={styles.kicker}>PENGUMUMAN TERBARU</span>
              <h2>Informasi untuk masyarakat</h2>
              <p>Pengumuman yang telah diterbitkan dan dapat dibaca oleh masyarakat.</p>
            </div>

            <form className={styles.search} action="/pengumuman" method="get">
              <label className={styles.srOnly} htmlFor="announcement-search">
                Cari pengumuman
              </label>
              <input
                id="announcement-search"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Cari pengumuman..."
              />
              <button type="submit">Cari</button>
            </form>
          </div>

          {utama ? (
            <article className={styles.featured}>
              <div className={styles.featuredCopy}>
                <span className={styles.noticeLabel}>
                  <i /> Pengumuman terbaru
                </span>
                <time dateTime={(utama.terbitPada ?? utama.createdAt).toISOString()}>
                  {tanggal(utama.terbitPada ?? utama.createdAt)}
                </time>
                <h2>{utama.judul}</h2>
                <p>
                  {utama.ringkasan ||
                    "Buka pengumuman untuk membaca informasi selengkapnya dari pemerintah desa."}
                </p>
                <Link
                  href={`/berita/${encodeURIComponent(utama.slug)}`}
                  className={styles.primaryLink}
                >
                  Baca pengumuman <span aria-hidden="true">→</span>
                </Link>
              </div>

              <div className={styles.featuredMedia}>
                {utama.gambar && mediaUrl(utama.gambar, desa.id) ? (
                  <Image
                    src={mediaUrl(utama.gambar, desa.id)!}
                    alt=""
                    fill
                    sizes="(max-width: 760px) 100vw, 48vw"
                    unoptimized
                  />
                ) : (
                  <div className={styles.mediaFallback}>
                    <span>INFORMASI</span>
                    <strong>DESA</strong>
                  </div>
                )}
              </div>
            </article>
          ) : null}

          {lainnya.length > 0 ? (
            <div className={styles.listSection}>
              <div className={styles.listHeading}>
                <div>
                  <span className={styles.kicker}>ARSIP INFORMASI</span>
                  <h2>Pengumuman lainnya</h2>
                </div>
                <span>{pengumuman.length} pengumuman</span>
              </div>

              <div className={styles.list}>
                {lainnya.map((item) => {
                  const date = item.terbitPada ?? item.createdAt;

                  return (
                    <article className={styles.item} key={item.id}>
                      <div className={styles.dateTile}>
                        <strong>
                          {new Intl.DateTimeFormat("id-ID", {
                            day: "2-digit",
                            timeZone: ZONA_WAKTU,
                          }).format(date)}
                        </strong>
                        <span>
                          {new Intl.DateTimeFormat("id-ID", {
                            month: "short",
                            year: "numeric",
                            timeZone: ZONA_WAKTU,
                          }).format(date)}
                        </span>
                      </div>

                      <div className={styles.itemCopy}>
                        <time dateTime={date.toISOString()}>{tanggal(date)}</time>
                        <h3>
                          <Link href={`/berita/${encodeURIComponent(item.slug)}`}>
                            {item.judul}
                          </Link>
                        </h3>
                        <p>
                          {item.ringkasan || "Baca informasi selengkapnya pada halaman pengumuman."}
                        </p>
                      </div>

                      <Link
                        href={`/berita/${encodeURIComponent(item.slug)}`}
                        className={styles.itemArrow}
                        aria-label={`Baca ${item.judul}`}
                      >
                        →
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.emptyIcon} aria-hidden="true">
                i
              </span>
              <h2>{q ? "Pengumuman tidak ditemukan" : "Belum ada pengumuman"}</h2>
              <p>
                {q
                  ? "Coba gunakan kata kunci lain."
                  : kategoriPengumuman
                    ? "Pengumuman resmi akan ditampilkan di sini setelah diterbitkan."
                    : "Kategori berita dengan slug “pengumuman” belum tersedia. Tambahkan kategori tersebut dan terbitkan kontennya melalui pengelolaan berita."}
              </p>
              {q ? <Link href="/pengumuman">Hapus pencarian</Link> : null}
            </div>
          )}

          <div className={styles.bottomNav}>
            <Link href="/berita">← Lihat berita desa</Link>
            <Link href="/agenda">Lihat agenda kegiatan →</Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div>
            <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
            <span>Portal informasi resmi desa</span>
          </div>
          <span>
            © {new Date().getFullYear()} {desa.namaDesa ?? "Pemerintah Desa"}
          </span>
          <Link href="/">Kembali ke beranda ↑</Link>
        </div>
      </footer>
    </main>
  );
}
