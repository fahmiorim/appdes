import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import { getPendudukFilterOptionsData } from "@/features/penduduk/application/use-cases";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { getStatistikPendudukUseCase } from "@/features/statistik/application/statistik-use-cases";
import { STATISTIK_LABELS, STATISTIK_PENDUDUK_KINDS, type StatistikPendudukKind } from "@/features/statistik/domain/statistik";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { verifySession } from "@/lib/dal";

export const metadata:Metadata={title:"Buat Laporan Kustom Kependudukan"};
const number=new Intl.NumberFormat("id-ID");
function str(params:Record<string,string|string[]|undefined>,key:string) {
  const value=params[key];return typeof value==="string"?value.trim().slice(0,100):"";
}
function umur(value:string):number|undefined {
  if(!/^\d{1,3}$/.test(value))return undefined;
  const n=Number(value);return n>=0&&n<=120?n:undefined;
}

export default async function LaporanKustomPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const [params,user]=await Promise.all([searchParams,verifySession()]);
  if(!hasPermission(user.permissions,RESOURCES.laporanPenduduk,"read"))notFound();
  const villageId=await resolveVillageId(user);
  const [filters]=await Promise.all([getPendudukFilterOptionsData()]);
  const requested=str(params,"kind");
  const kind=(STATISTIK_PENDUDUK_KINDS as readonly string[]).includes(requested)?requested as StatistikPendudukKind:"gender";
  const dusun=str(params,"dusun"),rw=str(params,"rw"),rt=str(params,"rt");
  const umurMin=umur(str(params,"umurMin")),umurMax=umur(str(params,"umurMax"));
  const applied=Boolean(dusun||rw||rt||umurMin!==undefined||umurMax!==undefined);
  const report=await getStatistikPendudukUseCase(villageId,{kind,dusun:dusun||undefined,rw:rw||undefined,rt:rt||undefined,umurMin,umurMax,perPage:100});
  const max=Math.max(1,...report.rows.map(row=>row.total));
  const query=new URLSearchParams();
  query.set("kind",kind);
  if(dusun)query.set("dusun",dusun);if(rw)query.set("rw",rw);if(rt)query.set("rt",rt);
  if(umurMin!==undefined)query.set("umurMin",String(umurMin));if(umurMax!==undefined)query.set("umurMax",String(umurMax));
  const exportQuery=query.toString();
  return <div className="modul-page data-kependudukan-page">
    <DataKependudukanNav active="/statistik/penduduk"/>
    <header className="page-heading"><div><span className="eyebrow">Statistik & Laporan</span><h1>Buat Laporan Kustom</h1><p>Atur wilayah dan rentang umur untuk membentuk laporan dari penduduk aktif desa.</p></div><Link className="button button-secondary" href="/statistik/penduduk">Kembali ke Statistik</Link></header>
    <section className="platform-card data-panel"><header><h2>Parameter Laporan</h2><p>Semua filter bersifat opsional.</p></header>
      <form className="data-custom-filter" method="get">
        <label className="form-field"><span className="form-label">Jenis laporan</span><select className="form-input" defaultValue={kind} name="kind">{STATISTIK_PENDUDUK_KINDS.map(value=><option key={value} value={value}>{STATISTIK_LABELS[value]}</option>)}</select></label>
        <label className="form-field"><span className="form-label">Dusun</span><select className="form-input" defaultValue={dusun} name="dusun"><option value="">Semua dusun</option>{filters.dusun.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
        <label className="form-field"><span className="form-label">RW</span><select className="form-input" defaultValue={rw} name="rw"><option value="">Semua RW</option>{filters.rw.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
        <label className="form-field"><span className="form-label">RT</span><select className="form-input" defaultValue={rt} name="rt"><option value="">Semua RT</option>{filters.rt.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
        <label className="form-field"><span className="form-label">Umur minimal</span><input className="form-input" defaultValue={umurMin??""} max="120" min="0" name="umurMin" type="number"/></label>
        <label className="form-field"><span className="form-label">Umur maksimal</span><input className="form-input" defaultValue={umurMax??""} max="120" min="0" name="umurMax" type="number"/></label>
        <div className="data-custom-actions"><button className="button button-primary" type="submit">Terapkan Filter</button><Link className="button button-secondary" href="/statistik/penduduk/kustom">Reset</Link></div>
      </form>
    </section>
    <section className="data-kependudukan-kpis"><article className="data-kpi data-kpi-primary"><span>Total Penduduk</span><strong>{number.format(report.summary.total)}</strong><small>{applied?"Sesuai parameter laporan":"Tanpa filter tambahan"}</small></article><article className="data-kpi"><span>Laki-laki</span><strong>{number.format(report.summary.male)}</strong><small>jiwa</small></article><article className="data-kpi" data-tone="pink"><span>Perempuan</span><strong>{number.format(report.summary.female)}</strong><small>jiwa</small></article></section>
    <section className="platform-card data-panel"><header className="data-section-heading"><div><h2>{STATISTIK_LABELS[kind]}</h2><p>Hasil pengelompokan sesuai filter yang diterapkan.</p></div><div className="penduduk-heading-actions"><a className="button button-secondary" href={`/statistik/penduduk/ekspor?${exportQuery}`}>Unduh CSV</a><a className="button button-primary" href={`/statistik/penduduk/ekspor/pdf?${exportQuery}`}>Unduh PDF</a></div></header>
      {report.rows.length?<div className="data-custom-results">{report.rows.map(row=><div className="data-bar-row data-report-bar" key={row.label}><span>{row.label}</span><div><i style={{width:(row.total/max*100)+"%"}}/></div><strong>{number.format(row.total)}</strong><small>{row.percentage}%</small></div>)}</div>:<p className="modul-empty">Tidak ada penduduk yang sesuai dengan filter.</p>}
      <footer><span>Hasil mencakup penduduk aktif pada desa dari sesi.</span><span>Total {number.format(report.summary.total)} jiwa</span></footer>
    </section>
  </div>;
}
