import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { daftarFotoAlbum, detailAlbumGaleri } from "@/features/publik/application/konten-publik";

import styles from "../galeri.module.css";
import { GalleryShell } from "../gallery-shell";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const segments = value.split(/[\\/]/).filter(Boolean);
  if (
    segments.length === 0 ||
    segments.some((part) => part === "." || part === ".." || part.includes(".."))
  )
    return null;
  const path = segments[0] === String(villageId) ? segments : [String(villageId), ...segments];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}

export async function generateMetadata({ params }: Props) {
  const [{ slug }, desa] = await Promise.all([params, getIdentitasFromRequest()]);
  const album = await detailAlbumGaleri(desa.id, slug);
  return {
    title: album ? `${album.nama} | ${desa.namaDesa ?? "Galeri Desa"}` : "Album tidak ditemukan",
    description: album?.keterangan ?? "Dokumentasi kegiatan desa",
  };
}

export default async function DetailGaleriPage({ params }: Props) {
  const [{ slug }, desa] = await Promise.all([params, getIdentitasFromRequest()]);
  const album = await detailAlbumGaleri(desa.id, slug);
  if (!album) notFound();
  const photos = await daftarFotoAlbum(desa.id, album.id);
  return (
    <GalleryShell villageName={desa.namaDesa ?? "Pemerintah Desa"}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <Link href="/galeri">Galeri</Link>
            <span>/</span>
            <span>{album.nama}</span>
          </div>
          <p className={styles.kicker}>ALBUM DOKUMENTASI</p>
          <h1>{album.nama}</h1>
          <p>{album.keterangan || `Dokumentasi kegiatan di ${desa.namaDesa ?? "desa"}.`}</p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          <div className={styles.heading}>
            <div>
              <span className={styles.kicker}>FOTO KEGIATAN</span>
              <h2>{photos.length} foto</h2>
            </div>
            <Link className={styles.back} href="/galeri">
              ← Semua album
            </Link>
          </div>
          {photos.length ? (
            <div className={styles.photoGrid}>
              {photos.map((photo) => {
                const src = mediaUrl(photo.gambar, desa.id);
                return (
                  <figure className={styles.photo} key={photo.id}>
                    {src ? (
                      <Image
                        src={src}
                        alt={photo.judul || album.nama}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 33vw"
                        unoptimized
                      />
                    ) : null}
                    {photo.judul || photo.keterangan ? (
                      <figcaption>{photo.judul || photo.keterangan}</figcaption>
                    ) : null}
                  </figure>
                );
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              <span>▧</span>
              <h3>Belum ada foto di album ini</h3>
              <p>Foto akan muncul setelah ditambahkan dan dipublikasikan.</p>
            </div>
          )}
        </div>
      </section>
    </GalleryShell>
  );
}
