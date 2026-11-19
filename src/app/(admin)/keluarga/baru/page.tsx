import type { Metadata } from "next";
import Link from "next/link";
import { buatKeluargaAction } from "@/app/(admin)/keluarga/actions";
import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import { getKeluargaReference } from "@/features/keluarga/application/use-cases";

export const metadata: Metadata = { title: "Tambah Kartu Keluarga" };

export default async function KeluargaBaruPage() {
  const reference = await getKeluargaReference();
  return <div className="modul-page data-kependudukan-page">
    <DataKependudukanNav active="/keluarga"/>
    <header className="page-heading"><div><span className="eyebrow">Kartu Keluarga</span><h1>Tambah Kartu Keluarga</h1><p>Daftarkan nomor KK dan wilayah tempat tinggal keluarga.</p></div></header>
    <section className="platform-card data-panel"><form action={buatKeluargaAction} className="form-stack">
      <label className="form-field"><span className="form-label">Nomor Kartu Keluarga</span><input className="form-input" inputMode="numeric" maxLength={16} minLength={16} name="number" pattern="[0-9]{16}" required/></label>
      <label className="form-field"><span className="form-label">Alamat</span><textarea className="form-input" maxLength={255} name="address" rows={3}/></label>
      <label className="form-field"><span className="form-label">Dusun / RT / RW</span><select className="form-input" defaultValue="" name="regionId"><option value="">Belum ditentukan</option>{reference.regions.map((item)=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <div className="penduduk-heading-actions"><Link className="button button-secondary" href="/keluarga">Batal</Link><button className="button button-primary" type="submit">Simpan KK</button></div>
    </form></section>
  </div>;
}
