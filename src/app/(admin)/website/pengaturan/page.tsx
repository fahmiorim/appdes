import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { simpanIdentitasWebsiteAction, simpanTemaWebsiteAction } from "../actions";
import { getWebsiteSettingsData } from "@/features/publik/application/website-admin";
import { WebsiteAdminShell, WebsiteSection } from "../website-admin-shell";

export const metadata: Metadata = { title: "Pengaturan Website Desa" };

export default async function WebsiteSettingsPage() {
  const data = await getWebsiteSettingsData();
  const desa = data.identitas;
  const domain = desa?.domain ? `https://${desa.domain}` : desa?.website?.startsWith("http") ? desa.website : null;
  let branding: { warnaUtama?: string; warnaAksen?: string; font?: string; logoTampil?: boolean } = {};
  try {
    const parsed = data.tema?.opsi ? JSON.parse(data.tema.opsi) as { branding?: typeof branding } : {};
    branding = parsed.branding ?? {};
  } catch { branding = {}; }
  return (
    <WebsiteAdminShell title="Pengaturan Website" active="/website/pengaturan" description={`Kelola identitas, tampilan, dan akses publik ${desa?.namaDesa ?? "desa"}.`} action={domain ? <Link className="website-button website-button-outline" href={domain} target="_blank" rel="noreferrer">↗ Lihat Website</Link> : <span className="website-status website-status-off">Domain belum diatur</span>}>
      <nav className="website-settings-tabs" aria-label="Kategori pengaturan"><a className="is-active" href="#identitas">Identitas & Umum</a><a href="#kontak">Kontak Publik</a><a href="#domain">Domain & Akses</a><a href="#tema">Tema & Tampilan</a></nav>
      <form action={simpanIdentitasWebsiteAction} className="website-settings-layout" encType="multipart/form-data">
        <div className="website-settings-main">
          <WebsiteSection title="Informasi Desa (Identitas Website)">
            <div className="website-form-grid" id="identitas">
              <label>Nama Website / Desa *<input name="namaDesa" required maxLength={100} defaultValue={desa?.namaDesa ?? ""}/></label>
              <label>Kode Desa<input name="kodeDesa" maxLength={10} defaultValue={desa?.kodeDesa ?? ""}/></label>
              <label>Alamat Website (URL)<input name="website" maxLength={150} defaultValue={desa?.website ?? ""} placeholder="https://desa.example.id"/></label>
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
          <WebsiteSection title="Identitas Visual">
            <div className="website-form-grid">
              <label>Logo Desa (JPG/PNG/WEBP)<input name="logo" type="file" accept="image/jpeg,image/png,image/webp"/></label>
              <label>Tanda Tangan Kepala Desa<input name="tandaTangan" type="file" accept="image/jpeg,image/png,image/webp"/></label>
              <label>Stempel Desa<input name="stempel" type="file" accept="image/jpeg,image/png,image/webp"/></label>
            </div>
            <div className="website-identity-previews">{desa?.logo ? <div><Image src={`/api/publik/media/${desa.logo.split("/").map(encodeURIComponent).join("/")}`} alt="Logo desa" width={72} height={72} unoptimized/><span>Logo tersimpan</span></div> : <span>Belum ada logo desa</span>}</div>
          </WebsiteSection>
          <WebsiteSection title="Domain & Akses Website">
            <div className="website-details" id="domain"><div><dt>Domain utama</dt><dd>{desa?.domain ?? "Belum dipetakan oleh Super Admin"}</dd></div><div><dt>URL publik</dt><dd>{domain ? <Link href={domain} target="_blank" rel="noreferrer">{domain}</Link> : "Belum tersedia"}</dd></div></div>
            <p className="website-hint">Pemetaan domain, alias, dan sertifikat SSL dikelola Super Admin. Admin Desa dapat mengubah alamat website profil, tetapi tidak mengambil alih konfigurasi DNS.</p>
          </WebsiteSection>
        </div>
        <aside className="website-settings-aside">
          <WebsiteSection title="Status & Akses Website">
            <div className="website-status-banner"><span>●</span><div><strong>{domain ? "Domain terkonfigurasi" : "Domain belum terkonfigurasi"}</strong><small>{domain ? "Domain utama telah dipetakan." : "Hubungi Super Admin untuk pemetaan domain."}</small></div></div>
            <dl className="website-details"><div><dt>Identitas desa</dt><dd>{desa?.namaDesa && desa?.alamatKantor ? "Identitas dasar tersedia" : "Perlu dilengkapi"}</dd></div><div><dt>Tema aktif</dt><dd>{data.tema?.nama ?? "Belum disiapkan"}</dd></div></dl>
          </WebsiteSection>
          <button className="website-button website-button-primary" type="submit">✓ Simpan Identitas</button>
        </aside>
      </form>
      <WebsiteSection title="Tema & Tampilan Website">
        <div id="tema" className="website-theme-summary"><div><strong>{data.tema?.nama ?? "Tema belum tersedia"}</strong><span>{data.tema ? `Versi ${data.tema.versi} · dikelola dari katalog template platform` : "Minta Super Admin menyiapkan template untuk desa ini."}</span></div><span className="website-status">{data.tema ? "Aktif" : "Belum tersedia"}</span></div>
        {data.tema ? <form action={simpanTemaWebsiteAction} className="website-inline-form"><div className="website-form-grid"><label>Warna Utama<input name="warnaUtama" type="color" defaultValue={branding.warnaUtama ?? "#0B65F5"}/></label><label>Warna Aksen<input name="warnaAksen" type="color" defaultValue={branding.warnaAksen ?? "#7A20F0"}/></label><label>Tipografi<select name="font" defaultValue={branding.font ?? "system"}><option value="system">System</option><option value="sans">Sans Serif</option><option value="serif">Serif</option></select></label><label className="website-checkbox"><input name="logoTampil" type="checkbox" defaultChecked={branding.logoTampil ?? true}/> Tampilkan logo desa</label></div><p className="website-hint">Pilihan template tersedia melalui katalog Template & Tampilan Super Admin. Pengaturan di sini hanya mengubah branding yang diizinkan oleh tema aktif.</p><button className="website-button website-button-primary" type="submit">Simpan Tampilan</button></form> : null}
      </WebsiteSection>
    </WebsiteAdminShell>
  );
}
