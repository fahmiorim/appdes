import Image from "next/image";
import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { daftarPerangkatPublik } from "@/features/publik/application/konten-publik";

import styles from "./pemerintahan.module.css";

export const dynamic = "force-dynamic";

function mediaUrl(value: string | null, villageId: number): string | null {
  if (!value) return null;
  const segments=value.split(/[\\/]/).filter(Boolean);
  if(!segments.length||segments.some((part)=>part==="."||part===".."||part.includes("..")))return null;
  const path=segments[0]===String(villageId)?segments:[String(villageId),...segments];
  return `/api/publik/media/${path.map(encodeURIComponent).join("/")}`;
}

export default async function PemerintahanPage(){
  const desa=await getIdentitasFromRequest();
  const perangkat=await daftarPerangkatPublik(desa.id);
  return <main className={styles.site}>
    <header className={styles.header}><div className={styles.container+" "+styles.headerInner}>
      <Link href="/" className={styles.brand}><Image src="/images/flexidesa-mark.svg" alt="" width={42} height={42}/><span><strong>{desa.namaDesa??"Pemerintah Desa"}</strong><small>Struktur Pemerintahan</small></span></Link>
      <nav aria-label="Navigasi utama"><Link href="/">Beranda</Link><Link href="/profil">Profil Desa</Link><Link href="/berita">Berita</Link><Link href="/agenda">Agenda</Link></nav>
      <Link href="/masuk" className={styles.login}>Masuk ↗</Link>
    </div></header>
    <section className={styles.hero}><div className={styles.container}>
      <div className={styles.breadcrumb}><Link href="/">Beranda</Link><span>/</span><span>Pemerintahan Desa</span></div>
      <p className={styles.kicker}>STRUKTUR ORGANISASI</p><h1>Pemerintahan {desa.namaDesa??"Desa"}</h1>
      <p>Kenali aparatur desa yang bertugas menyelenggarakan pemerintahan, pembangunan, dan pelayanan kepada masyarakat.</p>
    </div></section>
    <section className={styles.content}><div className={styles.container}>
      <div className={styles.heading}><div><p className={styles.kicker}>APARATUR DESA</p><h2>Perangkat desa</h2><p>Data aparatur yang ditampilkan berdasarkan informasi resmi desa.</p></div><span className={styles.count}>{perangkat.length} perangkat</span></div>
      {perangkat.length?<div className={styles.grid}>{perangkat.map((item)=>{
        const photo=mediaUrl(item.foto,desa.id);
        const name=[item.gelarDepan,item.nama,item.gelarBelakang].filter(Boolean).join(" ");
        return <article className={styles.card} key={item.id}>
          <div className={styles.photo}>{photo?<Image src={photo} alt={`Foto ${name}`} fill sizes="(max-width:640px) 100vw,(max-width:900px) 50vw,25vw" unoptimized/>:<span>{item.nama.slice(0,1).toUpperCase()}</span>}</div>
          <div className={styles.cardBody}><p className={styles.position}>{item.jabatan??"Perangkat Desa"}</p><h3>{name}</h3>{item.periode?<small>Periode {item.periode}</small>:null}</div>
        </article>;
      })}</div>:<div className={styles.empty}><span>♙</span><h3>Data perangkat belum tersedia</h3><p>Informasi aparatur desa akan ditampilkan setelah dilengkapi dan dipublikasikan.</p></div>}
    </div></section>
    <footer className={styles.footer}><div className={styles.container}><strong>{desa.namaDesa??"Pemerintah Desa"}</strong><span>© {new Date().getFullYear()} · Didukung FlexiDesa</span></div></footer>
  </main>;
}