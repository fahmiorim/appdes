import "server-only";

import { and, count, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  educations,
  maritalStatuses,
  occupations,
  regions,
  religions,
  residents,
} from "@/db/schema";
import { bantuanPeserta, bantuanProgram } from "@/db/schema/bantuan";
import { calculateAge } from "@/features/penduduk/domain/penduduk";
import {
  type StatistikBantuanParams,
  type StatistikBantuanResult,
  type StatistikBantuanRow,
  type StatistikBantuanSummary,
  type StatistikPendudukParams,
  type StatistikPendudukResult,
  type StatistikPendudukRow,
  type StatistikPendudukSummary,
} from "@/features/statistik/domain/statistik";
import { listRentangUmur } from "@/features/statistik/infrastructure/rentang-umur-repository";

const MAX_PAGE = 100;

function buildPendudukWhere(villageId: number, params: StatistikPendudukParams) {
  const filters = [eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive")];
  if (params.dusun) filters.push(eq(regions.dusun, params.dusun));
  if (params.rw) filters.push(eq(regions.rw, params.rw));
  if (params.rt) filters.push(eq(regions.rt, params.rt));
  if (params.umurMin !== undefined) {
    filters.push(sql`TIMESTAMPDIFF(YEAR, ${residents.birthDate}, CURDATE()) >= ${params.umurMin}`);
  }
  if (params.umurMax !== undefined) {
    filters.push(sql`TIMESTAMPDIFF(YEAR, ${residents.birthDate}, CURDATE()) <= ${params.umurMax}`);
  }
  return and(...filters);
}

/** Statistik penduduk berdasarkan jenis kategorinya. */
export async function getStatistikPenduduk(
  villageId: number,
  params: StatistikPendudukParams,
): Promise<StatistikPendudukResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(MAX_PAGE, Math.max(1, params.perPage ?? 10));
  const offset = (page - 1) * perPage;

  const baseWhere = buildPendudukWhere(villageId, params);

  let rows: StatistikPendudukRow[];
  let totalResidents: StatistikPendudukSummary;

  switch (params.kind) {
    case "gender": {
      const grouped = await db
        .select({
          gender: residents.gender,
          total: count(),
          male: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'male' THEN 1 END)`,
          female: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'female' THEN 1 END)`,
        })
        .from(residents)
        .leftJoin(regions, eq(residents.regionId, regions.id))
        .where(baseWhere)
        .groupBy(residents.gender);

      const maleRow = grouped.find((r) => r.gender === "male");
      const femaleRow = grouped.find((r) => r.gender === "female");
      const maleTotal = Number(maleRow?.total ?? 0);
      const femaleTotal = Number(femaleRow?.total ?? 0);
      const grandTotal = maleTotal + femaleTotal;

      totalResidents = { total: grandTotal, male: maleTotal, female: femaleTotal };

      rows = [
        {
          label: "Laki-laki",
          total: maleTotal,
          male: maleTotal,
          female: 0,
          percentage: grandTotal ? Math.round((maleTotal / grandTotal) * 100) : 0,
        },
        {
          label: "Perempuan",
          total: femaleTotal,
          male: 0,
          female: femaleTotal,
          percentage: grandTotal ? Math.round((femaleTotal / grandTotal) * 100) : 0,
        },
      ];
      break;
    }

    case "religion": {
      const grouped = await db
        .select({
          religionId: residents.religionId,
          total: count(),
          male: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'male' THEN 1 END)`,
          female: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'female' THEN 1 END)`,
        })
        .from(residents)
        .leftJoin(regions, eq(residents.regionId, regions.id))
        .where(baseWhere)
        .groupBy(residents.religionId);

      const allReligions = await db
        .select({ id: religions.id, name: religions.name })
        .from(religions);

      const map = new Map(allReligions.map((r) => [r.id, r.name]));
      totalResidents = {
        total: grouped.reduce((s, r) => s + Number(r.total), 0),
        male: grouped.reduce((s, r) => s + Number(r.male), 0),
        female: grouped.reduce((s, r) => s + Number(r.female), 0),
      };

      rows = grouped
        .map((r) => {
          const name = map.get(r.religionId ?? 0) ?? "Tidak diketahui";
          const grand = totalResidents.total;
          return {
            label: name,
            total: Number(r.total),
            male: Number(r.male),
            female: Number(r.female),
            percentage: grand ? Math.round((Number(r.total) / grand) * 100) : 0,
          };
        })
        .sort((a, b) => b.total - a.total);
      break;
    }

    case "education": {
      const grouped = await db
        .select({
          educationId: residents.educationId,
          total: count(),
          male: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'male' THEN 1 END)`,
          female: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'female' THEN 1 END)`,
        })
        .from(residents)
        .leftJoin(regions, eq(residents.regionId, regions.id))
        .where(baseWhere)
        .groupBy(residents.educationId);

      const allEducations = await db
        .select({ id: educations.id, name: educations.name })
        .from(educations);

      const map = new Map(allEducations.map((r) => [r.id, r.name]));
      totalResidents = {
        total: grouped.reduce((s, r) => s + Number(r.total), 0),
        male: grouped.reduce((s, r) => s + Number(r.male), 0),
        female: grouped.reduce((s, r) => s + Number(r.female), 0),
      };

      rows = grouped
        .map((r) => {
          const name = map.get(r.educationId ?? 0) ?? "Tidak diketahui";
          const grand = totalResidents.total;
          return {
            label: name,
            total: Number(r.total),
            male: Number(r.male),
            female: Number(r.female),
            percentage: grand ? Math.round((Number(r.total) / grand) * 100) : 0,
          };
        })
        .sort((a, b) => b.total - a.total);
      break;
    }

    case "occupation": {
      const grouped = await db
        .select({
          occupationId: residents.occupationId,
          total: count(),
          male: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'male' THEN 1 END)`,
          female: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'female' THEN 1 END)`,
        })
        .from(residents)
        .leftJoin(regions, eq(residents.regionId, regions.id))
        .where(baseWhere)
        .groupBy(residents.occupationId);

      const allOccupations = await db
        .select({ id: occupations.id, name: occupations.name })
        .from(occupations);

      const map = new Map(allOccupations.map((r) => [r.id, r.name]));
      totalResidents = {
        total: grouped.reduce((s, r) => s + Number(r.total), 0),
        male: grouped.reduce((s, r) => s + Number(r.male), 0),
        female: grouped.reduce((s, r) => s + Number(r.female), 0),
      };

      rows = grouped
        .map((r) => {
          const name = map.get(r.occupationId ?? 0) ?? "Tidak diketahui";
          const grand = totalResidents.total;
          return {
            label: name,
            total: Number(r.total),
            male: Number(r.male),
            female: Number(r.female),
            percentage: grand ? Math.round((Number(r.total) / grand) * 100) : 0,
          };
        })
        .sort((a, b) => b.total - a.total);
      break;
    }

    case "marital_status": {
      const grouped = await db
        .select({
          maritalStatusId: residents.maritalStatusId,
          total: count(),
          male: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'male' THEN 1 END)`,
          female: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'female' THEN 1 END)`,
        })
        .from(residents)
        .leftJoin(regions, eq(residents.regionId, regions.id))
        .where(baseWhere)
        .groupBy(residents.maritalStatusId);

      const allMarital = await db
        .select({ id: maritalStatuses.id, name: maritalStatuses.name })
        .from(maritalStatuses);

      const map = new Map(allMarital.map((r) => [r.id, r.name]));
      totalResidents = {
        total: grouped.reduce((s, r) => s + Number(r.total), 0),
        male: grouped.reduce((s, r) => s + Number(r.male), 0),
        female: grouped.reduce((s, r) => s + Number(r.female), 0),
      };

      rows = grouped
        .map((r) => {
          const name = map.get(r.maritalStatusId ?? 0) ?? "Tidak diketahui";
          const grand = totalResidents.total;
          return {
            label: name,
            total: Number(r.total),
            male: Number(r.male),
            female: Number(r.female),
            percentage: grand ? Math.round((Number(r.total) / grand) * 100) : 0,
          };
        })
        .sort((a, b) => b.total - a.total);
      break;
    }

    case "dusun": {
      const grouped = await db
        .select({
          regionId: residents.regionId,
          total: count(),
          male: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'male' THEN 1 END)`,
          female: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'female' THEN 1 END)`,
        })
        .from(residents)
        .leftJoin(regions, eq(residents.regionId, regions.id))
        .where(baseWhere)
        .groupBy(residents.regionId);

      const allRegions = await db
        .select({ id: regions.id, dusun: regions.dusun, rw: regions.rw, rt: regions.rt })
        .from(regions)
        .where(eq(regions.villageId, villageId));

      const map = new Map(
        allRegions.map((r) => [r.id, `${r.dusun ?? "-"} RW${r.rw ?? "-"}/RT${r.rt ?? "-"}`]),
      );
      totalResidents = {
        total: grouped.reduce((s, r) => s + Number(r.total), 0),
        male: grouped.reduce((s, r) => s + Number(r.male), 0),
        female: grouped.reduce((s, r) => s + Number(r.female), 0),
      };

      rows = grouped
        .map((r) => {
          const name = map.get(r.regionId ?? 0) ?? "Tidak diketahui";
          const grand = totalResidents.total;
          return {
            label: name,
            total: Number(r.total),
            male: Number(r.male),
            female: Number(r.female),
            percentage: grand ? Math.round((Number(r.total) / grand) * 100) : 0,
          };
        })
        .sort((a, b) => b.total - a.total);
      break;
    }

    case "age_group": {
      const now = new Date();
      const currentYear = now.getFullYear();

      const all = await db
        .select({ birthDate: residents.birthDate, gender: residents.gender })
        .from(residents)
        .leftJoin(regions, eq(residents.regionId, regions.id))
        .where(baseWhere);

      const groups: Record<string, { total: number; male: number; female: number }> = {
        "0-4 tahun": { total: 0, male: 0, female: 0 },
        "5-14 tahun": { total: 0, male: 0, female: 0 },
        "15-64 tahun": { total: 0, male: 0, female: 0 },
        "65+ tahun": { total: 0, male: 0, female: 0 },
      };

      for (const r of all) {
        if (!r.birthDate) continue;
        const birth = new Date(r.birthDate);
        let age = currentYear - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
        if (age < 0) continue;

        let key: keyof typeof groups;
        if (age <= 4) key = "0-4 tahun";
        else if (age <= 14) key = "5-14 tahun";
        else if (age <= 64) key = "15-64 tahun";
        else key = "65+ tahun";

        const grp = groups[key]!;
        grp.total += 1;
        if (r.gender === "male") grp.male += 1;
        else if (r.gender === "female") grp.female += 1;
      }

      totalResidents = {
        total: Object.values(groups).reduce((s, g) => s + g.total, 0),
        male: Object.values(groups).reduce((s, g) => s + g.male, 0),
        female: Object.values(groups).reduce((s, g) => s + g.female, 0),
      };

      rows = Object.entries(groups)
        .map(([label, g]) => {
          const grand = totalResidents.total;
          return {
            label,
            total: g.total,
            male: g.male,
            female: g.female,
            percentage: grand ? Math.round((g.total / grand) * 100) : 0,
          };
        })
        .sort((a, b) => b.total - a.total);
      break;
    }

    case "age_range": {
      const all = await db
        .select({ birthDate: residents.birthDate, gender: residents.gender })
        .from(residents)
        .leftJoin(regions, eq(residents.regionId, regions.id))
        .where(baseWhere);
      const ranges = await listRentangUmur(villageId);
      const groups = new Map(ranges.map((k) => [k.label, { total: 0, male: 0, female: 0 }]));
      for (const r of all) {
        const age = calculateAge(r.birthDate);
        if (age === null) continue;
        const bucket = ranges.find((k) => age >= k.min && (k.max === null || age <= k.max));
        if (!bucket) continue;
        const group = groups.get(bucket.label)!;
        group.total += 1;
        if (r.gender === "male") group.male += 1;
        else if (r.gender === "female") group.female += 1;
      }
      totalResidents = {
        total: [...groups.values()].reduce((s, g) => s + g.total, 0),
        male: [...groups.values()].reduce((s, g) => s + g.male, 0),
        female: [...groups.values()].reduce((s, g) => s + g.female, 0),
      };
      rows = [...groups.entries()].map(([label, g]) => ({
        label,
        total: g.total,
        male: g.male,
        female: g.female,
        percentage: totalResidents.total ? Math.round((g.total / totalResidents.total) * 100) : 0,
      }));
      break;
    }

    case "rentan": {
      const all = await db
        .select({ birthDate: residents.birthDate, gender: residents.gender })
        .from(residents)
        .leftJoin(regions, eq(residents.regionId, regions.id))
        .where(baseWhere);

      const groups: Record<string, { total: number; male: number; female: number }> = {
        "Balita (0–5 tahun)": { total: 0, male: 0, female: 0 },
        "Anak (6–12 tahun)": { total: 0, male: 0, female: 0 },
        "Lansia (60+ tahun)": { total: 0, male: 0, female: 0 },
      };

      for (const r of all) {
        const age = calculateAge(r.birthDate);
        if (age === null) continue;
        const key =
          age <= 5
            ? "Balita (0–5 tahun)"
            : age <= 12
              ? "Anak (6–12 tahun)"
              : age >= 60
                ? "Lansia (60+ tahun)"
                : null;
        if (!key) continue;
        const group = groups[key]!;
        group.total += 1;
        if (r.gender === "male") group.male += 1;
        else if (r.gender === "female") group.female += 1;
      }

      totalResidents = {
        total: Object.values(groups).reduce((s, g) => s + g.total, 0),
        male: Object.values(groups).reduce((s, g) => s + g.male, 0),
        female: Object.values(groups).reduce((s, g) => s + g.female, 0),
      };

      rows = Object.entries(groups).map(([label, g]) => ({
        label,
        total: g.total,
        male: g.male,
        female: g.female,
        percentage: totalResidents.total ? Math.round((g.total / totalResidents.total) * 100) : 0,
      }));
      break;
    }

    default:
      rows = [];
      totalResidents = { total: 0, male: 0, female: 0 };
  }

  const pageRows = rows.slice(offset, offset + perPage);
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));

  return {
    rows: pageRows,
    summary: totalResidents,
    page,
    perPage,
    pageCount,
  };
}

