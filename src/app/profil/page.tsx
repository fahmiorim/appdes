import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getStatistikDesa } from "@/features/desa/application/statistik-desa";
import {
  daftarAlbumGaleri,
  daftarFotoAlbum,
  daftarPerangkatPublik,
  daftarSliderBeranda,
  profilDesaPublik,
} from "@/features/publik/application/konten-publik";

import styles from "./profil.module.css";
import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";

export const dynamic = "force-dynamic";

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes(".."))) return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}

function plainText(value: string | null | undefined, max = 1800): string {
  return (value ?? "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim().slice(0, max);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function locationLabel(desa: { namaKecamatan: string | null; namaKabupaten: string | null; namaPropinsi: string | null }) {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}

export default async function ProfilDesaPage() {
  const desa = await getIdentitasFromRequest();
  const [profil, perangkat, statistik, slider, albums] = await Promise.all([
    profilDesaPublik(desa.id),
    daftarPerangkatPublik(desa.id),
    getStatistikDesa(desa.id),
    daftarSliderBeranda(desa.id),
    daftarAlbumGaleri(desa.id),
  ]);
  const populatedAlbums = albums.filter((album) => album.jumlahFoto > 0);
  const photoResults = await Promise.all(populatedAlbums.slice(0, 3).map((album) => daftarFotoAlbum(desa.id, album.id)));
  const galleryPhotos = photoResults.flat();
  const location = locationLabel(desa);
  const heroImage = mediaUrl(slider[0]?.gambar, desa.id) ?? (galleryPhotos[0] ? mediaUrl(galleryPhotos[0].gambar, desa.id) : null);
  const officeImage = mediaUrl(slider[1]?.gambar, desa.id) ?? (galleryPhotos[1] ? mediaUrl(galleryPhotos[1].gambar, desa.id) : null);
  const historyImage = mediaUrl(slider[2]?.gambar, desa.id) ?? (galleryPhotos[2] ? mediaUrl(galleryPhotos[2].gambar, desa.id) : null);
  const visi = plainText(profil?.visi);
  const sejarah = plainText(profil?.sejarah);
  const misi = (profil?.misi ?? "").split(/\r?\n/).map((item) => plainText(item, 300)).filter(Boolean);
  const mapUrl = profil?.koordinat
    ? `https://www.google.com/maps?q=${encodeURIComponent(profil.koordinat)}`
    : null;
  const kepalaDesa = perangkat.find((item) => (item.jabatan ?? "").toLocaleLowerCase("id-ID").includes("kepala desa"));
  const dusun = statistik.perDusun.filter((item) => item.label !== "Belum diisi");

  const sidebar = [
    { href: "#tentang", icon: "▣", label: "Tentang Desa" },
    { href: "#sejarah", icon: "◈", label: "Sejarah Desa" },
    { href: "#visi-misi", icon: "♡", label: "Visi & Misi" },
    { href: "#wilayah", icon: "⌖", label: "Wilayah Desa" },
    { href: "#potensi", icon: "♧", label: "Potensi Desa" },
    { href: "#data-umum", icon: "▧", label: "Data Umum" },
    { href: "#sarana-prasarana", icon: "♧", label: "Sarana & Prasarana" },
  ];

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={mediaUrl(desa.logo, desa.id)} activePath="/profil" />

      <section className={styles.hero} style={heroImage ? { backgroundImage: `linear-gradient(90deg,#063b70f2 0%,#06477dc9 44%,#062b5c35 100%),url("${heroImage}")` } : undefined}>
        <div className={styles.heroInner}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>›</span><span>Profil Desa</span></nav>
          <h1>Profil Desa</h1>
          <p>Informasi lengkap tentang sejarah, visi misi, wilayah, potensi,<br className={styles.desktopBreak}/> dan kondisi umum {desa.namaDesa ?? "desa"}.</p>
        </div>
      </section>

      <div className={styles.container}>
        <div className={styles.profileLayout}>
          <aside className={styles.sidebar}>
            <h2><span>▤</span> Profil Desa</h2>
            <nav aria-label="Navigasi profil desa">
              {sidebar.map((item, index) => <a href={item.href} key={item.href} className={index === 0 ? styles.active : ""}><span>{item.icon}</span>{item.label}</a>)}
            </nav>
          </aside>

          <div className={styles.mainContent}>
            <section className={styles.aboutCard} id="tentang">
              <h2>Tentang {desa.namaDesa ?? "Desa"}</h2>
              <div className={styles.aboutGrid}>
                <div className={styles.aboutPhoto}>
                  {officeImage ? <Image src={officeImage} alt={`Dokumentasi ${desa.namaDesa ?? "desa"}`} fill priority unoptimized sizes="(max-width: 700px) 100vw, 40vw"/> : <div className={styles.imageFallback}>Dokumentasi desa belum tersedia</div>}
                </div>
                <div className={styles.aboutText}>
                  <p>{plainText(profil?.sambutan) || `${desa.namaDesa ?? "Desa ini"} berada di wilayah ${location || "yang data wilayahnya belum dilengkapi"}. Informasi gambaran umum desa akan diperbarui oleh pemerintah desa.`}</p>
                  {kepalaDesa ? <small>— { [kepalaDesa.gelarDepan, kepalaDesa.nama, kepalaDesa.gelarBelakang].filter(Boolean).join(" ") }, {kepalaDesa.jabatan}</small> : null}
                </div>
              </div>
              <div className={styles.factGrid}>
                <div><span className={styles.factIcon}>▦</span><span><small>Tahun Berdiri</small><strong>Belum tersedia</strong></span></div>
                <div><span className={styles.factIcon}>♙</span><span><small>Jumlah Penduduk</small><strong>{formatNumber(statistik.total)} Jiwa</strong></span></div>
                <div><span className={styles.factIcon}>⌂</span><span><small>Jumlah KK</small><strong>{formatNumber(statistik.keluarga)} KK</strong></span></div>
                <div><span className={styles.factIcon}>◫</span><span><small>Luas Wilayah</small><strong>Belum tersedia</strong></span></div>
              </div>
            </section>

            <div className={styles.twoColumn}>
              <div className={styles.leftStack}>
                <section className={styles.historyCard} id="sejarah">
                  <div className={styles.sectionTitle}><span>▣</span><h2>Sejarah Singkat Desa</h2></div>
                  <div className={styles.historyBody}>
                    <div><p>{sejarah || "Sejarah desa belum dipublikasikan oleh pemerintah desa."}</p><Link href="/profil/sejarah">Selengkapnya <b>→</b></Link></div>
                    {historyImage ? <div className={styles.historyPhoto}><Image src={historyImage} alt="Dokumentasi sejarah desa" fill unoptimized sizes="(max-width: 700px) 100vw, 22vw"/></div> : null}
                  </div>
                </section>

                <section className={styles.regionCard} id="wilayah">
                  <div className={styles.sectionTitle}><span>⌖</span><h2>Letak & Wilayah Desa</h2></div>
                  <p>Secara administratif, {desa.namaDesa ?? "desa"} berada di {location || "wilayah administratif yang belum dilengkapi"}.</p>
                  <div className={styles.regionBody}>
                    <div className={styles.regionTable}>
                      <strong>⌖　Wilayah Administratif</strong>
                      <div><b>Kecamatan</b><span>{desa.namaKecamatan || "Belum diisi"}</span></div>
                      <div><b>Kabupaten</b><span>{desa.namaKabupaten || "Belum diisi"}</span></div>
                      <div><b>Provinsi</b><span>{desa.namaPropinsi || "Belum diisi"}</span></div>
                      {dusun.slice(0, 4).map((item) => <div key={item.label}><b>Dusun</b><span>{item.label}</span></div>)}
                    </div>
                    <a className={styles.mapPreview} href={mapUrl ?? "/profil#wilayah"} target={mapUrl ? "_blank" : undefined} rel={mapUrl ? "noreferrer" : undefined}>
                      {mapUrl ? <><span>⌖</span><strong>Lihat lokasi {desa.namaDesa ?? "desa"}</strong><small>Buka peta lokasi ↗</small></> : <><span>⌖</span><strong>Peta belum tersedia</strong><small>Koordinat desa belum diatur</small></>}
                    </a>
                  </div>
                </section>
              </div>

              <section className={styles.visionCard} id="visi-misi">
                <div className={styles.sectionTitle}><span>◎</span><h2>Visi & Misi Desa</h2></div>
                <div className={styles.visionQuote}><span>“</span><div><strong>Visi</strong><p>{visi || "Visi desa belum dipublikasikan."}</p></div></div>
                <div className={styles.missionTitle}><span>▣</span><h3>Misi</h3></div>
                {misi.length ? <ul>{misi.map((item, index) => <li key={index}><span>✓</span>{item}</li>)}</ul> : <p className={styles.emptyText}>Misi desa belum dipublikasikan.</p>}
              </section>
            </div>

            <section className={styles.potentialCard} id="potensi">
              <div className={styles.sectionTitle}><span>♧</span><div><h2>Potensi Desa</h2><p>Potensi unggulan yang menjadi kekuatan pembangunan {desa.namaDesa ?? "desa"}.</p></div></div>
              <div className={styles.emptyInline}>Informasi potensi desa belum dipublikasikan.</div>
            </section>

            <section className={styles.facilityCard} id="sarana-prasarana">
              <div className={styles.sectionTitle}><span>▱</span><div><h2>Sarana & Prasarana Desa</h2><p>Fasilitas umum dan infrastruktur pendukung pelayanan serta kegiatan masyarakat.</p></div></div>
              <div className={styles.emptyInline}>Data sarana dan prasarana desa belum tersedia untuk ditampilkan.</div>
            </section>
            <section className={styles.generalData} id="data-umum">
              <h2>Data Umum Desa</h2>
              <div><span>Jumlah Penduduk</span><strong>{formatNumber(statistik.total)} jiwa</strong><span>Jumlah Kepala Keluarga</span><strong>{formatNumber(statistik.keluarga)} KK</strong><span>Jumlah Dusun Terdata</span><strong>{formatNumber(dusun.length)} dusun</strong></div>
            </section>
          </div>
        </div>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={mediaUrl(desa.logo, desa.id)} />
    </main>
  );
}
