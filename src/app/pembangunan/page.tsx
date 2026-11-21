import Link from "next/link";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { getPembangunanPublik } from "@/features/pembangunan/application/use-cases";
import { formatAnggaran, statusPembangunanLabel } from "@/features/pembangunan/domain/pembangunan";
import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";
import styles from "./pembangunan.module.css";

export const dynamic = "force-dynamic";
type Props={searchParams:Promise<{tahun?:string}>};
function mediaUrl(value:string|null|undefined,villageId:number){if(!value)return null;const parts=value.split(/[\\\\/]/).filter(Boolean);if(!parts.length||parts.some(x=>x===".."||x.includes("..")))return null;const safe=parts[0]===String(villageId)?parts:[String(villageId),...parts];return "/api/publik/media/"+safe.map(encodeURIComponent).join("/");}
function lokasi(desa:{namaKecamatan:string|null;namaKabupaten:string|null;namaPropinsi:string|null}){return [desa.namaKecamatan,desa.namaKabupaten,desa.namaPropinsi].filter(Boolean).join(", ");}
export default async function PembangunanPage({searchParams}:Props){
 const [desa,params]=await Promise.all([getIdentitasFromRequest(),searchParams]);
 const raw=Number(params.tahun);const tahun=Number.isInteger(raw)&&raw>=2000&&raw<=2100?raw:null;
 const data=await getPembangunanPublik(tahun);const logoUrl=mediaUrl(desa.logo,desa.id);
 return <main className={styles.site}><PublicSiteHeader desa={desa} location={lokasi(desa)} logoUrl={logoUrl} activePath="/pembangunan"/>
 <section className={styles.hero}><div className={styles.container}><nav><Link href="/">Beranda</Link><span>›</span><span>Pembangunan Desa</span></nav><span className={styles.eyebrow}>TRANSPARANSI PEMBANGUNAN</span><h1>Pembangunan Desa {desa.namaDesa??""}</h1><p>Pantau program pembangunan, anggaran, progres pekerjaan, dan dokumentasi kegiatan desa secara terbuka.</p></div></section>
 <div className={styles.container}><section className={styles.stats}><article><span>Total Kegiatan</span><strong>{data.ringkasan.total}</strong></article><article><span>Selesai</span><strong>{data.ringkasan.selesai}</strong></article><article><span>Berjalan</span><strong>{data.ringkasan.berjalan}</strong></article><article><span>Total Anggaran</span><strong>{formatAnggaran(data.ringkasan.totalAnggaran)}</strong></article></section>
 <section className={styles.sectionHead}><div><span className={styles.eyebrow}>PROGRAM DESA</span><h2>Daftar Pembangunan</h2><p>Pilih kegiatan untuk melihat detail dan dokumentasi pelaksanaan.</p></div><form><label htmlFor="tahun">Tahun anggaran</label><select id="tahun" name="tahun" defaultValue={tahun??""}><option value="">Semua tahun</option>{data.tahunList.map(y=><option key={y} value={y}>{y}</option>)}</select><button type="submit">Tampilkan</button></form></section>
 {data.rows.length?<div className={styles.cards}>{data.rows.map((row)=><article className={styles.card} key={row.id}><div className={styles.cardVisual}><div className={styles.placeholder}>PEMBANGUNAN DESA</div><span className={styles.status}>{statusPembangunanLabel(row.status)}</span></div><div className={styles.cardBody}><div className={styles.cardMeta}><span>{row.tahunAnggaran}</span><span>{row.lokasi??"Lokasi belum diisi"}</span></div><h3><Link href={"/pembangunan/"+encodeURIComponent(row.slug)}>{row.judul}</Link></h3><p>{(row.deskripsi??"Informasi kegiatan pembangunan desa.").replace(/<[^>]*>/g," ").slice(0,150)}</p><div className={styles.progressLabel}><span>Progres pekerjaan</span><b>{row.progres}%</b></div><div className={styles.progress}><i style={{width:row.progres+"%"}}/></div><div className={styles.cardFoot}><span>{formatAnggaran(row.anggaran)}</span><Link href={"/pembangunan/"+encodeURIComponent(row.slug)}>Lihat detail →</Link></div></div></article>)}</div>:<p className={styles.empty}>Belum ada data pembangunan yang dipublikasikan untuk periode ini.</p>}
 </div><PublicSiteFooter desa={desa}/></main>;
}