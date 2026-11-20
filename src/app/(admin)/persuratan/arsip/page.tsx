import type { Metadata } from "next";
import Link from "next/link";
import { listArsipNomorSuratData } from "@/features/surat/application/surat-use-cases";
import { LETTER_STATUS_LABELS } from "@/features/surat/domain/surat";

export const metadata: Metadata = { title: "Arsip & Riwayat Surat" };
type SearchParams = Promise<{ q?: string; tahun?: string; jenis?: string; klasifikasi?: string; page?: string }>;
const TANGGAL = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
function angka(raw?: string) { const n = Number(raw); return Number.isSafeInteger(n) && n > 0 ? n : undefined; }
function tanggal(value: Date | string) { const d = value instanceof Date ? value : new Date(value); return Number.isNaN(d.getTime()) ? "—" : TANGGAL.format(d); }

export default async function ArsipSuratPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = { search: (params.q ?? "").trim().slice(0,100), year: angka(params.tahun), typeId: angka(params.jenis), classificationId: angka(params.klasifikasi), page: angka(params.page) ?? 1 };
  const result = await listArsipNomorSuratData(filter);
  const query = new URLSearchParams();
  if (filter.search) query.set("q",filter.search);
  if (filter.year) query.set("tahun",String(filter.year));
  if (filter.typeId) query.set("jenis",String(filter.typeId));
  if (filter.classificationId) query.set("klasifikasi",String(filter.classificationId));
  const pageHref = (page:number) => { const next=new URLSearchParams(query); next.set("page",String(page)); return `/persuratan/arsip?${next.toString()}`; };
  const tahunSekarang = new Date().getFullYear();
  const years = Array.from({length:8},(_,i)=>tahunSekarang-i);
  return <div className="modul-page">
    <div className="page-heading"><div><span className="eyebrow">Administrasi Surat</span><h1>Arsip & Riwayat Surat</h1><p>Telusuri arsip nomor surat resmi yang telah diterbitkan oleh desa.</p></div><div className="page-heading-actions"><Link href="/persuratan/surat" className="button button-secondary">Pengelolaan Surat</Link><a href={`/persuratan/arsip/ekspor?${query.toString()}`} className="button button-primary">↓ Ekspor CSV</a></div></div>
    <div className="beranda-kpi-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))"}}>
      <article className="beranda-card beranda-kpi" data-tone="ungu"><span className="beranda-kpi-icon">▤</span><div className="beranda-kpi-body"><span className="beranda-kpi-label">Total Arsip</span><strong className="beranda-kpi-value">{result.total.toLocaleString("id-ID")}</strong><span className="beranda-chip" data-tone="ungu">Nomor resmi terbit</span></div></article>
      <article className="beranda-card beranda-kpi" data-tone="hijau"><span className="beranda-kpi-icon">✓</span><div className="beranda-kpi-body"><span className="beranda-kpi-label">Tahun aktif</span><strong className="beranda-kpi-value">{filter.year ?? tahunSekarang}</strong><span className="beranda-chip" data-tone="hijau">Filter periode</span></div></article>
      <article className="beranda-card beranda-kpi" data-tone="biru"><span className="beranda-kpi-icon">▧</span><div className="beranda-kpi-body"><span className="beranda-kpi-label">Jenis Surat</span><strong className="beranda-kpi-value">{result.jenis.length}</strong><span className="beranda-chip" data-tone="biru">Katalog desa</span></div></article>
      <article className="beranda-card beranda-kpi" data-tone="jingga"><span className="beranda-kpi-icon">☷</span><div className="beranda-kpi-body"><span className="beranda-kpi-label">Klasifikasi</span><strong className="beranda-kpi-value">{result.klasifikasi.length}</strong><span className="beranda-chip" data-tone="netral">Kategori surat</span></div></article>
    </div>
    <section className="modul-card">
      <div className="beranda-card-head"><div><h2 className="beranda-card-title">Pencarian arsip</h2><p className="modul-muted">Pencarian hanya pada nomor dan nama jenis surat dalam arsip resmi.</p></div><Link href="/persuratan/arsip" className="table-action-link">Reset filter</Link></div>
      <form method="get" action="/persuratan/arsip" className="modul-filter-row">
        <label>Kata kunci<input type="search" name="q" maxLength={100} defaultValue={filter.search} placeholder="Nomor atau jenis surat..." /></label>
        <label>Tahun<select name="tahun" defaultValue={filter.year ? String(filter.year) : ""}><option value="">Semua tahun</option>{years.map((year)=><option key={year} value={year}>{year}</option>)}</select></label>
        <label>Jenis surat<select name="jenis" defaultValue={filter.typeId ? String(filter.typeId) : ""}><option value="">Semua jenis</option>{result.jenis.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Klasifikasi<select name="klasifikasi" defaultValue={filter.classificationId ? String(filter.classificationId) : ""}><option value="">Semua klasifikasi</option>{result.klasifikasi.map((item)=><option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label>
        <button className="button button-primary" type="submit">Terapkan</button>
      </form>
      {result.rows.length===0 ? <div className="modul-empty"><strong>Belum ada arsip pada filter ini</strong><p className="modul-muted">Arsip otomatis terbentuk setelah surat disetujui dan diterbitkan.</p><Link href="/persuratan/surat" className="button button-secondary">Lihat Pengelolaan Surat</Link></div> :
      <div className="modul-scroll"><table className="modul-table"><thead><tr><th>Nomor surat</th><th>Jenis surat</th><th>Nomor urut</th><th>Tahun</th><th>Tanggal terbit</th><th>Dokumen</th></tr></thead><tbody>{result.rows.map((row)=> <tr key={row.id}><td className="modul-mono"><strong>{row.number}</strong></td><td>{row.typeName}</td><td>{row.sequence}</td><td>{row.year}</td><td>{tanggal(row.issuedAt)}</td><td>{row.letterId ? <Link href={`/persuratan/surat/${row.letterId}`} className="table-action-link">Detail / PDF →</Link> : <span className="modul-muted">Arsip nomor saja</span>}</td></tr>)}</tbody></table></div>}
      <div className="modul-total" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><span>{result.total.toLocaleString("id-ID")} arsip · Halaman {result.page}</span><div style={{display:"flex",gap:8}}>{result.page>1?<Link href={pageHref(result.page-1)} className="button button-secondary">Sebelumnya</Link>:null}{result.rows.length===result.pageSize?<Link href={pageHref(result.page+1)} className="button button-secondary">Berikutnya</Link>:null}</div></div>
    </section>
    <p className="modul-muted">Catatan: daftar ini bersumber dari arsip nomor resmi. Riwayat aktivitas pengguna ditampilkan hanya jika tersedia pada catatan audit aplikasi; halaman ini tidak mengarang aktivitas yang tidak tercatat.</p>
  </div>;
}
