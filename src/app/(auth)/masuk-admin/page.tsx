import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/(auth)/masuk/login-form";
import { hostPlatformEksplisit } from "@/features/desa/application/platform-host";
import { adalahHostPlatform } from "@/features/desa/domain/host";
import { isSuperAdminUser } from "@/features/multi-desa/application/provisioning-use-cases";
import { getCurrentUser } from "@/lib/dal";
import { safeNextPath } from "@/lib/safe-next-path";

import styles from "./masuk-admin.module.css";

export const metadata: Metadata = {
  title: "Masuk Admin Desa",
  description: "Akses ruang kerja administrasi desa FlexiDesa.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ next?: string | string[] }>;

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  // Host platform tidak memiliki tenant desa; administrator platform memakai
  // halaman masuk tersendiri.
  if (adalahHostPlatform((await headers()).get("host"), hostPlatformEksplisit)) {
    redirect("/super-admin-login");
  }

  const user = await getCurrentUser();
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);

  if (user) {
    if (user.residentId !== null) redirect("/layanan-mandiri");
    if (user.villageId === null && (await isSuperAdminUser(user))) redirect("/super-admin");
    redirect(nextPath);
  }

  return (
    <main className={styles.screen}>
      <section className={styles.visual} aria-label="Ruang kerja Admin Desa FlexiDesa">
        <div className={styles.photo} aria-hidden="true" />

        <header className={styles.brand}>
          <Image src="/images/logo.png" alt="" width={44} height={44} priority unoptimized />
          <span>
            <strong>
              FlexiDesa<span>.id</span>
            </strong>
            <small>Sistem Informasi Desa Terpadu</small>
          </span>
        </header>

        <div className={styles.content}>
          <span className={styles.eyebrow}>
            <i /> AREA ADMINISTRASI DESA
          </span>
          <h1>
            Ruang kerja desa, <em>lebih tertata.</em>
          </h1>
          <p>
            Kelola data warga, persuratan, keuangan, dan layanan desa dari satu tempat yang aman dan
            terhubung.
          </p>

          <div className={styles.featureList}>
            <div className={styles.feature}>
              <span className={styles.featureIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 8h4M19 6v4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>
                <b>Data kependudukan</b>
                <small>Penduduk, keluarga, dan wilayah</small>
              </span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 3.5h7l3 3v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 3.5v3h3M9 12h5M9 16h5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>
                <b>Persuratan &amp; layanan</b>
                <small>Proses surat dan permohonan warga</small>
              </span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 19.5V10l8-5.5 8 5.5v9.5M2.8 19.5h18.4M9 19.5v-5h6v5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M12 8.5v3M10.5 10h3" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </span>
              <span>
                <b>Keuangan desa</b>
                <small>APBDes dan laporan transparan</small>
              </span>
            </div>
          </div>
        </div>

        <footer className={styles.visualFooter}>
          <span>FLEXIDESA · ADMINISTRASI DESA</span>
          <span>TERBATAS · TERCATAT · AMAN</span>
        </footer>
      </section>

      <section className={styles.panel} aria-labelledby="admin-login-title">
        <div className={styles.panelTop}>
          <span className={styles.panelBadge}>
            <i /> ADMINISTRASI DESA
          </span>
          <Link href="/" className={styles.backLink}>
            ← Kembali ke website desa
          </Link>
        </div>

        <div className={styles.cardArea}>
          <div className={styles.card}>
            <div className={styles.cardIcon} aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none">
                <path
                  d="M8 39.5V20l16-10 16 10v19.5M4 39.5h40"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 39.5V29h14v10.5M19 21h3M26 21h3M19 25.5h3M26 25.5h3"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className={styles.cardEyebrow}>AKSES STAF DESA</span>
            <h2 id="admin-login-title">Masuk ke ruang kerja</h2>
            <p className={styles.cardIntro}>
              Gunakan akun Admin Desa atau operator yang diberikan oleh pemerintah desa.
            </p>

            <div className={styles.formArea}>
              <LoginForm nextPath={nextPath} />
            </div>

            <div className={styles.securityNote}>
              <span aria-hidden="true">✓</span>
              <p>
                <strong>Akses terbatas untuk staf desa</strong>
                <small>Jangan bagikan nama pengguna dan kata sandi Anda.</small>
              </p>
            </div>

            <p className={styles.switch}>
              Warga desa?{" "}
              <Link href="/masuk">
                Masuk ke layanan warga <span aria-hidden="true">→</span>
              </Link>
            </p>
          </div>
        </div>

        <footer className={styles.panelFooter}>
          © {new Date().getFullYear()} FlexiDesa.id <span>·</span> Sistem Informasi Desa
        </footer>
      </section>
    </main>
  );
}
