import type { Metadata } from "next";

import { verifyWargaSession } from "@/lib/dal";

import { UbahPinForm } from "./ubah-pin-form";

export const metadata: Metadata = {
  title: "Ubah PIN",
  robots: { index: false, follow: false },
};

/**
 * Halaman ubah PIN.
 *
 * Memakai `verifyWargaSession` (bukan `verifyWargaPage`) karena halaman ini
 * justru menjadi tujuan redirect ketika PIN masih sementara; memakai
 * `verifyWargaPage` akan membuat loop redirect.
 */
export default async function UbahPinPage() {
  const user = await verifyWargaSession();

  return (
    <main className="page-container warga-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Keamanan akun</span>
          <h1>Ubah PIN</h1>
          <p>
            PIN dipakai untuk masuk ke layanan mandiri. Gunakan 6 angka yang tidak mudah ditebak dan
            jangan bagikan kepada siapa pun.
          </p>
        </div>
      </div>

      <section className="dashboard-section" style={{ maxWidth: 540 }}>
        <UbahPinForm mustChangePin={user.mustChangePin} />
      </section>
    </main>
  );
}
