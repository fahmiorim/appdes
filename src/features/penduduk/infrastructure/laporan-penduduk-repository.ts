import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  educations,
  maritalStatuses,
  occupations,
  regions,
  religions,
  residents,
} from "@/db/schema";
import type { PendudukStatistik } from "@/features/penduduk/domain/laporan-penduduk";
import type { Gender } from "@/features/penduduk/domain/penduduk";
import { formatWilayahLabel } from "@/features/wilayah/domain/wilayah";

/**
 * Pengambilan data untuk laporan kependudukan.
 *
 * Hanya penduduk **berstatus hidup** (`alive`) yang dihitung: penduduk yang
 * sudah meninggal atau pindah tidak lagi menjadi beban desa. Kolom kategori
 * diambil sebagai nama referensi (bukan id) supaya pengelompokan terjadi di
 * domain dan barisnya siap diekspor.
 */
export async function listPendudukStatistik(villageId: number): Promise<PendudukStatistik[]> {
  const rows = await db
    .select({
      gender: residents.gender,
      birthDate: residents.birthDate,
      religionName: religions.name,
      educationName: educations.name,
      occupationName: occupations.name,
      maritalStatusName: maritalStatuses.name,
      dusun: regions.dusun,
      rw: regions.rw,
      rt: regions.rt,
    })
    .from(residents)
    .leftJoin(religions, eq(residents.religionId, religions.id))
    .leftJoin(educations, eq(residents.educationId, educations.id))
    .leftJoin(occupations, eq(residents.occupationId, occupations.id))
    .leftJoin(maritalStatuses, eq(residents.maritalStatusId, maritalStatuses.id))
    .leftJoin(regions, eq(residents.regionId, regions.id))
    .where(and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive")));

  const today = new Date();

  return rows.map((row) => ({
    gender: row.gender as Gender,
    umur: hitungUmur(row.birthDate, today),
    agama: row.religionName,
    pendidikan: row.educationName,
    pekerjaan: row.occupationName,
    statusKawin: row.maritalStatusName,
    wilayah:
      row.dusun || row.rw || row.rt
        ? formatWilayahLabel({
            dusun: row.dusun ?? "",
            rw: row.rw ?? "",
            rt: row.rt ?? "",
          })
        : null,
  }));
}

/**
 * Umur dalam tahun penuh pada `today`.
 *
 * Ditulis ulang di sini (bukan mengimpor dari domain penduduk) karena baris
 * basis data berbentuk `YYYY-MM-DD`; aturan kalender tetap sama.
 */
function hitungUmur(birthDate: string | null, today: Date): number | null {
  if (!birthDate) return null;

  const lahir = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(lahir.getTime()) || lahir.getTime() > today.getTime()) return null;

  const bulanLahirKemudian =
    today.getUTCMonth() < lahir.getUTCMonth() ||
    (today.getUTCMonth() === lahir.getUTCMonth() && today.getUTCDate() < lahir.getUTCDate());

  return today.getUTCFullYear() - lahir.getUTCFullYear() - (bulanLahirKemudian ? 1 : 0);
}
