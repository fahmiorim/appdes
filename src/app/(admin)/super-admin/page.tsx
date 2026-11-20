import type { Metadata } from "next";
import Link from "next/link";

import { AUDIT_EVENT_LABELS, type AuditEvent } from "@/features/audit/domain/audit";
import { ambilAuditPlatform } from "@/features/multi-desa/application/audit-platform-use-cases";
import { daftarSemuaDomain } from "@/features/multi-desa/application/kelola-desa-use-cases";
import { daftarPenggunaPlatform } from "@/features/multi-desa/application/pengguna-platform-use-cases";
import { daftarDesaSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import { hariMenujuPurge, statusRetensi } from "@/features/multi-desa/domain/lifecycle-tenant";
import {
  distribusiKecamatan,
  distribusiTema,
} from "@/features/multi-desa/domain/ringkasan-platform";
import { hitungTrenTenant } from "@/features/multi-desa/domain/tren-tenant";
import {
  PlatformBarList,
  PlatformCard,
  PlatformDonut,
  PlatformEmpty,
  PlatformPageHeader,
  PlatformStat,
  PlatformStatus,
  PlatformTrend,
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
  const totalPenggunaDesa = rows.reduce((total, item) => total + item.pengguna, 0);
  const totalPengguna = totalPenggunaDesa + penggunaPlatform.length;
  const tema = distribusiTema(rows, 5);
  const temaDonut =
    tema.tanpaTema > 0
      ? [
          ...tema.items,
          {
            label: "Belum bertema",
            value: tema.tanpaTema,
            persentase: tema.total > 0 ? Math.round((tema.tanpaTema / tema.total) * 100) : 0,
          },
        ]
      : tema.items;
  const kecamatan = distribusiKecamatan(rows, 5);
  const desaBerdomain = new Set(domain.map((item) => item.villageId)).size;
  const desaTanpaDomain = rows.length - desaBerdomain;
  const siapPurge = rows.filter((item) => item.statusRetensi === "siap-purge");
  const nonaktif = rows.filter((item) => !item.active && item.statusRetensi !== "sudah-purge");
  const terbaru = [...rows]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const aktivitas = audit.rows.slice(0, 6);
  const persentaseAktif = rows.length > 0 ? Math.round((totalAktif / rows.length) * 100) : 0;
  const tren = hitungTrenTenant(rows, new Date(), 6);
  const baruBulanIni = tren[tren.length - 1]?.jumlah ?? 0;

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
      href: "/super-admin/tenant?status=nonaktif",
      aksi: "Tinjau tenant",
    });
  }
  if (siapPurge.length > 0) {
    perhatian.push({
      kunci: "purge",
      judul: `${angka.format(siapPurge.length)} desa siap purge`,
      keterangan: "Pastikan ekspor data masih berlaku sebelum menjalankan purge permanen.",
      href: "/super-admin/tenant?status=siap-purge",
      aksi: "Buka konsol tenant",
    });
  }
  const penggunaTanpaRole = penggunaPlatform.filter((item) => item.roleSlug === null).length;
  if (penggunaTanpaRole > 0) {
    perhatian.push({
      kunci: "role-platform",
      judul: `${angka.format(penggunaTanpaRole)} akun platform tanpa role`,
      keterangan: "Akun tanpa role tidak dapat membuka konsol; tetapkan role platform yang sah.",
      href: "/super-admin/pengguna",
      aksi: "Tinjau akses",
    });
  }

  return (
    <>
      <PlatformPageHeader
        actions={
          <>
            <Link className="button button-secondary" href="/super-admin/audit">
              Lihat audit
            </Link>
            <Link className="button button-primary" href="/super-admin/tenant">
              Kelola tenant
            </Link>
          </>
        }
        path="/super-admin"
      />
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
          tone="ungu"
          value={angka.format(rows.length)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.4" />
              <path d="m8.4 12 2.4 2.4 4.8-5" />
            </>
          }
          label="Desa aktif"
          note={`${angka.format(persentaseAktif)}% dari total tenant`}
          tone="hijau"
          value={angka.format(totalAktif)}
        />
        <PlatformStat
          icon={
            <>
              <circle cx="12" cy="12" r="8.4" />
              <path d="M10 8.6v6.8M14 8.6v6.8" />
            </>
          }
          label="Desa nonaktif"
          note={`${angka.format(siapPurge.length)} siap purge`}
          tone="merah"
          value={angka.format(nonaktif.length)}
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
          tone="biru"
          value={angka.format(domain.length)}
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
          label="Total pengguna"
          note={`${angka.format(totalPenggunaDesa)} desa · ${angka.format(penggunaPlatform.length)} platform`}
          tone="oranye"
          value={angka.format(totalPengguna)}
        />
      </div>

      <div className="platform-dashboard-secondary">
        <PlatformCard
          actions={
            <Link className="button button-secondary" href="/super-admin/template">
              Kelola tema
            </Link>
          }
          description="Pilihan tema publik yang benar-benar dipakai tenant saat ini."
          title="Ringkasan tema publik"
        >
          <div className="platform-summary-grid">
            <div>
              <span>Tema aktif</span>
              <strong>{angka.format(tema.temaUnik)}</strong>
              <small>slug berbeda digunakan</small>
            </div>
            <div>
              <span>Desa bertema</span>
              <strong>{angka.format(tema.bertema)}</strong>
              <small>
                {tema.total > 0 ? Math.round((tema.bertema / tema.total) * 100) : 0}% dari total
                tenant
              </small>
            </div>
            <div className={tema.tanpaTema > 0 ? "is-attention" : undefined}>
              <span>Belum bertema</span>
              <strong>{angka.format(tema.tanpaTema)}</strong>
              <small>perlu memilih tema</small>
            </div>
          </div>
        </PlatformCard>

        <PlatformCard
          actions={
            <Link className="button button-secondary" href="/super-admin/template">
              Lihat tema
            </Link>
          }
          description="Lima tema teratas berdasarkan jumlah tenant yang memakainya."
          title="Tema paling populer"
        >
          <PlatformDonut
            centerLabel="desa bertema"
            centerValue={angka.format(tema.bertema)}
            items={temaDonut}
            total={tema.total}
          />
          {tema.tanpaTema > 0 && tema.items.length > 0 ? (
            <p className="platform-distribution-note">
              {angka.format(tema.tanpaTema)} desa belum memilih tema dan ditandai abu-abu.
            </p>
          ) : null}
        </PlatformCard>
      </div>

      <div className="platform-dashboard-grid">
        <div className="platform-dashboard-main">
          <PlatformCard
            actions={
              <Link className="button button-secondary" href="/super-admin/tenant">
                Semua tenant
              </Link>
            }
            description="Pendaftaran tenant kumulatif enam bulan terakhir, dihitung dari tanggal tenant dibuat."
            title="Pertumbuhan tenant"
          >
            <div className="platform-trend-summary">
              <div>
                <span>Total tenant</span>
                <strong>{angka.format(rows.length)}</strong>
              </div>
              <div>
                <span>Baru bulan ini</span>
                <strong>+{angka.format(baruBulanIni)}</strong>
              </div>
              <div>
                <span>Desa aktif</span>
                <strong>{angka.format(persentaseAktif)}%</strong>
              </div>
            </div>
            <PlatformTrend points={tren} />
          </PlatformCard>

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
                        <td>
                          {item.domain || <span className="tenant-secondary">Belum diatur</span>}
                        </td>
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
        </div>
        <div className="platform-dashboard-side">
          <PlatformCard
            description="Sebaran tenant berdasarkan kecamatan yang tercatat pada profil desa."
            title="Distribusi tenant per kecamatan"
          >
            <PlatformBarList
              items={kecamatan.items}
              labelKosong="Belum ada desa dengan data kecamatan. Lengkapi profil desa agar sebaran dapat ditampilkan."
            />
            {kecamatan.tanpaKecamatan > 0 && kecamatan.items.length > 0 ? (
              <p className="platform-distribution-note">
                {angka.format(kecamatan.tanpaKecamatan)} desa belum mengisi kecamatan.
              </p>
            ) : null}
          </PlatformCard>

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
                      <strong>
                        {AUDIT_EVENT_LABELS[baris.event as AuditEvent] ?? baris.event}
                      </strong>
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
      </div>
    </>
  );
}
