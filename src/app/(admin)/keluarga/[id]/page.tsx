import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import { getKeluargaDetail } from "@/features/keluarga/application/use-cases";
import { hapusKeluargaAction, lepasAnggotaKeluargaAction } from "@/app/(admin)/keluarga/actions";
import { AKSI_LOG_LABELS, KELUARGA_RESOURCE } from "@/features/keluarga/domain/keluarga";
import { LIFE_STATUS_LABELS, PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import { hasPermission } from "@/features/rbac/application/authorization";
import { verifySession } from "@/lib/dal";

export const metadata: Metadata = { title: "Detail Kartu Keluarga" };
const number = new Intl.NumberFormat("id-ID");

export default async function DetailKeluargaPage({params}:{params:Promise<{id:string}>}) {
  const {id:raw}=await params; const id=Number(raw);
  if(!Number.isInteger(id)||id<=0) notFound();
  const [detail,user]=await Promise.all([getKeluargaDetail(id),verifySession()]);
  const bolehUbahKk=hasPermission(user.permissions,KELUARGA_RESOURCE,"update");
  const bolehHapusKk=hasPermission(user.permissions,KELUARGA_RESOURCE,"delete");
  const bolehUbahPenduduk=hasPermission(user.permissions,PENDUDUK_RESOURCE,"update");
  return <div className="modul-page data-kependudukan-page">
    <DataKependudukanNav active="/keluarga"/>
    <header className="page-heading"><div><span className="eyebrow">Kartu Keluarga</span><h1>Detail Kartu Keluarga</h1><p>Nomor KK {detail.keluarga.number}</p></div><div className="penduduk-heading-actions"><Link className="button button-secondary" href="/keluarga">Kembali</Link>{bolehUbahKk?<Link className="button button-secondary" href={`/keluarga/${id}/ubah`}>Ubah Data KK</Link>:null}<Link className="button button-primary" href={`/keluarga/${id}/pdf`}>Cetak KK</Link>{bolehHapusKk&&detail.members.length===0?<form action={hapusKeluargaAction}><input type="hidden" name="id" value={id}/><button className="button button-danger" type="submit">Hapus KK Kosong</button></form>:null}</div></header>
    <section className="data-kependudukan-kpis"><article className="data-kpi data-kpi-primary"><span>Kepala Keluarga</span><strong>{detail.headName??"Belum ditentukan"}</strong><small>Identitas kepala keluarga</small></article><article className="data-kpi"><span>Nomor KK</span><strong>{detail.keluarga.number}</strong><small>{detail.regionLabel??"Wilayah belum ditentukan"}</small></article><article className="data-kpi"><span>Jumlah Anggota</span><strong>{number.format(detail.members.length)} orang</strong><small>Termasuk riwayat status anggota</small></article></section>
    <section className="platform-card data-panel"><header className="data-section-heading"><div><h2>Anggota Keluarga</h2><p>Daftar anggota dan hubungan dalam keluarga.</p></div>{bolehUbahPenduduk?<Link className="button button-primary" href={`/penduduk/baru?familyId=${id}`}>+ Tambah Anggota</Link>:null}</header>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>No.</th><th>Nama</th><th>NIK</th><th>Jenis Kelamin</th><th>Hubungan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{detail.members.map((member,index)=><tr key={member.id}><td>{index+1}</td><td>{member.name}</td><td>{member.nationalId??"—"}</td><td>{member.gender==="male"?"Laki-laki":"Perempuan"}</td><td>{member.relationName??"Belum ditentukan"}</td><td>{LIFE_STATUS_LABELS[member.lifeStatus]}</td><td><Link href={`/penduduk/${member.id}`}>Detail</Link>{bolehUbahPenduduk?<> · <Link href={`/penduduk/${member.id}/ubah`}>Ubah</Link>{member.relationName?.toLowerCase().includes("kepala")&&detail.members.length>1?null:<form action={lepasAnggotaKeluargaAction} className="inline-form"><input type="hidden" name="id" value={member.id}/><input type="hidden" name="familyId" value={id}/><button className="button button-danger" type="submit">Lepas dari KK</button></form>}</>:null}</td></tr>)}</tbody></table></div>
    </section>
    <section className="platform-card data-panel"><header><h2>Riwayat Perubahan Anggota</h2><p>Jejak perubahan keanggotaan pada KK ini.</p></header>
      {detail.logs.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Waktu</th><th>Nama</th><th>Perubahan</th><th>Petugas</th></tr></thead><tbody>{detail.logs.map(log=><tr key={log.id}><td>{log.createdAt}</td><td>{log.residentName}</td><td>{AKSI_LOG_LABELS[log.aksi]}</td><td>{log.actorName??"—"}</td></tr>)}</tbody></table></div>:<p className="modul-empty">Belum ada riwayat perubahan anggota.</p>}
    </section>
  </div>;
}
