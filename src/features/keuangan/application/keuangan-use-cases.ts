import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  AKUN_LAPORAN,
  formatMoney,
  KEUANGAN_RESOURCE,
  keuanganBarisFormSchema,
  LAPORAN_KEUANGAN_RESOURCE,
  laporanRpApbd,
  listBidangBelanja,
  numberToMoney,
  realisasiPersen,
  seriGrafik,
  toMinor,
  totalLaporan,
  type KeuanganBarisInput,
} from "@/features/keuangan/domain/keuangan";
import { susunLaporanRealisasi } from "@/features/keuangan/domain/laporan-realisasi";
import {
  buildTriwulanRows,
  totalTriwulan,
  triwulanBarisFormSchema,
  type TriwulanBarisInput,
} from "@/features/keuangan/domain/laporan-triwulan";
import { rekonsiliasiBidang, totalRekonsiliasi } from "@/features/keuangan/domain/rekonsiliasi";
import {
  listKeuanganTahun,
  listKeuanganTahunTersedia,
  listKeuanganTriwulan,
  listTemplate,
  saveKeuanganNilai,
  saveKeuanganTriwulan,
} from "@/features/keuangan/infrastructure/keuangan-repository";
import { requirePermission } from "@/lib/dal";
import { conflict } from "@/lib/errors";

const TAHUN_MIN = 2000;
const TAHUN_MAX = 2100;

/** Tahun anggaran bawaan: tahun berjalan. */
export function defaultTahun(now = new Date()): number {
  return now.getFullYear();
}

function isValidTahun(value: number): boolean {
  return Number.isInteger(value) && value >= TAHUN_MIN && value <= TAHUN_MAX;
}

export async function listKeuangan(tahunParam?: number) {
  return bacaKeuangan(tahunParam, KEUANGAN_RESOURCE);
}

/**
 * Pembacaan data keuangan untuk laporan (read-only).
 *
 * Memakai resource `laporan-keuangan` agar sekretaris desa dan kepala desa —
 * yang hanya diberi izin baca laporan — dapat membuka menu Laporan tanpa
 * mendapat akses penyuntingan APBDes.
 */
async function bacaKeuangan(tahunParam: number | undefined, resource: string) {
  const user = await requirePermission(resource, "read");
  const villageId = await resolveVillageId(user);

  const tersedia = await listKeuanganTahunTersedia(villageId);
  const tahun =
    tahunParam !== undefined && isValidTahun(tahunParam)
      ? tahunParam
      : (tersedia.at(-1) ?? defaultTahun());

  const rows = await listKeuanganTahun(villageId, tahun);

  return { villageId, tahun, tersedia, rows };
}

function bacaKeuanganLaporan(tahunParam?: number) {
  return bacaKeuangan(tahunParam, LAPORAN_KEUANGAN_RESOURCE);
}

/**
 * Data laporan RP APBDes & realisasi per bidang untuk satu tahun anggaran.
 *
 * Mengembalikan baris RP APBDes (pendapatan/belanja/pembiayaan dengan
 * realisasi, selisih, %) serta rincian realisasi per bidang belanja.
 */
export async function getLaporanKeuangan(tahunParam?: number, bidangKode?: string) {
  const { tahun, tersedia, rows } = await bacaKeuanganLaporan(tahunParam);

  const baris = laporanRpApbd(rows, AKUN_LAPORAN);
  let bidang = listBidangBelanja(rows).map((row) => {
    const selisih = formatMoney(toMinor(row.anggaran) - toMinor(row.realisasi));
    return {
      kode: row.templateUuid,
      uraian: row.uraian,
      anggaran: row.anggaran,
      realisasi: row.realisasi,
      selisih,
      persen: realisasiPersen(row.anggaran, row.realisasi),
    };
  });

  if (bidangKode) {
    bidang = bidang.filter((b) => b.kode === bidangKode);
  }

  return {
    tahun,
    tersedia,
    baris,
    total: totalLaporan(baris),
    bidang,
    totalBidang: totalLaporan(bidang),
    grafik: seriGrafik(baris),
  };
}

/**
 * Rincian realisasi format resmi: hierarki akun → bidang → rincian beserta
 * JUMLAH per akun, SURPLUS/(DEFISIT), PEMBIAYAAN NETTO, dan SiLPA tahun
 * berjalan.
 */
export async function getLaporanRealisasiResmi(tahunParam?: number) {
  const { tahun, tersedia, rows } = await bacaKeuanganLaporan(tahunParam);

  return { tahun, tersedia, laporan: susunLaporanRealisasi(rows) };
}

/**
 * Daftar semua bidang belanja yang tersedia untuk filter laporan.
 */
export async function getLaporanKeuanganBidangList() {
  const { rows } = await bacaKeuanganLaporan();
  return listBidangBelanja(rows).map((row) => ({
    kode: row.templateUuid,
    uraian: row.uraian,
  }));
}

/**
 * Laporan realisasi per triwulan untuk satu tahun anggaran.
 *
 * Nilai triwulan dibaca dari tabel `keuangan_triwulan`; tidak ada estimasi
 * yang diturunkan dari realisasi tahunan. Baris yang belum pernah diisi
 * ditampilkan sebagai nol.
 */
