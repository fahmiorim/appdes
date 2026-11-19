import type { Metadata } from "next";
import Link from "next/link";
import { simpanIdentitasWebsiteAction } from "../actions";
import { getWebsiteSettingsData } from "@/features/publik/application/website-admin";
import { WebsiteAdminShell, WebsiteSection } from "../website-admin-shell";

export const metadata: Metadata = { title: "Pengaturan Website Desa" };

export default async function WebsiteSettingsPage() {
  const desa = await getWebsiteSettingsData();
  const domain = desa?.domain ? `https://${desa.domain}` : desa?.website?.startsWith("http") ? desa.website : null;
  return (
    <WebsiteAdminShell title="Pengaturan Website" active="/website/pengaturan" description={`Kelola identitas, domain, dan informasi publik ${desa?.namaDesa ?? "desa"}.`} action={domain ? <Link className="website-button website-button-outline" href={domain} target="_blank" rel="noreferrer">↗ Lihat Website</Link> : <span className="website-status website-status-off">Domain belum diatur</span>}>
      <nav className="website-settings-tabs" aria-label="Kategori pengaturan"><a className="is-active" href="#identitas">Identitas & Umum</a><a href="#kontak">Kontak Publik</a><a href="#domain">Domain & Akses</a><a href="#informasi">Informasi Teknis</a></nav>
      <form action={simpanIdentitasWebsiteAction} className="website-settings-layout">
        <div className="website-settings-main">
          <WebsiteSection title="Informasi Desa (Identitas Website)">
            <div className="website-form-grid" id="identitas">
              <label>Nama Website / Desa *<input name="namaDesa" required maxLength={100} defaultValue={desa?.namaDesa ?? ""}/></label>
              <label>Kode Desa<input name="kodeDesa" maxLength={10} defaultValue={desa?.kodeDesa ?? ""}/></label>
              <label>Slogan / Tagline<input name="website" maxLength={150} defaultValue={desa?.website ?? ""} placeholder="Alamat website atau tagline"/></label>
              <label>Kode Pos<input name="kodePos" maxLength={5} defaultValue={desa?.kodePos ?? ""}/></label>
              <label>Kecamatan<input name="namaKecamatan" defaultValue={desa?.namaKecamatan ?? ""}/></label>
              <label>Kabupaten<input name="namaKabupaten" defaultValue={desa?.namaKabupaten ?? ""}/></label>
              <label>Provinsi<input name="namaPropinsi" defaultValue={desa?.namaPropinsi ?? ""}/></label>
              <label>Nama Kepala Desa<input name="namaKepalaDesa" defaultValue={desa?.namaKepalaDesa ?? ""}/></label>
              <label className="span-two">Alamat Kantor Desa<textarea name="alamatKantor" rows={3} defaultValue={desa?.alamatKantor ?? ""}/></label>
            </div>
          </WebsiteSection>
          <WebsiteSection title="Kontak Publik">
            <div className="website-form-grid" id="kontak">
              <label>Email Desa<input name="emailDesa" type="email" defaultValue={desa?.emailDesa ?? ""}/></label>
              <label>Telepon / HP<input name="telepon" defaultValue={desa?.telepon ?? ""}/></label>
              <label>NIP Kepala Desa<input name="nipKepalaDesa" defaultValue={desa?.nipKepalaDesa ?? ""}/></label>
            </div>
          </WebsiteSection>
          <WebsiteSection title="Domain & Akses Website">
            <div className="website-details" id="domain"><div><dt>Domain utama</dt><dd>{desa?.domain ?? "Belum dipetakan oleh Super Admin"}</dd></div><div><dt>URL publik</dt><dd>{domain ? <Link href={domain} target="_blank" rel="noreferrer">{domain}</Link> : "Belum tersedia"}</dd></div></div>
            <p className="website-hint">Pemetaan domain dan alias dikelola Super Admin agar tidak terjadi konflik antar-tenant.</p>
          </WebsiteSection>
        </div>
        <aside className="website-settings-aside">
          <WebsiteSection title="Status & Akses Website"><div className="website-status-banner"><span>●</span><div><strong>{domain ? "Domain terkonfigurasi" : "Domain belum terkonfigurasi"}</strong><small>{domain ? "Alamat publik tersedia untuk dibuka." : "Hubungi Super Admin untuk pemetaan domain."}</small></div></div><dl className="website-details"><div><dt>Identitas desa</dt><dd>{desa?.namaDesa ? "Lengkap sebagian" : "Belum diisi"}</dd></div><div><dt>Terakhir diperbarui</dt><dd>{desa ? "Tersimpan di data tenant" : "Belum tersedia"}</dd></div></dl></WebsiteSection>
          <WebsiteSection title="Pengaturan Umum"><p className="website-hint">Logo, tema, SEO, integrasi, dan navigasi dikelola pada modul Website Desa setelah katalog tema dan konfigurasi masing-masing diaktifkan.</p></WebsiteSection>
          <button className="website-button website-button-primary" type="submit">✓ Simpan Perubahan</button>
        </aside>
      </form>
    </WebsiteAdminShell>
  );
}