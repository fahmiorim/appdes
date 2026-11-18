import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getNavPublik } from "@/features/publik/application/nav-publik";
import { listJenisSuratPublik } from "@/features/surat/application/surat-publik-use-cases";

import styles from "../../informasi-publik.module.css";
import { PublicShell } from "../../public-shell";

export const dynamic = "force-dynamic";

export default async function LayananSuratPage() {
  const desa = await getIdentitasFromRequest();
  const jenisSurat = await listJenisSuratPublik(desa.id);

  return (
    <PublicShell
      villageName={desa.namaDesa ?? "Pemerintah Desa"}
      brandLabel="Katalog Layanan Surat"
      navigation={await getNavPublik(desa.id)}
      showMark={false}
    >
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.crumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <Link href="/layanan">Layanan</Link>
            <span>/</span>
            <span>Layanan surat</span>
          </div>
          <p className={styles.kicker}>KATALOG ADMINISTRASI</p>
          <h1>Layanan surat online</h1>
          <p>
            Pilih jenis surat yang tersedia di {desa.namaDesa ?? "desa"}. Persyaratan dan pengajuan
            tersedia setelah warga masuk.
          </p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          {jenisSurat.length ? (
            <div className={styles.docList}>
              {jenisSurat.map((item) => (
                <article className={styles.doc} key={item.id}>
                  <div>
                    <h3>{item.nama}</h3>
                    <p>
                      {item.kode} · {item.klasifikasi ?? "Surat administrasi"} · Masa berlaku{" "}
                      {item.masaBerlakuBulan} bulan
                    </p>
                  </div>
                  <Link href="/masuk">Ajukan setelah masuk ↗</Link>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <strong>Jenis surat belum tersedia</strong>
              <p>Hubungi kantor desa untuk informasi layanan administrasi.</p>
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
