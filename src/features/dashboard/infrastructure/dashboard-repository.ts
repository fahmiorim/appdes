import "server-only";

import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  auditLogs,
  families,
  letterTypes,
  pengaduan,
  permohonanSurat,
  residents,
  users,
} from "@/db/schema";
import type { BarisTrenBulanan } from "@/features/dashboard/domain/tren-bulanan";

export interface DashboardStats {
  families: number;
  complaints: number;
  complaintsBaru: number;
  permohonan: number;
  permohonanMenunggu: number;
  /** Penduduk yang datanya dibuat sejak awal bulan berjalan. */
  residentsBaru: number;
  /** Kartu keluarga yang dibuat sejak awal bulan berjalan. */
  familiesBaru: number;
}

/** Status permohonan yang masih menunggu tindakan petugas (1 diperiksa, 2 TTE). */
const STATUS_PERMOHONAN_MENUNGGU = [1, 2];

/** Statistik dashboard yang seluruh query-nya dibatasi tenant aktif. */
export async function getDashboardStats(villageId: number): Promise<DashboardStats> {
  const sekarang = new Date();
  const awalBulan = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1);

  const [
    familyRows,
    complaintRows,
    newComplaintRows,
    permohonanRows,
    permohonanMenungguRows,
    residentBaruRows,
    familyBaruRows,
  ] = await Promise.all([
    db.select({ total: count() }).from(families).where(eq(families.villageId, villageId)),
    db.select({ total: count() }).from(pengaduan).where(eq(pengaduan.villageId, villageId)),
    db
      .select({ total: count() })
      .from(pengaduan)
      .where(and(eq(pengaduan.villageId, villageId), eq(pengaduan.status, "baru"))),
    db
      .select({ total: count() })
      .from(permohonanSurat)
      .where(eq(permohonanSurat.villageId, villageId)),
    db
      .select({ total: count() })
      .from(permohonanSurat)
      .where(
        and(
          eq(permohonanSurat.villageId, villageId),
          inArray(permohonanSurat.status, STATUS_PERMOHONAN_MENUNGGU),
        ),
      ),
    db
      .select({ total: count() })
      .from(residents)
      .where(and(eq(residents.villageId, villageId), gte(residents.createdAt, awalBulan))),
    db
      .select({ total: count() })
      .from(families)
      .where(and(eq(families.villageId, villageId), gte(families.createdAt, awalBulan))),
  ]);

  return {
    families: familyRows[0]?.total ?? 0,
    complaints: complaintRows[0]?.total ?? 0,
    complaintsBaru: newComplaintRows[0]?.total ?? 0,
    permohonan: permohonanRows[0]?.total ?? 0,
    permohonanMenunggu: permohonanMenungguRows[0]?.total ?? 0,
    residentsBaru: residentBaruRows[0]?.total ?? 0,
    familiesBaru: familyBaruRows[0]?.total ?? 0,
  };
}

/**
 * Jumlah permohonan surat per bulan untuk jendela waktu yang diminta.
 *
 * Pengelompokan dilakukan di database agar tidak menarik seluruh baris ke
 * aplikasi; hasilnya hanya berisi bulan yang memiliki data.
 */
export async function getTrenPermohonan(
  villageId: number,
  jumlahBulan: number,
): Promise<BarisTrenBulanan[]> {
  const sekarang = new Date();
  const awal = new Date(sekarang.getFullYear(), sekarang.getMonth() - (jumlahBulan - 1), 1);
  const bulan = sql<string>`DATE_FORMAT(${permohonanSurat.createdAt}, '%Y-%m')`;

  const rows = await db
    .select({ bulan, total: count() })
    .from(permohonanSurat)
    .where(and(eq(permohonanSurat.villageId, villageId), gte(permohonanSurat.createdAt, awal)))
    .groupBy(bulan);

  return rows.map((row) => ({ bulan: row.bulan, total: Number(row.total) }));
}

