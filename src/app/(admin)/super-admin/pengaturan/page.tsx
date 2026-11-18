import type { Metadata } from "next";

import { getKonfigurasiPlatform } from "@/features/multi-desa/application/platform-info-use-cases";
import {
  PlatformCard,
  PlatformPageHeader,
  PlatformStat,
  PlatformStatus,
} from "@/features/multi-desa/presentation/platform-ui";

import { pastikanSuperAdmin } from "../guard";

export const metadata: Metadata = {
  title: "Pengaturan Platform",
  robots: { index: false, follow: false },
};

const angka = new Intl.NumberFormat("id-ID");

const pengaturanAkses = [
  {
    kunci: "APP_URL",
    label: "Alamat aplikasi",
    keterangan: "Dipakai untuk tautan absolut, email, dan callback autentikasi.",
  },
  {
    kunci: "DESA_BASE_DOMAIN",
    label: "Domain induk desa",
    keterangan: "Wildcard subdomain untuk mengenali desa dari host.",
  },
  {
    kunci: "TRUST_PROXY",
    label: "Percaya header proxy",
    keterangan: "Hanya aktifkan bila reverse proxy tepercaya menimpa header host.",
  },
  {
    kunci: "RESEND_API_KEY · RESEND_FROM",
    label: "Email transaksional",
    keterangan: "Notifikasi email tidak dikirim bila belum dikonfigurasi.",
  },
  {
    kunci: "TTE_API · TTE_ALLOWED_HOSTS",
    label: "Tanda tangan elektronik",
    keterangan: "Provider TTE hanya dihubungi bila origin masuk allowlist.",
  },
];

export default async function SuperAdminPengaturanPage() {
  await pastikanSuperAdmin();

  const konfigurasi = await getKonfigurasiPlatform();

  const nilaiAkses: Record<string, { nilai: string; aktif: boolean }> = {
    APP_URL: { nilai: konfigurasi.appUrl, aktif: Boolean(konfigurasi.appUrl) },
    DESA_BASE_DOMAIN: {
      nilai: konfigurasi.baseDomain ?? "Wildcard subdomain nonaktif",
      aktif: konfigurasi.baseDomain !== null,
    },
    TRUST_PROXY: {
      nilai: konfigurasi.trustProxy
        ? "Aktif — host dari reverse proxy tepercaya"
        : "Nonaktif — host dari koneksi langsung",
      aktif: konfigurasi.trustProxy,
    },
    "RESEND_API_KEY · RESEND_FROM": {
      nilai: konfigurasi.emailAktif
        ? "Terkonfigurasi"
        : "Belum dikonfigurasi — notifikasi email tidak dikirim",
      aktif: konfigurasi.emailAktif,
    },
    "TTE_API · TTE_ALLOWED_HOSTS": {
      nilai: konfigurasi.tteAktif
        ? `Provider aktif · allowlist: ${
            konfigurasi.tteAllowedHosts.length > 0
              ? konfigurasi.tteAllowedHosts.join(", ")
              : "kosong (semua provider ditolak)"
          }`
        : "Tidak aktif",
      aktif: konfigurasi.tteAktif,
    },
  };

  return (
    <>
      <PlatformPageHeader
        description="Ringkasan konfigurasi aktif yang dibaca aplikasi. Nilai rahasia tidak pernah dibaca maupun ditampilkan di halaman ini."
        eyebrow="Konsol platform"
        title="Pengaturan platform"
      />

      <PlatformCard
        description="Kebijakan retensi dijalankan oleh pekerjaan terjadwal platform."
        title="Kebijakan retensi"
      >
        <div className="platform-stat-grid">
          <PlatformStat
            icon={
              <>
                <rect height="16" rx="2" width="16" x="4" y="5" />
                <path d="M4 10h16" />
                <path d="M9 3.5v3M15 3.5v3" />
              </>
            }
            label="Masa tenggang retensi"
            note="Hari sebelum data desa nonaktif boleh di-purge"
            value={angka.format(konfigurasi.retensi.masaTenggangHari)}
          />
          <PlatformStat
            icon={
              <>
                <circle cx="12" cy="13" r="7.6" />
                <path d="M12 9.4V13l2.6 1.6" />
                <path d="M9.4 3.6h5.2" />
              </>
            }
            label="Masa berlaku ekspor"
            note="Hari sebelum berkas ekspor dibersihkan"
            value={angka.format(konfigurasi.retensi.umurEksporHari)}
          />
          <PlatformStat
            icon={
              <>
                <rect height="5" rx="1.4" width="16" x="4" y="4" />
                <path d="M5.5 9v9.4a1.6 1.6 0 0 0 1.6 1.6h9.8a1.6 1.6 0 0 0 1.6-1.6V9" />
                <path d="M10 13h4" />
              </>
            }
            label="Retensi audit"
            note="Bulan penyimpanan audit, termasuk desa ter-purge"
            value={angka.format(konfigurasi.retensi.retensiAuditBulan)}
          />
        </div>

        <p className="form-help">
          Nilai retensi berasal dari environment deployment. Perubahan memerlukan restart aplikasi
          dan tidak dapat dilakukan dari konsol.
        </p>
      </PlatformCard>

      <PlatformCard
        description="Nilai ini berasal dari environment deployment; konsol hanya membaca."
        title="Alamat dan integrasi"
      >
        <dl className="platform-def">
          {pengaturanAkses.map((item) => {
            const nilai = nilaiAkses[item.kunci];
            return (
              <div className="platform-def-row" key={item.kunci}>
                <dt>
                  {item.label}
                  <span>{item.kunci}</span>
                </dt>
                <dd>
                  {nilai?.nilai ?? "—"}
                  <span className="tenant-secondary">{item.keterangan}</span>
                </dd>
                <PlatformStatus
                  aktif={Boolean(nilai?.aktif)}
                  label={nilai?.aktif ? "Aktif" : "Nonaktif"}
                />
              </div>
            );
          })}
        </dl>

        <p className="form-help">
          Sandi basis data, secret autentikasi, passphrase TTE, dan kunci API sengaja tidak dibaca
          maupun ditampilkan.
        </p>
      </PlatformCard>
    </>
  );
}
