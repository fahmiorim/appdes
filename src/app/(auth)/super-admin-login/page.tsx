import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";

import { isSuperAdminUser } from "@/features/multi-desa/application/provisioning-use-cases";
import { getCurrentUser } from "@/lib/dal";
import { safeNextPath } from "@/lib/safe-next-path";

import { SuperAdminLoginForm } from "./super-admin-login-form";
import styles from "./super-admin-login.module.css";

export const metadata: Metadata = {
  title: "Masuk Super Admin",
  description: "Akses aman ke konsol pengelolaan platform FlexiDesa.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ next?: string | string[] }>;

export default async function SuperAdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const requestedPath = safeNextPath(params.next);
  const nextPath = requestedPath.startsWith("/super-admin") ? requestedPath : "/super-admin";

  if (user) {
    if (await isSuperAdminUser(user)) redirect(nextPath);
    redirect("/beranda");
  }

  return (
    <main className={styles.screen}>
      <section className={styles.visual} aria-label="FlexiDesa, platform pengelolaan desa">
        <div className={styles.visualGlow} />
        <header className={styles.brand}>
          <Image
            src="/images/flexidesa-mark.svg"
            alt=""
            width={44}
            height={44}
            priority
            unoptimized
          />
          <span>
            <strong>FlexiDesa<span>.id</span></strong>
            <small>PLATFORM SISTEM INFORMASI DESA</small>
          </span>
        </header>

        <div className={styles.visualCopy}>
          <span className={styles.eyebrow}><i /> KONSOL PENGELOLA PLATFORM</span>
          <h1>Mengelola banyak desa, <em>dalam satu kendali.</em></h1>
          <p>
            Kelola tenant, domain, pengguna platform, dan konfigurasi FlexiDesa melalui satu
            konsol terpusat dengan kontrol akses yang terjaga.
          </p>
          <div className={styles.featureGrid}>
            <div><span className={styles.featureIcon}>⌂</span><span><b>Tenant Desa</b><small>Kelola seluruh desa</small></span></div>
            <div><span className={styles.featureIcon}>◎</span><span><b>Manajemen Domain</b><small>Atur alamat platform</small></span></div>
            <div><span className={styles.featureIcon}>◇</span><span><b>Konfigurasi</b><small>Template dan pengaturan</small></span></div>
            <div><span className={styles.featureIcon}>⌁</span><span><b>Audit Trail</b><small>Pantau aktivitas sistem</small></span></div>
          </div>
        </div>

        <div className={styles.landscape}>
          <Image
            src="/images/super-admin-login-landscape.svg"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 58vw"
            unoptimized
          />
        </div>
        <footer className={styles.visualFooter}>
          <span>FLEXIDESА PLATFORM</span>
          <span>TERHUBUNG · TERPISAH · TERKENDALI</span>
        </footer>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelTop}>
          <span className={styles.secureBadge}><i /> AREA TERBATAS</span>
          <a href="/" className={styles.backLink}>← Kembali ke beranda</a>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon} aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path d="M24 5.5 39 11v11.5c0 9-6.2 16.2-15 20-8.8-3.8-15-11-15-20V11L24 5.5Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/>
              <path d="M17.5 23.5v-3a6.5 6.5 0 0 1 13 0v3M15.5 23.5h17v12h-17z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/>
              <circle cx="24" cy="29" r="1.7" fill="currentColor"/>
            </svg>
          </div>
          <span className={styles.cardEyebrow}>AKSES PENGELOLA PLATFORM</span>
          <h2>Selamat datang kembali</h2>
          <p className={styles.cardIntro}>Masuk menggunakan akun Super Admin yang telah terdaftar.</p>

          <SuperAdminLoginForm nextPath={nextPath} />

          <div className={styles.securityNote}>
            <span aria-hidden="true">✓</span>
            <p><strong>Akses khusus Super Admin</strong><small>Aktivitas pengelolaan tercatat dalam Audit Trail platform.</small></p>
          </div>
          <p className={styles.helpText}>Tidak memiliki akses? Hubungi administrator utama platform.</p>
        </div>

        <footer className={styles.panelFooter}>© {new Date().getFullYear()} FlexiDesa.id <span>·</span> Sistem Informasi Desa</footer>
      </section>
    </main>
  );
}
