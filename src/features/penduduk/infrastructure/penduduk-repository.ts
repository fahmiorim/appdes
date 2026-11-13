import "server-only";

import { and, asc, count, eq, inArray, like, ne, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";

import { db } from "@/db";
import {
  bloodTypes,
  citizenships,
  educations,
  families,
  familyRelations,
  letters,
  maritalStatuses,
  occupations,
  regions,
  religions,
  residentMutations,
  residents,
  suplemenTerdata,
} from "@/db/schema";
import {
  HEAD_OF_FAMILY_RELATION_ID,
  type PendudukDTO,
  type PendudukFilter,
  type PendudukFormInput,
  type PendudukListRow,
} from "@/features/penduduk/domain/penduduk";
import { formatWilayahLabel } from "@/features/wilayah/domain/wilayah";
import { validationError } from "@/lib/errors";

export interface ListPendudukParams {
  villageId: number;
  /** Filter lanjutan (pencarian, status, katalog, wilayah, dan rentang umur). */
  filter: PendudukFilter;
  page: number;
  pageSize: number;
}

export interface PendudukListResult {
  rows: PendudukListRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

function toDto(row: typeof residents.$inferSelect): PendudukDTO {
  return {
    id: row.id,
    nationalId: row.nationalId,
    familyId: row.familyId,
    name: row.name,
    gender: row.gender,
    birthPlace: row.birthPlace,
    birthDate: row.birthDate,
    religionId: row.religionId,
    educationId: row.educationId,
    educationSedangId: row.educationSedangId,
    occupationId: row.occupationId,
    maritalStatusId: row.maritalStatusId,
    familyRelationId: row.familyRelationId,
    bloodTypeId: row.bloodTypeId,
    citizenshipId: row.citizenshipId,
    residenceStatus: row.residenceStatus,
    lifeStatus: row.lifeStatus,
    regionId: row.regionId,
    address: row.address,
    phone: row.phone,
    fatherName: row.fatherName,
    motherName: row.motherName,
    fatherNationalId: row.fatherNationalId,
    motherNationalId: row.motherNationalId,
  };
}

function formatRegionLabel(
  regionId: number | null,
  dusun: string | null,
  rw: string | null,
  rt: string | null,
): string | null {
  if (regionId === null) return null;
  return formatWilayahLabel({ dusun: dusun ?? "", rw: rw ?? "", rt: rt ?? "" });
}

/**
 * Bangun klausa WHERE daftar penduduk.
 *
 * Wilayah disaring lewat kolom `regions` (dusun/RW/RT), sehingga pemanggil
 * wajib ikut menyertakan `leftJoin(regions, ...)` pada query-nya.
 */
function buildWhere(villageId: number, filter: PendudukFilter): SQL {
  const villageFilter = eq(residents.villageId, villageId);
  const filters: SQL[] = [villageFilter];

  if (filter.search) {
    const term = `%${filter.search}%`;
    const searchFilter = or(
      like(residents.name, term),
      like(residents.nationalId, term),
      like(families.number, term),
    );
    if (searchFilter) filters.push(searchFilter);
  }

  if (filter.lifeStatus) filters.push(eq(residents.lifeStatus, filter.lifeStatus));
  if (filter.gender) filters.push(eq(residents.gender, filter.gender));
  if (filter.religionId !== null) filters.push(eq(residents.religionId, filter.religionId));
  if (filter.educationId !== null) filters.push(eq(residents.educationId, filter.educationId));
  if (filter.occupationId !== null) filters.push(eq(residents.occupationId, filter.occupationId));
  if (filter.maritalStatusId !== null) {
    filters.push(eq(residents.maritalStatusId, filter.maritalStatusId));
  }
  if (filter.dusun) filters.push(eq(regions.dusun, filter.dusun));
  if (filter.rw) filters.push(eq(regions.rw, filter.rw));
  if (filter.rt) filters.push(eq(regions.rt, filter.rt));
  if (filter.umurMin !== null) {
    filters.push(sql`TIMESTAMPDIFF(YEAR, ${residents.birthDate}, CURDATE()) >= ${filter.umurMin}`);
  }
  if (filter.umurMax !== null) {
    filters.push(sql`TIMESTAMPDIFF(YEAR, ${residents.birthDate}, CURDATE()) <= ${filter.umurMax}`);
  }

  return and(...filters) ?? villageFilter;
}

function blankToNull(value: string): string | null {
  return value === "" ? null : value;
}

/**
 * Verifikasi bahwa foreign reference tenant-scoped milik desa pemanggil.
 *
 * ID global saja tidak cukup: families dan regions masing-masing membawa
 * villageId sendiri. Pesan error sengaja generik agar tidak membocorkan
 * keberadaan record tenant lain.
 */
export async function validatePendudukTenantReferences(
  villageId: number,
  input: Pick<PendudukFormInput, "familyId" | "regionId">,
): Promise<void> {
  if (input.familyId !== null) {
    const [family] = await db
      .select({ id: families.id })
      .from(families)
      .where(and(eq(families.id, input.familyId), eq(families.villageId, villageId)))
      .limit(1);

    if (!family) {
      throw validationError("Kartu Keluarga atau wilayah tidak valid untuk desa ini.");
    }
  }

  if (input.regionId !== null) {
    const [region] = await db
      .select({ id: regions.id })
      .from(regions)
      .where(and(eq(regions.id, input.regionId), eq(regions.villageId, villageId)))
      .limit(1);

    if (!region) {
      throw validationError("Kartu Keluarga atau wilayah tidak valid untuk desa ini.");
    }
  }
}

export async function listPenduduk(params: ListPendudukParams): Promise<PendudukListResult> {
  const { villageId, filter, page, pageSize } = params;
  const where = buildWhere(villageId, filter);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        resident: residents,
        religionName: religions.name,
        familyNumber: families.number,
        joinedRegionId: regions.id,
        dusun: regions.dusun,
        rw: regions.rw,
        rt: regions.rt,
      })
      .from(residents)
      .leftJoin(religions, eq(residents.religionId, religions.id))
      .leftJoin(
        families,
        and(eq(residents.familyId, families.id), eq(families.villageId, villageId)),
      )
      .leftJoin(regions, and(eq(residents.regionId, regions.id), eq(regions.villageId, villageId)))
      .where(where)
      .orderBy(asc(residents.name), asc(residents.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(residents)
      .leftJoin(
        families,
        and(eq(residents.familyId, families.id), eq(families.villageId, villageId)),
      )
      .leftJoin(regions, and(eq(residents.regionId, regions.id), eq(regions.villageId, villageId)))
      .where(where),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);

  return {
    rows: rows.map((row) => ({
      ...toDto(row.resident),
      religionName: row.religionName ?? null,
      familyNumber: row.familyNumber ?? null,
      regionLabel:
        row.joinedRegionId === null
          ? null
          : formatRegionLabel(row.resident.regionId, row.dusun, row.rw, row.rt),
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function findPendudukById(villageId: number, id: number): Promise<PendudukDTO | null> {
  const [row] = await db
    .select()
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.id, id)))
    .limit(1);
  return row ? toDto(row) : null;
}

/**
 * Penduduk berstatus hidup dengan NIK tertentu di satu desa.
 *
 * Dipakai verifikasi tanpa akun pada anjungan kiosk; hanya kolom yang aman
 * untuk ditampilkan di layar publik yang dikembalikan.
 */
export async function findPendudukHidupByNik(
  villageId: number,
  nationalId: string,
): Promise<{ id: number; nama: string; nik: string | null; tanggalLahir: string | null } | null> {
  const [row] = await db
    .select({
      id: residents.id,
      nama: residents.name,
      nik: residents.nationalId,
      tanggalLahir: residents.birthDate,
    })
    .from(residents)
    .where(
      and(
        eq(residents.villageId, villageId),
        eq(residents.nationalId, nationalId),
        eq(residents.lifeStatus, "alive"),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertPenduduk(villageId: number, input: PendudukFormInput): Promise<number> {
  const [inserted] = await db
    .insert(residents)
    .values({
      villageId,
      nationalId: input.nationalId,
      familyId: input.familyId,
      name: input.name,
      gender: input.gender,
      birthPlace: blankToNull(input.birthPlace),
      birthDate: input.birthDate,
      religionId: input.religionId,
      educationId: input.educationId,
      educationSedangId: input.educationSedangId,
      occupationId: input.occupationId,
      maritalStatusId: input.maritalStatusId,
      familyRelationId: input.familyRelationId,
      bloodTypeId: input.bloodTypeId,
      citizenshipId: input.citizenshipId,
      residenceStatus: input.residenceStatus,
      lifeStatus: input.lifeStatus,
      regionId: input.regionId,
      address: blankToNull(input.address),
      phone: blankToNull(input.phone),
      fatherName: blankToNull(input.fatherName),
      motherName: blankToNull(input.motherName),
      fatherNationalId: input.fatherNationalId,
      motherNationalId: input.motherNationalId,
    })
    .$returningId();
  if (!inserted) throw new Error("Gagal menyimpan data penduduk.");
  return inserted.id;
}
export async function getPendudukDetailById(villageId: number, id: number) {
  const row = await db
    .select({
      resident: residents,
      family: families,
      region: regions,
      religion: religions,
      education: educations,
      occupation: occupations,
      maritalStatus: maritalStatuses,
      familyRelation: familyRelations,
      bloodType: bloodTypes,
      citizenship: citizenships,
    })
    .from(residents)
    .leftJoin(families, and(eq(residents.familyId, families.id), eq(families.villageId, villageId)))
    .leftJoin(regions, and(eq(residents.regionId, regions.id), eq(regions.villageId, villageId)))
    .leftJoin(religions, eq(residents.religionId, religions.id))
    .leftJoin(educations, eq(residents.educationId, educations.id))
    .leftJoin(occupations, eq(residents.occupationId, occupations.id))
    .leftJoin(maritalStatuses, eq(residents.maritalStatusId, maritalStatuses.id))
    .leftJoin(familyRelations, eq(residents.familyRelationId, familyRelations.id))
    .leftJoin(bloodTypes, eq(residents.bloodTypeId, bloodTypes.id))
    .leftJoin(citizenships, eq(residents.citizenshipId, citizenships.id))
    .where(and(eq(residents.id, id), eq(residents.villageId, villageId)))
    .limit(1);
  if (row.length === 0) return null;
  return row[0];
}

export async function nationalIdExists(
  villageId: number,
  nationalId: string,
  excludeId: number | null,
): Promise<boolean> {
  const filters: SQL[] = [eq(residents.villageId, villageId), eq(residents.nationalId, nationalId)];
  if (excludeId !== null) {
    filters.push(ne(residents.id, excludeId));
  }
  const duplicates = await db
    .select({ id: residents.id })
    .from(residents)
    .where(and(...filters))
    .limit(1);
  return duplicates.length > 0;
}

export async function headOfFamilyExists(
  villageId: number,
  familyId: number,
  excludeId: number | null,
): Promise<boolean> {
  const filters: SQL[] = [
    eq(residents.villageId, villageId),
    eq(residents.familyId, familyId),
    eq(residents.familyRelationId, HEAD_OF_FAMILY_RELATION_ID),
  ];
  if (excludeId !== null) {
    filters.push(ne(residents.id, excludeId));
  }
  const rows = await db
    .select({ id: residents.id })
    .from(residents)
    .where(and(...filters))
    .limit(1);
  return rows.length > 0;
}

export interface PendudukOption {
  id: number;
  name: string;
  nationalId: string | null;
}

export async function listPendudukOptions(villageId: number): Promise<PendudukOption[]> {
  return db
    .select({ id: residents.id, name: residents.name, nationalId: residents.nationalId })
    .from(residents)
    .where(eq(residents.villageId, villageId))
    .orderBy(asc(residents.name), asc(residents.id));
}

export async function findPendudukOptionByNik(
  villageId: number,
  nationalId: string,
): Promise<PendudukOption | null> {
  const [row] = await db
    .select({ id: residents.id, name: residents.name, nationalId: residents.nationalId })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.nationalId, nationalId)))
    .limit(1);
  return row ?? null;
}

export interface PendudukSuratData extends PendudukDTO {
  religionName: string | null;
  occupationName: string | null;
  familyNumber: string | null;
}

export async function getPendudukSuratData(
  villageId: number,
  id: number,
): Promise<PendudukSuratData | null> {
  const [row] = await db
    .select({
      resident: residents,
      religionName: religions.name,
      occupationName: occupations.name,
      familyNumber: families.number,
    })
    .from(residents)
    .leftJoin(religions, eq(residents.religionId, religions.id))
    .leftJoin(occupations, eq(residents.occupationId, occupations.id))
    .leftJoin(families, and(eq(residents.familyId, families.id), eq(families.villageId, villageId)))
    .where(and(eq(residents.villageId, villageId), eq(residents.id, id)))
    .limit(1);
  if (!row) return null;
  return {
    ...toDto(row.resident),
    religionName: row.religionName ?? null,
    occupationName: row.occupationName ?? null,
    familyNumber: row.familyNumber ?? null,
  };
}

export interface AnggotaKeluargaSuratRow {
  id: number;
  nationalId: string | null;
  name: string;
  gender: PendudukDTO["gender"];
  birthPlace: string | null;
  birthDate: string | null;
  religionName: string | null;
  educationName: string | null;
  educationSedangName: string | null;
  occupationName: string | null;
  maritalStatusName: string | null;
  familyRelationName: string | null;
  citizenshipName: string | null;
  bloodTypeName: string | null;
  address: string | null;
  fatherName: string | null;
  motherName: string | null;
  fatherNationalId: string | null;
  motherNationalId: string | null;
}

export async function listAnggotaKeluargaSurat(
  villageId: number,
  familyId: number,
): Promise<AnggotaKeluargaSuratRow[]> {
  const educationsSedang = alias(educations, "educations_sedang");
  const rows = await db
    .select({
      id: residents.id,
      nationalId: residents.nationalId,
      name: residents.name,
      gender: residents.gender,
      birthPlace: residents.birthPlace,
      birthDate: residents.birthDate,
      religionName: religions.name,
      educationName: educations.name,
      educationSedangName: educationsSedang.name,
      occupationName: occupations.name,
      maritalStatusName: maritalStatuses.name,
      familyRelationName: familyRelations.name,
      citizenshipName: citizenships.name,
      bloodTypeName: bloodTypes.name,
      address: residents.address,
      fatherName: residents.fatherName,
      motherName: residents.motherName,
      fatherNationalId: residents.fatherNationalId,
      motherNationalId: residents.motherNationalId,
    })
    .from(residents)
    .leftJoin(religions, eq(residents.religionId, religions.id))
    .leftJoin(educations, eq(residents.educationId, educations.id))
    .leftJoin(educationsSedang, eq(residents.educationSedangId, educationsSedang.id))
    .leftJoin(occupations, eq(residents.occupationId, occupations.id))
    .leftJoin(maritalStatuses, eq(residents.maritalStatusId, maritalStatuses.id))
    .leftJoin(familyRelations, eq(residents.familyRelationId, familyRelations.id))
    .leftJoin(citizenships, eq(residents.citizenshipId, citizenships.id))
    .leftJoin(bloodTypes, eq(residents.bloodTypeId, bloodTypes.id))
    .where(
      and(
        eq(residents.villageId, villageId),
        eq(residents.familyId, familyId),
        eq(residents.lifeStatus, "alive"),
      ),
    )
    .orderBy(asc(residents.familyRelationId), asc(residents.birthDate));
  return rows.map((row) => ({ ...row, gender: row.gender as PendudukDTO["gender"] }));
}

export async function listPendudukSuratByIds(
  villageId: number,
  ids: readonly number[],
): Promise<AnggotaKeluargaSuratRow[]> {
  if (ids.length === 0) return [];
  const educationsSedang = alias(educations, "educations_sedang");
  const idsDiminta = ids.slice(0, 10);

  // Satu query untuk maksimal 10 pengikut; sebelumnya satu query per ID.
  const hasil = await db
    .select({
      id: residents.id,
      nationalId: residents.nationalId,
      name: residents.name,
      gender: residents.gender,
      birthPlace: residents.birthPlace,
      birthDate: residents.birthDate,
      religionName: religions.name,
      educationName: educations.name,
      educationSedangName: educationsSedang.name,
      occupationName: occupations.name,
      maritalStatusName: maritalStatuses.name,
      familyRelationName: familyRelations.name,
      citizenshipName: citizenships.name,
      bloodTypeName: bloodTypes.name,
      address: residents.address,
      fatherName: residents.fatherName,
      motherName: residents.motherName,
      fatherNationalId: residents.fatherNationalId,
      motherNationalId: residents.motherNationalId,
    })
    .from(residents)
    .leftJoin(religions, eq(residents.religionId, religions.id))
    .leftJoin(educations, eq(residents.educationId, educations.id))
    .leftJoin(educationsSedang, eq(residents.educationSedangId, educationsSedang.id))
    .leftJoin(occupations, eq(residents.occupationId, occupations.id))
    .leftJoin(maritalStatuses, eq(residents.maritalStatusId, maritalStatuses.id))
    .leftJoin(familyRelations, eq(residents.familyRelationId, familyRelations.id))
    .leftJoin(citizenships, eq(residents.citizenshipId, citizenships.id))
    .leftJoin(bloodTypes, eq(residents.bloodTypeId, bloodTypes.id))
    .where(
      and(eq(residents.villageId, villageId), inArray(residents.id, [...new Set(idsDiminta)])),
    );

  const perId = new Map(hasil.map((row) => [row.id, row as AnggotaKeluargaSuratRow]));
  return idsDiminta.flatMap((id) => {
    const row = perId.get(id);
    return row ? [row] : [];
  });
}

export async function updatePenduduk(
  villageId: number,
  id: number,
  input: PendudukFormInput,
): Promise<void> {
  await db
    .update(residents)
    .set({
      nationalId: input.nationalId,
      familyId: input.familyId,
      name: input.name,
      gender: input.gender,
      birthPlace: blankToNull(input.birthPlace),
      birthDate: input.birthDate,
      religionId: input.religionId,
      educationId: input.educationId,
      educationSedangId: input.educationSedangId,
      occupationId: input.occupationId,
      maritalStatusId: input.maritalStatusId,
      familyRelationId: input.familyRelationId,
      bloodTypeId: input.bloodTypeId,
      citizenshipId: input.citizenshipId,
      residenceStatus: input.residenceStatus,
      lifeStatus: input.lifeStatus,
      regionId: input.regionId,
      address: blankToNull(input.address),
      phone: blankToNull(input.phone),
      fatherName: blankToNull(input.fatherName),
      motherName: blankToNull(input.motherName),
      fatherNationalId: input.fatherNationalId,
      motherNationalId: input.motherNationalId,
    })
    .where(and(eq(residents.id, id), eq(residents.villageId, villageId)));
}

/**
 * Hapus penduduk.
 *
 * Referensi yang boleh kosong dilepas di dalam transaksi sebelum baris dihapus.
 * `suplemen_terdata` memakai FK `RESTRICT` pada composite key, jadi pelepasan
 * harus eksplisit di sini. Sebaliknya `dtks_anggota` sengaja tetap `RESTRICT`:
 * penduduk yang tercatat sebagai anggota DTKS harus dikeluarkan dari DTKS dulu.
 */
export async function deletePenduduk(villageId: number, id: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(letters)
      .set({ residentId: null })
      .where(and(eq(letters.villageId, villageId), eq(letters.residentId, id)));
    await tx
      .update(residentMutations)
      .set({ residentId: null })
      .where(and(eq(residentMutations.villageId, villageId), eq(residentMutations.residentId, id)));
    await tx
      .update(suplemenTerdata)
      .set({ pendudukId: null })
      .where(and(eq(suplemenTerdata.villageId, villageId), eq(suplemenTerdata.pendudukId, id)));
    await tx.delete(residents).where(and(eq(residents.villageId, villageId), eq(residents.id, id)));
  });
}
