import Link from "next/link";

import {
  getPengajuanDetailData,
  getPengajuanPageData,
} from "@/features/pelayanan/application/pengajuan-use-cases";

export const metadata = { title: "Pengajuan Layanan" };
const labels: Record<string, string> = {
  diajukan: "Menunggu",
  diverifikasi: "Diverifikasi",
  diproses: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};
const order = ["diajukan", "diverifikasi", "diproses", "selesai", "ditolak"];
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; detail?: string }>;
}) {
  const p = await searchParams;
  const status = ["diajukan", "diverifikasi", "diproses", "selesai", "ditolak"].includes(
    p.status ?? "",
  )
    ? p.status
    : undefined;
  const q = (p.q ?? "").slice(0, 100),
    page = Math.max(1, Math.min(10000, Number(p.page) || 1));
  const d = await getPengajuanPageData(status, q, page);
  const selectedId = Number(p.detail);
  const selected =
    Number.isSafeInteger(selectedId) && selectedId > 0
      ? await getPengajuanDetailData(selectedId)
      : null;
  const countByStatus = new Map(d.statusSummary.map((item) => [item.status, item.total]));
  const total = d.statusSummary.reduce((sum, item) => sum + item.total, 0);
  const query = (next: number, detail?: number) =>
    "?" +
    new URLSearchParams({
      ...(status ? { status } : {}),
      ...(q ? { q } : {}),
      page: String(next),
      ...(detail ? { detail: String(detail) } : {}),
    }).toString();
  const exportQuery = new URLSearchParams({
    ...(status ? { status } : {}),
    ...(q ? { q } : {}),
  }).toString();
  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Pelayanan Publik</span>
          <h1>Pengajuan Layanan</h1>
          <p>Kelola antrean pengajuan, verifikasi dokumen, proses layanan, dan penyelesaiannya.</p>
        </div>
        <a
          className="button button-primary"
          href={"/pelayanan-publik/pengajuan/ekspor" + (exportQuery ? "?" + exportQuery : "")}
        >
          ↓ Ekspor CSV
        </a>
      </div>
      <div className="dashboard-stats">
        <article className="modul-card">
          <span>Total Pengajuan</span>
          <strong>{total.toLocaleString("id-ID")}</strong>
          <small>Seluruh pengajuan layanan</small>
        </article>
        {order.map((key) => (
          <article className="modul-card" key={key}>
            <span>{labels[key]}</span>
            <strong>{(countByStatus.get(key) ?? 0).toLocaleString("id-ID")}</strong>
            <small>
              {total
                ? (((countByStatus.get(key) ?? 0) / total) * 100).toFixed(1).replace(".", ",")
                : "0,0"}
              % dari total
            </small>
          </article>
        ))}
      </div>
      <nav className="quick-actions" aria-label="Filter status pengajuan">
        <Link
          className={"button " + (!status ? "button-primary" : "button-secondary")}
          href="/pelayanan-publik/pengajuan"
        >
          Semua Pengajuan
        </Link>
        {Object.entries(labels).map(([key, label]) => (
          <Link
            key={key}
            className={"button " + (status === key ? "button-primary" : "button-secondary")}
            href={"/pelayanan-publik/pengajuan?status=" + key}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="request-workspace">
        <section className="modul-card">
          <div className="page-heading">
            <div>
              <h2>Antrean Pengajuan</h2>
              <p>Pilih satu pengajuan untuk melihat ringkasan di panel detail.</p>
            </div>
          </div>
          <form method="get" className="modul-filter-row">
            <label>
              <span>Cari nomor tiket, nama, atau NIK</span>
              <input name="q" defaultValue={q} placeholder="Cari pengajuan…" />
            </label>
            <label>
              <span>Status</span>
              <select name="status" defaultValue={status ?? ""}>
                <option value="">Semua status</option>
                {Object.entries(labels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <input type="hidden" name="page" value="1" />
            <button className="button button-primary">Filter</button>
          </form>
          <div className="modul-scroll">
            <table className="modul-table">
              <thead>
                <tr>
                  <th>No. Tiket</th>
                  <th>Pemohon</th>
                  <th>Layanan</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.nomorTiket}</strong>
                    </td>
                    <td>
                      {r.namaPemohon}
                      <br />
                      <small>{r.nik ?? "NIK tidak dicantumkan"}</small>
                    </td>
                    <td>{r.namaLayanan ?? "Layanan dihapus"}</td>
                    <td>{r.createdAt?.toLocaleDateString("id-ID") ?? "—"}</td>
                    <td>{labels[r.status] ?? r.status}</td>
                    <td>
                      <Link className="button button-secondary" href={query(d.page, r.id)}>
                        Pilih
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {d.rows.length === 0 ? (
            <p className="modul-empty">Tidak ada pengajuan yang sesuai dengan filter.</p>
          ) : null}
          <div className="table-pagination">
            <span>
              Menampilkan {d.total === 0 ? 0 : (d.page - 1) * d.pageSize + 1}–
              {Math.min(d.page * d.pageSize, d.total)} dari {d.total} pengajuan
            </span>
            <div className="page-actions">
              <Link
                aria-disabled={d.page <= 1}
                className="button button-secondary"
                href={query(Math.max(1, d.page - 1), selectedId || undefined)}
              >
                Sebelumnya
              </Link>
              <span>
                Halaman {d.page} / {d.totalPages}
              </span>
              <Link
                aria-disabled={d.page >= d.totalPages}
                className="button button-secondary"
                href={query(Math.min(d.totalPages, d.page + 1), selectedId || undefined)}
              >
                Berikutnya
              </Link>
            </div>
          </div>
        </section>
        <aside className="modul-card request-detail-panel">
          {selected ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">Detail Terpilih</span>
                  <h2>{selected.request.nomorTiket}</h2>
                  <p>{selected.namaLayanan ?? "Layanan tidak tersedia"}</p>
                </div>
                <span className={"request-status request-status-" + selected.request.status}>
                  {labels[selected.request.status] ?? selected.request.status}
                </span>
              </div>
              <div className="request-detail-list">
                <div>
                  <small>Nama pemohon</small>
                  <strong>{selected.request.namaPemohon}</strong>
                </div>
                <div>
                  <small>NIK</small>
                  <strong>{selected.request.nik ?? "—"}</strong>
                </div>
                <div>
                  <small>Telepon</small>
                  <strong>{selected.request.telepon ?? "—"}</strong>
                </div>
                <div>
                  <small>Tanggal pengajuan</small>
                  <strong>{selected.request.createdAt.toLocaleString("id-ID")}</strong>
                </div>
                <div>
                  <small>Keperluan</small>
                  <p>{selected.request.keperluan}</p>
                </div>
                <div>
                  <small>Catatan petugas</small>
                  <p>{selected.request.catatanPetugas ?? "Belum ada catatan."}</p>
                </div>
              </div>
              <Link
                className="button button-primary"
                href={"/pelayanan-publik/pengajuan/" + selected.request.id}
              >
                Buka Detail & Proses →
              </Link>
            </>
          ) : (
            <div className="modul-empty">
              <strong>Belum ada pengajuan dipilih</strong>
              <p>Pilih salah satu baris antrean untuk melihat ringkasan pemohon dan status.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
