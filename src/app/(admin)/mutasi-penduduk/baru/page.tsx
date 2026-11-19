import type { Metadata } from "next";
import Link from "next/link";
import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import {
  catatDatangAction, catatKelahiranAction, catatKematianAction,
  catatPindahKeluarAction, catatPerubahanAction,
} from "@/app/(admin)/mutasi-penduduk/actions";
import { listPendudukOptionsData } from "@/features/penduduk/application/use-cases";

export const metadata: Metadata = { title: "Catat Mutasi Penduduk" };
const inputClass="form-input";

function Field({label,name,type="text",required=false}:{label:string;name:string;type?:string;required?:boolean}) {
  return <label className="form-field"><span className="form-label">{label}</span><input className={inputClass} name={name} type={type} required={required}/></label>;
}
function ResidentSelect({residents}:{residents:Array<{id:number;name:string}>}) {
  return <label className="form-field"><span className="form-label">Penduduk</span><select className={inputClass} name="residentId" required defaultValue=""><option value="" disabled>Pilih penduduk</option>{residents.map(r=><option key={r.id} value={r.id}>{r.name} · ID {r.id}</option>)}</select></label>;
}
export default async function MutasiBaruPage() {
  const residents=await listPendudukOptionsData();
  return <div className="modul-page data-kependudukan-page"><DataKependudukanNav active="/mutasi-penduduk"/>
    <header className="page-heading"><div><span className="eyebrow">Mutasi Penduduk</span><h1>Catat Mutasi Penduduk</h1><p>Pilih jenis peristiwa. Setiap pencatatan akan memperbarui status penduduk dan menyimpan riwayat mutasi.</p></div><Link className="button button-secondary" href="/mutasi-penduduk">Kembali</Link></header>
    <div className="data-kependudukan-grid">
      <section className="platform-card data-panel"><header><h2>Penduduk Masuk</h2><p>Catat penduduk baru yang pindah masuk ke desa.</p></header><form action={catatDatangAction} className="form-stack"><Field label="Tanggal masuk" name="eventDate" type="date" required/><Field label="Nama lengkap" name="name" required/><Field label="NIK" name="nationalId"/><label className="form-field"><span className="form-label">Jenis kelamin</span><select className={inputClass} name="gender" required defaultValue=""><option value="">Belum diketahui</option><option value="male">Laki-laki</option><option value="female">Perempuan</option></select></label><Field label="Tanggal lahir" name="birthDate" type="date"/><Field label="Alamat asal" name="fromAddress"/><Field label="Alamat di desa" name="address"/><Field label="Nomor surat" name="referenceNo"/><button className="button button-primary" type="submit">Simpan Penduduk Masuk</button></form></section>
      <section className="platform-card data-panel"><header><h2>Kelahiran</h2><p>Daftarkan kelahiran sebagai penduduk desa.</p></header><form action={catatKelahiranAction} className="form-stack"><Field label="Tanggal lahir" name="eventDate" type="date" required/><Field label="Nama bayi" name="name" required/><Field label="NIK (jika tersedia)" name="nationalId"/><label className="form-field"><span className="form-label">Jenis kelamin</span><select className={inputClass} name="gender" defaultValue=""><option value="">Belum diketahui</option><option value="male">Laki-laki</option><option value="female">Perempuan</option></select></label><Field label="Nama ayah" name="fatherName"/><Field label="Nama ibu" name="motherName"/><Field label="Alamat" name="address"/><Field label="Nomor surat" name="referenceNo"/><button className="button button-primary" type="submit">Simpan Kelahiran</button></form></section>
      <section className="platform-card data-panel"><header><h2>Penduduk Keluar</h2><p>Catat penduduk yang pindah keluar dari desa.</p></header><form action={catatPindahKeluarAction} className="form-stack"><ResidentSelect residents={residents}/><Field label="Tanggal pindah" name="eventDate" type="date" required/><Field label="Alamat tujuan" name="toAddress"/><Field label="Kabupaten / kota tujuan" name="destination"/><Field label="Nomor surat" name="referenceNo"/><button className="button button-primary" type="submit">Simpan Pindah Keluar</button></form></section>
      <section className="platform-card data-panel"><header><h2>Kematian</h2><p>Catat peristiwa kematian penduduk.</p></header><form action={catatKematianAction} className="form-stack"><ResidentSelect residents={residents}/><Field label="Tanggal meninggal" name="eventDate" type="date" required/><Field label="Nomor surat kematian" name="referenceNo"/><Field label="Keterangan" name="reason"/><button className="button button-primary" type="submit">Simpan Kematian</button></form></section>
      <section className="platform-card data-panel"><header><h2>Perubahan Data</h2><p>Catat perubahan status kependudukan.</p></header><form action={catatPerubahanAction} className="form-stack"><ResidentSelect residents={residents}/><Field label="Tanggal perubahan" name="eventDate" type="date" required/><label className="form-field"><span className="form-label">Status baru</span><select className={inputClass} name="lifeStatus" required defaultValue=""><option value="" disabled>Pilih status</option><option value="missing">Hilang</option><option value="departed">Pergi</option><option value="invalid">Tidak Valid</option></select></label><Field label="Alasan" name="reason"/><Field label="Nomor dokumen" name="referenceNo"/><button className="button button-primary" type="submit">Simpan Perubahan</button></form></section>
    </div>
  </div>;
}
