import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getNavPublik } from "@/features/publik/application/nav-publik";

import styles from "../informasi-publik.module.css";
import { PublicShell } from "../public-shell";

export const dynamic = "force-dynamic";

export default async function KontakPage() {
  const desa = await getIdentitasFromRequest();
  const lokasi = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi]
    .filter(Boolean)
    .join(", ");
  const telepon = desa.telepon?.replace(/[^\d+]/g, "");
  const email = desa.emailDesa?.trim();
  const website = desa.website?.trim();
  return (
    <PublicShell
      villageName={desa.namaDesa ?? "Pemerintah Desa"}
      brandLabel="Kontak & Informasi"
      navigation={await getNavPublik(desa.id)}
    >
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.crumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <span>Kontak & Pengaduan</span>
          </div>
          <p className={styles.kicker}>HUBUNGI PEMERINTAH DESA</p>
          <h1>Kontak {desa.namaDesa ?? "Desa"}</h1>
          <p>Temukan informasi kantor dan saluran komunikasi resmi pemerintah desa.</p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          <div className={styles.grid}>
            <article className={styles.contactItem}>
              <span>ALAMAT KANTOR</span>
              <strong>{desa.alamatKantor || "Alamat kantor belum tersedia"}</strong>
              <p className={styles.muted}>{lokasi || "Wilayah administrasi belum dilengkapi"}</p>
            </article>
            <article className={styles.contactItem}>
              <span>TELEPON</span>
              <strong>
                {telepon ? (
                  <a href={`tel:${telepon}`}>{desa.telepon}</a>
                ) : (
                  "Nomor telepon belum tersedia"
                )}
              </strong>
              <p className={styles.muted}>Hubungi kantor pada jam pelayanan.</p>
            </article>
            <article className={styles.contactItem}>
              <span>EMAIL RESMI</span>
              <strong>
                {email ? <a href={`mailto:${email}`}>{email}</a> : "Email belum tersedia"}
              </strong>
              <p className={styles.muted}>Gunakan email untuk korespondensi resmi.</p>
            </article>
            <article className={styles.contactItem}>
              <span>WEBSITE</span>
              <strong>
                {website ? (
                  <a
                    href={website.startsWith("http") ? website : `https://${website}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {website}
                  </a>
                ) : (
                  "Website belum tersedia"
                )}
              </strong>
              <p className={styles.muted}>Situs resmi pemerintah desa.</p>
            </article>
          </div>
          <p className={styles.muted}>
            Halaman ini menampilkan kontak resmi yang tersedia. Fitur pengiriman pengaduan online
            akan dihubungkan setelah alur pengaduan dan penyimpanan datanya tersedia.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
