import type { Metadata } from "next";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { bacaPengaturan } from "@/features/pengaturan/application/pengaturan-use-cases";

import { FormPendaftaranWarga } from "./form-pendaftaran";

export const metadata: Metadata = {
  title: "Pendaftaran Akun Warga",
  description: "Ajukan akun layanan mandiri warga desa.",
  robots: { index: false, follow: false },
};

export default async function DaftarWargaPage() {
  const desa = await getIdentitasFromRequest();
  const pengaturan = await bacaPengaturan(desa.id);

  return (
    <main className="page-container warga-page" style={{ maxWidth: 620, paddingTop: 48, paddingBottom: 64 }}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Layanan Digital {desa.namaDesa ?? "Desa"}</span>
          <h1>Pendaftaran Akun Warga</h1>
          <p>Ajukan akses layanan mandiri untuk mengurus layanan administrasi desa secara daring.</p>
        </div>
      </div>
      <section className="platform-card" style={{ padding: 28 }}>
        {pengaturan.pendaftaranWargaAktif ? (
          <>
            <h2>Formulir Pendaftaran</h2>
            <p>Isi data sesuai KTP dan data kependudukan yang tercatat di desa.</p>
            <FormPendaftaranWarga />
          </>
        ) : (
          <>
            <h2>Pendaftaran Sedang Ditutup</h2>
            <p>Pemerintah desa sedang tidak menerima pengajuan akun baru. Silakan hubungi kantor desa untuk informasi lebih lanjut.</p>
          </>
        )}
        <p style={{ marginTop: 24 }}>Sudah memiliki akun? <Link href="/masuk">Masuk ke layanan warga</Link></p>
      </section>
    </main>
  );
}
