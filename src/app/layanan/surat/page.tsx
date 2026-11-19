import type { Metadata } from "next";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { listJenisSuratPublik } from "@/features/surat/application/surat-publik-use-cases";
import { PublicSiteFooter, PublicSiteHeader } from "../../public-site-layout";
import { LayananSuratOnline } from "./layanan-surat-client";
import styles from "./layanan-surat.module.css";

export const metadata: Metadata = { title: "Layanan Surat Online" };
export const dynamic = "force-dynamic";

function locationLabel(desa: { namaKecamatan: string | null; namaKabupaten: string | null; namaPropinsi: string | null }) {
  return [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
}

function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes(".."))) return null;
  const path = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return "/api/publik/media/" + path.map(encodeURIComponent).join("/");
}

export default async function LayananSuratPage() {
  const desa = await getIdentitasFromRequest();
  const jenisSurat = await listJenisSuratPublik(desa.id);
  const location = locationLabel(desa);
  const logoUrl = mediaUrl(desa.logo, desa.id);

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/layanan" />
      <section className={styles.hero}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb"><a href="/">Beranda</a><span>›</span><a href="/layanan">Layanan</a><span>›</span><span>Layanan Surat Online</span></nav>
          <div className={styles.heroContent}>
            <div><span className={styles.eyebrow}>PELAYANAN ADMINISTRASI DESA</span><h1>Layanan Surat Online</h1><p>Ajukan layanan administrasi desa secara online dengan mudah. Temukan jenis surat, pelajari persyaratannya, lalu lanjutkan melalui Area Warga.</p><div className={styles.heroActions}><a className={styles.primaryAction} href="#pilih-surat">▤　Pilih Jenis Surat</a><a className={styles.secondaryAction} href="/masuk">♙　Masuk / Daftar Akun　→</a></div></div>
            <div className={styles.heroArt} aria-hidden="true"><div className={styles.paper}><b>FORMULIR SURAT</b><i/><i/><i/><i/><span>✓</span></div><div className={styles.artCheck}>✓</div></div>
          </div>
        </div>
      </section>
      <div className={styles.container + " " + styles.content}>
        <section className={styles.benefits}>
          <article><span>ϟ</span><div><b>Mudah</b><small>Mulai pengajuan melalui Area Warga.</small></div></article>
          <article><span>◷</span><div><b>Terarah</b><small>Ikuti tahapan pengajuan yang tersedia.</small></div></article>
          <article><span>✓</span><div><b>Transparan</b><small>Informasi proses dapat dipantau melalui akun.</small></div></article>
          <article><span>⌂</span><div><b>Layanan Desa</b><small>Informasi layanan resmi desa.</small></div></article>
        </section>
        <LayananSuratOnline
          desa={desa.namaDesa ?? "desa"}
          jenisSurat={jenisSurat.map((item) => ({ id: item.id, nama: item.nama, kode: item.kode, klasifikasi: item.klasifikasi, butuhPenduduk: item.butuhPenduduk, masaBerlakuBulan: item.masaBerlakuBulan }))}
        />
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl} />
    </main>
  );
}
