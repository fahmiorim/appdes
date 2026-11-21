import type { Metadata } from "next";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getNavPublik } from "@/features/publik/application/nav-publik";

import styles from "../../informasi-publik.module.css";
import { PublicShell } from "../../public-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pengaduan Terkirim" };

export default async function PengaduanBerhasilPage({
  searchParams,
}: {
  searchParams: Promise<{ tiket?: string }>;
}) {
  const [desa, params] = await Promise.all([getIdentitasFromRequest(), searchParams]);
  const tiket = params.tiket?.match(/^PGD-[0-9]{8}-[0-9]{4,}$/)?.[0] ?? null;
  return (
    <PublicShell
      villageName={desa.namaDesa ?? "Pemerintah Desa"}
      brandLabel="Pengaduan Masyarakat"
      navigation={await getNavPublik(desa.id)}
    >
      <section className={styles.content}>
        <div className={styles.container}>
          <div className={styles.panel}>
            <p className={styles.kicker}>PENGADUAN TERCATAT</p>
            <h1>Terima kasih, laporan Anda sudah diterima.</h1>
            <p>Simpan nomor tiket berikut untuk memeriksa perkembangan penanganan pengaduan.</p>
            {tiket ? (
              <p className={styles.kicker} style={{ fontSize: "1.25rem" }}>
                {tiket}
              </p>
            ) : (
              <p>Nomor tiket tidak tersedia. Silakan hubungi kantor desa.</p>
            )}
            <div className="modul-form-actions">
              <Link className="button button-primary" href="/pengaduan/lacak">
                Lacak Pengaduan
              </Link>
              <Link className="button button-secondary" href="/">
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
