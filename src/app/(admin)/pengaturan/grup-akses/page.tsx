import type { Metadata } from "next";
import Link from "next/link";

import { DialogHapus } from "@/components/ui/dialog-hapus";
import { getGrupAksesAdminData } from "@/features/pengguna/application/pengguna-admin";

import { buatRoleAction, hapusRoleAction, simpanIzinAction, ubahRoleAction } from "./actions";
import { DialogRole } from "./dialog-role";
import { DialogSalinRole } from "./dialog-salin-role";
import { salinRoleAction } from "./salin-role-action";
import { FormIzin } from "./form-izin";

export const metadata: Metadata = {
  title: "Hak Akses & Permission",
};

const angka = new Intl.NumberFormat("id-ID");

export default async function GrupAksesPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const params = await searchParams;
  const roleParam = Number(params.role);
  const data = await getGrupAksesAdminData(
    Number.isInteger(roleParam) && roleParam > 0 ? roleParam : undefined,
  );

  const sistem = data.roles.filter((role) => role.isSystem).length;
  const kustom = data.roles.length - sistem;

  return (
    <div className="modul-page pengguna-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Pengaturan</span>
          <h1>Hak Akses &amp; Permission</h1>
          <p>Atur role desa dan izin baca, tulis, serta kelola untuk setiap modul.</p>
        </div>
        {data.canUpdate ? (
          <DialogRole aksi={buatRoleAction} label="+ Tambah Grup" varian="primary" />
        ) : null}
      </div>

      <div className="pengguna-kpi-grid">
        <article className="pengguna-kpi" data-tone="ungu">
          <div>
            <span>Total Role</span>
            <strong>{angka.format(data.roles.length)}</strong>
            <small>Role milik desa ini</small>
          </div>
        </article>
        <article className="pengguna-kpi" data-tone="hijau">
          <div>
            <span>Role Kustom</span>
            <strong>{angka.format(kustom)}</strong>
            <small>Dapat diubah dan dihapus</small>
          </div>
        </article>
        <article className="pengguna-kpi" data-tone="oranye">
          <div><span>Modul Sistem</span><strong>{angka.format(data.moduleCount)}</strong><small>Modul aktif yang dapat diatur</small></div>
        </article>
        <article className="pengguna-kpi" data-tone="merah">
          <div><span>Total Hak Akses</span><strong>{angka.format(data.totalHakAkses)}</strong><small>Izin yang sudah diberikan pada role</small></div>
        </article>
      </div>

      <nav aria-label="Bagian manajemen pengguna" className="pengguna-tabs">
        <Link className="pengguna-tab" href="/pengaturan/pengguna">Pengguna</Link>
        <Link aria-current="page" className="pengguna-tab" href="/pengaturan/grup-akses">Peran &amp; Hak Akses</Link>
        <Link className="pengguna-tab" href="/pengaturan/pengguna/aktivitas">Aktivitas Pengguna</Link>
        <Link className="pengguna-tab" href="/pengaturan/pengguna/keamanan">Pengaturan Keamanan</Link>
      </nav>

      <div className="pengguna-role-layout">
        <section className="platform-card pengguna-card">
          <div className="pengguna-card-head">
            <div>
              <h2>Daftar Role</h2>
              <p>Jumlah anggota dihitung dari pengguna aktif dan nonaktif.</p>
            </div>
          </div>
          <ul className="pengguna-role-daftar">
            {data.roles.length === 0 ? (
              <li>
                <p className="modul-empty">Belum ada grup akses pada desa ini.</p>
              </li>
            ) : null}
            {data.roles.map((role) => {
              const dipilih = data.selected?.role.id === role.id;
              return (
                <li data-dipilih={dipilih || undefined} key={role.id}>
                  <Link
                    className="pengguna-role-link"
                    href={`/pengaturan/grup-akses?role=${role.id}`}
                  >
                    <span className="pengguna-role-ikon" aria-hidden="true">
                      {role.isSystem ? "★" : "◇"}
                    </span>
                    <span>
                      <strong>{role.name}</strong>
                      <span className="tenant-secondary">
                        {role.isSystem ? "Role sistem" : "Role kustom"} · {role.slug}
                      </span>
                    </span>
                    <span className="pengguna-role-jumlah">
                      {angka.format(data.statistik.perRole[role.id] ?? 0)} anggota
                    </span>
                  </Link>
                  <div className="pengguna-role-aksi">
                    {data.canUpdate ? <DialogSalinRole role={{ id: role.id, name: role.name }} aksi={salinRoleAction} /> : null}
                    {data.canUpdate && !role.isSystem ? (
                      <DialogRole
                        aksi={ubahRoleAction}
                        label="Ubah"
                        role={{ id: role.id, name: role.name }}
                      />
                    ) : null}
                    {data.canDelete && !role.isSystem ? (
                      <DialogHapus
                        aksi={hapusRoleAction}
                        id={String(role.id)}
                        judul="Hapus grup akses?"
                        keterangan={`Grup ${role.name} akan dihapus. Pengguna yang masih memakai grup ini kehilangan akses modul sampai role baru dipilih.`}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="platform-card pengguna-card" id="izin">
          <div className="pengguna-card-head">
            <div>
              <h2>{data.selected ? `Izin: ${data.selected.role.name}` : "Matriks Izin"}</h2>
              <p>
                {data.selected
                  ? "Centang akses per modul, lalu simpan. Role sistem hanya dapat dibaca."
                  : "Pilih salah satu role di samping untuk melihat dan mengatur izinnya."}
              </p>
            </div>
          </div>

          {data.selected ? (
            <div className="pengguna-card-body">
              <FormIzin
                aksi={simpanIzinAction}
                permissions={data.selected.permissions}
                readOnly={data.selected.role.isSystem || !data.canUpdate}
                roleId={data.selected.role.id}
              />
            </div>
          ) : (
            <p className="modul-empty">
              Belum ada role yang dipilih. Pilih role dari daftar untuk membuka matriks izin.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
