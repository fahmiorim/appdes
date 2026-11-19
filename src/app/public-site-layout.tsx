import Image from "next/image";
import Link from "next/link";

import styles from "./public-site-layout.module.css";

export type PublicVillageIdentity = {
  id: number;
  namaDesa: string | null;
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
  logo: string | null;
  alamatKantor: string | null;
  telepon: string | null;
  emailDesa: string | null;
};

type Props = {
  desa: PublicVillageIdentity;
  location: string;
  logoUrl: string | null;
  activePath?: string;
};

type NavigationLink = { href: string; label: string };
type NavigationGroup = { label: string; children: NavigationLink[] };

const navigation: readonly (NavigationLink | NavigationGroup)[] = [
  { href: "/", label: "Beranda" },
  {
    label: "Profil Desa",
    children: [
      { href: "/profil", label: "Profil Desa" },
      { href: "/sejarah", label: "Sejarah Desa" },
      { href: "/visi-misi", label: "Visi & Misi" },
      { href: "/wilayah", label: "Wilayah Desa" },
    ],
  },
  {
    label: "Pemerintahan",
    children: [{ href: "/pemerintahan", label: "Perangkat Desa" }],
  },
  {
    label: "Layanan",
    children: [
      { href: "/layanan", label: "Layanan Publik" },
      { href: "/layanan/surat", label: "Layanan Surat" },
      { href: "/kontak", label: "Kontak & Pengaduan" },
    ],
  },
  {
    label: "Informasi",
    children: [
      { href: "/berita", label: "Berita" },
      { href: "/pengumuman", label: "Pengumuman" },
      { href: "/agenda", label: "Agenda Kegiatan" },
      { href: "/statistik", label: "Statistik Desa" },
    ],
  },
  { href: "/galeri", label: "Galeri" },
  { href: "/kontak", label: "Kontak" },
];

export function PublicSiteHeader({ desa, logoUrl, activePath = "/" }: Props) {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label={`Beranda ${desa.namaDesa ?? "desa"}`}>
            {logoUrl ? (
              <Image
                src={logoUrl}
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
            <span className={styles.brandText}>
              <strong>Sistem Informasi Desa</strong>
              <b>{desa.namaDesa ?? "Pemerintah Desa"}</b>
              <small>{[desa.namaKecamatan, desa.namaKabupaten].filter(Boolean).join(", ")}</small>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Navigasi utama">
            {navigation.map((item) =>
              "href" in item ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className={activePath === item.href ? styles.active : undefined}
                  aria-current={activePath === item.href ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ) : (
                <details className={styles.dropdown} key={item.label}>
                  <summary>
                    {item.label}
                    <span aria-hidden="true">⌄</span>
                  </summary>
                  <div className={styles.dropdownMenu}>
                    {item.children.map((child) => (
                      <Link key={child.href} href={child.href}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </details>
              ),
            )}
          </nav>

          <div className={styles.headerActions}>
            <Link href="/cari" className={styles.searchLink} aria-label="Cari informasi">
              ⌕
            </Link>
            <Link href="/masuk" className={styles.login}>
              ♙ <span>Masuk</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function PublicSiteFooter({ desa, location, logoUrl }: Props) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerMain}>
        <div className={styles.footerBrand}>
          <div className={styles.footerIdentity}>
            {logoUrl ? <Image src={logoUrl} alt="" width={44} height={44} unoptimized /> : null}
            <div>
              <strong>Sistem Informasi Desa</strong>
              <b>{desa.namaDesa ?? "Pemerintah Desa"}</b>
              <small>{location}</small>
            </div>
          </div>
          <p>
            Portal informasi resmi desa untuk pelayanan publik yang transparan, informatif, dan
            mudah diakses masyarakat.
          </p>
        </div>
        <div className={styles.footerColumn}>
          <strong>Menu</strong>
          <Link href="/">Beranda</Link>
          <Link href="/profil">Profil Desa</Link>
          <Link href="/pemerintahan">Pemerintahan</Link>
          <Link href="/layanan">Layanan</Link>
        </div>
        <div className={styles.footerColumn}>
          <strong>Informasi</strong>
          <Link href="/berita">Berita Desa</Link>
          <Link href="/pengumuman">Pengumuman</Link>
          <Link href="/agenda">Agenda Kegiatan</Link>
          <Link href="/galeri">Galeri</Link>
        </div>
        <div className={styles.footerColumn + " " + styles.contactColumn}>
          <strong>Kontak Desa</strong>
          <span>{desa.alamatKantor || location || "Alamat kantor belum tersedia"}</span>
          {desa.telepon ? <a href={`tel:${desa.telepon}`}>{desa.telepon}</a> : null}
          {desa.emailDesa ? <a href={`mailto:${desa.emailDesa}`}>{desa.emailDesa}</a> : null}
        </div>
        <div className={styles.footerColumn}>
          <strong>Ikuti Kami</strong>
          <span>Media sosial resmi belum dikonfigurasi oleh pengelola desa.</span>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <span>
          © {new Date().getFullYear()} {desa.namaDesa ?? "Pemerintah Desa"}. All rights reserved.
        </span>
        <span>Pemerintah Desa {desa.namaDesa ?? ""}　|　Transparan · Informatif · Melayani</span>
      </div>
    </footer>
  );
}
