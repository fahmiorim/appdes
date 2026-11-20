import type { Metadata } from "next";
import Link from "next/link";

import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import { listRiwayat } from "@/features/penduduk/application/riwayat-penduduk-use-cases";
import { MUTATION_TYPE_LABELS, MUTATION_TYPES, normalisasiMutationType } from "@/features/penduduk/domain/riwayat-penduduk";
import { PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import { hasPermission } from "@/features/rbac/application/authorization";
import { verifySession } from "@/lib/dal";

export const metadata: Metadata = { title: "Mutasi Penduduk" };
const number = new Intl.NumberFormat("id-ID");
const date = new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short",year:"numeric"});

export default async function MutasiPendudukPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const [params,user]=await Promise.all([searchParams,verifySession()]);
  const bolehTambah=hasPermission(user.permissions,PENDUDUK_RESOURCE,"update");
  const q=typeof params.q==="string"?params.q.trim().slice(0,100):"";
  const type=normalisasiMutationType(typeof params.type==="string"?params.type:null);
  const from=typeof params.from==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(params.from)?params.from:"";
  const to=typeof params.to==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(params.to)?params.to:"";
  const pageRaw=typeof params.page==="string"?Number(params.page):1;
  const page=Number.isInteger(pageRaw)&&pageRaw>0?pageRaw:1;
  const [result, totals] = await Promise.all([
    listRiwayat({q,type,from:from||undefined,to:to||undefined,page,perPage:10}),
    Promise.all(MUTATION_TYPES.map(async (kind) => ({ kind, total: (await listRiwayat({type:kind,page:1,perPage:1})).total }))),
  ]);
  const countByType = new Map(totals.map((item) => [item.kind, item.total]));
  const counts=Object.entries(MUTATION_TYPE_LABELS);
  return <div className="modul-page data-kependudukan-page">
    <DataKependudukanNav active="/mutasi-penduduk"/>
    <header className="page-heading"><div><span className="eyebrow">Data Kependudukan</span><h1>Mutasi Penduduk</h1><p>Riwayat penduduk masuk, keluar, kelahiran, kematian, dan perubahan data.</p></div>{bolehTambah?<Link className="button button-primary" href="/mutasi-penduduk/baru">+ Catat Mutasi</Link>:null}</header>
    <section className="data-kependudukan-kpis"><article className="data-kpi data-kpi-primary"><span>Total Kejadian</span><strong>{number.format(totals.reduce((sum,item)=>sum+item.total,0))}</strong><small>Seluruh catatan mutasi tersimpan</small></article>
      {counts.slice(0,5).map(([key,label])=><article className="data-kpi" key={key}><span>{label}</span><strong>{number.format(countByType.get(key as (typeof MUTATION_TYPES)[number]) ?? 0)}</strong><small>Total catatan tersimpan</small></article>)}
    </section>
    <section className="platform-card data-panel"><header className="data-section-heading"><div><h2>Daftar Mutasi Penduduk</h2><p>Catatan kejadian kependudukan berdasarkan tanggal peristiwa.</p></div><Link className="button button-secondary" href={`/mutasi-penduduk/ekspor?q=${encodeURIComponent(q)}&type=${type}&from=${from}&to=${to}`}>Ekspor CSV</Link></header>
      <form className="data-filter" method="get"><input aria-label="Cari nama, NIK, atau nomor surat" defaultValue={q} name="q" placeholder="Cari nama, NIK, atau nomor surat..." type="search"/><select aria-label="Jenis mutasi" defaultValue={type} name="type"><option value="all">Semua jenis mutasi</option>{MUTATION_TYPES.map((v)=><option key={v} value={v}>{MUTATION_TYPE_LABELS[v]}</option>)}</select><label className="data-filter-date"><span>Dari tanggal</span><input aria-label="Dari tanggal" defaultValue={from} name="from" type="date"/></label><label className="data-filter-date"><span>Sampai tanggal</span><input aria-label="Sampai tanggal" defaultValue={to} name="to" type="date"/></label><button className="button button-secondary" type="submit">Filter</button></form>
      {result.rows.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Tanggal</th><th>Jenis Mutasi</th><th>Nama Penduduk</th><th>NIK</th><th>Keterangan</th></tr></thead><tbody>{result.rows.map(row=><tr key={row.id}><td>{date.format(new Date(row.eventDate+"T00:00:00"))}</td><td><span className="data-status">{MUTATION_TYPE_LABELS[row.type]}</span></td><td>{row.residentName??"Data penduduk tidak tersedia"}</td><td>{row.residentNationalId?row.residentNationalId.replace(/^(\d{6})\d+(\d{4})$/,"$1••••••$2"):"—"}</td><td>{row.reason??row.notes??row.referenceNo??"—"}</td></tr>)}</tbody></table></div>:<p className="modul-empty">Belum ada catatan mutasi untuk filter ini.</p>}
      <footer className="data-pagination"><span>Menampilkan {number.format(result.rows.length)} dari {number.format(result.total)} kejadian</span><div>{page>1?<Link href={`?q=${encodeURIComponent(q)}&type=${type}&from=${from}&to=${to}&page=${page-1}`}>Sebelumnya</Link>:null}{page*result.perPage<result.total?<Link href={`?q=${encodeURIComponent(q)}&type=${type}&from=${from}&to=${to}&page=${page+1}`}>Berikutnya</Link>:null}</div></footer>
    </section>
  </div>;
}
