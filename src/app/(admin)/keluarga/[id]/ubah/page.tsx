import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ubahKeluargaAction } from "@/app/(admin)/keluarga/actions";
import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import { getKeluargaDetail, getKeluargaReference } from "@/features/keluarga/application/use-cases";

export const metadata: Metadata = { title: "Ubah Kartu Keluarga" };
export default async function UbahKeluargaPage({params}:{params:Promise<{id:string}>}) {
  const {id:raw}=await params; const id=Number(raw);
  if(!Number.isInteger(id)||id<=0) notFound();
  const [detail,reference]=await Promise.all([getKeluargaDetail(id),getKeluargaReference()]);
  return <div className="modul-page data-kependudukan-page"><DataKependudukanNav active="/keluarga"/>
    <header className="page-heading"><div><span className="eyebrow">Kartu Keluarga</span><h1>Ubah Data Kartu Keluarga</h1><p>Perbarui nomor KK, alamat, dan wilayah keluarga.</p></div></header>
    <section className="platform-card data-panel"><form action={ubahKeluargaAction.bind(null,id)} className="form-stack">
      <label className="form-field"><span className="form-label">Nomor Kartu Keluarga</span><input className="form-input" defaultValue={detail.keluarga.number} inputMode="numeric" maxLength={16} minLength={16} name="number" pattern="[0-9]{16}" required/></label>
      <label className="form-field"><span className="form-label">Alamat</span><textarea className="form-input" defaultValue={detail.keluarga.address??""} maxLength={255} name="address" rows={3}/></label>
      <label className="form-field"><span className="form-label">Dusun / RT / RW</span><select className="form-input" defaultValue={detail.keluarga.regionId??""} name="regionId"><option value="">Belum ditentukan</option>{reference.regions.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <div className="penduduk-heading-actions"><Link className="button button-secondary" href={`/keluarga/${id}`}>Batal</Link><button className="button button-primary" type="submit">Simpan Perubahan</button></div>
    </form></section>
  </div>;
}