export async function getLaporanTriwulan(tahunParam?: number) {
  const { villageId, tahun, tersedia, rows } = await listKeuangan(tahunParam);
  const bidang = listBidangBelanja(rows);
  const tersimpan = await listKeuanganTriwulan(villageId, tahun);
  const byKode = new Map(tersimpan.map((row) => [row.templateUuid, row]));

  const input: TriwulanBarisInput[] = bidang.map((row) => {
    const nilai = byKode.get(row.templateUuid);
    return {
      kode: row.templateUuid,
      uraian: row.uraian,
      anggaran: row.anggaran,
      tw1: nilai?.tw1 ?? "0.00",
      tw2: nilai?.tw2 ?? "0.00",
      tw3: nilai?.tw3 ?? "0.00",
      tw4: nilai?.tw4 ?? "0.00",
    };
  });

  const baris = buildTriwulanRows(input);

  return { tahun, tersedia, baris, total: totalTriwulan(baris) };
}

/**
 * Rekonsiliasi realisasi belanja: realisasi tahunan APBDes dibandingkan
 * dengan jumlah realisasi triwulan per bidang (`5.x`).
 *
 * Kode yang hanya ada di salah satu sumber tetap ditampilkan agar data yang
 * belum lengkap terlihat. Tidak ada penulisan data di sini.
 */
export async function getRekonsiliasiKeuangan(tahunParam?: number) {
  const { villageId, tahun, tersedia, rows } = await listKeuangan(tahunParam);
  const bidang = listBidangBelanja(rows);
  const tersimpan = await listKeuanganTriwulan(villageId, tahun);
  const byKode = new Map(tersimpan.map((row) => [row.templateUuid, row]));
  const uraianBidang = new Map(bidang.map((row) => [row.templateUuid, row]));

  // Gabungkan kode dari kedua sisi supaya bidang yang hanya punya salah satu
  // data (mis. triwulan terisi tetapi baris APBDes belum ada) ikut tampil.
  const kode = [...new Set([...uraianBidang.keys(), ...byKode.keys()])].sort((a, b) =>
    a.localeCompare(b),
  );

  const triwulan: TriwulanBarisInput[] = kode.map((item) => {
    const dasar = uraianBidang.get(item);
    const nilai = byKode.get(item);
    return {
      kode: item,
      uraian: dasar?.uraian ?? item,
      anggaran: dasar?.anggaran ?? "0.00",
      tw1: nilai?.tw1 ?? "0.00",
      tw2: nilai?.tw2 ?? "0.00",
      tw3: nilai?.tw3 ?? "0.00",
      tw4: nilai?.tw4 ?? "0.00",
    };
  });

  const baris = rekonsiliasiBidang(bidang, triwulan);

  return { tahun, tersedia, baris, total: totalRekonsiliasi(baris) };
}

/** Simpan realisasi triwulan per bidang belanja (`5.x`). */
export async function saveKeuanganTriwulanData(tahun: number, inputs: unknown[]) {
  const user = await requirePermission(KEUANGAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  if (!isValidTahun(tahun)) throw conflict("Tahun anggaran tidak valid.");

  const rows = inputs.map((input) => {
    const parsed = triwulanBarisFormSchema.safeParse(input);
    if (!parsed.success) {
      throw conflict(parsed.error.issues[0]?.message ?? "Isian realisasi triwulan tidak valid.");
    }
    return parsed.data;
  });

  await saveKeuanganTriwulan(
    villageId,
    tahun,
    user.id,
    rows.map((row) => ({
      templateUuid: row.kode,
      tw1: numberToMoney(row.tw1),
      tw2: numberToMoney(row.tw2),
      tw3: numberToMoney(row.tw3),
      tw4: numberToMoney(row.tw4),
    })),
  );

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.keuanganSave,
    resource: KEUANGAN_RESOURCE,
    resourceId: String(tahun),
    details: { jenis: "triwulan", baris: rows.length },
  });

  return { tahun };
}

export async function listKeuanganTemplate() {
  await requirePermission(KEUANGAN_RESOURCE, "read");
  return listTemplate();
}

export async function saveKeuanganData(tahun: number, inputs: unknown[]) {
  const user = await requirePermission(KEUANGAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  if (!isValidTahun(tahun)) throw conflict("Tahun anggaran tidak valid.");

  const rows: KeuanganBarisInput[] = [];
  for (const input of inputs) {
    const parsed = keuanganBarisFormSchema.safeParse(input);
    if (!parsed.success) {
      throw conflict(parsed.error.issues[0]?.message ?? "Isian keuangan tidak valid.");
    }
    rows.push(parsed.data);
  }

  await saveKeuanganNilai(
    villageId,
    tahun,
    user.id,
    rows.map((row) => ({
      templateUuid: row.templateUuid,
      anggaran: numberToMoney(row.anggaran),
      realisasi: numberToMoney(row.realisasi),
    })),
  );

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.keuanganSave,
    resource: KEUANGAN_RESOURCE,
    resourceId: String(tahun),
    details: { jenis: "anggaran-realisasi", baris: rows.length },
  });

  return { tahun };
}