export interface AktivitasRingkas {
  id: number;
  event: string;
  actorName: string | null;
  createdAt: Date;
}

/**
 * Aktivitas terbaru satu desa dari audit trail.
 *
 * Filter `villageId` wajib: feed beranda tidak boleh menampilkan peristiwa
 * desa lain atau peristiwa tingkat platform.
 */
export async function listAktivitasTerbaru(
  villageId: number,
  limit = 5,
): Promise<AktivitasRingkas[]> {
  return db
    .select({
      id: auditLogs.id,
      event: auditLogs.event,
      actorName: users.name,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(eq(auditLogs.villageId, villageId))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(limit);
}

export interface KelompokUmur {
  label: string;
  total: number;
}

/** Urutan tampilan kelompok umur; label juga dipakai sebagai hasil query. */
const URUTAN_KELOMPOK_UMUR = [
  "0–14",
  "15–24",
  "25–34",
  "35–44",
  "45–54",
  "55–64",
  "65+",
  "Tidak diketahui",
] as const;

/**
 * Sebaran penduduk hidup per kelompok umur untuk tab statistik beranda.
 *
 * Pengelompokan dihitung di database dengan `TIMESTAMPDIFF` agar baris penduduk
 * tidak perlu ditarik ke aplikasi. Penduduk tanpa tanggal lahir tetap dihitung
 * pada kelompok "Tidak diketahui" supaya totalnya konsisten dengan donut gender.
 */
export async function getStatistikUmur(villageId: number): Promise<KelompokUmur[]> {
  const kelompok = sql<string>`case
    when ${residents.birthDate} is null then 'Tidak diketahui'
    when timestampdiff(year, ${residents.birthDate}, curdate()) < 15 then '0–14'
    when timestampdiff(year, ${residents.birthDate}, curdate()) < 25 then '15–24'
    when timestampdiff(year, ${residents.birthDate}, curdate()) < 35 then '25–34'
    when timestampdiff(year, ${residents.birthDate}, curdate()) < 45 then '35–44'
    when timestampdiff(year, ${residents.birthDate}, curdate()) < 55 then '45–54'
    when timestampdiff(year, ${residents.birthDate}, curdate()) < 65 then '55–64'
    else '65+'
  end`;

  const rows = await db
    .select({ label: kelompok, total: count() })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive")))
    .groupBy(kelompok);

  const totalPerKelompok = new Map(rows.map((row) => [row.label, Number(row.total)]));

  return URUTAN_KELOMPOK_UMUR.map((label) => ({
    label,
    total: totalPerKelompok.get(label) ?? 0,
  })).filter((kelompokUmur) => kelompokUmur.total > 0);
}

export interface PermohonanTerbaru {
  id: number;
  pemohon: string;
  jenisSurat: string;
  status: number;
  diajukanPada: Date;
}

/**
 * Permohonan surat terbaru pada satu desa.
 *
 * Join memakai pasangan `(id, villageId)` agar baris lintas tenant tidak bisa
 * ikut terbaca meskipun relasi id-nya keliru.
 */
export async function listPermohonanTerbaru(
  villageId: number,
  limit = 5,
): Promise<PermohonanTerbaru[]> {
  return db
    .select({
      id: permohonanSurat.id,
      pemohon: residents.name,
      jenisSurat: letterTypes.name,
      status: permohonanSurat.status,
      diajukanPada: permohonanSurat.createdAt,
    })
    .from(permohonanSurat)
    .innerJoin(
      residents,
      and(
        eq(residents.id, permohonanSurat.residentId),
        eq(residents.villageId, permohonanSurat.villageId),
      ),
    )
    .innerJoin(
      letterTypes,
      and(
        eq(letterTypes.id, permohonanSurat.letterTypeId),
        eq(letterTypes.villageId, permohonanSurat.villageId),
      ),
    )
    .where(eq(permohonanSurat.villageId, villageId))
    .orderBy(desc(permohonanSurat.createdAt), desc(permohonanSurat.id))
    .limit(limit);
}
