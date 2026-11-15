import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { daftarAlbumGaleri } from "@/features/publik/application/konten-publik";

import styles from "./galeri.module.css";
import { GalleryShell } from "./gallery-shell";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const segments = value.split(/[\\/]/).filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((part) => part === "." || part === ".." || part.includes(".."))
  ) {
    return null;
  }
  const path = segments[0] === String(villageId) ? segments : [String(villageId), ...segments];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}

export default async function GaleriPage({ searchParams }: Props) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  const query = (params.q ?? "").trim().slice(0, 80);
  const albums = await daftarAlbumGaleri(desa.id, query || undefined);
  const totalFoto = albums.reduce((total, album) => total + album.jumlahFoto, 0);

  return (
    <GalleryShell villageName={desa.namaDesa ?? "Pemerintah Desa"}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <span>Galeri</span>
          </div>
          <p className={styles.kicker}>MOMEN &amp; CERITA DESA</p>
          <h1>Galeri {desa.namaDesa ?? "Desa"}</h1>
          <p>
            Dokumentasi kegiatan, pembangunan, dan kebersamaan warga {desa.namaDesa ?? "desa"} yang
            telah dipublikasikan.
          </p>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.container}>
          <div className={styles.galleryLayout}>
            <div className={styles.galleryMain}>
              <section className={styles.gallerySection}>
                <div className={styles.sectionHeading}>
                  <div>
                    <p className={styles.kicker}>DOKUMENTASI DESA</p>
                    <h2>Album kegiatan desa</h2>
                    <p>Kumpulan dokumentasi yang telah dipublikasikan oleh pemerintah desa.</p>
                  </div>
                  <span>{albums.length} album</span>
                </div>

                <form className={styles.gallerySearch} action="/galeri" method="get">
                  <label htmlFor="gallery-search">Cari album galeri</label>
                  <div>
                    <input
                      id="gallery-search"
                      type="search"
                      name="q"
                      placeholder="Masukkan nama atau keterangan album..."
                      defaultValue={query}
                    />
                    <button type="submit">Cari galeri</button>
                  </div>
                </form>

                {albums.length ? (
                  <div className={styles.grid}>
                    {albums.map((album) => {
                      const cover = mediaUrl(album.sampul, desa.id);
                      return (
                        <Link
                          className={styles.card}
                          href={`/galeri/${encodeURIComponent(album.slug)}`}
                          key={album.id}
                        >
                          <div className={styles.cover}>
                            {cover ? (
                              <Image
                                src={cover}
                                alt={album.nama}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
                                unoptimized
                              />
                            ) : (
                              <span aria-hidden="true">▧</span>
                            )}
                            <b>{album.jumlahFoto} foto</b>
                          </div>
                          <div className={styles.cardBody}>
                            <h3>{album.nama}</h3>
                            <p>{album.keterangan || "Dokumentasi kegiatan dan aktivitas desa."}</p>
                            <span>
                              Lihat album <i>→</i>
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.empty}>
                    <span>▧</span>
                    <h3>{query ? "Album tidak ditemukan" : "Galeri belum tersedia"}</h3>
                    <p>
                      {query
                        ? "Coba gunakan kata kunci lain untuk mencari album."
                        : "Foto kegiatan desa akan ditampilkan setelah dipublikasikan."}
                    </p>
                    {query ? <Link href="/galeri">Hapus pencarian →</Link> : null}
                  </div>
                )}
              </section>
            </div>

            <aside className={styles.galleryAside}>
              <section className={styles.asideCard}>
                <h2>Ringkasan galeri</h2>
                <div className={styles.galleryStats}>
                  <div>
                    <strong>{albums.length}</strong>
                    <span>Album tersedia</span>
                  </div>
                  <div>
                    <strong>{totalFoto}</strong>
                    <span>Foto dalam hasil</span>
                  </div>
                </div>
              </section>

              <section className={styles.galleryCallout}>
                <span aria-hidden="true">▧</span>
                <h2>Kenangan dan kegiatan desa</h2>
                <p>
                  Jelajahi album untuk melihat dokumentasi yang telah dibagikan kepada masyarakat.
                </p>
                <Link href="/kontak">Hubungi pemerintah desa</Link>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </GalleryShell>
  );
}
