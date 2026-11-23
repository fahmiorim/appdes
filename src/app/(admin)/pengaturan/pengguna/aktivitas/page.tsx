import Link from "next/link";

import { getAuditLogPageData } from "@/features/audit/application/audit-use-cases";
import { labelAktivitas } from "@/features/dashboard/domain/aktivitas";

import styles from "./aktivitas.module.css";

export const metadata = { title: "Aktivitas Pengguna" };
export default async function AktivitasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; event?: string; days?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const days = [7, 30, 90].includes(Number(params.days)) ? Number(params.days) : 7;
  const data = await getAuditLogPageData({
    page,
    search: params.q,
    event: params.event || undefined,
    days,
  });
  return (
    <main className={styles.page}>
      <header>
        <div>
          <small>Pengaturan Desa / Manajemen Pengguna</small>
          <h1>Aktivitas Pengguna</h1>
          <p>Jejak audit perubahan data, autentikasi, dan aktivitas administrasi desa.</p>
        </div>
        <a href="/api/pengaturan/pengguna/aktivitas/ekspor">Unduh CSV</a>
      </header>
      <nav className={styles.tabs}>
        <Link href="/pengaturan/pengguna">Pengguna</Link>
        <Link href="/pengaturan/grup-akses">Peran & Hak Akses</Link>
        <Link aria-current="page" href="/pengaturan/pengguna/aktivitas">
          Aktivitas Pengguna
        </Link>
        <Link href="/pengaturan/pengguna/keamanan">Pengaturan Keamanan</Link>
      </nav>
      <div className={styles.stats}>
        <article>
          <span>Total Aktivitas</span>
          <strong>
            {Object.values(data.stats)
              .reduce((sum, value) => sum + value, 0)
              .toLocaleString("id-ID")}
          </strong>
        </article>
        <article>
          <span>Login</span>
          <strong>{(data.stats["auth.login.success"] ?? 0).toLocaleString("id-ID")}</strong>
        </article>
        <article>
          <span>Gagal Login</span>
          <strong>{(data.stats["auth.login.failure"] ?? 0).toLocaleString("id-ID")}</strong>
        </article>
        <article>
          <span>Tambah Data</span>
          <strong>{(data.stats["pengguna.create"] ?? 0).toLocaleString("id-ID")}</strong>
        </article>
        <article>
          <span>Ubah Data</span>
          <strong>{(data.stats["pengguna.update"] ?? 0).toLocaleString("id-ID")}</strong>
        </article>
        <article>
          <span>Hapus Data</span>
          <strong>{(data.stats["pengguna.delete"] ?? 0).toLocaleString("id-ID")}</strong>
        </article>
      </div>
      <section className={styles.card}>
        <div className={styles.summary}>
          <b>{data.total.toLocaleString("id-ID")} aktivitas tercatat</b>
          <span>
            Halaman {data.page} dari {data.pageCount}
          </span>
        </div>
        <form className={styles.search}>
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Cari pengguna, aktivitas, atau modul..."
          />
          <select name="event" defaultValue={params.event ?? ""}>
            <option value="">Semua Aktivitas</option>
            <option value="auth.login.success">Login</option>
            <option value="auth.login.failure">Gagal Login</option>
            <option value="pengguna.create">Tambah Pengguna</option>
            <option value="pengguna.update">Ubah Pengguna</option>
            <option value="pengguna.delete">Hapus Pengguna</option>
            <option value="grup-akses.permission">Ubah Hak Akses</option>
          </select>
          <select name="days" defaultValue={String(days)}>
            <option value="7">7 Hari Terakhir</option>
            <option value="30">30 Hari Terakhir</option>
            <option value="90">90 Hari Terakhir</option>
          </select>
          <button type="submit">Filter</button>
        </form>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Waktu</th>
                <th>Pengguna</th>
                <th>Aktivitas</th>
                <th>Modul</th>
                <th>Detail</th>
                <th>IP Address</th>
                <th>Perangkat</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, index) => (
                <tr key={row.id}>
                  <td>{(page - 1) * data.pageSize + index + 1}</td>
                  <td>
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(row.createdAt)}
                  </td>
                  <td>{row.actorName ?? "Sistem"}</td>
                  <td>
                    <span className={styles.event}>{labelAktivitas(row.event)}</span>
                  </td>
                  <td>{row.resource}</td>
                  <td>{row.details ?? row.resourceId ?? "—"}</td>
                  <td>{row.ipAddress ?? "—"}</td>
                  <td>{row.userAgent?.slice(0, 80) ?? "—"}</td>
                </tr>
              ))}
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>Belum ada aktivitas yang sesuai.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <footer>
          <span>
            Menampilkan {data.rows.length} dari {data.total} aktivitas
          </span>
          <div>
            {page > 1 ? (
              <Link
                href={`?page=${page - 1}&q=${encodeURIComponent(params.q ?? "")}&event=${encodeURIComponent(params.event ?? "")}&days=${days}`}
              >
                ‹ Sebelumnya
              </Link>
            ) : null}
            {page < data.pageCount ? (
              <Link
                href={`?page=${page + 1}&q=${encodeURIComponent(params.q ?? "")}&event=${encodeURIComponent(params.event ?? "")}&days=${days}`}
              >
                Berikutnya ›
              </Link>
            ) : null}
          </div>
        </footer>
      </section>
    </main>
  );
}
