import type { Metadata } from "next";
import Link from "next/link";

import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import { listKeluarga } from "@/features/keluarga/application/use-cases";

export const metadata: Metadata = { title: "Kartu Keluarga" };
const number = new Intl.NumberFormat("id-ID");

export default async function KeluargaPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0,100) : "";
  const pageRaw = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const result = await listKeluarga({search:q,page,pageSize:10});
  return <div className="modul-page data-kependudukan-page">
    <DataKependudukanNav active="/keluarga"/>
    <header className="page-heading"><div><span className="eyebrow">Data Kependudukan</span><h1>Kartu Keluarga</h1><p>Kelola data Kartu Keluarga dan periksa susunan anggota setiap keluarga.</p></div>
      <div className="penduduk-heading-actions"><Link className="button button-secondary" href={`/keluarga/ekspor${q?`?q=${encodeURIComponent(q)}`:""}`}>Ekspor CSV</Link><Link className="button button-primary" href="/keluarga/baru">+ Tambah KK</Link></div></header>
    <section className="data-kependudukan-kpis">
      <article className="data-kpi data-kpi-primary"><span>Total Kartu Keluarga</span><strong>{number.format(result.total)} KK</strong><small>Terdaftar pada desa ini</small></article>
      <article className="data-kpi"><span>Anggota pada halaman ini</span><strong>{number.format(result.rows.reduce((sum,row)=>sum+row.memberCount,0))}</strong><small>Jumlah anggota dari daftar yang ditampilkan</small></article>
    </section>
    <section className="platform-card data-panel"><header><h2>Daftar Kartu Keluarga</h2><p>{number.format(result.total)} kartu keluarga terdaftar</p></header>
      <form className="data-filter" method="get"><input aria-label="Cari nomor KK atau alamat" defaultValue={q} name="q" placeholder="Cari nomor KK atau alamat..." type="search"/><button className="button button-secondary" type="submit">Cari</button></form>
      {result.rows.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>No.</th><th>Nomor KK</th><th>Kepala Keluarga</th><th>Jumlah Anggota</th><th>Wilayah</th><th>Aksi</th></tr></thead><tbody>
        {result.rows.map((row,index)=><tr key={row.id}><td>{(result.page-1)*result.pageSize+index+1}</td><td>{row.number}</td><td>{row.headName ?? "Belum ditentukan"}</td><td>{row.memberCount} orang</td><td>{row.regionLabel ?? "Belum ditentukan"}</td><td><Link href={`/keluarga/${row.id}`}>Lihat detail</Link></td></tr>)}
      </tbody></table></div> : <p className="modul-empty">Belum ada Kartu Keluarga yang sesuai.</p>}
      <footer className="data-pagination"><span>Halaman {result.page} dari {result.pageCount}</span><div>{result.page>1?<Link href={`?q=${encodeURIComponent(q)}&page=${result.page-1}`}>Sebelumnya</Link>:null}{result.page<result.pageCount?<Link href={`?q=${encodeURIComponent(q)}&page=${result.page+1}`}>Berikutnya</Link>:null}</div></footer>
    </section>
  </div>;
}
