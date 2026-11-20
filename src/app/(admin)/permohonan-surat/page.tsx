import type { Metadata } from "next";
import Link from "next/link";

import { getPermohonanAdminData } from "@/features/layanan-mandiri/application/admin-use-cases";
import {
  labelPermohonanStatus,
  PERMOHONAN_STATUS_LABELS,
} from "@/features/layanan-mandiri/domain/layanan-mandiri";

export const metadata: Metadata = { title: "Permohonan Surat" };

type SearchParams = Promise<{
  dari?: string;
  sampai?: string;
  jenis?: string;
  status?: string;
  page?: string;
}>;

const FORMAT_TANGGAL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function tanggalValid(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function angkaValid(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function tanggal(value: Date | null): string {
  return value ? FORMAT_TANGGAL.format(value) : "—";
}

function toneStatus(status: number): string {
  if (status === 3 || status === 4) return "berhasil";
  if (status === 5) return "netral";
  if (status === 0) return "peringatan";
  return "biru";
}

export default async function PermohonanSuratPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter = {
    dari: tanggalValid(params.dari),
    sampai: tanggalValid(params.sampai),
    typeId: angkaValid(params.jenis),
    status: params.status !== undefined && /^[0-5]$/.test(params.status) ? Number(params.status) : undefined,
  };
  const hasil = await getPermohonanAdminData(filter);
  const { permohonan, jenis, canManage } = hasil;
  const total = permohonan.length;
  const pageSize = 20;
  const requestedPage = angkaValid(params.page) ?? 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const pageRows = permohonan.slice((page - 1) * pageSize, page * pageSize);
  const menunggu = permohonan.filter((row) => row.status === 0 || row.status === 1 || row.status === 2).length;
  const selesai = permohonan.filter((row) => row.status === 3 || row.status === 4).length;
  const dibatalkan = permohonan.filter((row) => row.status === 5).length;

  const query = new URLSearchParams();
  if (filter.dari) query.set("dari", filter.dari);
  if (filter.sampai) query.set("sampai", filter.sampai);
  if (filter.typeId !== undefined) query.set("jenis", String(filter.typeId));
  if (filter.status !== undefined) query.set("status", String(filter.status));
  const exportHref = query.size ? `/permohonan-surat/ekspor?${query.toString()}` : "/permohonan-surat/ekspor";

  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administrasi Surat</span>
          <h1>Permohonan Surat</h1>
          <p>Kelola permohonan layanan surat dari warga, periksa kelengkapan, dan teruskan proses penerbitan.</p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <Link className="button button-secondary" href="/persuratan/dashboard">Dashboard Surat</Link>
          <a className="button button-primary" href={exportHref}>Ekspor CSV</a>
        </div>
      </div>

      <div className="beranda-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))" }}>
        <article className="beranda-card beranda-kpi" data-tone="ungu">
          <span className="beranda-kpi-icon" aria-hidden="true">▤</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Total Permohonan</span>
            <strong className="beranda-kpi-value">{total.toLocaleString("id-ID")}</strong>
            <span className="beranda-chip" data-tone="netral">Sesuai filter</span>
          </div>
        </article>
        <article className="beranda-card beranda-kpi" data-tone="biru">
          <span className="beranda-kpi-icon" aria-hidden="true">◷</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Dalam Proses</span>
            <strong className="beranda-kpi-value">{menunggu.toLocaleString("id-ID")}</strong>
            <span className="beranda-chip" data-tone="biru">Belum selesai</span>
          </div>
        </article>
        <article className="beranda-card beranda-kpi" data-tone="hijau">
          <span className="beranda-kpi-icon" aria-hidden="true">✓</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Selesai</span>
            <strong className="beranda-kpi-value">{selesai.toLocaleString("id-ID")}</strong>
            <span className="beranda-chip" data-tone="berhasil">Siap / sudah diambil</span>
          </div>
        </article>
        <article className="beranda-card beranda-kpi" data-tone="jingga">
          <span className="beranda-kpi-icon" aria-hidden="true">×</span>
          <div className="beranda-kpi-body">
            <span className="beranda-kpi-label">Dibatalkan</span>
            <strong className="beranda-kpi-value">{dibatalkan.toLocaleString("id-ID")}</strong>
            <span className="beranda-chip" data-tone="netral">Permohonan batal</span>
          </div>
        </article>
      </div>

      <section className="modul-card" style={{ marginBottom: 18 }}>
        <div className="beranda-card-head">
          <div>
            <h2 className="beranda-card-title">Filter Permohonan</h2>
            <p className="modul-muted">Cari berdasarkan tanggal masuk, jenis surat, atau status layanan.</p>
          </div>
          <Link href="/permohonan-surat" className="modul-muted">Reset filter</Link>
        </div>
        <form method="get" action="/permohonan-surat" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6, color: "var(--color-text-muted)", fontSize: 12, fontWeight: 600 }}>
            <span>Dari tanggal</span>
            <input type="date" name="dari" defaultValue={filter.dari} />
          </label>
          <label className="modul-field">
            <span>Sampai tanggal</span>
            <input type="date" name="sampai" min={filter.dari} defaultValue={filter.sampai} />
          </label>
          <label className="modul-field">
            <span>Jenis surat</span>
            <select name="jenis" defaultValue={filter.typeId?.toString() ?? ""}>
              <option value="">Semua jenis surat</option>
              {jenis.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
            </select>
          </label>
          <label className="modul-field">
            <span>Status</span>
            <select name="status" defaultValue={filter.status?.toString() ?? ""}>
              <option value="">Semua status</option>
              {Object.entries(PERMOHONAN_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button type="submit" className="button button-primary">Terapkan Filter</button>
          </div>
        </form>
      </section>

      <section className="modul-card">
        <div className="beranda-card-head">
          <div>
            <h2 className="beranda-card-title">Daftar Permohonan</h2>
            <p className="modul-muted">{total.toLocaleString("id-ID")} permohonan ditemukan</p>
          </div>
          {canManage ? <span className="beranda-chip" data-tone="berhasil">Akses pengelolaan aktif</span> : <span className="beranda-chip" data-tone="netral">Akses baca saja</span>}
        </div>
        {permohonan.length === 0 ? (
          <div style={{ display: "grid", justifyItems: "center", gap: 8, padding: "42px 20px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <span aria-hidden="true">▤</span>
            <strong>Belum ada permohonan</strong>
            <p>Tidak ada data yang sesuai dengan filter saat ini.</p>
            <Link href="/permohonan-surat">Tampilkan semua permohonan</Link>
          </div>
        ) : (
          <div className="modul-scroll">
            <table className="modul-table">
              <thead>
                <tr>
                  <th scope="col">No. Antrian</th>
                  <th scope="col">Pemohon</th>
                  <th scope="col">Jenis Surat</th>
                  <th scope="col">Tanggal Masuk</th>
                  <th scope="col">Status</th>
                  <th scope="col">Nomor Surat</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td className="modul-mono">{row.noAntrian ?? `#${row.id}`}</td>
                    <td>
                      <strong>{row.namaPemohon ?? "Data pemohon tidak tersedia"}</strong>
                      <span className="modul-muted">{row.nikPemohon ?? "NIK tidak tersedia"}</span>
                    </td>
                    <td><strong>{row.namaSurat ?? "Jenis surat tidak tersedia"}</strong></td>
                    <td>{tanggal(row.createdAt)}</td>
                    <td><span className="beranda-chip" data-tone={toneStatus(row.status)}>{labelPermohonanStatus(row.status)}</span></td>
                    <td className="modul-mono">{row.letterNumber ?? "—"}</td>
                    <td><Link href={`/permohonan-surat/${row.id}`} style={{ color: "var(--color-brand)", fontWeight: 700, whiteSpace: "nowrap" }}>Lihat detail →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > 0 ? (
          <div className="modul-total" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span>Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total.toLocaleString("id-ID")} permohonan</span>
            <div style={{ display: "flex", gap: 8 }}>
              {page > 1 ? <Link className="button button-secondary" href={`/permohonan-surat?${query.toString()}${query.size ? "&" : ""}page=${page - 1}`}>Sebelumnya</Link> : null}
              <span style={{ alignSelf: "center" }}>Halaman {page} / {pageCount}</span>
              {page < pageCount ? <Link className="button button-secondary" href={`/permohonan-surat?${query.toString()}${query.size ? "&" : ""}page=${page + 1}`}>Berikutnya</Link> : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
