import Image from "next/image";
import Link from "next/link";

import { agendaMendatang } from "@/features/agenda/application/agenda-use-cases";
import { agendaLabelTanggal } from "@/features/agenda/domain/agenda";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";

import styles from "./agenda.module.css";

export const dynamic = "force-dynamic";

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
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

function locationLabel(desa: {
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
}): string {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}

function dateParts(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    day: new Intl.DateTimeFormat("id-ID", { day: "2-digit", timeZone: "UTC" }).format(date),
    month: new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(date),
    weekday: new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" }).format(date),
  };
}

function plainText(value: string | null): string {
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
    .trim();
}

export default async function AgendaPage() {
  const desa = await getIdentitasFromRequest();
  const agenda = await agendaMendatang(desa.id, 100);
  const lokasi = locationLabel(desa);

  return (
    <main className={styles.site}>
      <div className={styles.topline}>
        <div className={styles.container + " " + styles.toplineInner}>
          <span>Website Resmi Pemerintah Desa</span>
          <span className={styles.toplineLocation}>{lokasi || "Informasi resmi dan kegiatan desa"}</span>
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label={`Beranda ${desa.namaDesa ?? "desa"}`}>
            {desa.logo ? (
              <Image
                src={mediaUrl(desa.logo, desa.id) ?? "/images/flexidesa-mark.svg"}
                alt=""
                width={46}
                height={46}
                className={styles.logo}
                unoptimized
              />
            ) : (
              <span className={styles.logoFallback} aria-hidden="true">D</span>
            )}
            <span className={styles.brandCopy}>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <small>{desa.namaKabupaten ? `Kabupaten ${desa.namaKabupaten}` : "Sistem Informasi Desa"}</small>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Navigasi utama">
            <Link href="/">Beranda</Link>
            <Link href="/profil">Profil Desa</Link>
            <Link href="/berita">Berita</Link>
            <Link href="/agenda" aria-current="page">Agenda</Link>
          </nav>
          <Link href="/masuk" className={styles.login}>Masuk <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>/</span>
            <span aria-current="page">Agenda Kegiatan</span>
          </nav>
          <p className={styles.eyebrow}>INFORMASI KEGIATAN DESA</p>
          <h1>Agenda Kegiatan</h1>
          <p className={styles.heroText}>
            Ikuti jadwal kegiatan, pertemuan, dan acara yang diselenggarakan oleh {desa.namaDesa ?? "pemerintah desa"}.
          </p>
          {lokasi ? <p className={styles.location}>⌖ {lokasi}</p> : null}
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>JADWAL TERDEKAT</p>
              <h2>Kegiatan mendatang</h2>
              <p>Agenda yang telah dipublikasikan oleh pemerintah desa.</p>
            </div>
            <span className={styles.count}>{agenda.length} agenda</span>
          </div>

          {agenda.length > 0 ? (
            <div className={styles.agendaList}>
              {agenda.map((item) => {
                const date = dateParts(item.mulai);
                const deskripsi = plainText(item.deskripsi);
                return (
                  <article className={styles.agendaCard} key={item.id}>
                    <div className={styles.dateBlock} aria-label={agendaLabelTanggal(item.mulai, item.selesai)}>
                      <strong>{date.day}</strong>
                      <span>{date.month}</span>
                    </div>
                    <div className={styles.agendaBody}>
                      <p className={styles.dateLabel}>{date.weekday} · {agendaLabelTanggal(item.mulai, item.selesai)}</p>
                      <h3>{item.judul}</h3>
                      {deskripsi ? <p className={styles.description}>{deskripsi}</p> : null}
                      {item.lokasi ? (
                        <p className={styles.place}>
                          <span aria-hidden="true">⌖</span> {item.lokasi}
                        </p>
                      ) : null}
                    </div>
                    <span className={styles.agendaMark} aria-hidden="true">↗</span>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true">▦</span>
              <h3>Belum ada agenda kegiatan</h3>
              <p>Jadwal kegiatan yang telah dipublikasikan akan ditampilkan di halaman ini.</p>
              <Link href="/">Kembali ke beranda <span aria-hidden="true">→</span></Link>
            </div>
          )}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerMain}>
            <div>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <p>Portal informasi resmi untuk mewujudkan pelayanan publik desa yang terbuka, mudah, dan terpercaya.</p>
            </div>
            <div>
              <span>INFORMASI KANTOR</span>
              <p>{desa.alamatKantor || lokasi || "Alamat kantor desa belum tersedia."}</p>
              {desa.telepon ? <a href={`tel:${desa.telepon}`}>{desa.telepon}</a> : null}
            </div>
            <div>
              <span>TAUTAN CEPAT</span>
              <Link href="/">Beranda</Link>
              <Link href="/profil">Profil Desa</Link>
              <Link href="/berita">Berita</Link>
              <Link href="/masuk">Layanan Warga</Link>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} {desa.namaDesa ?? "Pemerintah Desa"}. Seluruh hak cipta dilindungi.</span>
            <span>Didukung oleh <strong>FlexiDesa</strong></span>
          </div>
        </div>
      </footer>
    </main>
  );
}
