import Link from "next/link";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { daftarWilayahPublik } from "@/features/wilayah/application/wilayah-publik";

import styles from "./wilayah.module.css";

export const dynamic = "force-dynamic";

export default async function WilayahPage() {
  const desa=await getIdentitasFromRequest();
  const rows=await daftarWilayahPublik(desa.id);
  const dusun=[...new Set(rows.map((row)=>row.dusun).filter(Boolean))];
  const rw=[...new Set(rows.map((row)=>row.rw).filter(Boolean))];
  const rt=[...new Set(rows.map((row)=>row.rt).filter(Boolean))];
  const grouped=dusun.map((name)=>({name,items:rows.filter((row)=>row.dusun===name)}));
  return <main className={styles.site}>
    <header className={styles.header}><div className={styles.container+" "+styles.headerInner}>
      <Link href="/" className={styles.brand}><span className={styles.mark}>D</span><span><strong>{desa.namaDesa??"Pemerintah Desa"}</strong><small>Wilayah Administratif</small></span></Link>
      <nav aria-label="Navigasi utama"><Link href="/">Beranda</Link><Link href="/profil">Profil Desa</Link><Link href="/berita">Berita</Link><Link href="/agenda">Agenda</Link></nav>
      <Link href="/masuk" className={styles.login}>Masuk ↗</Link>
    </div></header>
    <section className={styles.hero}><div className={styles.container}>
      <div className={styles.breadcrumb}><Link href="/">Beranda</Link><span>/</span><span>Wilayah Desa</span></div>
      <p className={styles.kicker}>PEMBAGIAN WILAYAH</p><h1>Wilayah {desa.namaDesa??"Desa"}</h1>
      <p>Informasi pembagian dusun, rukun warga, dan rukun tetangga di lingkungan {desa.namaDesa??"desa"}.</p>
    </div></section>
    <section className={styles.content}><div className={styles.container}>
      <div className={styles.metrics}><div><strong>{dusun.length}</strong><span>Dusun</span></div><div><strong>{rw.length}</strong><span>RW terdata</span></div><div><strong>{rt.length}</strong><span>RT terdata</span></div></div>
      <div className={styles.sectionHead}><div><p className={styles.kicker}>STRUKTUR LINGKUNGAN</p><h2>Daftar wilayah administratif</h2></div><span>{rows.length} data wilayah</span></div>
      {grouped.length?<div className={styles.groups}>{grouped.map((group)=> <section className={styles.group} key={group.name}><div className={styles.groupHead}><span className={styles.pin}>⌖</span><div><h3>Dusun {group.name}</h3><p>{group.items.length} data RT/RW</p></div></div><div className={styles.tags}>{group.items.map((item)=><div className={styles.tag} key={item.id}><strong>{item.rw? `RW ${item.rw}`:"RW —"}</strong><span>{item.rt? `RT ${item.rt}`:"RT —"}</span></div>)}</div></section>)}</div>:<div className={styles.empty}><span>⌖</span><h3>Data wilayah belum tersedia</h3><p>Pembagian wilayah akan ditampilkan setelah data dilengkapi oleh pemerintah desa.</p></div>}
    </div></section>
    <footer className={styles.footer}><div className={styles.container}><strong>{desa.namaDesa??"Pemerintah Desa"}</strong><span>© {new Date().getFullYear()} · Didukung FlexiDesa</span></div></footer>
  </main>;
}