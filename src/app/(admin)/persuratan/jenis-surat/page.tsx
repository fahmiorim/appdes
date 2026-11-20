import type { Metadata } from "next";
import Link from "next/link";
import { getMasterJenisSuratData } from "@/features/surat/application/jenis-surat-use-cases";
import { parseIsianFields, parseSyaratIds } from "@/features/surat/domain/isian";

export const metadata: Metadata = { title: "Template & Jenis Surat" };
type SearchParams = Promise<{ q?: string; status?: string }>;

export default async function JenisSuratPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { jenis, klasifikasi, syarat } = await getMasterJenisSuratData();
  const q = (params.q ?? "").trim().toLocaleLowerCase("id");
  const filtered = jenis.filter((item) => {
    const match = !q || item.name.toLocaleLowerCase("id").includes(q) || item.code.toLocaleLowerCase("id").includes(q);
    const active = params.status === "aktif" ? item.isActive : params.status === "nonaktif" ? !item.isActive : true;
    return match && active;
  });
  const active = jenis.filter((item) => item.isActive).length;
  return (
    <div className="modul-page">
      <div className="page-heading">
        <div><span className="eyebrow">Administrasi Surat</span><h1>Template & Jenis Surat</h1><p>Atur katalog surat, format dokumen, isian dinamis, persyaratan, dan penomoran untuk desa ini.</p></div>
        <div className="page-heading-actions"><Link href="/persuratan/surat" className="button button-secondary">Kembali ke Pengelolaan Surat</Link><Link href="/persuratan/jenis-surat/baru" className="button button-primary">＋ Tambah Jenis Surat</Link></div>
      </div>
      <div className="beranda-kpi-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))"}}>
        <article className="beranda-card beranda-kpi" data-tone="ungu"><span className="beranda-kpi-icon">▤</span><div className="beranda-kpi-body"><span className="beranda-kpi-label">Total Jenis Surat</span><strong className="beranda-kpi-value">{jenis.length}</strong><span className="beranda-chip" data-tone="ungu">Katalog desa</span></div></article>
        <article className="beranda-card beranda-kpi" data-tone="hijau"><span className="beranda-kpi-icon">✓</span><div className="beranda-kpi-body"><span className="beranda-kpi-label">Aktif</span><strong className="beranda-kpi-value">{active}</strong><span className="beranda-chip" data-tone="hijau">Tersedia di formulir</span></div></article>
        <article className="beranda-card beranda-kpi" data-tone="biru"><span className="beranda-kpi-icon">▧</span><div className="beranda-kpi-body"><span className="beranda-kpi-label">Klasifikasi</span><strong className="beranda-kpi-value">{klasifikasi.length}</strong><span className="beranda-chip" data-tone="biru">Kategori surat</span></div></article>
        <article className="beranda-card beranda-kpi" data-tone="jingga"><span className="beranda-kpi-icon">☷</span><div className="beranda-kpi-body"><span className="beranda-kpi-label">Persyaratan</span><strong className="beranda-kpi-value">{syarat.length}</strong><span className="beranda-chip" data-tone="netral">Dokumen pendukung</span></div></article>
      </div>
      <section className="modul-card">
        <div className="beranda-card-head"><div><h2 className="beranda-card-title">Katalog jenis surat</h2><p className="modul-muted">{filtered.length} dari {jenis.length} jenis surat ditampilkan</p></div></div>
        <form method="get" action="/persuratan/jenis-surat" className="modul-filter-row">
          <label>Kata kunci<input type="search" name="q" defaultValue={params.q ?? ""} placeholder="Cari kode atau nama surat..." /></label>
          <label>Status<select name="status" defaultValue={params.status ?? ""}><option value="">Semua</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></label>
          <button className="button button-primary" type="submit">Cari</button><Link href="/persuratan/jenis-surat" className="button button-secondary">Reset</Link>
        </form>
        {filtered.length === 0 ? <div className="modul-empty"><strong>Jenis surat belum tersedia</strong><p className="modul-muted">Tambahkan jenis surat pertama atau ubah filter pencarian.</p><Link href="/persuratan/jenis-surat/baru" className="button button-primary">Tambah Jenis Surat</Link></div> :
        <div className="modul-scroll"><table className="modul-table"><thead><tr><th>Kode</th><th>Nama jenis surat</th><th>Klasifikasi</th><th>Konfigurasi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
          {filtered.map((item) => {
            const fields = parseIsianFields(item.formIsian).length;
            const requirements = parseSyaratIds(item.syaratSurat).length;
            return <tr key={item.id}><td className="modul-mono">{item.code}</td><td><strong>{item.name}</strong><span className="modul-muted">Masa berlaku: {item.validityMonths ? item.validityMonths + " bulan" : "Tidak dibatasi"}</span></td><td>{item.classificationName ?? "—"}</td><td><span className="beranda-chip" data-tone="ungu">{fields} isian dinamis</span><span className="beranda-chip" data-tone="netral">{requirements} persyaratan</span></td><td><span className="beranda-chip" data-tone={item.isActive ? "hijau" : "netral"}>{item.isActive ? "Aktif" : "Nonaktif"}</span></td><td><Link href={`/persuratan/jenis-surat/${item.id}/edit`} className="table-action-link">Kelola →</Link></td></tr>;
          })}
        </tbody></table></div>}
      </section>
      <section className="modul-card">
        <div className="beranda-card-head"><div><h2 className="beranda-card-title">Komponen master</h2><p className="modul-muted">Persyaratan dan klasifikasi dipakai bersama oleh beberapa jenis surat.</p></div></div>
        <div className="modul-form-grid"><div><strong>Klasifikasi surat</strong><p className="modul-muted">{klasifikasi.length} klasifikasi terdaftar</p>{klasifikasi.slice(0,5).map((item)=><p key={item.id}><span className="modul-mono">{item.code}</span> · {item.name}</p>)}</div><div><strong>Persyaratan dokumen</strong><p className="modul-muted">{syarat.length} persyaratan terdaftar</p>{syarat.slice(0,5).map((item)=><p key={item.id}>{item.name}</p>)}</div></div>
      </section>
    </div>
  );
}
