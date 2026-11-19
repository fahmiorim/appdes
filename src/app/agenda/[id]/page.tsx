import Link from "next/link";
import { notFound } from "next/navigation";

import { agendaJamLabel, agendaTanggalPanjang } from "@/features/agenda/domain/agenda";
import { detailAgendaPublik, agendaMendatang } from "@/features/agenda/application/agenda-use-cases";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { PublicSiteFooter, PublicSiteHeader } from "../../public-site-layout";
import styles from "./detail-agenda.module.css";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{id:string}> };
function locationLabel(desa:{namaKecamatan:string|null;namaKabupaten:string|null;namaPropinsi:string|null}) { return [desa.namaKecamatan,desa.namaKabupaten,desa.namaPropinsi].filter(Boolean).join(", "); }
function plainText(value:string|null) { return (value??"").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim(); }

export async function generateMetadata({params}:Props) {
  const [{id},desa]=await Promise.all([params,getIdentitasFromRequest()]);
  const item=await detailAgendaPublik(desa.id,Number(id));
  return item?{title:item.judul+" | Agenda "+(desa.namaDesa??"Desa"),description:plainText(item.deskripsi).slice(0,160)}:{title:"Agenda tidak ditemukan"};
}
export default async function DetailAgendaPage({params}:Props) {
  const [{id},desa]=await Promise.all([params,getIdentitasFromRequest()]);
  const item=await detailAgendaPublik(desa.id,Number(id));
  if(!item)notFound();
  const [others]=await Promise.all([agendaMendatang(desa.id,8)]);
  const location=locationLabel(desa);
  const logoUrl=desa.logo?"/api/publik/media/"+[String(desa.id),...desa.logo.split(/[\\/]/).filter(Boolean)].map(encodeURIComponent).join("/"):null;
  const time=agendaJamLabel(item.jamMulai,item.jamSelesai);
  const status=item.status==="rencana"?"Rencana":item.status==="berlangsung"?"Sedang Berlangsung":"Selesai";
  const statusClass=item.status==="rencana"?styles.plan:item.status==="berlangsung"?styles.live:styles.done;
  return <main className={styles.site}>
    <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/agenda"/>
    <section className={styles.hero}><div><nav><Link href="/">Beranda</Link><span>›</span><Link href="/agenda">Informasi</Link><span>›</span><Link href="/agenda">Agenda Kegiatan</Link><span>›</span><span>Detail Agenda</span></nav><h1>Agenda Kegiatan Desa</h1><p>Informasi jadwal dan pelaksanaan kegiatan Pemerintah {desa.namaDesa??"Desa"}.</p></div></section>
    <div className={styles.container}><div className={styles.layout}>
      <article className={styles.article}><Link className={styles.back} href="/agenda">←　Kembali ke Daftar Agenda</Link><span className={styles.category}>{item.kategori}</span><h2>{item.judul}</h2><div className={styles.meta}><span>▦　{agendaTanggalPanjang(item.mulai)}</span><span>◷　{time??"Waktu belum ditentukan"}</span><span className={statusClass}>{status}</span></div>
        <div className={styles.eventVisual}><span>▦</span><strong>AGENDA KEGIATAN DESA</strong><small>{desa.namaDesa??"Pemerintah Desa"}</small></div>
        {item.deskripsi?<div className={styles.description}>{plainText(item.deskripsi)}</div>:<p className={styles.description}>Informasi kegiatan ini diterbitkan oleh Pemerintah {desa.namaDesa??"Desa"}.</p>}
        <section className={styles.info}><h3>▦　Informasi Kegiatan</h3><dl><div><dt>Hari / Tanggal</dt><dd>{agendaTanggalPanjang(item.mulai)}{item.selesai&&item.selesai!==item.mulai?" – "+agendaTanggalPanjang(item.selesai):""}</dd></div><div><dt>Waktu</dt><dd>{time??"Belum ditentukan"}</dd></div><div><dt>Tempat</dt><dd>{item.lokasi??"Belum ditentukan"}</dd></div><div><dt>Kategori</dt><dd>{item.kategori}</dd></div><div><dt>Status</dt><dd>{status}</dd></div></dl></section>
        <div className={styles.actions}><Link href="/agenda">← Daftar Agenda</Link></div>
      </article>
      <aside className={styles.aside}><section className={styles.sideCard}><h2>Informasi Agenda</h2><p><strong>Penyelenggara</strong><span>Pemerintah {desa.namaDesa??"Desa"}</span></p><p><strong>Lokasi</strong><span>{item.lokasi??"Belum ditentukan"}</span></p><p><strong>Status</strong><span className={statusClass}>{status}</span></p></section><section className={styles.sideCard}><h2>Kegiatan Lainnya</h2>{others.filter(row=>row.id!==item.id).slice(0,5).map(row=><Link className={styles.other} key={row.id} href={"/agenda/"+row.id}><strong>{row.judul}</strong><small>{agendaTanggalPanjang(row.mulai)} · {row.lokasi??"Lokasi belum ditentukan"}</small></Link>)}<Link className={styles.all} href="/agenda">Lihat Semua Agenda →</Link></section></aside>
    </div></div>
    <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl}/>
  </main>;
}
