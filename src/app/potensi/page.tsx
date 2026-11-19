import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import {
  daftarAlbumGaleri,
  daftarFotoAlbum,
  daftarPotensiDesa,
} from "@/features/publik/application/konten-publik";

import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import styles from "./potensi.module.css";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ kategori?: string }> };

const categories = [
  { id: "pertanian", label: "Pertanian", icon: "♧", color: "green" },
  { id: "perkebunan", label: "Perkebunan", icon: "♣", color: "green" },
  { id: "peternakan", label: "Peternakan", icon: "♧", color: "orange" },
  { id: "perikanan", label: "Perikanan", icon: "♧", color: "blue" },
  { id: "umkm", label: "UMKM", icon: "▤", color: "pink" },
  { id: "wisata", label: "Wisata Desa", icon: "▧", color: "purple" },
] as const;

function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes("..")))
    return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return "/api/publik/media/" + path.map(encodeURIComponent).join("/");
}
function locationLabel(desa: {
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
}) {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}
function categoryName(id: string) {
  return categories.find((item) => item.id === id)?.label ?? id;
}

export default async function PotensiPage({ searchParams }: Props) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  const [potensi, albums] = await Promise.all([
    daftarPotensiDesa(desa.id),
    daftarAlbumGaleri(desa.id),
  ]);
  const selected = categories.some((item) => item.id === params.kategori)
    ? params.kategori!
    : (categories.find((item) => potensi.some((p) => p.kategori === item.id && p.unggulan))?.id ??
      categories[0].id);
  const featured = potensi.filter((item) => item.kategori === selected && item.unggulan);
  const selectedItems = featured.length
    ? featured
    : potensi.filter((item) => item.kategori === selected);
  const gallery = (
    await Promise.all(
      albums
        .slice(0, 8)
        .map(async (album) => ({ album, photos: await daftarFotoAlbum(desa.id, album.id) })),
    )
  )
    .flatMap(({ album, photos }) => photos.slice(0, 2).map((photo) => ({ ...photo, album })))
    .slice(0, 6);
  const logoUrl = mediaUrl(desa.logo, desa.id);
  const location = locationLabel(desa);
  const heroImages = potensi.filter((item) => item.gambar).slice(0, 3);

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/profil" />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>›</span>
            <Link href="/profil">Profil Desa</Link>
            <span>›</span>
            <span>Potensi Desa</span>
          </nav>
          <h1>Potensi Desa</h1>
          <p>
            Berbagai potensi unggulan {desa.namaDesa ?? "desa"} yang menjadi kekuatan ekonomi dan
            kesejahteraan masyarakat.
          </p>
          <div className={styles.heroCollage}>
            {heroImages.map((item) => {
              const src = mediaUrl(item.gambar, desa.id);
              return src ? (
                <div key={item.id}>
                  <Image
                    src={src}
                    alt={item.judul}
                    fill
                    sizes="(max-width: 700px) 22vw, 180px"
                    unoptimized
                  />
                </div>
              ) : null;
            })}
          </div>
        </div>
      </section>
      <div className={styles.container}>
        <nav className={styles.profileTabs} aria-label="Navigasi profil desa">
          <Link href="/sejarah">♧　Sejarah Desa</Link>
          <Link href="/visi-misi">◎　Visi &amp; Misi</Link>
          <Link href="/wilayah">⌖　Wilayah Desa</Link>
          <span>♧　Potensi Desa</span>
        </nav>
        <section className={styles.panel}>
          <div className={styles.sectionTitle}>
            <span>♧</span>
            <div>
              <h2>Gambaran Potensi Desa</h2>
              <p>
                Sektor-sektor unggulan yang memiliki nilai ekonomi dan berpotensi dikembangkan di{" "}
                {desa.namaDesa ?? "desa"}.
              </p>
            </div>
          </div>
          <div className={styles.categoryGrid}>
            {categories.map((category) => {
              const items = potensi.filter((item) => item.kategori === category.id);
              const cover = items.find((item) => item.gambar);
              const src = cover ? mediaUrl(cover.gambar, desa.id) : null;
              return (
                <Link
                  className={styles.categoryCard}
                  href={"/potensi?kategori=" + category.id}
                  key={category.id}
                >
                  <div className={styles.categoryImage}>
                    {src ? (
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="(max-width: 700px) 45vw, 300px"
                        unoptimized
                      />
                    ) : (
                      <span>{category.icon}</span>
                    )}
                  </div>
                  <div className={styles.categoryInfo}>
                    <b className={styles[category.color]}>{category.icon}</b>
                    <div>
                      <strong>{category.label}</strong>
                      <small>
                        {items.length
                          ? items.length + " potensi dipublikasikan"
                          : "Belum ada data potensi"}
                      </small>
                    </div>
                    <i>→</i>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        <div className={styles.detailLayout}>
          <section className={styles.panel}>
            <div className={styles.sectionTitle}>
              <span>▥</span>
              <div>
                <h2>Potensi Unggulan Desa</h2>
                <p>
                  Detail potensi utama {desa.namaDesa ?? "desa"} yang memiliki nilai ekonomi tinggi.
                </p>
              </div>
            </div>
            <nav className={styles.categoryTabs} aria-label="Pilih kategori potensi">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={"/potensi?kategori=" + category.id}
                  aria-current={selected === category.id ? "page" : undefined}
                >
                  {category.icon}　{category.label}
                </Link>
              ))}
            </nav>
            {selectedItems.length ? (
              <div className={styles.featureList}>
                {selectedItems.map((item) => {
                  const src = mediaUrl(item.gambar, desa.id);
                  return (
                    <article className={styles.featured} key={item.id}>
                      <div className={styles.featureImage}>
                        {src ? (
                          <Image
                            src={src}
                            alt={item.judul}
                            fill
                            sizes="(max-width: 700px) 90vw, 280px"
                            unoptimized
                          />
                        ) : (
                          <span>{categoryName(item.kategori)}</span>
                        )}
                      </div>
                      <div className={styles.featureText}>
                        <h3>{item.judul}</h3>
                        {item.ringkasan ? <p>{item.ringkasan}</p> : null}
                        {item.deskripsi ? <p>{item.deskripsi}</p> : null}
                        {item.lokasi ? <small>⌖ {item.lokasi}</small> : null}
                        {item.indikator.length ? (
                          <div className={styles.metrics}>
                            {item.indikator.map((metric) => (
                              <div key={metric.id}>
                                <strong>{metric.nilai}</strong>
                                <span>{metric.label}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}>
                <strong>Data {categoryName(selected)} belum tersedia</strong>
                <p>
                  Potensi akan ditampilkan setelah ditambahkan dan dipublikasikan melalui Admin
                  Desa.
                </p>
              </div>
            )}
          </section>
          <aside className={styles.panel}>
            <div className={styles.sectionTitle}>
              <span>◷</span>
              <div>
                <h2>Data Potensi Desa</h2>
                <p>Ringkasan data yang telah dipublikasikan.</p>
              </div>
            </div>
            <div className={styles.summaryList}>
              {categories.map((category) => {
                const items = potensi.filter((item) => item.kategori === category.id);
                const metric = items.flatMap((item) => item.indikator).slice(0, 1)[0];
                return (
                  <Link href={"/potensi?kategori=" + category.id} key={category.id}>
                    <b className={styles[category.color]}>{category.icon}</b>
                    <strong>{category.label}</strong>
                    <span>
                      {metric ? metric.nilai : items.length ? items.length + " Potensi" : "—"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </aside>
        </div>
        <section className={styles.panel}>
          <div className={styles.sectionTitle}>
            <span>▧</span>
            <div>
              <h2>Galeri Potensi Desa</h2>
              <p>Dokumentasi kegiatan dan hasil potensi desa.</p>
            </div>
            <Link href="/galeri">Lihat Semua Galeri　→</Link>
          </div>
          {gallery.length ? (
            <div className={styles.gallery}>
              {gallery.map((item) => {
                const src = mediaUrl(item.gambar, desa.id);
                return src ? (
                  <Link href={"/galeri/" + encodeURIComponent(item.album.slug)} key={item.id}>
                    <Image
                      src={src}
                      alt={item.judul ?? item.album.nama}
                      fill
                      sizes="(max-width: 700px) 30vw, 180px"
                      unoptimized
                    />
                  </Link>
                ) : null;
              })}
            </div>
          ) : (
            <div className={styles.empty}>
              <strong>Dokumentasi potensi belum tersedia</strong>
              <p>Foto akan tampil setelah album dan foto dipublikasikan di Galeri Desa.</p>
            </div>
          )}
        </section>
        <section className={styles.cta}>
          <span>↗</span>
          <div>
            <h2>Mari Kembangkan Potensi Desa Bersama</h2>
            <p>
              Dukung pemanfaatan potensi lokal untuk meningkatkan ekonomi dan kesejahteraan
              masyarakat {desa.namaDesa ?? "desa"}.
            </p>
          </div>
          <Link href="/kontak">Hubungi Pemerintah Desa　→</Link>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
