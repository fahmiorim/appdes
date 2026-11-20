import type { Metadata } from "next";
import Link from "next/link";

import { listSuratWithMeta } from "@/features/surat/application/surat-use-cases";
import {
  LETTER_STATUSES,
  LETTER_STATUS_LABELS,
  type LetterStatus,
} from "@/features/surat/domain/surat";

export const metadata: Metadata = { title: "Pembuatan & Pengelolaan Surat" };

type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function statusValid(value: string | undefined): LetterStatus | null {
  return value && (LETTER_STATUSES as readonly string[]).includes(value)
    ? (value as LetterStatus)
    : null;
}

function angkaHalaman(value: string | undefined): number {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 1;
}

function chipStatus(status: LetterStatus): string {
  if (status === "issued") return "hijau";
  if (status === "verifikasi") return "ungu";
  if (status === "cancelled") return "merah";
  return "netral";
}

export default async function SuratPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = {
    search: (params.q ?? "").trim().slice(0, 100),
    status: statusValid(params.status),
    page: angkaHalaman(params.page),
    pageSize: 20,
  };
  const hasil = await listSuratWithMeta(filter);
  const total = hasil.total;
  const draft = hasil.recap.filter((item) => item.status === "draft").reduce((sum, item) => sum + item.total, 0);
  const verifikasi = hasil.recap.filter((item) => item.status === "verifikasi").reduce((sum, item) => sum + item.total, 0);
  const terbit = hasil.recap.filter((item) => item.status === "issued").reduce((sum, item) => sum + item.total, 0);
  const batal = hasil.recap.filter((item) => item.status === "cancelled").reduce((sum, item) => sum + item.total, 0);

  const query = new URLSearchParams();
  if (filter.search) query.set("q", filter.search);
  if (filter.status) query.set("status", filter.status);
  const hrefPage = (page: number) => {
    const next = new URLSearchParams(query);
    next.set("page", String(page));
    return `/persuratan/surat?${next.toString()}`;
  };

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administrasi Surat</span>
          <h1>Pembuatan & Pengelolaan Surat</h1>
          <p>Kelola konsep, proses verifikasi, penerbitan, dan dokumen surat resmi desa.</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link href="/persuratan/dashboard" className="button button-secondary">Dashboard Surat</Link>
          <Link href="/persuratan/surat/baru" className="button button-primary">＋ Buat Surat Baru</Link>
        </div>
      </div>

      <div className="beranda-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))" }}>
        <article className="beranda-card beranda-kpi" data-tone="ungu">
          <span className="beranda-kpi-icon" aria-hidden="true">▤</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Total Surat</span>
            <strong className="beranda-kpi-value">{hasil.recap.reduce((sum, item) => sum + item.total, 0).toLocaleString("id-ID")}</strong>
            <span className="beranda-chip" data-tone="ungu">Seluruh periode</span>
          </div>
        </article>
        <article className="beranda-card beranda-kpi" data-tone="biru">
          <span className="beranda-kpi-icon" aria-hidden="true">◷</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Konsep</span>
            <strong className="beranda-kpi-value">{draft.toLocaleString("id-ID")}</strong>
            <span className="beranda-chip" data-tone="netral">Belum diajukan</span>
          </div>
        </article>
        <article className="beranda-card beranda-kpi" data-tone="ungu">
          <span className="beranda-kpi-icon" aria-hidden="true">⇄</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Menunggu Verifikasi</span>
            <strong className="beranda-kpi-value">{verifikasi.toLocaleString("id-ID")}</strong>
            <span className="beranda-chip" data-tone="ungu">Antrean persetujuan</span>
          </div>
        </article>
        <article className="beranda-card beranda-kpi" data-tone="hijau">
          <span className="beranda-kpi-icon" aria-hidden="true">✓</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Surat Terbit</span>
            <strong className="beranda-kpi-value">{terbit.toLocaleString("id-ID")}</strong>
            <span className="beranda-chip" data-tone="hijau">Siap dicetak</span>
          </div>
        </article>
        <article className="beranda-card beranda-kpi" data-tone="jingga">
          <span className="beranda-kpi-icon" aria-hidden="true">×</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Dibatalkan</span>
            <strong className="beranda-kpi-value">{batal.toLocaleString("id-ID")}</strong>
            <span className="beranda-chip" data-tone="merah">Tidak diterbitkan</span>
          </div>
        </article>
      </div>

      <section className="modul-card" style={{ marginBottom: 18 }}>
        <div className="beranda-card-head">
          <div>
            <h2 className="beranda-card-title">Cari & Filter Surat</h2>
            <p className="modul-muted">Cari nomor surat, jenis surat, nama penduduk, atau keperluan.</p>
          </div>
          <Link href="/persuratan/surat" className="modul-muted">Reset filter</Link>
        </div>
        <form method="get" action="/persuratan/surat" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>
            Kata kunci
            <input type="search" name="q" maxLength={100} defaultValue={filter.search} placeholder="Nomor, jenis, nama pemohon..." />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700 }}>
            Status surat
            <select name="status" defaultValue={filter.status ?? ""}>
              <option value="">Semua status</option>
              {LETTER_STATUSES.map((status) => <option key={status} value={status}>{LETTER_STATUS_LABELS[status]}</option>)}
            </select>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="button button-primary" type="submit">Terapkan Filter</button>
          </div>
        </form>
      </section>

      <section className="modul-card">
        <div className="beranda-card-head">
          <div>
            <h2 className="beranda-card-title">Daftar Surat</h2>
            <p className="modul-muted">{total.toLocaleString("id-ID")} surat ditemukan · {hasil.pageSize} data per halaman</p>
          </div>
        </div>
        {hasil.rows.length === 0 ? (
          <div style={{ display: "grid", justifyItems: "center", gap: 8, padding: "42px 20px", textAlign: "center" }}>
            <span aria-hidden="true" style={{ fontSize: 28 }}>▤</span>
            <strong>Belum ada surat pada filter ini</strong>
            <p className="modul-muted">Buat surat baru atau ubah kata kunci pencarian.</p>
            <Link href="/persuratan/surat/baru" className="button button-primary">Buat Surat Baru</Link>
          </div>
        ) : (
          <div className="modul-scroll">
            <table className="modul-table">
              <thead>
                <tr>
                  <th scope="col">Nomor Surat</th>
                  <th scope="col">Jenis Surat</th>
                  <th scope="col">Pemohon</th>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Status</th>
                  <th scope="col">TTE</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {hasil.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="modul-mono">{row.number ?? "Belum bernomor"}</td>
                    <td>
                      <strong>{row.typeName}</strong>
                      {row.purpose ? <span className="modul-muted">{row.purpose}</span> : null}
                    </td>
                    <td>{row.residentName ?? "—"}</td>
                    <td>{FORMAT_TANGGAL.format(new Date(`${row.letterDate}T00:00:00`))}</td>
                    <td><span className="beranda-chip" data-tone={chipStatus(row.status)}>{LETTER_STATUS_LABELS[row.status]}</span></td>
                    <td><span className="beranda-chip" data-tone={row.tte ? "hijau" : "netral"}>{row.tte ? "Tertanda" : "—"}</span></td>
                    <td><Link href={`/persuratan/surat/${row.id}`} style={{ color: "var(--color-brand)", fontWeight: 700, whiteSpace: "nowrap" }}>Detail →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasil.pageCount > 1 ? (
          <div className="modul-total" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>Halaman {hasil.page} dari {hasil.pageCount}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {hasil.page > 1 ? <Link className="button button-secondary" href={hrefPage(hasil.page - 1)}>Sebelumnya</Link> : null}
              {hasil.page < hasil.pageCount ? <Link className="button button-secondary" href={hrefPage(hasil.page + 1)}>Berikutnya</Link> : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
