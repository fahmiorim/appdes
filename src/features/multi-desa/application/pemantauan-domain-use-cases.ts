import "server-only";

import type { DataDns } from "@/features/multi-desa/domain/status-dns";
import type { DataSsl } from "@/features/multi-desa/domain/status-ssl";
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
import {
  getDomainPlatform,
  listSemuaDomain,
} from "@/features/multi-desa/infrastructure/kelola-desa-repository";
import { periksaDnsDomain } from "@/features/multi-desa/infrastructure/pemeriksa-dns";
import { periksaSslDomain } from "@/features/multi-desa/infrastructure/pemeriksa-ssl";
import { notFound } from "@/lib/errors";

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

/**
 * Ambil domain terdaftar untuk pemeriksaan satu domain.
 *
 * Hanya id yang dikirim klien; host selalu dibaca ulang dari database supaya
 * Server Action tidak bisa dipakai memindai host sembarang.
 */
async function domainPlatformTerdaftar(domainId: number) {
  await requireSuperAdmin();
  if (!Number.isSafeInteger(domainId) || domainId <= 0) {
    throw notFound("Domain tidak ditemukan.");
  }

  const domain = await getDomainPlatform(domainId);
  if (!domain) throw notFound("Domain tidak ditemukan.");
  return domain;
}

/** Periksa DNS satu domain terdaftar dan simpan hasilnya. */
export async function periksaDnsSatuDomain(domainId: number): Promise<DataDns> {
  const domain = await domainPlatformTerdaftar(domainId);
  const hasil = await periksaDnsDomain(domain.domain);
  await simpanHasilDns(domain.id, hasil);
  return hasil;
}

/** Periksa sertifikat TLS satu domain terdaftar dan simpan hasilnya. */
export async function periksaSslSatuDomain(domainId: number): Promise<DataSsl> {
  const domain = await domainPlatformTerdaftar(domainId);
  const hasil = await periksaSslDomain(domain.domain);
  await simpanHasilSsl(domain.id, hasil);
  return hasil;
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
