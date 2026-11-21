import type { Metadata } from "next";
import Link from "next/link";

import { listPengaduanData } from "@/features/pengaduan/application/use-cases";
import {
  KATEGORI_PENGADUAN,
  STATUS_PENGADUAN,
  hitungStatistikPengaduan,
  labelStatus,
} from "@/features/pengaduan/domain/pengaduan";

export const metadata: Metadata = { title: "Pengaduan Warga" };

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function PengaduanAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kategori?: string; cari?: string; berhasil?: string }>;
}) {
  const params = await searchParams;
  const status = STATUS_PENGADUAN.some((item) => item.value === params.status)
    ? (params.status as (typeof STATUS_PENGADUAN)[number]["value"])
    : undefined;
  const kategori = KATEGORI_PENGADUAN.some((item) => item.value === params.kategori)
    ? params.kategori
    : undefined;
  const [semua, rows] = await Promise.all([
    listPengaduanData({}),
    listPengaduanData({ status, kategori, cari: params.cari }),
  ]);
  const statistik = hitungStatistikPengaduan(semua);

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div><span className="eyebrow">Layanan Warga</span><h1>Pengaduan Warga</h1><p>Kelola laporan, berikan tindak lanjut, dan pantau penyelesaian pengaduan masyarakat.</p></div>
        <Link className="button button-secondary" href="/pengaduan">Lihat halaman publik</Link>
      </div>
      {params.berhasil ? <p className="alert alert-info" role="status">Pengaduan berhasil dihapus.</p> : null}
      <div className="dashboard-stats">
        <article className="modul-card"><span>Total Pengaduan</span><strong>{statistik.total.toLocaleString("id-ID")}</strong></article>
        <article className="modul-card"><span>Baru</span><strong>{statistik.baru.toLocaleString("id-ID")}</strong></article>
        <article className="modul-card"><span>Diproses</span><strong>{statistik.diproses.toLocaleString("id-ID")}</strong></article>
        <article className="modul-card"><span>Selesai</span><strong>{statistik.selesai.toLocaleString("id-ID")}</strong></article>
      </div>
      <section className="modul-card">
        <form method="get" className="modul-filter-row">
          <label className="modul-field">Cari tiket / judul / pelapor<input name="cari" defaultValue={params.cari ?? ""} placeholder="PGD-..., jalan rusak..." /></label>
          <label className="modul-field">Status<select name="status" defaultValue={status ?? ""}><option value="">Semua status</option>{STATUS_PENGADUAN.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="modul-field">Kategori<select name="kategori" defaultValue={kategori ?? ""}><option value="">Semua kategori</option>{KATEGORI_PENGADUAN.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <div className="modul-form-actions"><button className="button button-primary" type="submit">Terapkan</button><Link className="button button-secondary" href="/pengaduan-admin">Reset</Link></div>
        </form>
        {rows.length === 0 ? <p className="modul-empty">Tidak ada pengaduan yang cocok dengan filter.</p> : (
          <div className="modul-scroll">
            <table className="modul-table">
              <thead><tr><th>Tiket</th><th>Judul</th><th>Pelapor</th><th>Kategori</th><th>Masuk</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id}>
                  <td className="modul-mono">{row.nomorTiket}</td>
                  <td><strong>{row.judul}</strong>{row.petugasNama ? <span className="modul-muted">Ditangani {row.petugasNama}</span> : null}</td>
                  <td>{row.namaPelapor}</td><td>{KATEGORI_PENGADUAN.find((item) => item.value === row.kategori)?.label ?? "Umum"}</td>
                  <td>{row.createdAt ? FORMAT_TANGGAL.format(row.createdAt) : "—"}</td>
                  <td><span className="beranda-chip" data-tone={row.status === "baru" ? "peringatan" : row.status === "selesai" ? "positif" : "netral"}>{labelStatus(row.status)}</span></td>
                  <td><Link className="button button-secondary" href={`/pengaduan-admin/${row.id}`}>Detail</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
