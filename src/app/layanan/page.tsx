import type { Metadata } from "next";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { daftarLayananDesaPublik } from "@/features/publik/application/konten-publik";
import { listJenisSuratPublik } from "@/features/surat/application/surat-publik-use-cases";

import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import { KatalogLayanan } from "./katalog-layanan-client";
import styles from "./katalog-layanan.module.css";

export const metadata: Metadata = { title: "Katalog Layanan Desa" };
export const dynamic = "force-dynamic";

function locationLabel(desa: {
  namaKecamatan: string | null;
  namaKabupaten: string | null;
  namaPropinsi: string | null;
}) {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}

function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes("..")))
    return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return "/api/publik/media/" + path.map(encodeURIComponent).join("/");
}

export default async function KatalogLayananPage() {
  const desa = await getIdentitasFromRequest();
  const [jenisSurat, layananDesa] = await Promise.all([
    listJenisSuratPublik(desa.id),
    daftarLayananDesaPublik(desa.id),
  ]);
  const location = locationLabel(desa);
  const logoUrl = mediaUrl(desa.logo, desa.id);

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/layanan" />
      <section className={styles.hero}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Beranda</Link>
            <span>›</span>
            <a href="/layanan">Layanan</a>
            <span>›</span>
            <span>Katalog Layanan Desa</span>
          </nav>
          <div className={styles.heroContent}>
            <div>
              <span className={styles.eyebrow}>PELAYANAN PUBLIK</span>
              <h1>Katalog Layanan Desa</h1>
              <p>
                Temukan layanan administrasi dan informasi pelayanan yang tersedia di{" "}
                {desa.namaDesa ?? "desa"} dengan mudah.
              </p>
              <div className={styles.heroActions}>
                <a href="#daftar-layanan" className={styles.primaryAction}>
                  ▤　Jelajahi Layanan
                </a>
                <a href="/layanan/surat" className={styles.secondaryAction}>
                  ▣　Panduan Layanan
                </a>
              </div>
            </div>
            <div className={styles.heroArt} aria-hidden="true">
              <div className={styles.clip}>✓　✓　✓</div>
              <div className={styles.paper}>
                <b>DAFTAR LAYANAN</b>
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className={styles.check}>✓</div>
            </div>
          </div>
        </div>
      </section>
      <div className={styles.container + " " + styles.content}>
        <section className={styles.benefits} aria-label="Keunggulan layanan">
          <article>
            <span>ϟ</span>
            <div>
              <b>Mudah Diakses</b>
              <small>Informasi layanan tersedia dalam satu portal.</small>
            </div>
          </article>
          <article>
            <span>◷</span>
            <div>
              <b>Informasi Jelas</b>
              <small>Kenali jenis layanan dan cara pengajuannya.</small>
            </div>
          </article>
          <article>
            <span>✓</span>
            <div>
              <b>Transparan</b>
              <small>Persyaratan layanan dapat dibaca sebelum mengajukan.</small>
            </div>
          </article>
          <article>
            <span>⌂</span>
            <div>
              <b>Layanan Desa</b>
              <small>Informasi resmi dari pemerintah desa.</small>
            </div>
          </article>
        </section>
        <KatalogLayanan
          layanan={[
            ...jenisSurat.map((item) => ({
              source: "surat" as const,
              id: item.id,
              nama: item.nama,
              kode: item.kode,
              klasifikasi: item.klasifikasi,
              butuhPenduduk: item.butuhPenduduk,
              masaBerlakuBulan: item.masaBerlakuBulan,
            })),
            ...layananDesa.map((item) => ({
              source: "desa" as const,
              id: item.id,
              nama: item.nama,
              kategori: item.kategori,
              deskripsi: item.deskripsi,
              persyaratan: item.persyaratan,
              estimasiHari: item.estimasiHari,
              biaya: item.biaya,
              metode: item.metode,
            })),
          ]}
        />
        <section className={styles.process}>
          <div className={styles.sectionTitle}>
            <span>⌘</span>
            <div>
              <h2>Alur Mengakses Layanan Desa</h2>
              <p>Langkah umum untuk mendapatkan informasi dan mengajukan layanan.</p>
            </div>
          </div>
          <div className={styles.steps}>
            {[
              ["♙", "1. Pilih Layanan", "Temukan layanan sesuai kebutuhan Anda."],
              ["▤", "2. Baca Persyaratan", "Periksa ketentuan dan dokumen yang diperlukan."],
              ["✎", "3. Siapkan Data", "Lengkapi data dan dokumen pendukung."],
              ["✓", "4. Ajukan Layanan", "Masuk ke akun warga untuk pengajuan online."],
              ["⇩", "5. Pantau Proses", "Periksa informasi dan status melalui Area Warga."],
            ].map(([icon, title, description]) => (
              <article key={title}>
                <span>{icon}</span>
                <b>{title}</b>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className={styles.help}>
          <div className={styles.helpArt} aria-hidden="true">
            ▤　✓
          </div>
          <div>
            <h2>Butuh Bantuan Layanan?</h2>
            <p>
              Hubungi pemerintah desa jika membutuhkan informasi lebih lanjut mengenai layanan dan
              persyaratannya.
            </p>
          </div>
          <a href="/kontak">Hubungi Pemerintah Desa　→</a>
        </section>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
