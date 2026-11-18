import type { Metadata } from "next";
import Link from "next/link";

import { StatIcon } from "@/components/ui/stat-icon";
import { getAuditLogPageData } from "@/features/audit/application/audit-use-cases";
import { labelAktivitas, toneAktivitas } from "@/features/dashboard/domain/aktivitas";
import { waktuRelatif } from "@/features/dashboard/domain/waktu-relatif";
import { getPenggunaAdminData } from "@/features/pengguna/application/pengguna-admin";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { verifySession } from "@/lib/dal";

import { buatPenggunaAction, hapusPenggunaAction, ubahPenggunaAction } from "./actions";
import { DialogPengguna } from "./dialog-pengguna";
import { PenggunaConsole } from "./pengguna-console";

export const metadata: Metadata = {
  title: "Manajemen Pengguna",
};

const angka = new Intl.NumberFormat("id-ID");

export default async function PenggunaPage() {
  const [user, data] = await Promise.all([verifySession(), getPenggunaAdminData()]);
  const bolehAudit = hasPermission(user.permissions, RESOURCES.auditLog, "read");
  const audit = bolehAudit ? await getAuditLogPageData({ page: 1 }) : null;

  const roles = data.roles.map((role) => ({ value: String(role.id), label: role.name }));
  const aktivitas = audit?.rows.slice(0, 5) ?? [];
  const persenAktif =
    data.statistik.total === 0
      ? 0
      : Math.round((data.statistik.aktif / data.statistik.total) * 100);
  const donut =
    data.statistik.total === 0
      ? "conic-gradient(#e6e9f4 0deg 360deg)"
      : `conic-gradient(#16a36a 0deg ${persenAktif * 3.6}deg, #f0a020 ${persenAktif * 3.6}deg 360deg)`;

  return (
    <div className="modul-page pengguna-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Pengaturan</span>
          <h1>Manajemen Pengguna &amp; Hak Akses</h1>
          <p>Kelola akun pengguna, role, dan izin modul untuk desa ini.</p>
        </div>
      </div>

      <div className="pengguna-kpi-grid">
        <article className="pengguna-kpi" data-tone="ungu">
          <StatIcon>
            <circle cx="9" cy="8" r="3.2" />
            <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
            <path d="M16.4 5.6a3.2 3.2 0 0 1 0 6.4" />
          </StatIcon>
          <div>
            <span>Total Pengguna</span>
            <strong>{angka.format(data.statistik.total)}</strong>
            <small>{angka.format(data.roles.length)} role tersedia</small>
          </div>
        </article>
        <article className="pengguna-kpi" data-tone="hijau">
          <StatIcon>
            <path d="M12 3.4 19 6v5.4c0 4.2-2.9 7.6-7 9.2-4.1-1.6-7-5-7-9.2V6z" />
            <path d="m9 12 2.1 2.2L15.4 10" />
          </StatIcon>
          <div>
            <span>Aktif</span>
            <strong>{angka.format(data.statistik.aktif)}</strong>
            <small>{persenAktif}% dari total akun</small>
          </div>
        </article>
        <article className="pengguna-kpi" data-tone="oranye">
          <StatIcon>
            <circle cx="12" cy="12" r="8.4" />
            <path d="M12 7.6V12l3 1.8" />
          </StatIcon>
          <div>
            <span>Nonaktif</span>
            <strong>{angka.format(data.statistik.nonaktif)}</strong>
            <small>Akun tidak dapat masuk</small>
          </div>
        </article>
        <article className="pengguna-kpi" data-tone="biru">
          <StatIcon>
            <rect height="12" rx="2" width="16" x="4" y="4" />
            <path d="M8 9h8M8 13h5" />
          </StatIcon>
          <div>
            <span>Total Role</span>
            <strong>{angka.format(data.roles.length)}</strong>
            <small>Role milik desa ini</small>
          </div>
        </article>
      </div>

      <nav aria-label="Bagian manajemen pengguna" className="pengguna-tabs">
        <Link aria-current="page" className="pengguna-tab" href="/pengaturan/pengguna">
          Daftar Pengguna
        </Link>
        <Link className="pengguna-tab" href="/pengaturan/grup-akses">
          Hak Akses (Role)
        </Link>
        <Link className="pengguna-tab" href="/pengaturan/grup-akses#izin">
          Grup &amp; Permission
        </Link>
        {bolehAudit ? (
          <a className="pengguna-tab" href="#log-aktivitas">
            Log Aktivitas
          </a>
        ) : null}
      </nav>

      <div className="pengguna-layout">
        <section className="platform-card pengguna-card">
          <div className="pengguna-card-head">
            <div>
              <h2>Daftar Pengguna</h2>
              <p>{angka.format(data.statistik.total)} akun terdaftar pada desa ini.</p>
            </div>
          </div>
          <div className="pengguna-card-body">
            <PenggunaConsole
              aksi={{
                buat: buatPenggunaAction,
                ubah: ubahPenggunaAction,
                hapus: hapusPenggunaAction,
              }}
              canDelete={data.canDelete}
              canUpdate={data.canUpdate}
              currentUserId={data.currentUserId}
              roles={roles}
              rows={data.rows}
            />
          </div>
        </section>

        <aside className="pengguna-rail">
          <section className="pengguna-rail-card pengguna-rail-aksi">
            {data.canUpdate ? (
              <DialogPengguna
                aksi={buatPenggunaAction}
                currentUserId={data.currentUserId}
                label="+ Tambah Pengguna"
                roles={roles}
                varian="primary"
              />
            ) : (
              <span className="pengguna-rail-note">Anda hanya memiliki akses baca.</span>
            )}
            <Link className="pengguna-rail-tombol" href="/pengaturan/grup-akses">
              Kelola Role &amp; Hak Akses
            </Link>
          </section>

          <section className="pengguna-rail-card">
            <header className="pengguna-rail-head">
              <h2>Daftar Role ({data.roles.length})</h2>
              <Link href="/pengaturan/grup-akses">Kelola</Link>
            </header>
            <ul className="pengguna-role-list">
              {data.roles.map((role) => (
                <li key={role.id}>
                  <span className="pengguna-role-ikon" aria-hidden="true">
                    {role.isSystem ? "★" : "◇"}
                  </span>
                  <span>{role.name}</span>
                  <strong>{data.statistik.perRole[role.id] ?? 0}</strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="pengguna-rail-card">
            <header className="pengguna-rail-head">
              <h2>Statistik Pengguna</h2>
            </header>
            <div className="pengguna-donut-wrap">
              <div
                aria-label={`${data.statistik.total} pengguna: ${data.statistik.aktif} aktif, ${data.statistik.nonaktif} nonaktif`}
                className="pengguna-donut"
                role="img"
                style={{ background: donut }}
              >
                <span>
                  <strong>{angka.format(data.statistik.total)}</strong>
                  Pengguna
                </span>
              </div>
              <ul className="pengguna-legend">
                <li>
                  <span aria-hidden="true" data-warna="hijau" /> Aktif
                  <strong>{angka.format(data.statistik.aktif)}</strong>
                </li>
                <li>
                  <span aria-hidden="true" data-warna="oranye" /> Nonaktif
                  <strong>{angka.format(data.statistik.nonaktif)}</strong>
                </li>
              </ul>
            </div>
          </section>

          <section className="pengguna-rail-card">
            <header className="pengguna-rail-head">
              <h2>Aktivitas Terbaru</h2>
              {bolehAudit ? <a href="#log-aktivitas">Lihat semua</a> : null}
            </header>
            {aktivitas.length === 0 ? (
              <p className="pengguna-rail-note">Belum ada aktivitas pengguna atau role.</p>
            ) : (
              <ul className="pengguna-aktivitas">
                {aktivitas.map((baris) => (
                  <li data-tone={toneAktivitas(baris.event)} key={baris.id}>
                    <span className="pengguna-aktivitas-titik" aria-hidden="true" />
                    <div>
                      <strong>{labelAktivitas(baris.event)}</strong>
                      <span>
                        {baris.actorName ?? "Sistem"} · {waktuRelatif(baris.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {bolehAudit && audit ? (
        <section className="platform-card pengguna-audit" id="log-aktivitas">
          <div className="pengguna-card-head">
            <div>
              <h2>Log Aktivitas</h2>
              <p>{angka.format(audit.total)} peristiwa tercatat untuk desa ini.</p>
            </div>
          </div>
          {audit.rows.length === 0 ? (
            <p className="modul-empty">Belum ada aktivitas yang tercatat.</p>
          ) : (
            <div className="tenant-table-scroll">
              <table className="tenant-table">
                <thead>
                  <tr>
                    <th scope="col">Peristiwa</th>
                    <th scope="col">Aktor</th>
                    <th scope="col">Resource</th>
                    <th scope="col">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.rows.map((baris) => (
                    <tr key={baris.id}>
                      <td>{labelAktivitas(baris.event)}</td>
                      <td>{baris.actorName ?? "Sistem"}</td>
                      <td className="pengguna-mono">
                        {baris.resource}
                        {baris.resourceId ? `:${baris.resourceId}` : ""}
                      </td>
                      <td>{waktuRelatif(baris.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