/** Statistik bantuan sosial per program atau sasaran. */
export async function getStatistikBantuan(
  villageId: number,
  params: StatistikBantuanParams,
): Promise<StatistikBantuanResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(MAX_PAGE, Math.max(1, params.perPage ?? 10));
  const offset = (page - 1) * perPage;

  let rows: StatistikBantuanRow[];
  let summary: StatistikBantuanSummary;

  if (params.kind === "program") {
    const programs = await db
      .select({
        id: bantuanProgram.id,
        slug: bantuanProgram.slug,
        name: bantuanProgram.name,
        sasaran: bantuanProgram.sasaran,
      })
      .from(bantuanProgram)
      .where(
        params.programSlug
          ? and(
              eq(bantuanProgram.villageId, villageId),
              eq(bantuanProgram.slug, params.programSlug),
            )
          : eq(bantuanProgram.villageId, villageId),
      );

    const programIds = programs.map((p) => p.id);

    let counts: Array<{
      programId: number;
      total: string | number;
      male: string | number;
      female: string | number;
    }> = [];
    if (programIds.length > 0) {
      counts = await db
        .select({
          programId: bantuanPeserta.programId,
          total: sql<number>`COUNT(${bantuanPeserta.id})`,
          male: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'male' AND ${residents.lifeStatus} = 'alive' THEN 1 END)`,
          female: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'female' AND ${residents.lifeStatus} = 'alive' THEN 1 END)`,
        })
        .from(bantuanPeserta)
        .leftJoin(residents, eq(bantuanPeserta.residentId, residents.id))
        .leftJoin(regions, eq(residents.regionId, regions.id))
        .where(
          and(
            inArray(bantuanPeserta.programId, programIds),
            eq(bantuanPeserta.villageId, villageId),
            params.dusun ? eq(regions.dusun, params.dusun) : undefined,
            params.rw ? eq(regions.rw, params.rw) : undefined,
            params.rt ? eq(regions.rt, params.rt) : undefined,
          ),
        )
        .groupBy(bantuanPeserta.programId);
    }

    const map = new Map(counts.map((c) => [c.programId, c]));
    let total = 0;
    let male = 0;
    let female = 0;
    for (const c of counts) {
      total += Number(c.total);
      male += Number(c.male);
      female += Number(c.female);
    }
    summary = { total, male, female };

    rows = programs
      .map((p) => {
        const c = map.get(p.id);
        const grand = summary.total;
        return {
          label: p.name,
          total: c ? Number(c.total) : 0,
          male: c ? Number(c.male) : 0,
          female: c ? Number(c.female) : 0,
          percentage: grand ? Math.round(((c ? Number(c.total) : 0) / grand) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  } else {
    // sasaran: hitung peserta per jenis sasaran (1=penduduk, 2=keluarga, …).
    // `COUNT(bantuan_peserta.id)` penting agar program tanpa peserta tidak ikut
    // terhitung sebagai satu baris (left join tetap menghasilkan satu baris).
    const sasaranRows = await db
      .select({
        sasaran: bantuanProgram.sasaran,
        total: sql<number>`COUNT(${bantuanPeserta.id})`,
        male: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'male' AND ${residents.lifeStatus} = 'alive' THEN 1 END)`,
        female: sql<number>`COUNT(CASE WHEN ${residents.gender} = 'female' AND ${residents.lifeStatus} = 'alive' THEN 1 END)`,
      })
      .from(bantuanProgram)
      .leftJoin(
        bantuanPeserta,
        and(
          eq(bantuanPeserta.programId, bantuanProgram.id),
          eq(bantuanPeserta.villageId, villageId),
        ),
      )
      .leftJoin(residents, eq(bantuanPeserta.residentId, residents.id))
      .leftJoin(regions, eq(residents.regionId, regions.id))
      .where(
        and(
          params.sasaran
            ? and(
                eq(bantuanProgram.villageId, villageId),
                eq(bantuanProgram.sasaran, params.sasaran),
              )
            : eq(bantuanProgram.villageId, villageId),
          params.dusun ? eq(regions.dusun, params.dusun) : undefined,
          params.rw ? eq(regions.rw, params.rw) : undefined,
          params.rt ? eq(regions.rt, params.rt) : undefined,
          params.periodeMulai
            ? sql`(${bantuanProgram.startDate} IS NULL AND ${bantuanProgram.endDate} IS NULL) OR (${bantuanProgram.startDate} <= ${params.periodeMulai})`
            : undefined,
          params.periodeAkhir
            ? sql`(${bantuanProgram.endDate} IS NULL AND ${bantuanProgram.startDate} IS NULL) OR (${bantuanProgram.endDate} >= ${params.periodeAkhir})`
            : undefined,
        ),
      )
      .groupBy(bantuanProgram.sasaran);

    const labels: Record<number, string> = {
      1: "Penduduk",
      2: "Keluarga",
      3: "Rumah Tangga",
      4: "Kelompok",
    };
    summary = {
      total: sasaranRows.reduce((s, r) => s + Number(r.total), 0),
      male: sasaranRows.reduce((s, r) => s + Number(r.male), 0),
      female: sasaranRows.reduce((s, r) => s + Number(r.female), 0),
    };

    rows = sasaranRows
      .map((r) => {
        const grand = summary.total;
        return {
          label: labels[r.sasaran ?? 0] ?? `Sasaran ${r.sasaran ?? 0}`,
          total: Number(r.total),
          male: Number(r.male),
          female: Number(r.female),
          percentage: grand ? Math.round((Number(r.total) / grand) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  const pageRows = rows.slice(offset, offset + perPage);
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));

  return {
    rows: pageRows,
    summary,
    page,
    perPage,
    pageCount,
  };
}
