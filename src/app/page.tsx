import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";

import { agendaMendatang } from "@/features/agenda/application/agenda-use-cases";
import { agendaTanggalPanjang } from "@/features/agenda/domain/agenda";
import { hostPlatform } from "@/features/desa/application/platform-host";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikDesa } from "@/features/desa/application/statistik-desa";
import { adalahHostPlatform } from "@/features/desa/domain/host";
import {
  daftarBerita,
  daftarSliderBeranda,
  profilDesaPublik,
} from "@/features/publik/application/konten-publik";

import { PlatformLanding } from "./platform-landing";
import { PublicSiteFooter, PublicSiteHeader } from "./public-site-layout";
import styles from "./public-home.module.css";

export const dynamic = "force-dynamic";

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;

  // Media publik disimpan sebagai jalur relatif. Jangan izinkan URL eksternal
  // atau jalur absolut melewati endpoint yang memeriksa kepemilikan tenant.
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function locationLabel(desa: {
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
}): string {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}

export default async function PublicHomePage() {
  // Host platform menampilkan landing page, bukan beranda desa. Tanpa
  // pemisahan ini host apex ikut memakai fallback satu-desa dan pengunjung
  // melihat data desa tertentu seolah-olah itu situs platform.
  if (adalahHostPlatform((await headers()).get("host"), hostPlatform)) {
    return <PlatformLanding />;
  }

  const desa = await getIdentitasFromRequest();
  const [profil, berita, slider, statistik, agenda] = await Promise.all([
    profilDesaPublik(desa.id),
    daftarBerita(desa.id, { limit: 4 }),
    daftarSliderBeranda(desa.id),
    getStatistikDesa(desa.id),
    agendaMendatang(desa.id, 3),
  ]);

  const heroImage = mediaUrl(slider[0]?.gambar, desa.id);
  const location = locationLabel(desa);
  const welcome = profil?.sambutan?.trim();
  const intro = welcome
    ? welcome
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 280)
    : `Selamat datang di website resmi ${desa.namaDesa ?? "desa kami"}. Temukan informasi, kabar terbaru, dan layanan desa dalam satu tempat.`;

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={mediaUrl(desa.logo, desa.id)} activePath="/" />

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
        <div className={styles.container + " " + styles.heroInner}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>
              <span /> PORTAL RESMI DESA
            </span>
            <h1>
              Membangun Desa,
              <br />
              <em>Melayani Warga.</em>
            </h1>
            <p>{intro}</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#profil">
                Jelajahi Desa <span aria-hidden="true">→</span>
              </a>
              <Link className={styles.secondaryButton} href="/masuk">
                Layanan Warga <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <div className={styles.heroCaption}>
            <span className={styles.captionDot} />
            <span>
              {desa.namaDesa ?? "Desa"}
              {location ? ` · ${location}` : ""}
            </span>
          </div>
        </div>
      </section>

      <section className={styles.statsBand} aria-label="Statistik desa">
        <div className={styles.container + " " + styles.statsGrid}>
          <div className={styles.statsIntro}>
            <span className={styles.sectionKicker}>DATA DESA</span>
            <strong>Desa dalam angka</strong>
            <small>Ringkasan data kependudukan</small>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>♙</span>
            <span>
              <strong>{formatNumber(statistik.total)}</strong>
              <small>Penduduk</small>
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>⌂</span>
            <span>
              <strong>{formatNumber(statistik.keluarga)}</strong>
              <small>Kepala keluarga</small>
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>◉</span>
            <span>
              <strong>{formatNumber(statistik.perDusun.length)}</strong>
              <small>Dusun</small>
            </span>
          </div>
        </div>
      </section>

      <section id="layanan" className={styles.serviceSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionKicker}>AKSES MUDAH</span>
              <h2>Apa yang Anda cari?</h2>
              <p>Temukan informasi dan layanan desa dengan lebih mudah.</p>
            </div>
            <span className={styles.headingAccent}>01 / LAYANAN</span>
          </div>
          <div className={styles.serviceGrid}>
            <Link href="/masuk" className={styles.serviceCard}>
              <span className={styles.serviceIcon}>▤</span>
              <strong>Layanan Mandiri</strong>
              <span>Ajukan kebutuhan administrasi dan pantau layanan warga.</span>
              <b>
                Masuk layanan <i>→</i>
              </b>
            </Link>
            <a href="#profil" className={styles.serviceCard}>
              <span className={styles.serviceIcon}>⌂</span>
              <strong>Profil Desa</strong>
              <span>Kenali sejarah, visi, misi, dan potensi desa.</span>
              <b>
                Kenali desa <i>→</i>
              </b>
            </a>
            <Link href="/berita" className={styles.serviceCard}>
              <span className={styles.serviceIcon}>▧</span>
              <strong>Berita & Informasi</strong>
              <span>Ikuti kabar dan informasi terbaru dari pemerintah desa.</span>
              <b>
                Baca informasi <i>→</i>
              </b>
            </Link>
            <a href="#agenda" className={styles.serviceCard}>
              <span className={styles.serviceIcon}>▦</span>
              <strong>Agenda Kegiatan</strong>
              <span>Lihat kegiatan dan agenda desa yang akan datang.</span>
              <b>
                Lihat agenda <i>→</i>
              </b>
            </a>
          </div>
        </div>
      </section>

      <section id="profil" className={styles.profileSection}>
        <div className={styles.container + " " + styles.profileGrid}>
          <div className={styles.profileVisual}>
            <div className={styles.profileVisualMain}>
              <span className={styles.profileSeal}>
                DESA
                <br />
                KITA
              </span>
              <span className={styles.profileVisualLabel}>BERSAMA MEMBANGUN DESA</span>
            </div>
            <div className={styles.profileNote}>
              <strong>{desa.namaDesa ?? "Desa Kami"}</strong>
              <span>{location || "Informasi resmi pemerintahan desa"}</span>
            </div>
          </div>
          <div className={styles.profileCopy}>
            <span className={styles.sectionKicker}>MENGENAL DESA</span>
            <h2>
              Desa yang tumbuh
              <br />
              bersama warganya.
            </h2>
            <p>
              {profil?.sejarah
                ?.replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .slice(0, 420) || intro}
            </p>
            {profil?.visi ? (
              <blockquote>
                <span>VISI DESA</span>
                {profil.visi
                  .replace(/<[^>]*>/g, " ")
                  .replace(/\s+/g, " ")
                  .slice(0, 220)}
              </blockquote>
            ) : null}
            <a className={styles.textLink} href="#berita">
              Lihat profil desa <span>→</span>
            </a>
          </div>
        </div>
      </section>

      <section id="berita" className={styles.newsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionKicker}>KABAR TERKINI</span>
              <h2>Berita dari desa</h2>
              <p>Informasi dan kegiatan terbaru untuk seluruh warga.</p>
            </div>
            <Link className={styles.textLink} href="/berita">
              Semua berita <span>→</span>
            </Link>
          </div>
          {berita.length > 0 ? (
            <div className={styles.newsGrid}>
              {berita.map((item, index) => {
                const image = mediaUrl(item.gambar, desa.id);
                const date = item.terbitPada ?? item.createdAt;
                return (
                  <article className={styles.newsCard} key={item.id}>
                    <div className={styles.newsImage}>
                      {image ? (
                        <Image
                          src={image}
                          alt=""
                          fill
                          sizes="(max-width: 700px) 100vw, 33vw"
                          unoptimized
                        />
                      ) : (
                        <span className={styles.newsImageFallback}>
                          INFO
                          <br />
                          DESA
                        </span>
                      )}
                      <span className={styles.newsNumber}>0{index + 1}</span>
                    </div>
                    <div className={styles.newsBody}>
                      <div className={styles.newsMeta}>
                        <span>{item.kategori || "Informasi"}</span>
                        <time dateTime={date.toISOString()}>
                          {new Intl.DateTimeFormat("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }).format(date)}
                        </time>
                      </div>
                      <h3>
                        <Link href={`/berita/${encodeURIComponent(item.slug)}`}>{item.judul}</Link>
                      </h3>
                      <p>{item.ringkasan || "Baca informasi selengkapnya dari pemerintah desa."}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span>✳</span>
              <strong>Belum ada berita yang ditayangkan</strong>
              <p>Informasi terbaru desa akan tampil di halaman ini.</p>
            </div>
          )}
        </div>
      </section>

      <section id="agenda" className={styles.agendaSection}>
        <div className={styles.container + " " + styles.agendaInner}>
          <div>
            <span className={styles.sectionKicker}>JANGAN LEWATKAN</span>
            <h2>Agenda kegiatan desa</h2>
            <p>Catat kegiatan dan pertemuan yang akan datang.</p>
          </div>
          <div className={styles.agendaList}>
            {agenda.length > 0 ? (
              agenda.map((item) => (
                <article className={styles.agendaItem} key={item.id}>
                  <span className={styles.agendaDate}>
                    {new Date(`${item.mulai}T00:00:00`).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                  <span className={styles.agendaText}>
                    <strong>{item.judul}</strong>
                    <small>
                      {agendaTanggalPanjang(item.mulai)}
                      {item.lokasi ? ` · ${item.lokasi}` : ""}
                    </small>
                  </span>
                  <span className={styles.agendaArrow}>↗</span>
                </article>
              ))
            ) : (
              <div className={styles.agendaEmpty}>
                Belum ada agenda kegiatan yang dipublikasikan.
              </div>
            )}
          </div>
        </div>
      </section>

      <PublicSiteFooter desa={desa} location={location} logoUrl={mediaUrl(desa.logo, desa.id)} />
    </main>
  );
}
