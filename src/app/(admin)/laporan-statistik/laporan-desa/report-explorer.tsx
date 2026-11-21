"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "../laporan-statistik.module.css";

type ReportItem = { key: string; title: string; category: string; period: string; rows: number; href: string; exportHref: string; excelHref: string; pdfHref: string };
export function ReportExplorer({ items }: { items: ReportItem[] }) {
  const [category,setCategory]=useState("Semua Kategori");
  const [query,setQuery]=useState("");
  const [page,setPage]=useState(1);
  const [selected,setSelected]=useState(items[0]?.key ?? "");
  const pageSize=10;
  const filtered=useMemo(()=>items.filter(item=>(category==="Semua Kategori"||item.category===category)&&item.title.toLocaleLowerCase("id-ID").includes(query.toLocaleLowerCase("id-ID"))),[items,category,query]);
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const visible=filtered.slice((page-1)*pageSize,page*pageSize);
  const active=filtered.find(item=>item.key===selected)??filtered[0];
  function changeCategory(value:string){setCategory(value);setPage(1);setSelected("");}
  function changeQuery(value:string){setQuery(value);setPage(1);setSelected("");}
  return <div className={styles["ls-explorer"]}>
    <section className={styles["ls-card"]}>
      <header><div><h2>Daftar Laporan Desa</h2><p>Pilih jenis laporan, cari data, lalu buka atau unduh rekapnya.</p></div></header>
      <div className={styles["ls-actions"]}>
        <label>Kategori<select value={category} onChange={e=>changeCategory(e.target.value)}><option>Semua Kategori</option>{Array.from(new Set(items.map(i=>i.category))).map(c=><option key={c}>{c}</option>)}</select></label>
        <label className={styles["ls-search"]}>Cari laporan<input value={query} onChange={e=>changeQuery(e.target.value)} placeholder="Cari nama laporan..." /></label>
      </div>
      <div className={styles["ls-table"]}><table><thead><tr><th>No.</th><th>Nama Laporan</th><th>Kategori</th><th>Periode</th><th>Jumlah Baris</th><th>Aksi</th></tr></thead><tbody>
        {visible.map((item,index)=><tr key={item.key} aria-selected={active?.key===item.key} onClick={()=>setSelected(item.key)}><td>{(page-1)*pageSize+index+1}</td><td><button type="button" className={styles["ls-row-link"]} onClick={()=>setSelected(item.key)}>{item.title}</button></td><td><span className={styles["ls-tag"]}>{item.category}</span></td><td>{item.period}</td><td>{item.rows.toLocaleString("id-ID")}</td><td><Link href={item.href}>Lihat</Link> · <a href={item.exportHref}>CSV</a> · <a href={item.excelHref}>Excel</a> · <a href={item.pdfHref}>PDF</a></td></tr>)}
        {visible.length===0&&<tr><td colSpan={6}>Tidak ada laporan yang cocok dengan pencarian.</td></tr>}
      </tbody></table></div>
      <footer className={styles["ls-pagination"]}><span>Menampilkan {filtered.length?((page-1)*pageSize+1):0}–{Math.min(page*pageSize,filtered.length)} dari {filtered.length} laporan</span><div><button type="button" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button><strong>{page} / {pages}</strong><button type="button" disabled={page===pages} onClick={()=>setPage(p=>p+1)}>›</button></div></footer>
    </section>
    <aside className={styles["ls-card"]}>
      <header><div><h2>Detail Laporan</h2><p>Ringkasan jenis laporan yang dipilih.</p></div></header>
      {active?<><div className={styles["ls-detail-cover"]}><span>FLEXIDESA</span><strong>{active.title}</strong><small>{active.period}</small></div><h3>{active.title}</h3><dl className={styles["ls-detail-list"]}><div><dt>Kategori</dt><dd>{active.category}</dd></div><div><dt>Periode</dt><dd>{active.period}</dd></div><div><dt>Jumlah Baris</dt><dd>{active.rows.toLocaleString("id-ID")}</dd></div><div><dt>Status Data</dt><dd><span className={styles["ls-status"]}>Data tersedia</span></dd></div></dl><div className={styles["ls-actions"]}><Link className="button button-primary" href={active.href}>Buka Laporan</Link><div className={styles["ls-export-links"]}><a className="button" href={active.exportHref}>CSV</a><a className="button" href={active.excelHref}>Excel</a><a className="button" href={active.pdfHref}>PDF</a></div></div></>:<p className={styles["ls-empty"]}>Pilih laporan untuk melihat detail.</p>}
    </aside>
  </div>;
}
