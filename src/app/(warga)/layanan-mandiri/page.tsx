import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Layanan Mandiri Warga",
  description:
    "Ajukan surat, pantau permohonan, dan simpan dokumen pribadi secara daring melalui layanan mandiri desa.",
};

/**
 * Halaman informasi layanan mandiri (publik).
 *
 * Rute ini sengaja tidak mewajibkan sesi: warga perlu tahu layanan apa yang
 * tersedia sebelum membuat akun. Setelah masuk, CTA mengarah ke beranda warga.
 */
export default async function LayananMandiriPage() {
  const [desa, user] = await Promise.all([getIdentitasFromRequest(), getCurrentUser()]);
  const sudahMasuk = user?.residentId != null;
  const tujuanMasuk = "/masuk?next=%2Flayanan-mandiri%2Fberanda";

  return (
    <main className="page-container warga-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Layanan digital</span>
          <h1>Layanan Mandiri Warga</h1>
          <p>
            Akses layanan administrasi {desa.namaDesa ?? "desa ini"} secara daring: ajukan surat,
            pantau prosesnya, dan simpan dokumen pribadi Anda.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <Card>
          <div className="stat-card-label">Ajukan surat</div>
          <div className="stat-card-value" aria-hidden="true">
            1
          </div>
          <div className="stat-card-note">
            Pilih jenis surat, lengkapi isian, dan unggah syarat yang diminta.
          </div>
        </Card>
        <Card>
          <div className="stat-card-label">Pantau permohonan</div>
          <div className="stat-card-value" aria-hidden="true">
            2
          </div>
          <div className="stat-card-note">
            Lihat status permohonan dan nomor antrean tanpa datang ke kantor desa.
          </div>
        </Card>
        <Card>
          <div className="stat-card-label">Arsip dokumen</div>
          <div className="stat-card-value" aria-hidden="true">
            3
          </div>
          <div className="stat-card-note">
            Simpan KTP, KK, dan dokumen lain agar siap dipakai pada pengajuan berikutnya.
          </div>
        </Card>
      </div>

      <section className="dashboard-section">
        <h2>{sudahMasuk ? "Lanjutkan ke beranda warga" : "Masuk untuk mulai"}</h2>
        <p>
          {sudahMasuk
            ? "Sesi Anda aktif. Buka beranda layanan untuk melihat permohonan dan dokumen Anda."
            : "Gunakan NIK dan PIN yang diberikan administrator desa. Jika PIN masih sementara, Anda akan diminta menggantinya lebih dulu."}
        </p>
        <div className="quick-links">
          <Link
            className="button button-primary"
            href={sudahMasuk ? "/layanan-mandiri/beranda" : tujuanMasuk}
          >
            {sudahMasuk ? "Buka beranda warga" : "Masuk ke layanan"}
          </Link>
          <Link className="button button-secondary" href="/">
            Kembali ke website desa
          </Link>
        </div>
      </section>
    </main>
  );
}
