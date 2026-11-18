import type { Metadata } from "next";
import Link from "next/link";

import { AUDIT_EVENT_LABELS, type AuditEvent } from "@/features/audit/domain/audit";
import { ambilAuditPlatform } from "@/features/multi-desa/application/audit-platform-use-cases";
import { daftarSemuaDomain } from "@/features/multi-desa/application/kelola-desa-use-cases";
import { daftarPenggunaPlatform } from "@/features/multi-desa/application/pengguna-platform-use-cases";
import { daftarDesaSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import { hariMenujuPurge, statusRetensi } from "@/features/multi-desa/domain/lifecycle-tenant";
import {
  PlatformCard,
  PlatformEmpty,
  PlatformStat,
  PlatformStatus,
} from "@/features/multi-desa/presentation/platform-ui";

import { pastikanSuperAdmin } from "./guard";

export const metadata: Metadata = {
  title: "Ringkasan Platform",
  robots: { index: false, follow: false },
};

const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
const waktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const angka = new Intl.NumberFormat("id-ID");

export default async function SuperAdminPage() {
  await pastikanSuperAdmin();

  const [desa, domain, penggunaPlatform, audit] = await Promise.all([
    daftarDesaSuperAdmin(),
    daftarSemuaDomain(),
    daftarPenggunaPlatform(),
    ambilAuditPlatform({ page: 1 }),
  ]);

  const rows = desa.map((item) => ({
    ...item,
    statusRetensi: statusRetensi(item),
    hariMenujuPurge: hariMenujuPurge(item),
  }));

  const totalAktif = rows.filter((item) => item.active).length;
  const totalPenduduk = rows.reduce((total, item) => total + item.penduduk, 0);
  const totalPengguna = rows.reduce((total, item) => total + item.pengguna, 0);
  const desaBerdomain = new Set(domain.map((item) => item.villageId)).size;
  const desaTanpaDomain = rows.length - desaBerdomain;
  const siapPurge = rows.filter((item) => item.statusRetensi === "siap-purge");
  const nonaktif = rows.filter((item) => !item.active && item.statusRetensi !== "sudah-purge");
  const terbaru = [...rows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const aktivitas = audit.rows.slice(0, 6);

  // Baris bernilai nol hanya menambah tinggi halaman tanpa memberi tindakan,
  // jadi panel hanya menampilkan kondisi yang benar-benar perlu ditangani.
  const perhatian: {
    kunci: string;
    judul: string;
    keterangan: string;
    href: string;
    aksi: string;
  }[] = [];

  if (desaTanpaDomain > 0) {
    perhatian.push({
      kunci: "domain",
      judul: `${angka.format(desaTanpaDomain)} desa tanpa domain`,
      keterangan: "Tenant hanya dapat diakses lewat alamat bawaan sampai domain ditambahkan.",
      href: "/super-admin/domain",
      aksi: "Atur domain",
    });
  }
  if (nonaktif.length > 0) {
    perhatian.push({
      kunci: "nonaktif",
      judul: `${angka.format(nonaktif.length)} desa nonaktif`,
      keterangan: "Masa tenggang retensi berjalan otomatis; data dapat di-purge setelah selesai.",
      href: "/super-admin/tenant",
      aksi: "Tinjau tenant",
    });
  }
  if (siapPurge.length > 0) {
    perhatian.push({
      kunci: "purge",
      judul: `${angka.format(siapPurge.length)} desa siap purge`,
      keterangan: "Pastikan ekspor data masih berlaku sebelum menjalankan purge permanen.",
      href: "/super-admin/tenant",
      aksi: "Buka konsol tenant",
    });
  }

  return (
    <>
      <div className="platform-stat-grid">
        <PlatformStat
          icon={
            <>
              <path d="M3.5 20.5V9.2L9 6.3v14.2" />
              <path d="M9 20.5h11.5V11l-6-3.2" />
              <path d="M6 11.4h.01M6 14.8h.01M6 18.2h.01" />
              <path d="M12.5 12.2h.01M12.5 15.4h.01M12.5 18.6h.01M16 12.2h.01M16 15.4h.01" />
            </>
          }
          label="Total desa"
          note={`${angka.format(totalAktif)} desa aktif`}
          value={angka.format(rows.length)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="9" cy="8" r="3.2" />
              <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
              <path d="M16.4 5.6a3.2 3.2 0 0 1 0 6.4" />
              <path d="M18.3 14.4a6.2 6.2 0 0 1 3.1 5.6" />
            </>
          }
          label="Pengguna desa"
          note={`${angka.format(totalPenduduk)} penduduk tercatat`}
          value={angka.format(totalPengguna)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.4" />
              <path d="M3.6 12h16.8" />
              <path d="M12 3.6c2.4 2.4 3.6 5.2 3.6 8.4s-1.2 6-3.6 8.4c-2.4-2.4-3.6-5.2-3.6-8.4s1.2-6 3.6-8.4" />
            </>
          }
          label="Domain terdaftar"
          note={`${angka.format(desaTanpaDomain)} desa belum berdomain`}
          value={angka.format(domain.length)}
        />
        <PlatformStat
          icon={
            <>
              <path d="M12 3.4 19 6v5.4c0 4.2-2.9 7.6-7 9.2-4.1-1.6-7-5-7-9.2V6z" />
              <circle cx="12" cy="10.4" r="2" />
              <path d="M8.7 16.1a3.8 3.8 0 0 1 6.6 0" />
            </>
          }
          label="Pengguna platform"
          note={`${angka.format(penggunaPlatform.length)} akun pengelola terdaftar`}
          value={angka.format(penggunaPlatform.filter((item) => item.active).length)}
        />
      </div>

      <PlatformCard
        actions={
          <Link className="button button-secondary" href="/super-admin/tenant">
            Kelola semua tenant
          </Link>
        }
        description="Lima desa yang paling akhir didaftarkan."
        flush
        title="Tenant terbaru"
      >
        {terbaru.length > 0 ? (
          <div className="tenant-table-scroll">
            <table className="tenant-table">
              <thead>
                <tr>
                  <th scope="col">Desa</th>
                  <th scope="col">Domain</th>
                  <th scope="col">Pengguna</th>
                  <th scope="col">Penduduk</th>
                  <th scope="col">Terdaftar</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {terbaru.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name || "Tanpa nama"}</strong>
                      <span className="tenant-secondary">Kode: {item.code || "—"}</span>
                    </td>
                    <td>{item.domain || <span className="tenant-secondary">Belum diatur</span>}</td>
                    <td>{angka.format(item.pengguna)}</td>
                    <td>{angka.format(item.penduduk)}</td>
                    <td>{tanggal.format(new Date(item.createdAt))}</td>
                    <td>
                      <PlatformStatus
                        aktif={item.active}
                        label={item.active ? "Aktif" : "Nonaktif"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PlatformEmpty
            action={
              <Link className="button button-primary" href="/super-admin/tenant">
                Daftarkan desa pertama
              </Link>
            }
            description="Mulai dengan membuat tenant desa, lalu tetapkan domain dan administrator desanya."
            title="Belum ada tenant desa"
          />
        )}
      </PlatformCard>

      <div className="platform-split">
        <PlatformCard
          description="Kondisi tenant yang membutuhkan tindakan operator."
          title="Perlu perhatian"
        >
          {perhatian.length > 0 ? (
            <ul className="platform-attention-list">
              {perhatian.map((baris) => (
                <li key={baris.kunci}>
                  <div>
                    <strong>{baris.judul}</strong>
                    <p>{baris.keterangan}</p>
                  </div>
                  <Link className="button button-secondary" href={baris.href}>
                    {baris.aksi}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <PlatformEmpty
              description="Semua tenant berdomain, berstatus aktif, dan tidak ada data yang menunggu purge."
              title="Tidak ada tindakan tertunda"
            />
          )}
        </PlatformCard>

        <PlatformCard
          actions={
            <Link className="button button-secondary" href="/super-admin/audit">
              Semua aktivitas
            </Link>
          }
          description="Peristiwa terakhir lintas desa dan platform."
          title="Aktivitas terbaru"
        >
          {aktivitas.length > 0 ? (
            <ul className="platform-activity">
              {aktivitas.map((baris) => (
                <li key={baris.id}>
                  <span aria-hidden="true" className="platform-activity-dot" />
                  <div>
                    <strong>{AUDIT_EVENT_LABELS[baris.event as AuditEvent] ?? baris.event}</strong>
                    <span className="platform-activity-meta">
                      {baris.actorName ?? "Sistem"} · {baris.villageName ?? "Platform"} ·{" "}
                      {waktu.format(new Date(baris.createdAt))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <PlatformEmpty
              description="Setelah operator melakukan perubahan, jejaknya akan muncul di sini."
              title="Belum ada aktivitas tercatat"
            />
          )}
        </PlatformCard>
      </div>
    </>
  );
}
