import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import {
  daftarPerangkatPublik,
  profilDesaPublik,
} from "@/features/publik/application/konten-publik";

import styles from "./profil.module.css";

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

function plainText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script>/gi, " ")
    .replace(/<style\\b[^>]*>[\\s\\S]*?<\\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\\s+/g, " ")
    .trim();
}

function locationLabel(desa: {
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
}): string {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}

export default async function ProfilDesaPage() {
  const desa = await getIdentitasFromRequest();
  const [profil, perangkat] = await Promise.all([
    profilDesaPublik(desa.id),
    daftarPerangkatPublik(desa.id),
  ]);

  const lokasi = locationLabel(desa);
  const sejarah = plainText(profil?.sejarah);
  const misi = (profil?.misi ?? "")
    .split(/\\r?\\n/)
    .map((item) => plainText(item))
    .filter(Boolean);
  const koordinat = profil?.koordinat?.match(/^(-?\\d{1,3}(?:\\.\\d+)?)\\s*,\\s*(-?\\d{1,3}(?:\\.\\d+)?)$/);
  const petaUrl = koordinat
    ? `https://www.google.com/maps?q=${encodeURIComponent(profil?.koordinat ?? "")}`
    : null;

  return (
    <main className={styles.site}>
      <div className={styles.topline}>
        <div className={styles.container + " " + styles.toplineInner}>
          <span>Website Resmi Pemerintah Desa</span>
          <span>{lokasi || "Informasi resmi dan layanan desa"}</span>
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.container + " " + styles.headerInner}>
          <Link href="/" className={styles.brand}>
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
            <span>
              <strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong>
              <small>{desa.namaKabupaten ? `Kabupaten ${desa.namaKabupaten}` : "Sistem Informasi Desa"}</small>
            </span>
          </Link>
          <nav className={styles.nav} aria-label="Navigasi utama">
            <Link href="/">Beranda</Link>
            <Link href="/profil" aria-current="page">Profil Desa</Link>
            <Link href="/#berita">Berita</Link>
            <Link href="/#agenda">Agenda</Link>
          </nav>
          <Link href="/masuk" className={styles.login}>Masuk <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Beranda</Link><span>/</span><span aria-current="page">Profil Desa</span>
          </nav>
          <p className={styles.eyebrow}>MENGENAL LEBIH DEKAT</p>
          <h1>Profil {desa.namaDesa ?? "Desa"}</h1>
          <p className={styles.heroText}>
            Kenali identitas, sejarah, visi, dan arah pembangunan {desa.namaDesa ?? "desa"}.
          </p>
          {lokasi ? <p className={styles.location}>⌖ {lokasi}</p> : null}
        </div>
      </section>

      <section className={styles.introSection}>
        <div className={styles.container + " " + styles.introGrid}>
          <div className={styles.identityCard}>
            <div className={styles.identityMark}>
              {desa.logo ? (
                <Image
                  src={mediaUrl(desa.logo, desa.id) ?? "/images/flexidesa-mark.svg"}
                  alt={`Logo ${desa.namaDesa ?? "desa"}`}
                  width={92}
                  height={92}
                  unoptimized
                />
              ) : <span aria-hidden="true">D</span>}
            </div>
            <p className={styles.cardLabel}>PEMERINTAH DESA</p>
            <h2>{desa.namaDesa ?? "Nama Desa"}</h2>
            <p>{lokasi || "Informasi wilayah belum dilengkapi."}</p>
            {desa.kodeDesa ? <span className={styles.code}>Kode desa: {desa.kodeDesa}</span> : null}
          </div>

          <div className={styles.introCopy}>
            <p className={styles.kicker}>SAMBUTAN & GAMBARAN UMUM</p>
            <h2>Membangun desa dimulai dengan mengenal potensinya.</h2>
            {plainText(profil?.sambutan) ? (
              <p>{plainText(profil?.sambutan)}</p>
            ) : sejarah ? (
              <p>{sejarah.slice(0, 520)}</p>
            ) : (
              <p>Informasi gambaran umum desa akan ditampilkan di sini setelah dilengkapi oleh pemerintah desa.</p>
            )}
            <div className={styles.quickFacts}>
              <div><span>Desa</span><strong>{desa.namaDesa ?? "—"}</strong></div>
              <div><span>Kecamatan</span><strong>{desa.namaKecamatan ?? "—"}</strong></div>
              <div><span>Kabupaten</span><strong>{desa.namaKabupaten ?? "—"}</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className={styles.container + " " + styles.contentGrid}>
          <article className={styles.contentCard}>
            <p className={styles.kicker}>SEJARAH DESA</p>
            <h2>Perjalanan dan cerita desa</h2>
            {sejarah ? <p className={styles.bodyCopy}>{sejarah}</p> : <p className={styles.muted}>Sejarah desa belum dipublikasikan.</p>}
          </article>
          <aside className={styles.sideStack}>
            <div className={styles.visionCard}>
              <p className={styles.kicker}>VISI DESA</p>
              <h2>Arah dan cita-cita bersama</h2>
              <p>{plainText(profil?.visi) || "Visi desa belum dipublikasikan."}</p>
            </div>
            <div className={styles.missionCard}>
              <p className={styles.kicker}>MISI DESA</p>
              <h2>Langkah untuk mewujudkan visi</h2>
              {misi.length ? (
                <ol>{misi.map((item, index) => <li key={index}>{item}</li>)}</ol>
              ) : <p className={styles.muted}>Misi desa belum dipublikasikan.</p>}
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.officialSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <div><p className={styles.kicker}>PEMERINTAHAN DESA</p><h2>Perangkat desa</h2><p>Kenali perangkat yang menjalankan pelayanan dan pemerintahan desa.</p></div>
            <span className={styles.count}>{perangkat.length} perangkat aktif</span>
          </div>
          {perangkat.length ? (
            <div className={styles.officialGrid}>
              {perangkat.map((item) => {
                const foto = mediaUrl(item.foto, desa.id);
                const nama = [item.gelarDepan, item.nama, item.gelarBelakang].filter(Boolean).join(" ");
                return (
                  <article className={styles.officialCard} key={item.id}>
                    <div className={styles.officialPhoto}>
                      {foto ? <Image src={foto} alt={`Foto ${nama}`} fill sizes="(max-width: 700px) 50vw, 220px" unoptimized /> : <span aria-hidden="true">{item.nama.slice(0, 1).toUpperCase()}</span>}
                    </div>
                    <div className={styles.officialInfo}>
                      <h3>{nama}</h3>
                      <p>{item.jabatan ?? "Perangkat Desa"}</p>
                      {item.periode ? <small>Periode {item.periode}</small> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>Data perangkat desa belum tersedia.</div>
          )}
        </div>
      </section>

      <section className={styles.contactSection}>
        <div className={styles.container + " " + styles.contactPanel}>
          <div><p className={styles.kicker}>INFORMASI WILAYAH</p><h2>Kunjungi kantor desa</h2><p>{desa.alamatKantor || lokasi || "Alamat kantor desa belum dilengkapi."}</p></div>
          <div className={styles.contactActions}>
            {desa.telepon ? <a href={`tel:${desa.telepon}`}>Hubungi kantor desa</a> : null}
            {petaUrl ? <a href={petaUrl} target="_blank" rel="noreferrer">Lihat lokasi di peta ↗</a> : null}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.container + " " + styles.footerInner}>
          <div><strong>{desa.namaDesa ?? "Pemerintah Desa"}</strong><p>{lokasi || "Website resmi pemerintah desa"}</p></div>
          <div className={styles.footerLinks}><Link href="/">Beranda</Link><Link href="/profil">Profil Desa</Link><Link href="/#berita">Berita</Link><Link href="/masuk">Layanan Warga</Link></div>
          <small>© {new Date().getFullYear()} {desa.namaDesa ?? "Pemerintah Desa"}. Didukung FlexiDesa.</small>
        </div>
      </footer>
    </main>
  );
}
