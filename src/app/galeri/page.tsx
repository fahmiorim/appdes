import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { daftarAlbumGaleri } from "@/features/publik/application/konten-publik";

import styles from "./galeri.module.css";

export const dynamic = "force-dynamic";

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

export default async function GaleriPage() {
  const desa = await getIdentitasFromRequest();
  const albums = await daftarAlbumGaleri(desa.id);
  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}>
            <Image src="/images/flexidesa-mark.svg" alt="" width={42} height={42} />
            <span>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <small>Galeri Desa</small>
            </span>
          </Link>
          <nav aria-label="Navigasi utama">
            <Link href="/">Beranda</Link>
            <Link href="/profil">Profil Desa</Link>
            <Link href="/berita">Berita</Link>
            <Link href="/agenda">Agenda</Link>
          </nav>
          <Link href="/masuk" className={styles.login}>
            Masuk ↗
          </Link>
        </div>
      </header>
      <section className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.kicker}>MOMEN & CERITA DESA</p>
          <h1>Galeri {desa.namaDesa ?? "Desa"}</h1>
          <p>Dokumentasi kegiatan, kebersamaan warga, dan perkembangan desa dalam bingkai foto.</p>
          <div className={styles.breadcrumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <span>Galeri</span>
          </div>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          <div className={styles.heading}>
            <div>
              <span className={styles.kicker}>DOKUMENTASI</span>
              <h2>Album kegiatan</h2>
              <p>{albums.length} album tersedia</p>
            </div>
          </div>
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
                        <span aria-hidden="true">FD</span>
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
              <h3>Galeri belum tersedia</h3>
              <p>Foto kegiatan desa akan ditampilkan setelah dipublikasikan.</p>
              <Link href="/">Kembali ke beranda →</Link>
            </div>
          )}
        </div>
      </section>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
          <span>© {new Date().getFullYear()} · Didukung FlexiDesa</span>
        </div>
      </footer>
    </main>
  );
}
