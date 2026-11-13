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
    <main className="auth-screen">
      <section className="auth-visual" aria-label="Informasi platform">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            ⌂
          </span>
          <span>FlexiDesa</span>
        </div>
        <div className="auth-visual-copy">
          <span className="eyebrow">Layanan digital pemerintahan desa</span>
          <h1>Administrasi desa, lebih mudah dan terhubung.</h1>
          <p>
            Satu ruang kerja untuk mengelola data, pelayanan, dan informasi desa dengan lebih
            tertata.
          </p>
        </div>
        <div className="auth-visual-footer">Platform layanan desa · {APP_NAME}</div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">Selamat datang kembali</span>
          <h2>Masuk ke akun Anda</h2>
          <p className="auth-intro">
            Gunakan nama pengguna dan kata sandi yang diberikan oleh administrator desa.
          </p>
          <LoginForm nextPath={nextPath} />
          <p className="form-help" style={{ marginTop: 24, textAlign: "center" }}>
            Mengalami kendala masuk? Hubungi administrator desa Anda.
          </p>
        </div>
      </section>
    </main>
  );
}
