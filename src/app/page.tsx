import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { hostPlatform } from "@/features/desa/application/platform-host";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikDesa } from "@/features/desa/application/statistik-desa";
import { adalahHostPlatform } from "@/features/desa/domain/host";
import { bacaPengaturan } from "@/features/pengaturan/application/pengaturan-use-cases";
import {
  daftarAlbumGaleri,
  daftarBerita,
  daftarDokumenPublik,
  daftarFotoAlbum,
  daftarPerangkatPublik,
  daftarSliderBeranda,
  profilDesaPublik,
} from "@/features/publik/application/konten-publik";

import { PlatformLanding } from "./platform-landing";
import styles from "./public-home.module.css";
import { PublicSiteFooter, PublicSiteHeader } from "./public-site-layout";

export const dynamic = "force-dynamic";

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes("..")))
    return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}

function cleanText(value: string | null | undefined, limit = 320): string {
  return (value ?? "")
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
    .trim()
    .slice(0, limit);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function locationLabel(desa: {
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
}) {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function PublicHomePage() {
  if (adalahHostPlatform((await headers()).get("host"), hostPlatform)) return <PlatformLanding />;

  const desa = await getIdentitasFromRequest();
  const [pengaturan, profil, berita, slider, statistik, perangkat, albums, announcements] =
    await Promise.all([
      bacaPengaturan(desa.id),
      profilDesaPublik(desa.id),
      daftarBerita(desa.id, { limit: 12 }),
      daftarSliderBeranda(desa.id),
      getStatistikDesa(desa.id),
      daftarPerangkatPublik(desa.id),
      daftarAlbumGaleri(desa.id),
      daftarDokumenPublik(desa.id, "pengumuman"),
    ]);

  const galleryAlbum = albums.find((album) => album.jumlahFoto > 0) ?? null;
  const galleryPhotos = galleryAlbum ? await daftarFotoAlbum(desa.id, galleryAlbum.id) : [];
  const location = locationLabel(desa);
  const leader = perangkat.find((item) =>
    (item.jabatan ?? "").toLocaleLowerCase("id-ID").includes("kepala desa"),
  );
  const heroImage = mediaUrl(slider[0]?.gambar, desa.id);
  const profileImage = mediaUrl(slider[1]?.gambar ?? galleryPhotos[0]?.gambar, desa.id);
  const intro =
    cleanText(profil?.sambutan) ||
    `Selamat datang di portal resmi ${desa.namaDesa ?? "desa"}. Media informasi, layanan publik, dan keterbukaan data desa.`;
  const newsMain = berita[0];
  const newsSide = berita.slice(1, pengaturan.beritaBeranda);
  const gallery = galleryPhotos.slice(0, 5);
  const quickLinks = [
    {
      href: "/layanan/surat",
      icon: "▤",
      title: "Pengajuan Surat",
      description: "Layanan administrasi surat menyurat",
    },
    {
      href: "/kontak",
      icon: "◉",
      title: "Pengaduan",
      description: "Sampaikan aspirasi dan keluhan",
    },
    {
      href: "/statistik",
      icon: "▥",
      title: "Data Desa",
      description: "Data kependudukan dan potensi desa",
    },
    {
      href: "/transparansi/apbdes",
      icon: "▱",
      title: "APBDes",
      description: "Transparansi anggaran desa",
    },
    {
      href: "/agenda",
      icon: "▦",
      title: "Jadwal Kegiatan",
      description: "Agenda dan kegiatan pemerintah desa",
    },
    {
      href: "/layanan",
      icon: "♧",
      title: "Layanan Lainnya",
      description: "Lihat semua layanan desa",
    },
  ];

  return (
    <main className={styles.site}>
      <PublicSiteHeader
        desa={desa}
        location={location}
        logoUrl={mediaUrl(desa.logo, desa.id)}
        activePath="/"
      />

      <section className={styles.hero}>
        {heroImage ? (
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className={styles.heroImage}
          />
        ) : null}
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <div className={styles.leaderVisual}>
            {leader?.foto && mediaUrl(leader.foto, desa.id) ? (
              <Image
                src={mediaUrl(leader.foto, desa.id)!}
                alt={leader.nama}
                fill
                priority
                unoptimized
                sizes="(max-width: 700px) 40vw, 300px"
              />
            ) : (
              <div className={styles.leaderPlaceholder}>
                Foto Kepala Desa
                <br />
                <small>Belum tersedia</small>
              </div>
            )}
            {leader ? (
              <div className={styles.leaderCaption}>
                <strong>
                  {[leader.gelarDepan, leader.nama, leader.gelarBelakang].filter(Boolean).join(" ")}
                </strong>
                <span>{leader.jabatan}</span>
              </div>
            ) : null}
          </div>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>◉ Portal Resmi {desa.namaDesa ?? "Desa"}</span>
            <h1>
              Sistem Informasi Desa
              <br />
              {desa.namaDesa ?? "Desa Kami"}
            </h1>
            <p>
              Media informasi, layanan publik, dan keterbukaan data untuk masyarakat{" "}
              {desa.namaDesa ?? "desa"}.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/layanan/surat">
                ▤　Ajukan Surat Online
              </Link>
              <Link className={styles.secondaryButton} href="/profil">
                ▷　Lihat Profil Desa
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.container}>
        <nav className={styles.quickLinks} aria-label="Akses cepat">
          {quickLinks.map((item) => (
            <Link href={item.href} className={styles.quickLink} key={item.title}>
              <span className={styles.quickIcon}>{item.icon}</span>
              <span className={styles.quickText}>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
            </Link>
          ))}
        </nav>

        <section className={styles.introStats}>
          <article className={styles.welcomeCard}>
            <h2>
              <span>✓</span> Sambutan Kepala Desa
            </h2>
            <p className={styles.quoteMark}>“</p>
            <p>{intro}</p>
            {leader ? (
              <div className={styles.signature}>
                <strong>
                  {[leader.gelarDepan, leader.nama, leader.gelarBelakang].filter(Boolean).join(" ")}
                </strong>
                <small>{leader.jabatan}</small>
              </div>
            ) : null}
          </article>
          <article className={styles.statsCard}>
            <div className={styles.cardHeading}>
              <h2>▥　Statistik Desa</h2>
              <Link href="/statistik">Lihat Detail →</Link>
            </div>
            <div className={styles.statTiles}>
              <div>
                <span>♙</span>
                <strong>{formatNumber(statistik.total)}</strong>
                <small>Jumlah Penduduk</small>
              </div>
              <div>
                <span>⌂</span>
                <strong>{formatNumber(statistik.keluarga)}</strong>
                <small>Kepala Keluarga</small>
              </div>
              <div>
                <span>◎</span>
                <strong>{formatNumber(statistik.perDusun.length)}</strong>
                <small>Dusun</small>
              </div>
              <div>
                <span>⌖</span>
                <strong>
                  {formatNumber(statistik.perDusun.reduce((sum, row) => sum + row.total, 0))}
                </strong>
                <small>Warga terdata</small>
              </div>
            </div>
          </article>
        </section>

        <section className={styles.newsAnnouncements}>
          <article className={styles.newsPanel}>
            <div className={styles.cardHeading}>
              <div>
                <h2>▣　Berita Terbaru</h2>
                <small>Informasi dan kegiatan terbaru di {desa.namaDesa ?? "desa"}</small>
              </div>
              <Link href="/berita">Lihat Semua →</Link>
            </div>
            {newsMain ? (
              <div className={styles.newsFeature}>
                <Link
                  href={`/berita/${encodeURIComponent(newsMain.slug)}`}
                  className={styles.newsLeadImage}
                >
                  {mediaUrl(newsMain.gambar, desa.id) ? (
                    <Image
                      src={mediaUrl(newsMain.gambar, desa.id)!}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 700px) 100vw, 34vw"
                    />
                  ) : (
                    <span>BERITA DESA</span>
                  )}
                  <strong>{newsMain.judul}</strong>
                  <small>{dateLabel(newsMain.terbitPada ?? newsMain.createdAt)}</small>
                </Link>
                <div className={styles.newsSideList}>
                  {newsSide.map((item) => (
                    <Link href={`/berita/${encodeURIComponent(item.slug)}`} key={item.id}>
                      {mediaUrl(item.gambar, desa.id) ? (
                        <Image
                          src={mediaUrl(item.gambar, desa.id)!}
                          alt=""
                          width={66}
                          height={54}
                          unoptimized
                        />
                      ) : (
                        <span className={styles.thumbFallback}>▣</span>
                      )}
                      <span>
                        <strong>{item.judul}</strong>
                        <small>{dateLabel(item.terbitPada ?? item.createdAt)}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <p className={styles.empty}>Belum ada berita yang dipublikasikan.</p>
            )}
          </article>

          <article className={styles.announcementPanel}>
            <div className={styles.cardHeading}>
              <div>
                <h2>⚑　Pengumuman</h2>
                <small>Informasi resmi dari pemerintah desa</small>
              </div>
              <Link href="/pengumuman">Lihat Semua →</Link>
            </div>
            {announcements.length ? (
              announcements.slice(0, 3).map((item) => (
                <Link
                  className={styles.announcement}
                  href={item.tautan || "/pengumuman"}
                  key={item.id}
                >
                  <span>▤</span>
                  <span>
                    <strong>{item.nama}</strong>
                    <small>
                      {item.tahun ?? "Pengumuman resmi"}
                      {item.keterangan ? ` · ${item.keterangan}` : ""}
                    </small>
                  </span>
                </Link>
              ))
            ) : (
              <p className={styles.empty}>Belum ada pengumuman yang dipublikasikan.</p>
            )}
          </article>
        </section>

        <section className={styles.profileGallery}>
          <article className={styles.profileCard}>
            <div>
              <h2>⌂　Profil Desa</h2>
              <p>{cleanText(profil?.sejarah) || intro}</p>
              <Link href="/profil">Selengkapnya →</Link>
            </div>
            {profileImage ? (
              <Image
                src={profileImage}
                alt={`Dokumentasi ${desa.namaDesa ?? "desa"}`}
                width={440}
                height={260}
                unoptimized
              />
            ) : (
              <div className={styles.profileImageFallback}>
                Foto Desa
                <br />
                <small>Tambahkan foto pada galeri atau slider</small>
              </div>
            )}
          </article>
          <article className={styles.profileMenu}>
            <Link href="/visi-misi">
              <span>♡</span>
              <b>Visi & Misi</b>
              <small>Arah pembangunan {desa.namaDesa ?? "desa"}</small>
              <i>›</i>
            </Link>
            <Link href="/profil#potensi">
              <span>♧</span>
              <b>Potensi Desa</b>
              <small>Potensi unggulan dan ekonomi desa</small>
              <i>›</i>
            </Link>
            <Link href="/pemerintahan">
              <span>♙</span>
              <b>Struktur Pemerintahan</b>
              <small>Susunan perangkat dan lembaga desa</small>
              <i>›</i>
            </Link>
          </article>
        </section>

        <section className={styles.galleryPanel}>
          <div className={styles.cardHeading}>
            <div>
              <h2>▧　Galeri Kegiatan Desa</h2>
              <small>Dokumentasi kegiatan dan pembangunan di {desa.namaDesa ?? "desa"}</small>
            </div>
            <Link href="/galeri">Lihat Galeri →</Link>
          </div>
          {gallery.length ? (
            <div className={styles.galleryGrid}>
              {gallery.map((photo) => (
                <Link href={`/galeri/${encodeURIComponent(galleryAlbum!.slug)}`} key={photo.id}>
                  <Image
                    src={mediaUrl(photo.gambar, desa.id)!}
                    alt={photo.judul || photo.keterangan || "Dokumentasi kegiatan desa"}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 50vw, 20vw"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>Belum ada foto galeri yang dipublikasikan.</p>
          )}
        </section>

        <section className={styles.serviceBanner}>
          <div className={styles.bannerIllustration}>
            <Image src="/images/home-service-illustration.svg" alt="" width={100} height={72} />
          </div>
          <div className={styles.bannerCopy}>
            <strong>
              Urus Administrasi Desa
              <br />
              Kini Lebih Mudah & Cepat
            </strong>
            <small>
              Ajukan berbagai surat secara online, pantau prosesnya, dan ambil di kantor desa tanpa
              antre.
            </small>
          </div>
          <div className={styles.bannerSteps}>
            <span>
              ▤<small>Ajukan Permohonan</small>
            </span>
            <b>→</b>
            <span>
              ⌛<small>Proses & Verifikasi</small>
            </span>
            <b>→</b>
            <span>
              ♧<small>Dapatkan Notifikasi</small>
            </span>
            <b>→</b>
            <span>
              ✓<small>Ambil Dokumen</small>
            </span>
          </div>
          <Link href="/layanan/surat">Mulai Sekarang →</Link>
        </section>

        <section className={styles.relatedLinks}>
          <h2>— Tautan Terkait</h2>
          <div>
            <a href="https://batubarakab.go.id" target="_blank" rel="noreferrer">
              🏛　Kabupaten Batu Bara <small>batubarakab.go.id</small>
            </a>
            <a href="https://kemendesa.go.id" target="_blank" rel="noreferrer">
              🏢　Kementerian Desa <small>kemendesa.go.id</small>
            </a>
            <a href="https://sdgs.kemendesa.go.id" target="_blank" rel="noreferrer">
              🌐　SDGs Desa <small>sdgs.kemendesa.go.id</small>
            </a>
          </div>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={mediaUrl(desa.logo, desa.id)} />
    </main>
  );
}
