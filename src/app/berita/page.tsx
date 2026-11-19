import Image from "next/image";
import Link from "next/link";

import { agendaMendatang } from "@/features/agenda/application/agenda-use-cases";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import {
  daftarBerita,
  daftarKategoriBerita,
  hitungBeritaPublik,
} from "@/features/publik/application/konten-publik";

import styles from "./berita.module.css";
import { PublicSiteFooter, PublicSiteHeader } from "../public-site-layout";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ q?: string; kategori?: string; page?: string }>;
};

function mediaUrl(value: string | null | undefined, villageId: number): string | null {
  if (!value) return null;
  const parts = value.split(/[\\\\/]/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes(".."))) return null;
  const safe = parts[0] === String(villageId) ? parts : [String(villageId), ...parts];
  return `/api/publik/media/${safe.map(encodeURIComponent).join("/")}`;
}

function tanggal(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Tanggal belum tersedia";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function angka(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function urlBerita(page: number, q: string, kategori: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (kategori) params.set("kategori", kategori);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/berita?${query}` : "/berita";
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className={styles.icon} aria-hidden="true">{children}</span>;
}

export default async function BeritaPage({ searchParams }: Props) {
  const desa = await getIdentitasFromRequest();
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 100) ?? "";
  const kategori = params.kategori?.trim().slice(0, 100) ?? "";
  const page = Math.max(1, Math.min(999, Number.parseInt(params.page ?? "1", 10) || 1));
  const pageSize = 6;
  const location = [desa.namaKecamatan, desa.namaKabupaten, desa.namaPropinsi].filter(Boolean).join(", ");
  const logoUrl = mediaUrl(desa.logo, desa.id);

  const [allNews, kategoriBerita, agenda] = await Promise.all([
    daftarBerita(desa.id, { limit: 100, cari: q || undefined, kategoriSlug: kategori || undefined }),
    daftarKategoriBerita(desa.id),
    agendaMendatang(desa.id, 3),
  ]);
  const [total, ...counts] = await Promise.all([
    hitungBeritaPublik(desa.id, kategori || undefined),
    ...kategoriBerita.map((item) => hitungBeritaPublik(desa.id, item.slug)),
  ]);
  const categoryCounts = new Map(kategoriBerita.map((item, index) => [item.slug, counts[index] ?? 0]));
  const featured = !q && !kategori ? (allNews.find((item) => item.headline) ?? allNews[0] ?? null) : null;
  const popular = [...allNews].sort((a, b) => b.hit - a.hit).slice(0, 3);
  const listing = featured ? allNews.filter((item) => item.id !== featured.id) : allNews;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageItems = listing.slice((safePage - 1) * pageSize, safePage * pageSize);
  const visibleCategories = [
    { nama: "Semua Berita", slug: "", jumlah: total, icon: "▤" },
    ...kategoriBerita.map((item, index) => ({
      nama: item.nama,
      slug: item.slug,
      jumlah: categoryCounts.get(item.slug) ?? 0,
      icon: ["♧", "▱", "♙", "♧", "♡", "♧", "♧", "♻"][index % 8],
    })),
  ];

  return (
    <main className={styles.site}>
      <PublicSiteHeader desa={desa} location={location} logoUrl={logoUrl} activePath="/berita" />
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <nav aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>›</span><Link href="/berita">Informasi</Link><span>›</span><span>Berita Desa</span></nav>
          <h1>Berita Desa</h1>
          <p>Informasi terbaru seputar kegiatan, program, dan pembangunan di {desa.namaDesa ?? "desa"}.</p>
          <div className={styles.heroPaper} aria-hidden="true"><strong>BERITA DESA</strong><span/><i/><i/></div>
        </div>
      </section>

      <div className={styles.container}>
        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            {featured ? (
              <section className={styles.featuredPanel}>
                <h2><Icon>▤</Icon> Berita Terbaru</h2>
                <article className={styles.featured}>
                  {mediaUrl(featured.gambar, desa.id) ? <Image src={mediaUrl(featured.gambar, desa.id)!} alt={featured.judul} fill priority unoptimized sizes="(max-width: 900px) 100vw, 65vw"/> : <div className={styles.featuredFallback}>BERITA DESA</div>}
                  <div className={styles.featuredShade}/>
                  <div className={styles.featuredContent}>
                    <span className={styles.featuredCategory}>{featured.kategori ?? "Informasi"}</span>
                    <h3><Link href={`/berita/${encodeURIComponent(featured.slug)}`}>{featured.judul}</Link></h3>
                    <div className={styles.newsMeta}><span>▣ {tanggal(featured.terbitPada ?? featured.createdAt)}</span><span>◉ {angka(featured.hit)} kali dibaca</span></div>
                    {featured.ringkasan ? <p>{featured.ringkasan}</p> : null}
                    <Link className={styles.readButton} href={`/berita/${encodeURIComponent(featured.slug)}`}>Baca Selengkapnya <b>→</b></Link>
                  </div>
                </article>
              </section>
            ) : null}

            <section className={styles.allNews}>
              <h2><Icon>▤</Icon> {q || kategori ? "Hasil Pencarian Berita" : "Semua Berita"}</h2>
              {pageItems.length ? <div className={styles.newsGrid}>
                {pageItems.map((item) => <article className={styles.newsCard} key={item.id}>
                  <Link className={styles.newsImage} href={`/berita/${encodeURIComponent(item.slug)}`}>
                    {mediaUrl(item.gambar, desa.id) ? <Image src={mediaUrl(item.gambar, desa.id)!} alt="" fill unoptimized sizes="(max-width: 700px) 120px, 180px"/> : <span>INFO DESA</span>}
                  </Link>
                  <div className={styles.newsCopy}>
                    <span className={styles.tag}>{item.kategori ?? "Informasi"}</span>
                    <h3><Link href={`/berita/${encodeURIComponent(item.slug)}`}>{item.judul}</Link></h3>
                    <div className={styles.smallMeta}><span>▣ {tanggal(item.terbitPada ?? item.createdAt)}</span><span>◉ {angka(item.hit)}</span></div>
                    {item.ringkasan ? <p>{item.ringkasan}</p> : null}
                  </div>
                </article>)}
              </div> : <div className={styles.empty}><strong>{q || kategori ? "Berita tidak ditemukan" : "Belum ada berita yang diterbitkan"}</strong><p>{q || kategori ? "Coba kata kunci atau kategori lainnya." : "Berita desa akan tampil di sini setelah diterbitkan."}</p></div>}
              {pageCount > 1 ? <nav className={styles.pagination} aria-label="Paginasi berita">
                <Link href={urlBerita(1,q,kategori)} aria-label="Halaman pertama">«</Link>
                <Link href={urlBerita(Math.max(1,safePage-1),q,kategori)} aria-label="Halaman sebelumnya">‹</Link>
                {Array.from({length:Math.min(5,pageCount)},(_,i)=>Math.max(1,Math.min(pageCount-4,safePage-2))+i).map(number=><Link key={number} className={number===safePage?styles.pageActive:undefined} href={urlBerita(number,q,kategori)}>{number}</Link>)}
                <Link href={urlBerita(Math.min(pageCount,safePage+1),q,kategori)} aria-label="Halaman berikutnya">›</Link>
                <Link href={urlBerita(pageCount,q,kategori)} aria-label="Halaman terakhir">»</Link>
              </nav> : null}
            </section>
          </div>

          <aside className={styles.sidebar}>
            <section className={styles.sideCard}>
              <h2><Icon>⌕</Icon> Cari Berita</h2>
              <form action="/berita" method="get" className={styles.searchForm}>
                {kategori ? <input type="hidden" name="kategori" value={kategori}/> : null}
                <input name="q" type="search" defaultValue={q} placeholder="Masukkan kata kunci..." aria-label="Cari berita"/>
                <button type="submit" aria-label="Cari">⌕</button>
              </form>
            </section>
            <section className={styles.sideCard}>
              <h2><Icon>▤</Icon> Kategori Berita</h2>
              <div className={styles.categoryList}>
                {visibleCategories.map((item) => <Link key={item.slug || "all"} href={urlBerita(1,q,item.slug)} className={(!kategori && !item.slug) || kategori===item.slug && item.slug ? styles.categoryActive : undefined}>
                  <span className={styles.categoryIcon}>{item.icon}</span><strong>{item.nama}</strong><small>{angka(item.jumlah)}</small>
                </Link>)}
              </div>
            </section>
            <section className={styles.sideCard}>
              <h2><Icon>♨</Icon> Berita Populer</h2>
              <div className={styles.popularList}>
                {popular.length ? popular.map((item) => <Link key={item.id} href={`/berita/${encodeURIComponent(item.slug)}`} className={styles.popularItem}>
                  <span className={styles.popularImage}>{mediaUrl(item.gambar,desa.id) ? <Image src={mediaUrl(item.gambar,desa.id)!} alt="" fill unoptimized sizes="110px"/> : null}</span>
                  <span className={styles.popularCopy}><strong>{item.judul}</strong><small>▣ {tanggal(item.terbitPada ?? item.createdAt)}　◉ {angka(item.hit)}</small></span>
                </Link>) : <p className={styles.emptySmall}>Belum ada berita populer.</p>}
              </div>
            </section>
            <section className={styles.sideCard}>
              <div className={styles.agendaHead}><h2><Icon>▦</Icon> Agenda Kegiatan</h2><Link href="/agenda">Lihat Semua →</Link></div>
              <div className={styles.agendaList}>
                {agenda.length ? agenda.map((item) => {
                  const date = new Date(`${item.mulai}T00:00:00`);
                  const day = new Intl.DateTimeFormat("id-ID",{day:"2-digit"}).format(date);
                  const month = new Intl.DateTimeFormat("id-ID",{month:"short"}).format(date);
                  return <div className={styles.agendaItem} key={item.id}><span className={styles.agendaDate}><b>{day}</b><small>{month}</small></span><span><strong>{item.judul}</strong><small>{item.deskripsi ?? item.kategori}</small><small>◷ {item.jamMulai ? `${item.jamMulai} WIB` : "Waktu belum ditentukan"}{item.lokasi ? ` – ${item.lokasi}` : ""}</small></span></div>;
                }) : <p className={styles.emptySmall}>Belum ada agenda mendatang.</p>}
              </div>
            </section>
          </aside>
        </div>
      </div>
      <PublicSiteFooter desa={desa} location={location} logoUrl={logoUrl}/>
    </main>
  );
}
