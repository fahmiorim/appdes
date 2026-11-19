import type { Metadata } from "next";
import { getWebsiteSettingsData } from "@/features/publik/application/website-admin";
import { WebsiteAdminShell, WebsiteSection } from "../website-admin-shell";

export const metadata: Metadata = { title: "Pengaturan Website Desa" };

export default async function WebsiteSettingsPage() {
  const desa = await getWebsiteSettingsData();
  return (
    <WebsiteAdminShell title="Pengaturan Website" active="/website/pengaturan" description="Kelola identitas dan informasi kontak yang digunakan pada website publik desa.">
      <div className="website-dashboard-grid website-settings-grid">
        <WebsiteSection title="Informasi Desa (Identitas Website)">
          <dl className="website-details"><div><dt>Nama Desa</dt><dd>{desa?.namaDesa ?? "Belum diisi"}</dd></div><div><dt>Kode Desa</dt><dd>{desa?.kodeDesa ?? "—"}</dd></div><div><dt>Kecamatan</dt><dd>{desa?.namaKecamatan ?? "—"}</dd></div><div><dt>Kabupaten</dt><dd>{desa?.namaKabupaten ?? "—"}</dd></div><div><dt>Provinsi</dt><dd>{desa?.namaPropinsi ?? "—"}</dd></div><div><dt>Alamat Kantor</dt><dd>{desa?.alamatKantor ?? "Belum diisi"}</dd></div></dl>
          <p className="website-hint">Perubahan identitas desa dilakukan melalui modul Pengaturan Desa. Data di sini mengikuti identitas tenant yang tersimpan.</p>
        </WebsiteSection>
        <WebsiteSection title="Status & Akses Website">
          <dl className="website-details"><div><dt>Domain utama</dt><dd>{desa?.domain ?? "Belum dipetakan"}</dd></div><div><dt>Alamat website</dt><dd>{desa?.website ?? "Belum diatur"}</dd></div><div><dt>Email publik</dt><dd>{desa?.emailDesa ?? "Belum diisi"}</dd></div><div><dt>Telepon</dt><dd>{desa?.telepon ?? "Belum diisi"}</dd></div><div><dt>Nama Kepala Desa</dt><dd>{desa?.namaKepalaDesa ?? "Belum diisi"}</dd></div></dl>
        </WebsiteSection>
      </div>
    </WebsiteAdminShell>
  );
}