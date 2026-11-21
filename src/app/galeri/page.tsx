import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import {
  daftarAlbumGaleri,
  daftarFotoAlbum,
  daftarVideoGaleriPublik,
} from "@/features/publik/application/konten-publik";

import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import styles from "./galeri.module.css";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string; tipe?: string; kategori?: string }> };

function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const segments = value.split(/[\\/]/).filter(Boolean);
  if (
    !segments.length ||
    segments.some((part) => part === "." || part === ".." || part.includes(".."))
  )
    return null;
  const path = segments[0] === String(villageId) ? segments : [String(villageId), ...segments];
  return "/api/publik/media/" + path.map(encodeURIComponent).join("/");
}
function locationLabel(desa: {
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
}) {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}
function dateLabel(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function GaleriPage({ searchParams }: Props) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  const query = (params.q ?? "").trim().slice(0, 80);
  const type =
    params.tipe === "foto" || params.tipe === "album" || params.tipe === "video"
      ? params.tipe
      : "semua";
  const [allAlbums, videos] = await Promise.all([
    daftarAlbumGaleri(desa.id, query || undefined),
    daftarVideoGaleriPublik(desa.id, 8),
  ]);
  const category = (params.kategori ?? "").trim().slice(0, 80);
  const albums = category ? allAlbums.filter((album) => album.kategori === category) : allAlbums;
  const categoryRows = [
    ...new Set(
      allAlbums.map((album) => album.kategori).filter((value): value is string => Boolean(value)),
    ),
  ].map((name) => ({
    name,
    count: allAlbums.filter((album) => album.kategori === name).length,
  }));
  const photoAlbums = albums.filter((album) => album.jumlahFoto > 0);
  const photoRows = await Promise.all(
    photoAlbums
      .slice(0, 12)
      .map(async (album) => ({ album, photos: await daftarFotoAlbum(desa.id, album.id) })),
  );
  const photos = photoRows
    .flatMap(({ album, photos }) =>
      photos.map((photo) => ({ ...photo, albumSlug: album.slug, albumNama: album.nama })),
    )
    .slice(0, 12);
  const totalFoto = albums.reduce((sum, album) => sum + album.jumlahFoto, 0);
  const logoUrl = desa.logo ? mediaUrl(desa.logo, desa.id) : null;
  const location = locationLabel(desa);
  const heroAlbum = albums.find((album) => mediaUrl(album.sampul, desa.id)) ?? albums[0] ?? null;
  const heroCover = heroAlbum ? mediaUrl(heroAlbum.sampul, desa.id) : null;

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/galeri" />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>›</span>
            <span>Galeri</span>
          </nav>
          <h1>Galeri Desa</h1>
          <p>Dokumentasi kegiatan, pembangunan, dan potensi {desa.namaDesa ?? "desa"}.</p>
          {heroCover ? (
            <div className={styles.heroImage}>
              <Image
                src={heroCover}
                alt=""
                fill
                sizes="(max-width: 700px) 35vw, 280px"
                unoptimized
              />
            </div>
          ) : (
            <div className={styles.heroIcon}>▧</div>
          )}
        </div>
      </section>
      <div className={styles.container}>
        <nav className={styles.tabs} aria-label="Jenis galeri">
          <Link href="/galeri" aria-current={type === "semua" ? "page" : undefined}>
            ▧　Semua Galeri
          </Link>
          <Link href="/galeri?tipe=foto" aria-current={type === "foto" ? "page" : undefined}>
            ▣　Foto
          </Link>
          <Link href="/galeri?tipe=video" aria-current={type === "video" ? "page" : undefined}>
            ▷　Video
          </Link>
          <Link href="/galeri?tipe=album" aria-current={type === "album" ? "page" : undefined}>
            ▱　Album
          </Link>
        </nav>
        <div className={styles.layout}>
          <div className={styles.main}>
            {type === "video" ? (
              <section className={styles.panel}>
                <div className={styles.sectionHeading}>
                  <div>
                    <h2>▷　Video Kegiatan</h2>
                    <p>Video kegiatan yang dipublikasikan oleh pemerintah desa.</p>
                  </div>
                  <span>{videos.length} Video</span>
                </div>
                {videos.length ? (
                  <div className={styles.videoGrid}>
                    {videos.map((video) => (
                      <article className={styles.videoCard} key={video.id}>
                        <iframe
                          src={video.url}
                          title={video.judul}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                        <h3>{video.judul}</h3>
                        <p>{video.keterangan ?? "Video kegiatan desa."}</p>
                        {video.publishedAt ? <small>{dateLabel(video.publishedAt)}</small> : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.empty}>
                    <span>▷</span>
                    <h3>Video belum tersedia</h3>
                    <p>
                      Video akan ditampilkan setelah ditambahkan dan dipublikasikan melalui Admin
                      Desa.
                    </p>
                  </div>
                )}
              </section>
            ) : null}
            {type !== "foto" && type !== "video" ? (
              <section className={styles.panel}>
                <div className={styles.sectionHeading}>
                  <div>
                    <h2>▱　Album Kegiatan Desa</h2>
                    <p>Kumpulan dokumentasi kegiatan dan program di {desa.namaDesa ?? "desa"}.</p>
                  </div>
                  <span>{albums.length} Album</span>
                </div>
                {albums.length ? (
                  <div className={styles.albumGrid}>
                    {albums.slice(0, 8).map((album) => {
                      const cover = mediaUrl(album.sampul, desa.id);
                      return (
                        <Link
                          className={styles.albumCard}
                          href={"/galeri/" + encodeURIComponent(album.slug)}
                          key={album.id}
                        >
                          <div className={styles.albumCover}>
                            {cover ? (
                              <Image
                                src={cover}
                                alt={album.nama}
                                fill
                                sizes="(max-width: 680px) 45vw, 180px"
                                unoptimized
                              />
                            ) : (
                              <span>▧</span>
                            )}
                            <b>▣ {album.jumlahFoto} Foto</b>
                          </div>
                          <h3>{album.nama}</h3>
                          <small>
                            {album.publishedAt
                              ? dateLabel(album.publishedAt)
                              : "Tanggal belum diatur"}
                          </small>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.empty}>
                    <span>▧</span>
                    <h3>{query ? "Album tidak ditemukan" : "Album belum tersedia"}</h3>
                    <p>
                      Album akan ditampilkan setelah dibuat dan dipublikasikan oleh pengelola desa.
                    </p>
                  </div>
                )}
              </section>
            ) : null}
            {type !== "album" && type !== "video" ? (
              <section className={styles.panel}>
                <div className={styles.sectionHeading}>
                  <div>
                    <h2>▧　Foto Terbaru</h2>
                    <p>Dokumentasi foto dari album yang dipublikasikan.</p>
                  </div>
                  <span>{totalFoto} Foto</span>
                </div>
                {photos.length ? (
                  <div className={styles.photoGrid}>
                    {photos.map((photo) => {
                      const src = mediaUrl(photo.gambar, desa.id);
                      return (
                        <Link
                          href={"/galeri/" + encodeURIComponent(photo.albumSlug)}
                          className={styles.photo}
                          key={photo.id}
                        >
                          {src ? (
                            <Image
                              src={src}
                              alt={photo.judul || photo.albumNama}
                              fill
                              sizes="(max-width: 680px) 45vw, 220px"
                              unoptimized
                            />
                          ) : (
                            <span>▧</span>
                          )}
                          <b>{photo.judul || photo.albumNama}</b>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.empty}>
                    <span>▧</span>
                    <h3>Foto belum tersedia</h3>
                    <p>
                      Foto kegiatan akan tampil di sini setelah diunggah dan diaktifkan pada album.
                    </p>
                  </div>
                )}
              </section>
            ) : null}
          </div>
          <aside className={styles.aside}>
            <section className={styles.sideCard}>
              <h2>⌕　Cari di Galeri</h2>
              <form action="/galeri" method="get">
                <input
                  type="search"
                  name="q"
                  placeholder="Masukkan kata kunci..."
                  defaultValue={query}
                />
                <button type="submit" aria-label="Cari galeri">
                  ⌕
                </button>
              </form>
            </section>
            <section className={styles.sideCard}>
              <h2>▱　Kategori Galeri</h2>
              <div className={styles.categoryList}>
                <Link href="/galeri">
                  <span>▧</span>
                  <strong>Semua Galeri</strong>
                  <b>{allAlbums.length}</b>
                </Link>
                {categoryRows.map((row) => (
                  <Link href={"/galeri?kategori=" + encodeURIComponent(row.name)} key={row.name}>
                    <span>▱</span>
                    <strong>{row.name}</strong>
                    <b>{row.count}</b>
                  </Link>
                ))}
              </div>
              <p className={styles.categoryNote}>Kategori dikelola oleh Admin Desa.</p>
            </section>
            <section className={styles.sideCard}>
              <h2>▣　Video Kegiatan</h2>
              {videos.length ? (
                <div className={styles.videoSide}>
                  {videos.slice(0, 3).map((video) => (
                    <a href={video.url} target="_blank" rel="noreferrer" key={video.id}>
                      <span>▷</span>
                      <strong>{video.judul}</strong>
                      <small>{video.provider.toUpperCase()}</small>
                    </a>
                  ))}
                </div>
              ) : (
                <div className={styles.videoEmpty}>
                  <span>▷</span>
                  <strong>Belum ada video</strong>
                  <p>Video akan muncul setelah diterbitkan oleh Admin Desa.</p>
                </div>
              )}
            </section>
          </aside>
        </div>
        <section className={styles.banner}>
          <span>▧</span>
          <div>
            <h2>Jelajahi Dokumentasi Pembangunan dan Kegiatan Desa</h2>
            <p>
              Lihat berbagai dokumentasi foto kegiatan masyarakat, program pembangunan, serta
              potensi {desa.namaDesa ?? "desa"}.
            </p>
          </div>
          <Link href="/galeri">▧　Lihat Semua Galeri　→</Link>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
