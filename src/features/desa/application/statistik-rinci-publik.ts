import "server-only";

import { and, asc, count, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { areas, educations, occupations, regions, residents } from "@/db/schema";

const alive = (villageId: number) => and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive"));

export async function getRincianStatistikPublik(villageId: number) {
  const ageGroup = sql<string>`case
    when timestampdiff(year, ${residents.birthDate}, curdate()) between 0 and 4 then '0–4'
    when timestampdiff(year, ${residents.birthDate}, curdate()) between 5 and 9 then '5–9'
    when timestampdiff(year, ${residents.birthDate}, curdate()) between 10 and 14 then '10–14'
    when timestampdiff(year, ${residents.birthDate}, curdate()) between 15 and 19 then '15–19'
    when timestampdiff(year, ${residents.birthDate}, curdate()) between 20 and 24 then '20–24'
    when timestampdiff(year, ${residents.birthDate}, curdate()) between 25 and 29 then '25–29'
    when timestampdiff(year, ${residents.birthDate}, curdate()) between 30 and 34 then '30–34'
    when timestampdiff(year, ${residents.birthDate}, curdate()) between 35 and 39 then '35–39'
    when timestampdiff(year, ${residents.birthDate}, curdate()) between 40 and 44 then '40–44'
    when timestampdiff(year, ${residents.birthDate}, curdate()) between 45 and 49 then '45–49'
    when timestampdiff(year, ${residents.birthDate}, curdate()) between 50 and 54 then '50–54'
    when timestampdiff(year, ${residents.birthDate}, curdate()) between 55 and 59 then '55–59'
    else '≥ 60' end`;
  const [ageRows, educationRows, occupationRows, regionRows, mapRows] = await Promise.all([
    db.select({ label: ageGroup, total: count() }).from(residents)
      .where(and(alive(villageId), isNotNull(residents.birthDate)))
      .groupBy(ageGroup),
    db.select({ label: sql<string>`coalesce(${educations.name}, 'Belum diisi')`, total: count() })
      .from(residents).leftJoin(educations, eq(residents.educationId, educations.id))
      .where(alive(villageId)).groupBy(educations.name).orderBy(asc(educations.name)),
    db.select({ label: sql<string>`coalesce(${occupations.name}, 'Belum diisi')`, total: count() })
      .from(residents).leftJoin(occupations, eq(residents.occupationId, occupations.id))
      .where(alive(villageId)).groupBy(occupations.name).orderBy(asc(occupations.name)),
    db.select({
      label: sql<string>`coalesce(${regions.dusun}, 'Belum diisi')`,
      total: count(),
      lakiLaki: sql<number>`sum(case when ${residents.gender} = 'male' then 1 else 0 end)`,
      perempuan: sql<number>`sum(case when ${residents.gender} = 'female' then 1 else 0 end)`,
      keluarga: sql<number>`count(distinct ${residents.familyId})`,
    }).from(residents).leftJoin(regions, and(eq(residents.regionId, regions.id), eq(regions.villageId, villageId)))
      .where(alive(villageId)).groupBy(regions.dusun).orderBy(asc(regions.dusun)),
    db.select({ nama: areas.nama, deskripsi: areas.desk, path: areas.path })
      .from(areas).where(and(eq(areas.villageId, villageId), eq(areas.enabled, 1)))
      .orderBy(asc(areas.sortOrder)),
  ]);

  const ageOrder = ["0–4","5–9","10–14","15–19","20–24","25–29","30–34","35–39","40–44","45–49","50–54","55–59","≥ 60"];
  const ageMap = new Map(ageRows.map((row) => [row.label, Number(row.total)]));
  return {
    kelompokUsia: ageOrder.map((label) => ({ label, total: ageMap.get(label) ?? 0 })),
    pendidikan: educationRows.map((row) => ({ label: row.label, total: Number(row.total) })),
    pekerjaan: occupationRows.map((row) => ({ label: row.label, total: Number(row.total) })),
    perDusun: regionRows.map((row) => ({
      label: row.label, total: Number(row.total), lakiLaki: Number(row.lakiLaki ?? 0),
      perempuan: Number(row.perempuan ?? 0), keluarga: Number(row.keluarga ?? 0),
    })),
    wilayah: mapRows.map((row) => ({ nama: row.nama, deskripsi: row.deskripsi, tersediaPeta: Boolean(row.path) })),
  };
}
