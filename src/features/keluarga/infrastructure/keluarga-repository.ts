import "server-only";

import {
  aliasedTable,
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  like,
  ne,
  or,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import {
  bloodTypes,
  citizenships,
  dtks,
  educations,
  families,
  familyMemberLogs,
  familyRelations,
  maritalStatuses,
  occupations,
  regions,
  religions,
  residents,
  suplemenTerdata,
  users,
} from "@/db/schema";
import {
  HEAD_OF_FAMILY_RELATION_ID,
  type KeluargaAnggotaLog,
  type KeluargaAnggotaRow,
  type KeluargaDTO,
  type KeluargaFormInput,
  type KeluargaListRow,
  type KeluargaMember,
  type KeluargaMemberDetail,
  type PerubahanAnggota,
} from "@/features/keluarga/domain/keluarga";
import { formatWilayahLabel } from "@/features/wilayah/domain/wilayah";
import { validationError } from "@/lib/errors";

/** Alias `residents` untuk mencari anggota yang berperan sebagai kepala keluarga. */
const head = aliasedTable(residents, "head");

export interface ListKeluargaParams {
  villageId: number;
  search: string;
  page: number;
  pageSize: number;
}

export interface KeluargaListResult {
  rows: KeluargaListRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Ubah teks kosong menjadi `NULL` agar basis data tidak menyimpan string kosong. */
function blankToNull(value: string): string | null {
  return value === "" ? null : value;
}

/** Petakan baris `families` → DTO domain (kosakata Indonesia). */
function toDto(row: typeof families.$inferSelect): KeluargaDTO {
  return {
    id: row.id,
    number: row.number,
    address: row.address,
    regionId: row.regionId,
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

function buildWhere(villageId: number, search: string): SQL {
  const villageFilter = eq(families.villageId, villageId);
  const filters: SQL[] = [villageFilter];

  if (search) {
    const term = `%${search}%`;
    const searchFilter = or(like(families.number, term), like(families.address, term));
    if (searchFilter) filters.push(searchFilter);
  }

  return and(...filters) ?? villageFilter;
}

export async function listKeluarga(params: ListKeluargaParams): Promise<KeluargaListResult> {
  const { villageId, search, page, pageSize } = params;
  const where = buildWhere(villageId, search);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        family: families,
        headName: head.name,
        dusun: regions.dusun,
        rw: regions.rw,
        rt: regions.rt,
      })
      .from(families)
      .leftJoin(
        head,
        and(
          eq(head.familyId, families.id),
          eq(head.villageId, villageId),
          eq(head.familyRelationId, HEAD_OF_FAMILY_RELATION_ID),
        ),
      )
      .leftJoin(regions, and(eq(families.regionId, regions.id), eq(regions.villageId, villageId)))
      .where(where)
      .orderBy(asc(families.number), asc(families.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(families).where(where),
  ]);

  const total = totalRows[0]?.value ?? 0;

  // Hitungan anggota diambil lewat query agregat, bukan subquery berkorelasi:
  // Drizzle merender kolom subquery tanpa kualifikasi tabel sehingga `id`
  // menunjuk `residents.id`, bukan `families.id`.
  const familyIds = rows.map((row) => row.family.id);
  const anggotaRows =
    familyIds.length === 0
      ? []
      : await db
          .select({ familyId: residents.familyId, jumlah: count() })
          .from(residents)
          .where(and(inArray(residents.familyId, familyIds), eq(residents.villageId, villageId)))
          .groupBy(residents.familyId);
  const anggotaByFamily = new Map(
    anggotaRows.map((row) => [row.familyId, Number(row.jumlah ?? 0)]),
  );

  return {
    rows: rows.map((row) => ({
      ...toDto(row.family),
      headName: row.headName ?? null,
      memberCount: anggotaByFamily.get(row.family.id) ?? 0,
      regionLabel: formatRegionLabel(row.family.regionId, row.dusun, row.rw, row.rt),
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function findKeluargaById(villageId: number, id: number): Promise<KeluargaDTO | null> {
  const [row] = await db
    .select()
    .from(families)
    .where(and(eq(families.villageId, villageId), eq(families.id, id)))
    .limit(1);

  return row ? toDto(row) : null;
}

/** Apakah nomor KK sudah dipakai keluarga lain di desa yang sama. */
export async function keluargaNumberExists(
  villageId: number,
  number: string,
  excludeId: number | null,
): Promise<boolean> {
  const filters: SQL[] = [eq(families.villageId, villageId), eq(families.number, number)];

  if (excludeId !== null) {
    filters.push(ne(families.id, excludeId));
  }

  const duplicates = await db
    .select({ id: families.id })
    .from(families)
    .where(and(...filters))
    .limit(1);

  return duplicates.length > 0;
}

/** Anggota sebuah KK, terurut dengan kepala keluarga di depan. */
export async function listKeluargaMembers(
  villageId: number,
  familyId: number,
): Promise<KeluargaMember[]> {
  const rows = await db
    .select({
      id: residents.id,
      name: residents.name,
      nationalId: residents.nationalId,
      gender: residents.gender,
      birthDate: residents.birthDate,
      relationName: familyRelations.name,
      familyRelationId: residents.familyRelationId,
    })
    .from(residents)
    .innerJoin(
      families,
      and(eq(families.id, residents.familyId), eq(families.villageId, villageId)),
    )
    .leftJoin(familyRelations, eq(residents.familyRelationId, familyRelations.id))
    .where(and(eq(residents.villageId, villageId), eq(residents.familyId, familyId)))
    .orderBy(asc(residents.name), asc(residents.id));

  return rows
    .sort((a, b) => {
      const aHead = a.familyRelationId === HEAD_OF_FAMILY_RELATION_ID ? 0 : 1;
      const bHead = b.familyRelationId === HEAD_OF_FAMILY_RELATION_ID ? 0 : 1;
      return aHead - bHead;
    })
    .map((row) => ({
      id: row.id,
      name: row.name,
      nationalId: row.nationalId,
      gender: row.gender,
      birthDate: row.birthDate,
      relationName: row.relationName ?? null,
    }));
}

/**
 * Anggota sebuah KK dengan data lengkap untuk cetak Kartu Keluarga.
 *
 * Hanya penduduk berstatus hidup yang dicetak. Seluruh kolom referensi diambil
 * sebagai nama (bukan id) agar lapisan PDF tinggal menulis teksnya.
 */
export async function listKeluargaMemberDetails(
  villageId: number,
  familyId: number,
): Promise<KeluargaMemberDetail[]> {
  const rows = await db
    .select({
      id: residents.id,
      name: residents.name,
      nationalId: residents.nationalId,
      gender: residents.gender,
      birthPlace: residents.birthPlace,
      birthDate: residents.birthDate,
      relationName: familyRelations.name,
      familyRelationId: residents.familyRelationId,
      religionName: religions.name,
      educationName: educations.name,
      occupationName: occupations.name,
      maritalStatusName: maritalStatuses.name,
      bloodTypeName: bloodTypes.name,
      citizenshipName: citizenships.name,
      fatherName: residents.fatherName,
      motherName: residents.motherName,
    })
    .from(residents)
    .innerJoin(
      families,
      and(eq(families.id, residents.familyId), eq(families.villageId, villageId)),
    )
    .leftJoin(familyRelations, eq(residents.familyRelationId, familyRelations.id))
    .leftJoin(religions, eq(residents.religionId, religions.id))
    .leftJoin(educations, eq(residents.educationId, educations.id))
    .leftJoin(occupations, eq(residents.occupationId, occupations.id))
    .leftJoin(maritalStatuses, eq(residents.maritalStatusId, maritalStatuses.id))
    .leftJoin(bloodTypes, eq(residents.bloodTypeId, bloodTypes.id))
    .leftJoin(citizenships, eq(residents.citizenshipId, citizenships.id))
    .where(
      and(
        eq(residents.villageId, villageId),
        eq(residents.familyId, familyId),
        eq(residents.lifeStatus, "alive"),
      ),
    );

  return rows
    .sort((a, b) => {
      const aHead = a.familyRelationId === HEAD_OF_FAMILY_RELATION_ID ? 0 : 1;
      const bHead = b.familyRelationId === HEAD_OF_FAMILY_RELATION_ID ? 0 : 1;
      return aHead - bHead || a.name.localeCompare(b.name, "id") || a.id - b.id;
    })
    .map((row) => ({
      id: row.id,
      name: row.name,
      nationalId: row.nationalId,
      gender: row.gender,
      birthDate: row.birthDate,
      relationName: row.relationName ?? null,
      birthPlace: row.birthPlace,
      religionName: row.religionName,
      educationName: row.educationName,
      occupationName: row.occupationName,
      maritalStatusName: row.maritalStatusName,
      bloodTypeName: row.bloodTypeName,
      citizenshipName: row.citizenshipName,
      fatherName: row.fatherName,
      motherName: row.motherName,
    }));
}

/**
 * Pastikan wilayah yang dipilih benar-benar milik desa pemanggil.
 *
 * Composite foreign key sudah mencegah relasi lintas desa pada database baru,
 * tetapi baris lama dan database yang belum menjalankan migration tetap perlu
 * ditolak di layer aplikasi agar kesalahan tidak bocor sebagai error SQL.
 */
export async function validateKeluargaRegion(
  villageId: number,
  regionId: number | null,
): Promise<void> {
  if (regionId === null) return;

  const [region] = await db
    .select({ id: regions.id })
    .from(regions)
    .where(and(eq(regions.id, regionId), eq(regions.villageId, villageId)))
    .limit(1);

  if (!region) {
    throw validationError("Wilayah tidak valid untuk desa ini.");
  }
}

export async function insertKeluarga(villageId: number, input: KeluargaFormInput): Promise<number> {
  const [inserted] = await db
    .insert(families)
    .values({
      villageId,
      number: input.number,
      address: blankToNull(input.address),
      regionId: input.regionId,
    })
    .$returningId();

  if (!inserted) throw new Error("Gagal menyimpan data keluarga.");
  return inserted.id;
}

export async function updateKeluarga(
  villageId: number,
  id: number,
  input: KeluargaFormInput,
): Promise<void> {
  await db
    .update(families)
    .set({
      number: input.number,
      address: blankToNull(input.address),
      regionId: input.regionId,
    })
    .where(and(eq(families.villageId, villageId), eq(families.id, id)));
}

/**
 * Hapus KK.
 *
 * Referensi penduduk, DTKS, dan Suplemen dilepas dalam transaksi sebelum KK
 * dihapus agar `village_id` tetap terjaga pada composite foreign key. Ketiganya
 * memakai FK `RESTRICT` (bukan `SET NULL`) karena composite FK menyertakan
 * `village_id NOT NULL`; `SET NULL` akan ikut mengosongkan kolom desa.
 */
export async function deleteKeluarga(villageId: number, id: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(residents)
      .set({ familyId: null })
      .where(and(eq(residents.villageId, villageId), eq(residents.familyId, id)));
    await tx
      .update(dtks)
      .set({ keluargaId: null })
      .where(and(eq(dtks.villageId, villageId), eq(dtks.keluargaId, id)));
    await tx
      .update(suplemenTerdata)
      .set({ keluargaId: null })
      .where(and(eq(suplemenTerdata.villageId, villageId), eq(suplemenTerdata.keluargaId, id)));
    await tx.delete(families).where(and(eq(families.villageId, villageId), eq(families.id, id)));
  });
}

// --- Riwayat perubahan anggota ---------------------------------------------

/**
 * Catat perubahan keanggotaan KK.
 *
 * Hanya dipanggil saat ada perubahan nyata (lihat `bedakanPerubahanAnggota`),
 * sehingga riwayat tidak dipenuhi baris kosong. Nama hubungan keluarga disimpan
 * sebagai snapshot agar riwayat tetap terbaca bila katalog berubah.
 */
export async function catatLogAnggotaKk(params: {
  villageId: number;
  residentId: number | null;
  residentName: string;
  perubahan: readonly PerubahanAnggota[];
  actorId: string | null;
}): Promise<void> {
  if (params.perubahan.length === 0) return;

  const relationIds = [
    ...new Set(
      params.perubahan.map((item) => item.relationId).filter((id): id is number => id !== null),
    ),
  ];

  const namaHubungan = new Map<number, string>();
  if (relationIds.length > 0) {
    const baris = await db
      .select({ id: familyRelations.id, name: familyRelations.name })
      .from(familyRelations)
      .where(inArray(familyRelations.id, relationIds));
    for (const baris1 of baris) namaHubungan.set(baris1.id, baris1.name);
  }

  await db.insert(familyMemberLogs).values(
    params.perubahan.map((item) => ({
      villageId: params.villageId,
      familyId: item.familyId,
      residentId: params.residentId,
      residentName: params.residentName,
      aksi: item.aksi,
      relationId: item.relationId,
      relationName: item.relationId === null ? null : (namaHubungan.get(item.relationId) ?? null),
      actorId: params.actorId,
    })),
  );
}

/** Identitas KK beserta label wilayah untuk halaman rincian. */
export async function findKeluargaDetail(
  villageId: number,
  id: number,
): Promise<{ keluarga: KeluargaDTO; regionLabel: string | null } | null> {
  const [row] = await db
    .select({
      family: families,
      dusun: regions.dusun,
      rw: regions.rw,
      rt: regions.rt,
    })
    .from(families)
    .leftJoin(regions, and(eq(families.regionId, regions.id), eq(regions.villageId, villageId)))
    .where(and(eq(families.villageId, villageId), eq(families.id, id)))
    .limit(1);

  if (!row) return null;

  return {
    keluarga: toDto(row.family),
    regionLabel: formatRegionLabel(row.family.regionId, row.dusun, row.rw, row.rt),
  };
}

/**
 * Seluruh anggota sebuah KK (termasuk yang sudah meninggal/pindah).
 *
 * Halaman rincian KK perlu menampilkan status kependudukan anggota, sedangkan
 * cetak KK hanya memuat penduduk hidup.
 */
export async function listKeluargaAnggotaRows(
  villageId: number,
  familyId: number,
): Promise<KeluargaAnggotaRow[]> {
  const rows = await db
    .select({
      id: residents.id,
      name: residents.name,
      nationalId: residents.nationalId,
      gender: residents.gender,
      birthDate: residents.birthDate,
      lifeStatus: residents.lifeStatus,
      relationId: residents.familyRelationId,
      relationName: familyRelations.name,
    })
    .from(residents)
    .innerJoin(
      families,
      and(eq(families.id, residents.familyId), eq(families.villageId, villageId)),
    )
    .leftJoin(familyRelations, eq(residents.familyRelationId, familyRelations.id))
    .where(and(eq(residents.villageId, villageId), eq(residents.familyId, familyId)))
    .orderBy(asc(residents.name), asc(residents.id));

  return rows
    .sort((a, b) => {
      const aHead = a.relationId === HEAD_OF_FAMILY_RELATION_ID ? 0 : 1;
      const bHead = b.relationId === HEAD_OF_FAMILY_RELATION_ID ? 0 : 1;
      return aHead - bHead;
    })
    .map((row) => ({
      id: row.id,
      name: row.name,
      nationalId: row.nationalId,
      gender: row.gender,
      birthDate: row.birthDate,
      lifeStatus: row.lifeStatus,
      relationId: row.relationId,
      relationName: row.relationName ?? null,
    }));
}

/** Riwayat perubahan anggota sebuah KK, terbaru lebih dahulu. */
export async function listLogAnggotaKk(
  villageId: number,
  familyId: number,
  limit = 100,
): Promise<KeluargaAnggotaLog[]> {
  const rows = await db
    .select({
      id: familyMemberLogs.id,
      createdAt: familyMemberLogs.createdAt,
      residentName: familyMemberLogs.residentName,
      aksi: familyMemberLogs.aksi,
      relationName: familyMemberLogs.relationName,
      actorName: users.name,
    })
    .from(familyMemberLogs)
    .innerJoin(
      families,
      and(eq(families.id, familyMemberLogs.familyId), eq(families.villageId, villageId)),
    )
    .leftJoin(
      users,
      and(
        eq(familyMemberLogs.actorId, users.id),
        or(eq(users.villageId, villageId), isNull(users.villageId)),
      ),
    )
    .where(and(eq(familyMemberLogs.villageId, villageId), eq(familyMemberLogs.familyId, familyId)))
    .orderBy(desc(familyMemberLogs.createdAt), desc(familyMemberLogs.id))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    residentName: row.residentName,
    aksi: row.aksi,
    relationName: row.relationName,
    actorName: row.actorName ?? null,
  }));
}
