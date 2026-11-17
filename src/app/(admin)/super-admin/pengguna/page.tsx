import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { daftarPenggunaPlatform } from "@/features/multi-desa/application/pengguna-platform-use-cases";
import { PenggunaPlatformConsole } from "@/features/multi-desa/presentation/pengguna-platform-console";
import { PlatformCard, PlatformPageHeader } from "@/features/multi-desa/presentation/platform-ui";

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
        <Card>
          <div className="stat-card-label">Total akun</div>
          <div className="stat-card-value">{angka.format(pengguna.length)}</div>
          <div className="stat-card-note">Akun tanpa desa (village_id kosong)</div>
        </Card>
        <Card>
          <div className="stat-card-label">Akun aktif</div>
          <div className="stat-card-value">{angka.format(aktif)}</div>
          <div className="stat-card-note">
            {angka.format(pengguna.length - aktif)} akun nonaktif
          </div>
        </Card>
        <Card>
          <div className="stat-card-label">Sesi aktif</div>
          <div className="stat-card-value">{angka.format(sesiAktif)}</div>
          <div className="stat-card-note">Sesi yang belum kedaluwarsa</div>
        </Card>
        <Card>
          <div className="stat-card-label">Tanpa role</div>
          <div className="stat-card-value">{angka.format(tanpaRole)}</div>
          <div className="stat-card-note">Akun tanpa role tidak dapat membuka konsol</div>
        </Card>
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
