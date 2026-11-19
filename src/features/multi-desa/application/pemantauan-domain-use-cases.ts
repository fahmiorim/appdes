import "server-only";

import {
  listHasilDns,
  simpanHasilDns,
  type HasilDnsRow,
} from "@/features/multi-desa/infrastructure/domain-dns-repository";
import {
  listHasilSsl,
  simpanHasilSsl,
  type HasilSslRow,
} from "@/features/multi-desa/infrastructure/domain-ssl-repository";
import { listSemuaDomain } from "@/features/multi-desa/infrastructure/kelola-desa-repository";
import { periksaDnsDomain } from "@/features/multi-desa/infrastructure/pemeriksa-dns";
import { periksaSslDomain } from "@/features/multi-desa/infrastructure/pemeriksa-ssl";

import { requireSuperAdmin } from "./provisioning-use-cases";

/**
 * Pemantauan DNS/SSL domain platform.
 *
 * Seluruh fungsi diawali `requireSuperAdmin`; pemeriksaan hanya dijalankan atas
 * domain yang sudah ada di tabel `village_domains`, bukan host dari input klien.
 * Hasil disimpan sebagai cache agar halaman tidak melakukan handshake jaringan
 * saat dirender.
 */

const MAKS_PEMERIKSAAN_BERSAMAAN = 4;

export interface RingkasanSsl {
  diperiksa: number;
  aktif: number;
  segeraExpired: number;
  bermasalah: number;
}

export interface RingkasanDns {
  diperiksa: number;
  normal: number;
  bermasalah: number;
}

export interface PemeriksaanDomain {
  ssl: HasilSslRow[];
  dns: HasilDnsRow[];
}

/** Baca cache pemeriksaan; halaman tidak memicu koneksi jaringan. */
export async function daftarPemeriksaanDomain(): Promise<PemeriksaanDomain> {
  await requireSuperAdmin();
  const [ssl, dns] = await Promise.all([listHasilSsl(), listHasilDns()]);
  return { ssl, dns };
}

/** Periksa seluruh domain dengan batas konkurensi agar resolver tidak dibanjiri. */
export async function periksaSslSemuaDomain(): Promise<RingkasanSsl> {
  await requireSuperAdmin();
  const domain = await listSemuaDomain();
  const ringkasan: RingkasanSsl = {
    diperiksa: 0,
    aktif: 0,
    segeraExpired: 0,
    bermasalah: 0,
  };

  for (let mulai = 0; mulai < domain.length; mulai += MAKS_PEMERIKSAAN_BERSAMAAN) {
    const kelompok = domain.slice(mulai, mulai + MAKS_PEMERIKSAAN_BERSAMAAN);

    await Promise.all(
      kelompok.map(async (item) => {
        let hasil;
        try {
          hasil = await periksaSslDomain(item.domain);
        } catch {
          hasil = {
            status: "bermasalah" as const,
            validFrom: null,
            validTo: null,
            issuer: null,
            error: "Pemeriksaan TLS gagal.",
            checkedAt: new Date(),
          };
        }

        await simpanHasilSsl(item.id, hasil);
        ringkasan.diperiksa += 1;
        if (hasil.status === "aktif") ringkasan.aktif += 1;
        if (hasil.status === "segera-expired") ringkasan.segeraExpired += 1;
        if (hasil.status === "bermasalah") ringkasan.bermasalah += 1;
      }),
    );
  }

  return ringkasan;
}

/** Periksa DNS seluruh domain dan simpan hasilnya. */
export async function periksaDnsSemuaDomain(): Promise<RingkasanDns> {
  await requireSuperAdmin();
  const domain = await listSemuaDomain();
  const ringkasan: RingkasanDns = { diperiksa: 0, normal: 0, bermasalah: 0 };

  for (let mulai = 0; mulai < domain.length; mulai += MAKS_PEMERIKSAAN_BERSAMAAN) {
    const kelompok = domain.slice(mulai, mulai + MAKS_PEMERIKSAAN_BERSAMAAN);

    await Promise.all(
      kelompok.map(async (item) => {
        let hasil;
        try {
          hasil = await periksaDnsDomain(item.domain);
        } catch {
          hasil = {
            status: "bermasalah" as const,
            addresses: [],
            error: "Pemeriksaan DNS gagal.",
            checkedAt: new Date(),
          };
        }

        await simpanHasilDns(item.id, hasil);
        ringkasan.diperiksa += 1;
        if (hasil.status === "normal") ringkasan.normal += 1;
        if (hasil.status === "bermasalah") ringkasan.bermasalah += 1;
      }),
    );
  }

  return ringkasan;
}
