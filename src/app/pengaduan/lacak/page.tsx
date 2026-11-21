import type { Metadata } from "next";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getNavPublik } from "@/features/publik/application/nav-publik";

import styles from "../../informasi-publik.module.css";
import { PublicShell } from "../../public-shell";
import { FormLacakPengaduan } from "./form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lacak Pengaduan" };

export default async function LacakPengaduanPage() {
  const desa = await getIdentitasFromRequest();
  return (
    <PublicShell
      villageName={desa.namaDesa ?? "Pemerintah Desa"}
      brandLabel="Pengaduan Masyarakat"
      navigation={await getNavPublik(desa.id)}
    >
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.crumb}>
            <Link href="/">Beranda</Link>
            <span>/</span>
            <Link href="/pengaduan">Pengaduan</Link>
            <span>/</span>
            <span>Lacak Tiket</span>
          </div>
          <p className={styles.kicker}>PELACAKAN PENGADUAN</p>
          <h1>Periksa Status Pengaduan</h1>
          <p>
            Masukkan nomor tiket dan salah satu identitas yang digunakan ketika mengirim laporan.
          </p>
        </div>
      </section>
      <section className={styles.content}>
        <div className={styles.container}>
          <FormLacakPengaduan />
        </div>
      </section>
    </PublicShell>
  );
}
