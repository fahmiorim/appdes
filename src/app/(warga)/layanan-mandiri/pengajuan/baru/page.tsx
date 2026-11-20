import Link from "next/link";
import { redirect } from "next/navigation";
import { getLayananPublikWargaData } from "@/features/pelayanan/application/pengajuan-use-cases";
import { ajukanLayananWargaAction } from "./actions";
import { verifyWargaPage } from "@/lib/dal";

export const metadata = { title: "Ajukan Layanan Publik", robots: { index: false, follow: false } };

export default async function AjukanLayananPage() {
  await verifyWargaPage();
  const { profil, layanan, kontakEmail } = await getLayananPublikWargaData();
  if (layanan.length === 0) redirect("/layanan-mandiri/beranda?layanan=kosong");
  return <main className="page-container warga-page">
    <div className="page-heading"><div><span className="eyebrow">Layanan Mandiri / Pelayanan Publik</span><h1>Ajukan Layanan</h1><p>Isi data pengajuan. Identitas pemohon diambil dari data kependudukan akun Anda.</p></div><Link className="button button-secondary" href="/layanan-mandiri/beranda">Kembali</Link></div>
    <section className="dashboard-section"><h2>Data Pemohon</h2><dl><dt>Nama</dt><dd>{profil.name}</dd><dt>NIK</dt><dd>{profil.nationalId ?? "Belum tercatat"}</dd><dt>Alamat</dt><dd>{profil.address ?? "Belum tercatat"}</dd></dl></section>
    <section className="dashboard-section"><h2>Formulir Pengajuan</h2><form action={ajukanLayananWargaAction} className="modul-form-grid" encType="multipart/form-data">
      <label className="modul-field"><span>Pilih layanan</span><select name="layananId" required defaultValue=""><option value="" disabled>Pilih layanan</option>{layanan.map(item=><option key={item.id} value={item.id}>{item.nama} — {item.biaya===0?"Gratis":item.biaya.toLocaleString("id-ID")+" rupiah"}</option>)}</select></label>
      <label className="modul-field"><span>Nomor telepon / WhatsApp aktif</span><input name="telepon" type="tel" required minLength={8} maxLength={30} defaultValue={profil.phone ?? ""}/></label>
      <label className="modul-field"><span>Email (opsional)</span><input name="email" type="email" maxLength={150} defaultValue={kontakEmail}/></label>
      <label className="modul-field" style={{gridColumn:"1 / -1"}}><span>Keperluan / keterangan</span><textarea name="keperluan" rows={5} minLength={10} maxLength={4000} required placeholder="Jelaskan keperluan layanan Anda secara rinci"/></label>
      <label className="modul-field" style={{gridColumn:"1 / -1"}}><span>Lampiran pendukung (PDF, maks. 20 MB)</span><input name="lampiran" type="file" accept="application/pdf,.pdf" required/><small>Unggah dokumen PDF. Berkas disimpan privat dan hanya dapat dibuka oleh pemohon serta petugas desa yang berwenang.</small></label>
      <div style={{gridColumn:"1 / -1"}}><button className="button button-primary" type="submit">Kirim Pengajuan</button></div>
    </form></section>
  </main>;
}
