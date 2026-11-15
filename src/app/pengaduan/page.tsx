import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { listPengaduanPublikData } from "@/features/pengaduan/application/use-cases";
import { labelKategori, labelStatus } from "@/features/pengaduan/domain/pengaduan";

import styles from "../informasi-publik.module.css";
import { PublicShell } from "../public-shell";

export const dynamic = "force-dynamic";

function plainText(value: string) {
  return value
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

export default async function PengaduanPage() {
  const desa = await getIdentitasFromRequest();
  const items = await listPengaduanPublikData(desa.id);
  return (
    <PublicShell
      villageName={desa.namaDesa ?? "Pemerintah Desa"}
      brandLabel="Pengaduan Masyarakat"
      navigation={[
        { href: "/", label: "Beranda" },
        { href: "/profil", label: "Profil Desa" },
        { href: "/berita", label: "Berita" },
        { href: "/kontak", label: "Kontak" },
      ]}
    >
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.crumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <span>Pengaduan</span>
          </div>
          <p className={styles.kicker}>ASPIRASI & TRANSPARANSI</p>
          <h1>Pengaduan {desa.namaDesa ?? "Desa"}</h1>
          <p>
            Informasi tindak lanjut pengaduan masyarakat yang telah disetujui untuk ditampilkan
            kepada publik.
          </p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          {items.length ? (
            <div className={styles.docList}>
              {items.map((item) => (
                <article className={styles.panel} key={item.id}>
                  <p className={styles.kicker}>
                    {labelKategori(item.kategori)} · {labelStatus(item.status)}
                  </p>
                  <h2>{item.judul}</h2>
                  <p className={styles.copy}>{plainText(item.isi)}</p>
                  <p className={styles.muted}>
                    Tiket {item.nomorTiket} · Disampaikan oleh {item.namaPelapor}
                  </p>
                  {item.tanggapan ? (
                    <div>
                      <strong>Tanggapan pemerintah desa</strong>
                      <p className={styles.copy}>{plainText(item.tanggapan)}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <strong>Belum ada pengaduan yang dipublikasikan</strong>
              <p>Pengaduan hanya ditampilkan di sini setelah petugas menyetujui publikasinya.</p>
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
