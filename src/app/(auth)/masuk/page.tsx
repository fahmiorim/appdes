import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/(auth)/masuk/login-form";
import { APP_NAME } from "@/lib/app-config";
import { getCurrentUser } from "@/lib/dal";
import { safeNextPath } from "@/lib/safe-next-path";

export const metadata: Metadata = {
  title: "Masuk",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ next?: string | string[] }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);

  if (user) {
    redirect(user.residentId !== null ? "/layanan-mandiri" : nextPath);
  }

  return (
    <div className="login-site">
      <header className="login-site-header">
        <a className="login-brand" href="#top" aria-label="FlexiDesa, beranda">
          <img className="login-brand-symbol" src="/images/flexidesa-mark.svg" alt="" />
          <span className="login-brand-copy">
            <strong>FlexiDesa</strong>
            <small>Sistem Informasi Desa</small>
          </span>
        </a>

        <nav className="login-public-nav" aria-label="Navigasi situs desa">
          <span aria-current="page">Beranda</span>
          <span>Profil Desa</span>
          <span>Pemerintahan</span>
          <span>Layanan</span>
          <span>Informasi</span>
        </nav>

        <a className="login-header-cta" href="#login-card">
          Masuk
        </a>
      </header>

      <main id="top">
        <section className="login-hero">
          <div className="login-hero-left">
            <div className="login-hero-copy">
              <span className="login-hero-badge">LAYANAN DIGITAL WARGA DESA</span>
              <h1>
                Layanan Digital
                <br />
                Warga Desa
              </h1>
              <p>
                Akses layanan administrasi, informasi, dan berbagai layanan publik desa secara
                online, mudah, cepat, dan aman.
              </p>
              <span className="login-hero-rule" aria-hidden="true" />
            </div>
            <div
              className="login-hero-photo"
              role="img"
              aria-label="Ilustrasi kantor desa dan bendera Merah Putih"
            />
          </div>

          <div className="login-form-area">
            <section className="login-card" id="login-card" aria-labelledby="login-title">
              <div className="login-illustration" aria-hidden="true">
                <img src="/images/login-security.svg" alt="" />
              </div>
              <span className="login-card-eyebrow">SELAMAT DATANG KEMBALI</span>
              <h2 id="login-title">Masuk ke Akun</h2>
              <p className="login-card-intro">
                Gunakan akun Anda untuk mengakses layanan warga desa.
              </p>

              <LoginForm nextPath={nextPath} />

              <p className="login-card-help">
                Mengalami kendala masuk? Hubungi administrator desa Anda.
              </p>
            </section>
          </div>
        </section>

        <section className="login-benefits" aria-label="Keunggulan layanan desa">
          <article className="login-benefit">
            <span className="login-benefit-icon" aria-hidden="true"><img src="/images/benefit-fast.svg" alt="" /></span>
            <div>
              <h3>Cepat &amp; Mudah</h3>
              <p>Akses layanan desa kapan saja, di mana saja.</p>
            </div>
          </article>
          <article className="login-benefit">
            <span className="login-benefit-icon" aria-hidden="true"><img src="/images/benefit-secure.svg" alt="" /></span>
            <div>
              <h3>Aman &amp; Terpercaya</h3>
              <p>Data Anda dilindungi dengan sistem keamanan.</p>
            </div>
          </article>
          <article className="login-benefit">
            <span className="login-benefit-icon" aria-hidden="true"><img src="/images/benefit-services.svg" alt="" /></span>
            <div>
              <h3>Layanan Lengkap</h3>
              <p>Berbagai layanan administrasi dan informasi desa.</p>
            </div>
          </article>
          <article className="login-benefit">
            <span className="login-benefit-icon" aria-hidden="true"><img src="/images/benefit-devices.svg" alt="" /></span>
            <div>
              <h3>Multi Perangkat</h3>
              <p>Dapat diakses melalui komputer, tablet, dan ponsel.</p>
            </div>
          </article>
        </section>
      </main>

      <footer className="login-footer">
        <div className="login-footer-main">
          <div className="login-footer-brand">
            <img className="login-brand-symbol" src="/images/flexidesa-mark.svg" alt="" />
            <div>
              <strong>FlexiDesa</strong>
              <span>{APP_NAME}</span>
            </div>
          </div>
          <div>
            <h3>Butuh Bantuan?</h3>
            <p>Hubungi administrator desa untuk bantuan akun dan layanan.</p>
          </div>
          <div>
            <h3>Layanan Desa</h3>
            <p>Administrasi, informasi, dan pelayanan publik desa.</p>
          </div>
          <div>
            <h3>Platform</h3>
            <p>Terhubung, mudah diakses, dan aman untuk warga.</p>
          </div>
        </div>
        <div className="login-footer-bottom">
          <span>© {new Date().getFullYear()} FlexiDesa. Hak cipta dilindungi.</span>
          <span>Sistem Informasi Desa</span>
        </div>
      </footer>
    </div>
  );
}
