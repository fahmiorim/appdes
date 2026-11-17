import "server-only";

import { z } from "zod";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { requireSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import {
  alasanTidakBolehPurge,
  bolehDiekspor,
  hariMenujuPurge,
  statusRetensi,
  type StatusRetensi,
} from "@/features/multi-desa/domain/lifecycle-tenant";
import {
  bersihkanEksporKedaluwarsa as bersihkanEksporRepo,
  eksporBerlakuTerbaru,
  eksporDataTenant,
  getDesaRetensi,
  purgeTenant,
  type DesaRetensiRow,
  type HasilEkspor,
} from "@/features/multi-desa/infrastructure/lifecycle-tenant-repository";
import { conflict, notFound } from "@/lib/errors";

/**
 * Use case lifecycle tenant: status retensi, ekspor wajib sebelum purge, purge,
 * dan pembersihan berkas ekspor kedaluwarsa.
 *
 * Semua operasi khusus platform (`requireSuperAdmin`) dan memakai `villageId`
 * dari pemanggil yang sudah terotorisasi — bukan dari input klien mentah.
 * Purge adalah operasi tidak dapat dibatalkan, sehingga guard-nya berlapis:
 * role platform, status nonaktif, masa tenggang, ekspor berlaku, dan konfirmasi
 * slug desa.
 */

const villageIdSchema = z.coerce
  .number({ error: "Desa tidak valid." })
  .int("Desa tidak valid.")
  .positive("Desa tidak valid.");

async function pastikanDesaAda(villageId: number): Promise<DesaRetensiRow> {
  const desa = await getDesaRetensi(villageId);
  if (!desa) throw notFound("Desa tidak ditemukan.");
  return desa;
}

export interface StatusLifecycleDesa {
  id: number;
  name: string | null;
  slug: string | null;
  domain: string | null;
  status: StatusRetensi;
  hariMenujuPurge: number | null;
  nonaktifSejak: Date | null;
  purgedAt: Date | null;
  adaEksporBerlaku: boolean;
}

/** Status retensi satu desa untuk ditampilkan di konsol. */
export async function statusLifecycleDesa(input: unknown): Promise<StatusLifecycleDesa> {
  await requireSuperAdmin();
  const desa = await pastikanDesaAda(villageIdSchema.parse(input));
  const ekspor = await eksporBerlakuTerbaru(desa.id);

  return {
    id: desa.id,
    name: desa.name,
    slug: desa.slug,
    domain: desa.domain,
    status: statusRetensi(desa),
    hariMenujuPurge: hariMenujuPurge(desa),
    nonaktifSejak: desa.nonaktifSejak,
    purgedAt: desa.purgedAt,
    adaEksporBerlaku: ekspor !== null,
  };
}

/**
 * Ekspor seluruh data desa ke berkas JSON.
 *
 * Ekspor tidak memuat kolom rahasia (password/token/pin). Berkas berlaku 30
 * hari dan menjadi syarat purge.
 */
export async function eksporDataDesa(input: unknown): Promise<HasilEkspor> {
  const user = await requireSuperAdmin();
  const desa = await pastikanDesaAda(villageIdSchema.parse(input));

  if (!bolehDiekspor(desa)) {
    throw conflict("Desa ini sudah di-purge; tidak ada data untuk diekspor.");
  }

  const hasil = await eksporDataTenant(desa.id, user.id);

  await recordAuditEvent({
    villageId: desa.id,
    actorId: user.id,
    event: AUDIT_EVENTS.desaExport,
    resource: "villages",
    resourceId: String(desa.id),
    details: { slug: desa.slug, jumlahBaris: hasil.jumlahBaris, ukuranByte: hasil.ukuranByte },
  });

  return hasil;
}

/**
 * Purge data desa setelah masa tenggang dan ekspor.
 *
 * `konfirmasi` harus sama dengan slug desa; ini mencegah purge tidak sengaja
 * pada desa yang salah saat operator mengelola banyak tenant.
 */
export async function purgeDesa(input: unknown): Promise<{
  jumlahBarisDihapus: number;
  tabelDiproses: number;
  mediaDihapus: boolean;
}> {
  const user = await requireSuperAdmin();
  const parsed = z
    .object({
      villageId: villageIdSchema,
      konfirmasi: z.string().trim().min(1, "Ketik slug desa untuk konfirmasi."),
    })
    .parse(input);

  const desa = await pastikanDesaAda(parsed.villageId);
  const ekspor = await eksporBerlakuTerbaru(desa.id);
  const alasan = alasanTidakBolehPurge(desa, { adaEksporBerlaku: ekspor !== null });
  if (alasan) throw conflict(alasan);

  if (!desa.slug || parsed.konfirmasi !== desa.slug) {
    throw conflict("Konfirmasi tidak cocok. Ketik slug desa persis seperti yang terdaftar.");
  }

  const hasil = await purgeTenant({ villageId: desa.id, actorId: user.id });

  await recordAuditEvent({
    villageId: desa.id,
    actorId: user.id,
    event: AUDIT_EVENTS.desaPurge,
    resource: "villages",
    resourceId: String(desa.id),
    details: {
      slug: desa.slug,
      jumlahBarisDihapus: hasil.jumlahBarisDihapus,
      tabelDiproses: hasil.tabelDiproses,
      mediaDihapus: hasil.mediaDihapus,
    },
  });

  return {
    jumlahBarisDihapus: hasil.jumlahBarisDihapus,
    tabelDiproses: hasil.tabelDiproses,
    mediaDihapus: hasil.mediaDihapus,
  };
}

/** Hapus berkas dan catatan ekspor yang sudah lewat 30 hari. */
export async function bersihkanEksporKedaluwarsa(): Promise<{ dihapus: number }> {
  await requireSuperAdmin();
  return bersihkanEksporRepo();
}
