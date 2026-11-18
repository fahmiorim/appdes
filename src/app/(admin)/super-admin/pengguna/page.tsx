import type { Metadata } from "next";

import { daftarPenggunaPlatform } from "@/features/multi-desa/application/pengguna-platform-use-cases";
import { PenggunaPlatformConsole } from "@/features/multi-desa/presentation/pengguna-platform-console";
import {
  PlatformCard,
  PlatformPageHeader,
  PlatformStat,
} from "@/features/multi-desa/presentation/platform-ui";

import { pastikanSuperAdmin } from "../guard";
import {
  buatPenggunaAction,
  cabutSesiPenggunaAction,
  resetSandiPenggunaAction,
  ubahStatusPenggunaAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Pengguna Platform",
  robots: { index: false, follow: false },
};

const angka = new Intl.NumberFormat("id-ID");

export default async function SuperAdminPenggunaPage() {
  const user = await pastikanSuperAdmin();

  const pengguna = await daftarPenggunaPlatform();
  const aktif = pengguna.filter((item) => item.active).length;
  const tanpaRole = pengguna.filter((item) => item.roleSlug === null).length;
  const sesiAktif = pengguna.reduce((total, item) => total + item.sesiAktif, 0);

  return (
    <>
      <PlatformPageHeader
        description="Akun yang tidak terikat desa dan hanya mengelola platform. Akun administrator desa dikelola dari konsol tenant, bukan di sini."
        eyebrow="Konsol platform"
        title="Pengguna platform"
      />

      <div className="platform-stat-grid">
        <PlatformStat
          icon={
            <>
              <circle cx="9" cy="8" r="3.2" />
              <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
              <path d="M16.4 5.6a3.2 3.2 0 0 1 0 6.4" />
              <path d="M18.3 14.4a6.2 6.2 0 0 1 3.1 5.6" />
            </>
          }
          label="Total akun"
          note="Akun tanpa desa (village_id kosong)"
          value={angka.format(pengguna.length)}
        />
        <PlatformStat
          icon={
            <>
              <path d="M12 3.4 19 6v5.4c0 4.2-2.9 7.6-7 9.2-4.1-1.6-7-5-7-9.2V6z" />
              <path d="m9 12 2.1 2.2L15.4 10" />
            </>
          }
          label="Akun aktif"
          note={`${angka.format(pengguna.length - aktif)} akun nonaktif`}
          value={angka.format(aktif)}
        />
        <PlatformStat
          icon={
            <>
              <rect height="10" rx="2" width="16" x="4" y="9.4" />
              <path d="M8.4 9.4V7a3.6 3.6 0 0 1 7.2 0v2.4" />
              <path d="M12 13v2.6" />
            </>
          }
          label="Sesi aktif"
          note="Sesi yang belum kedaluwarsa"
          value={angka.format(sesiAktif)}
        />
        <PlatformStat
          icon={
            <>
              <path d="M12 4.2 21 20H3z" />
              <path d="M12 9.8v4.4" />
              <path d="M12 17.2h.01" />
            </>
          }
          label="Tanpa role"
          note="Akun tanpa role tidak dapat membuka konsol"
          value={angka.format(tanpaRole)}
        />
      </div>

      <PlatformCard
        description="Nonaktifkan akun yang tidak dipakai lagi, reset sandi bila akses hilang, atau cabut sesi untuk mengeluarkan perangkat lama."
        title="Akun pengelola platform"
      >
        <PenggunaPlatformConsole
          aksi={{
            buat: buatPenggunaAction,
            status: ubahStatusPenggunaAction,
            reset: resetSandiPenggunaAction,
            cabut: cabutSesiPenggunaAction,
          }}
          idSaya={user.id}
          pengguna={pengguna}
        />
      </PlatformCard>
    </>
  );
}
