import Link from "next/link";

import { agendaBulan, agendaMendatang } from "@/features/agenda/application/agenda-use-cases";
import { agendaJamLabel, bulanAgendaDalamRentang, geserBulanAgenda } from "@/features/agenda/domain/agenda";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import { CetakJadwal } from "./cetak-jadwal";
import styles from "./agenda.module.css";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string; bulan?: string; tahun?: string; hari?: string; kategori?: string; page?: string }> };
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const KATEGORI = ["umum","rapat","sosialisasi","keagamaan","kesehatan","lingkungan","pelatihan","pendidikan","olahraga","pemerintahan"];

function plainText(value: string | null): string {
  return (value ?? "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();
}
function dateParts(value: string) {
  const [year=1970,month=1,day=1]=value.split("-").map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return {day:new Intl.DateTimeFormat("id-ID",{day:"2-digit",timeZone:"UTC"}).format(date),month:new Intl.DateTimeFormat("id-ID",{month:"short",timeZone:"UTC"}).format(date),year};
}
function locationLabel(desa:{namaKecamatan:string|null;namaKabupaten:string|null;namaPropinsi:string|null}) {
  return [desa.namaKecamatan,desa.namaKabupaten,desa.namaPropinsi].filter(Boolean).join(", ");
}

export default async function AgendaPage({searchParams}:Props) {
  const [desa,params]=await Promise.all([getIdentitasFromRequest(),searchParams]);
  const lokasi=locationLabel(desa);
  const now=new Date();
  const currentYear=now.getFullYear();
  const minYear=currentYear-1,maxYear=currentYear+2;
  const rawMonth=Number(params.bulan),rawYear=Number(params.tahun);
  const month=Number.isInteger(rawMonth)&&rawMonth>=1&&rawMonth<=12?rawMonth:now.getMonth()+1;
  const year=Number.isInteger(rawYear)&&rawYear>=minYear&&rawYear<=maxYear?rawYear:currentYear;
  const query=(params.q??"").trim().slice(0,100);
  const category=(params.kategori??"").trim().toLowerCase();
  const daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
  const rawDay=Number(params.hari);
  const selectedDay=Number.isInteger(rawDay)&&rawDay>=1&&rawDay<=daysInMonth?rawDay:null;
  const rawPage=Number(params.page);
  const page=Number.isInteger(rawPage)&&rawPage>0?rawPage:1;
  const [monthItems,upcoming]=await Promise.all([agendaBulan(desa.id,year,month),agendaMendatang(desa.id,6)]);
  const normalizedQuery=query.toLocaleLowerCase("id-ID");
  const filtered=monthItems.filter(item=>(!category||item.kategori.toLowerCase()===category)&&(!normalizedQuery||[item.judul,item.lokasi,item.deskripsi].some(value=>plainText(value).toLocaleLowerCase("id-ID").includes(normalizedQuery))));
  const eventDays=new Set(filtered.map(item=>Number(item.mulai.slice(8,10))));
  const selectedItems=selectedDay?filtered.filter(item=>Number(item.mulai.slice(8,10))===selectedDay):[];
  const previous=geserBulanAgenda({tahun:year,bulan:month},-1),next=geserBulanAgenda({tahun:year,bulan:month},1);
  const canPrevious=bulanAgendaDalamRentang(previous,minYear,maxYear),canNext=bulanAgendaDalamRentang(next,minYear,maxYear);
  const totalPages=Math.max(1,Math.ceil(filtered.length/4));
  const currentPage=Math.min(page,totalPages);
  const pageItems=filtered.slice((currentPage-1)*4,currentPage*4);
  const categories=[...new Set(monthItems.map(item=>item.kategori.trim().toLowerCase()).filter(Boolean))].sort();
  const selectedMonth=new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(year,month-1,1)));
  const firstOffset=(new Date(Date.UTC(year,month-1,1)).getUTCDay()+6)%7;
  const cells:(number|null)[]=[...Array.from({length:firstOffset},()=>null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  while(cells.length%7)cells.push(null);
  const href=(overrides:Record<string,string|null>)=>{
    const output=new URLSearchParams();
    const values:Record<string,string|null>={bulan:String(month),tahun:String(year),q:query||null,kategori:category||null,...overrides};
    for(const [key,value] of Object.entries(values))if(value)output.set(key,value);
    return "/agenda?"+output.toString();
  };
  const stats={total:monthItems.length,done:monthItems.filter(x=>x.status==="selesai").length,ongoing:monthItems.filter(x=>x.status==="berlangsung").length,planned:monthItems.filter(x=>x.status==="rencana").length};
  const logoUrl=desa.logo?"/api/publik/media/"+[String(desa.id),...desa.logo.split(/[\\/]/).filter(Boolean)].map(encodeURIComponent).join("/"):null;

  return <main className={styles.site}>
    <PublicSiteHeader desa={desa} location={lokasi} logoUrl={logoUrl} activePath="/agenda"/>
    <section className={styles.hero}><div className={styles.heroInner}>
      <nav aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>›</span><Link href="/berita">Informasi</Link><span>›</span><span>Agenda Kegiatan</span></nav>
      <h1>Agenda Kegiatan Desa</h1><p>Jadwal, rencana, dan laporan kegiatan Pemerintah {desa.namaDesa??"Desa"} untuk masyarakat.</p><span className={styles.heroArt} aria-hidden="true">▦</span>
    </div></section>
    <div className={styles.container}>
      <nav className={styles.tabs} aria-label="Navigasi informasi"><Link href="/berita">▤　Berita Desa</Link><Link href="/pengumuman">⚑　Pengumuman</Link><Link href="/agenda" aria-current="page">▦　Agenda Kegiatan</Link><Link href="/laporan-kegiatan">▥　Laporan Kegiatan</Link></nav>
      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.calendarCard}>
            <div className={styles.calendarHeading}><div><h2>▦　Kalender Kegiatan</h2><p>Lihat jadwal kegiatan desa dalam tampilan kalender interaktif.</p></div><div className={styles.monthNav}>{canPrevious?<Link href={href({bulan:String(previous.bulan),tahun:String(previous.tahun),hari:null,page:null})} aria-label="Bulan sebelumnya">‹</Link>:<span>‹</span>}<strong>{selectedMonth}</strong>{canNext?<Link href={href({bulan:String(next.bulan),tahun:String(next.tahun),hari:null,page:null})} aria-label="Bulan berikutnya">›</Link>:<span>›</span>}</div></div>
            <div className={styles.calendarContent}>
              <div className={styles.calendarGrid}>{["Sen","Sel","Rab","Kam","Jum","Sab","Min"].map(d=><b key={d}>{d}</b>)}{cells.map((day,i)=>day?<Link key={i} href={href({hari:String(day),page:null})} aria-current={day===selectedDay?"date":undefined} className={[styles.day,day===selectedDay?styles.selected:"",eventDays.has(day)?styles.hasEvent:"",day===now.getDate()&&month===now.getMonth()+1&&year===currentYear?styles.today:""].filter(Boolean).join(" ")}>{day}{eventDays.has(day)?<i/>:null}</Link>:<span key={i}/>)}</div>
              <section className={styles.selectedPanel}><h3>▦　Kegiatan pada {selectedDay?selectedDay+" "+BULAN[month-1]:"tanggal pilihan"}</h3>{selectedDay?(selectedItems.length?<div className={styles.selectedList}>{selectedItems.map(item=><Link key={item.id} href={"/agenda/"+item.id}><span><b>{item.jamMulai??"Waktu belum diatur"}</b><small>{item.lokasi??"Lokasi belum ditentukan"}</small></span><strong>{item.judul}</strong><em>{item.kategori}</em></Link>)}</div>:<p>Belum ada kegiatan pada tanggal ini.</p>):<p>Pilih tanggal bertanda titik untuk melihat jadwal kegiatannya.</p>}</section>
            </div>
          </section>
          <form className={styles.filters} action="/agenda" method="get"><strong>⚑　Filter Kegiatan</strong><select name="kategori" defaultValue={category}><option value="">Semua Kategori</option>{[...new Set([...KATEGORI,...categories])].map(x=><option key={x} value={x}>{x.charAt(0).toUpperCase()+x.slice(1)}</option>)}</select><select name="bulan" defaultValue={String(month)}>{BULAN.map((x,i)=><option key={x} value={i+1}>{x}</option>)}</select><select name="tahun" defaultValue={String(year)}>{[minYear,currentYear,currentYear+1,maxYear].filter((x,i,a)=>a.indexOf(x)===i).map(x=><option key={x}>{x}</option>)}</select><input type="search" name="q" placeholder="Cari agenda kegiatan..." defaultValue={query}/><button type="submit">Cari</button></form>
          <section className={styles.listCard}><div className={styles.listHeading}><div><h2>☷　Daftar Agenda Kegiatan</h2><p>Daftar seluruh agenda kegiatan desa yang direncanakan dan sedang berlangsung.</p></div><span>{filtered.length} agenda</span></div>
            {pageItems.length?<div className={styles.eventList}>{pageItems.map(item=>{const date=dateParts(item.mulai);const time=agendaJamLabel(item.jamMulai,item.jamSelesai);return <article key={item.id}><div className={styles.dateBadge}><b>{date.day}</b><span>{date.month}</span><small>{date.year}</small></div><div className={styles.eventVisual} aria-hidden="true"><span>▦</span></div><div className={styles.eventCopy}><div className={styles.eventTop}><h3>{item.judul}</h3><span className={item.status==="rencana"?styles.statusPlan:item.status==="berlangsung"?styles.statusLive:styles.statusDone}>{item.status==="rencana"?"Rencana":item.status==="berlangsung"?"Berlangsung":"Selesai"}</span></div><p className={styles.eventMeta}>◷　{time??"Waktu belum ditentukan"}　⌖　{item.lokasi??"Lokasi belum ditentukan"}</p><p className={styles.description}>{plainText(item.deskripsi)||"Informasi lebih lanjut mengenai kegiatan ini dapat dilihat pada detail agenda."}</p><Link href={"/agenda/"+item.id}>Lihat Detail　→</Link></div></article>})}</div>:<div className={styles.empty}><span>▦</span><h3>Belum ada agenda pada periode ini</h3><p>Belum ada kegiatan yang dipublikasikan sesuai filter yang dipilih.</p><Link href="/agenda">Hapus Filter →</Link></div>}
            {totalPages>1?<nav className={styles.pagination} aria-label="Halaman agenda">{currentPage>1?<Link href={href({page:String(currentPage-1),hari:null})}>‹ Sebelumnya</Link>:<span>‹ Sebelumnya</span>}{Array.from({length:totalPages},(_,i)=>i+1).map(n=><Link key={n} href={href({page:String(n),hari:null})} aria-current={n===currentPage?"page":undefined}>{n}</Link>)}{currentPage<totalPages?<Link href={href({page:String(currentPage+1),hari:null})}>Selanjutnya ›</Link>:<span>Selanjutnya ›</span>}</nav>:null}
          </section>
        </div>
        <aside className={styles.aside}>
          <section className={styles.sideCard}><h2>▥　Statistik Kegiatan</h2><div className={styles.stats}><div><b>▦</b><strong>{stats.total}</strong><span>Total Kegiatan</span></div><div><b>✓</b><strong>{stats.done}</strong><span>Sudah Dilaksanakan</span></div><div><b>⌛</b><strong>{stats.ongoing}</strong><span>Sedang Berlangsung</span></div><div><b>◷</b><strong>{stats.planned}</strong><span>Dalam Perencanaan</span></div></div><small className={styles.statsNote}>Statistik untuk {selectedMonth}</small></section>
          <section className={styles.sideCard}><h2>▦　Kegiatan Mendatang</h2>{upcoming.length?<div className={styles.upcoming}>{upcoming.slice(0,3).map(item=>{const d=dateParts(item.mulai);return <Link key={item.id} href={"/agenda/"+item.id}><span><b>{d.day}</b><small>{d.month}</small></span><div><strong>{item.judul}</strong><small>◷　{agendaJamLabel(item.jamMulai,item.jamSelesai)??"Waktu belum diatur"}　|　{item.lokasi??"Lokasi belum ditentukan"}</small></div><b>›</b></Link>})}</div>:<p className={styles.muted}>Belum ada agenda mendatang.</p>}<Link className={styles.allLink} href="/agenda">Lihat Semua Kegiatan　→</Link></section>
          <section className={styles.notify}><span>▣</span><h2>Ikuti Setiap Kegiatan Desa</h2><p>Dapatkan informasi terbaru agenda dan kegiatan desa secara langsung.</p><Link href="/masuk">♧　Masuk untuk informasi warga</Link></section>
          <section className={styles.download}><h2>↓　Unduh Jadwal Kegiatan</h2><p>Jadwal kegiatan desa dapat dicetak atau disimpan melalui fitur cetak.</p><CetakJadwal/></section>
        </aside>
      </div>
    </div>
    <PublicSiteFooter desa={desa} location={lokasi} logoUrl={logoUrl}/>
  </main>;
}
