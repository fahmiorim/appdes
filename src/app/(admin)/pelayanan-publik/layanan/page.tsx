import Link from "next/link";

import { getLayananPageData } from "@/features/pelayanan/application/layanan-use-cases";

import { hapusLayananAction } from "./actions";

export const metadata = { title: "Daftar Layanan Publik" };
const money = (value: number) =>
  value === 0
    ? "Gratis"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(value);
export default async function LayananPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tersimpan?: string; dihapus?: string }>;
}) {
  const p = await searchParams,
    q = (p.q ?? "").slice(0, 100);
  const [d, all] = await Promise.all([getLayananPageData(q), getLayananPageData()]);
  const active = all.rows.filter((r) => r.aktif).length,
    inactive = all.rows.length - active;
  const selected = d.rows[0];
  const categories = [
    ["Semua", ""],
    ["Administrasi", "administrasi"],
    ["Kependudukan", "kependudukan"],
    ["Sosial", "sosial"],
    ["Pemerintahan", "pemerintahan"],
    ["Lainnya", "lainnya"],
  ] as const;
  return (
    <div className="modul-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Pelayanan Publik</span>
          <h1>Daftar Layanan</h1>
          <p>
            Kelola jenis layanan publik desa, persyaratan, estimasi waktu, biaya, dan status
            layanan.
          </p>
        </div>
        {d.canCreate ? (
          <Link className="button button-primary" href="/pelayanan-publik/layanan/baru">
            ＋ Tambah Layanan
          </Link>
        ) : null}
      </div>
      <div className="dashboard-stats">
        <article className="modul-card">
          <span>Total Layanan</span>
          <strong>{d.total.toLocaleString("id-ID")}</strong>
          <small>Jenis layanan terdaftar</small>
        </article>
        <article className="modul-card">
          <span>Layanan Aktif</span>
          <strong>{active.toLocaleString("id-ID")}</strong>
          <small>Tersedia untuk masyarakat</small>
        </article>
        <article className="modul-card">
          <span>Layanan Nonaktif</span>
          <strong>{inactive.toLocaleString("id-ID")}</strong>
          <small>Tidak ditampilkan ke warga</small>
        </article>
        <article className="modul-card">
          <span>Rata-rata Estimasi</span>
          <strong>
            {d.rows.length
              ? Math.round(d.rows.reduce((sum, r) => sum + r.estimasiHari, 0) / d.rows.length)
              : 0}{" "}
            hari
          </strong>
          <small>Berdasarkan daftar yang tampil</small>
        </article>
      </div>
      {p.tersimpan ? <div className="alert alert-info">Layanan berhasil disimpan.</div> : null}
      {p.dihapus ? <div className="alert alert-info">Layanan berhasil dihapus.</div> : null}
      <section className="modul-card">
        <div className="page-heading">
          <div>
            <h2>Katalog Layanan Desa</h2>
            <p>Gunakan pencarian untuk menemukan layanan yang akan dikelola.</p>
          </div>
        </div>
        <nav className="quick-actions" aria-label="Kategori layanan">
          {categories.map(([label, value]) => (
            <Link
              key={value || "all"}
              className={
                "button " + (q === value || (!q && !value) ? "button-primary" : "button-secondary")
              }
              href={
                value
                  ? "/pelayanan-publik/layanan?q=" + encodeURIComponent(value)
                  : "/pelayanan-publik/layanan"
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <form method="get" className="modul-filter-row">
          <label>
            <span>Cari layanan</span>
            <input name="q" defaultValue={q} placeholder="Cari nama atau kategori layanan…" />
          </label>
          <button className="button button-secondary">Cari</button>
        </form>
        <div className="modul-scroll">
          <table className="modul-table">
            <thead>
              <tr>
                <th>Nama layanan</th>
                <th>Kategori</th>
                <th>Estimasi</th>
                <th>Biaya</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.nama}</strong>
                    <br />
                    <small>{r.deskripsi ?? ""}</small>
                  </td>
                  <td>{r.kategori}</td>
                  <td>{r.estimasiHari} hari kerja</td>
                  <td>{money(r.biaya)}</td>
                  <td>{r.aktif ? "Aktif" : "Nonaktif"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link
                        className="button button-secondary"
                        href={"/pelayanan-publik/layanan/" + r.id}
                      >
                        Detail
                      </Link>
                      {d.canUpdate ? (
                        <Link
                          className="button button-secondary"
                          href={"/pelayanan-publik/layanan/" + r.id + "/edit"}
                        >
                          Ubah
                        </Link>
                      ) : null}
                      {d.canDelete ? (
                        <form action={hapusLayananAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="button button-danger-ghost">Hapus</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.rows.length === 0 ? (
          <p className="modul-empty">
            Belum ada layanan yang sesuai. Tambahkan layanan pertama untuk mulai mengelola katalog
            desa.
          </p>
        ) : null}
        <p>
          Menampilkan {d.rows.length} dari {d.total} layanan.
        </p>
      </section>
      {selected ? (
        <section className="modul-card">
          <div className="page-heading">
            <div>
              <h2>Detail Layanan Terpilih</h2>
              <p>Ringkasan konfigurasi dan persyaratan layanan.</p>
            </div>
            <Link
              className="button button-secondary"
              href={"/pelayanan-publik/layanan/" + selected.id}
            >
              Buka detail →
            </Link>
          </div>
          <div className="service-preview-grid">
            <div>
              <h3>{selected.nama}</h3>
              <p>{selected.deskripsi || "Belum ada deskripsi layanan."}</p>
              <strong>Persyaratan</strong>
              {(selected.persyaratan ?? "").split(/\r?\n/).filter(Boolean).length ? (
                <ul>
                  {(selected.persyaratan ?? "")
                    .split(/\r?\n/)
                    .filter(Boolean)
                    .map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                </ul>
              ) : (
                <p className="modul-empty">Belum ada persyaratan yang ditetapkan.</p>
              )}
            </div>
            <div className="service-preview-facts">
              <div>
                <span>Kategori</span>
                <strong>{selected.kategori}</strong>
              </div>
              <div>
                <span>Estimasi</span>
                <strong>{selected.estimasiHari} hari kerja</strong>
              </div>
              <div>
                <span>Biaya</span>
                <strong>{money(selected.biaya)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selected.aktif ? "Aktif" : "Nonaktif"}</strong>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
