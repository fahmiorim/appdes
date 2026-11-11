import "server-only";

import { and, asc, count, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { letterClassifications, letterRequirements, letters, letterTypes } from "@/db/schema";
import { parseSyaratIds, type SyaratSuratDTO } from "@/features/surat/domain/isian";
import type { BarisKlasifikasiImpor } from "@/features/surat/domain/klasifikasi-berkas";
import type {
  JenisSuratDTO,
  JenisSuratInput,
  KlasifikasiSuratDTO,
  KlasifikasiSuratInput,
} from "@/features/surat/domain/surat";

// --- Klasifikasi -----------------------------------------------------------

const klasifikasiColumns = {
  id: letterClassifications.id,
  code: letterClassifications.code,
  name: letterClassifications.name,
};

export async function listKlasifikasi(villageId: number): Promise<KlasifikasiSuratDTO[]> {
  return db
    .select(klasifikasiColumns)
    .from(letterClassifications)
    .where(eq(letterClassifications.villageId, villageId))
    .orderBy(asc(letterClassifications.code), asc(letterClassifications.name));
}

export async function getKlasifikasi(
  villageId: number,
  id: number,
): Promise<KlasifikasiSuratDTO | null> {
  const [row] = await db
    .select(klasifikasiColumns)
    .from(letterClassifications)
    .where(and(eq(letterClassifications.villageId, villageId), eq(letterClassifications.id, id)))
    .limit(1);

  return row ?? null;
}

export async function klasifikasiExists(
  villageId: number,
  code: string,
  excludeId: number | null,
): Promise<boolean> {
  const filters = [
    eq(letterClassifications.villageId, villageId),
    eq(letterClassifications.code, code),
  ];
  if (excludeId !== null) filters.push(ne(letterClassifications.id, excludeId));

  const rows = await db
    .select({ id: letterClassifications.id })
    .from(letterClassifications)
    .where(and(...filters))
    .limit(1);

  return rows.length > 0;
}

export async function createKlasifikasi(
  villageId: number,
  input: KlasifikasiSuratInput,
): Promise<number> {
  const [inserted] = await db
    .insert(letterClassifications)
    .values({ villageId, code: input.code, name: input.name })
    .$returningId();

  if (!inserted) throw new Error("Gagal menyimpan klasifikasi surat.");
  return inserted.id;
}

export async function updateKlasifikasi(
  villageId: number,
  id: number,
  input: KlasifikasiSuratInput,
): Promise<void> {
  await db
    .update(letterClassifications)
    .set({ code: input.code, name: input.name })
    .where(and(eq(letterClassifications.villageId, villageId), eq(letterClassifications.id, id)));
}

/**
 * Impor klasifikasi lama: perbarui kode yang sudah ada, tambahkan yang baru.
 *
 * Dijalankan dalam satu transaksi agar kegagalan di tengah berkas tidak
 * meninggalkan data setengah jadi.
 */
export async function importKlasifikasi(
  villageId: number,
  rows: readonly BarisKlasifikasiImpor[],
): Promise<{ ditambahkan: number; diperbarui: number }> {
  let ditambahkan = 0;
  let diperbarui = 0;

  await db.transaction(async (tx) => {
    for (const row of rows) {
      const [existing] = await tx
        .select({ id: letterClassifications.id })
        .from(letterClassifications)
        .where(
          and(
            eq(letterClassifications.villageId, villageId),
            eq(letterClassifications.code, row.kode),
          ),
        )
        .limit(1);

      if (existing) {
        await tx
          .update(letterClassifications)
          .set({ name: row.nama, description: row.keterangan })
          .where(eq(letterClassifications.id, existing.id));
        diperbarui += 1;
      } else {
        await tx.insert(letterClassifications).values({
          villageId,
          code: row.kode,
          name: row.nama,
          description: row.keterangan,
        });
        ditambahkan += 1;
      }
    }
  });

  return { ditambahkan, diperbarui };
}

export async function deleteKlasifikasi(villageId: number, id: number): Promise<void> {
  await db
    .delete(letterClassifications)
    .where(and(eq(letterClassifications.villageId, villageId), eq(letterClassifications.id, id)));
}

/** Berapa jenis surat yang memakai klasifikasi ini (menghalangi penghapusan). */
export async function countJenisByKlasifikasi(villageId: number, classificationId: number) {
  const [row] = await db
    .select({ value: count() })
    .from(letterTypes)
    .where(
      and(eq(letterTypes.villageId, villageId), eq(letterTypes.classificationId, classificationId)),
    );

  return row?.value ?? 0;
}

// --- Jenis surat -----------------------------------------------------------

const jenisColumns = {
  id: letterTypes.id,
  code: letterTypes.code,
  name: letterTypes.name,
  classificationId: letterTypes.classificationId,
  classificationName: letterClassifications.name,
  templateBody: letterTypes.templateBody,
  templateBodyAlt: letterTypes.templateBodyAlt,
  formIsian: letterTypes.formIsian,
  syaratSurat: letterTypes.syaratSurat,
  requiresResident: letterTypes.requiresResident,
  isActive: letterTypes.isActive,
  numberFormat: letterTypes.numberFormat,
  validityMonths: letterTypes.validityMonths,
  sortOrder: letterTypes.sortOrder,
  templateVariant: letterTypes.templateVariant,
  layoutConfig: letterTypes.layoutConfig,
};

export async function listJenisSurat(villageId: number): Promise<JenisSuratDTO[]> {
  return db
    .select(jenisColumns)
    .from(letterTypes)
    .leftJoin(letterClassifications, eq(letterTypes.classificationId, letterClassifications.id))
    .where(eq(letterTypes.villageId, villageId))
    .orderBy(asc(letterTypes.sortOrder), asc(letterTypes.name));
}

/**
 * Jenis surat aktif dengan kolom aman untuk situs publik.
 *
 * Template isi dan konfigurasi internal tidak diambil agar halaman publik tidak
 * pernah menerima data yang bukan untuk ditampilkan.
 */
export async function listJenisSuratAktifPublik(villageId: number) {
  return db
    .select({
      id: letterTypes.id,
      code: letterTypes.code,
      name: letterTypes.name,
      classificationName: letterClassifications.name,
      requiresResident: letterTypes.requiresResident,
      validityMonths: letterTypes.validityMonths,
    })
    .from(letterTypes)
    .leftJoin(letterClassifications, eq(letterTypes.classificationId, letterClassifications.id))
    .where(and(eq(letterTypes.villageId, villageId), eq(letterTypes.isActive, true)))
    .orderBy(asc(letterTypes.sortOrder), asc(letterTypes.name));
}

export async function getJenisSurat(villageId: number, id: number): Promise<JenisSuratDTO | null> {
  const [row] = await db
    .select(jenisColumns)
    .from(letterTypes)
    .leftJoin(letterClassifications, eq(letterTypes.classificationId, letterClassifications.id))
    .where(and(eq(letterTypes.villageId, villageId), eq(letterTypes.id, id)))
    .limit(1);

  return row ?? null;
}

export async function jenisSuratExists(
  villageId: number,
  code: string,
  excludeId: number | null,
): Promise<boolean> {
  const filters = [eq(letterTypes.villageId, villageId), eq(letterTypes.code, code)];
  if (excludeId !== null) filters.push(ne(letterTypes.id, excludeId));

  const rows = await db
    .select({ id: letterTypes.id })
    .from(letterTypes)
    .where(and(...filters))
    .limit(1);

  return rows.length > 0;
}

export async function createJenisSurat(villageId: number, input: JenisSuratInput): Promise<number> {
  const [inserted] = await db
    .insert(letterTypes)
    .values({
      villageId,
      classificationId: input.classificationId,
      code: input.code,
      name: input.name,
      templateBody: input.templateBody,
      templateBodyAlt: input.templateBodyAlt ?? "",
      formIsian: input.formIsian,
      syaratSurat: input.syaratSurat,
      requiresResident: input.requiresResident,
      isActive: input.isActive,
      numberFormat: input.numberFormat,
      validityMonths: input.validityMonths,
      sortOrder: input.sortOrder,
      templateVariant: input.templateVariant ?? "default",
      layoutConfig: input.layoutConfig ?? "{}",
    })
    .$returningId();

  if (!inserted) throw new Error("Gagal menyimpan jenis surat.");
  return inserted.id;
}

export async function updateJenisSurat(
  villageId: number,
  id: number,
  input: JenisSuratInput,
): Promise<void> {
  await db
    .update(letterTypes)
    .set({
      classificationId: input.classificationId,
      code: input.code,
      name: input.name,
      templateBody: input.templateBody,
      templateBodyAlt: input.templateBodyAlt ?? "",
      formIsian: input.formIsian,
      syaratSurat: input.syaratSurat,
      requiresResident: input.requiresResident,
      isActive: input.isActive,
      numberFormat: input.numberFormat,
      validityMonths: input.validityMonths,
      sortOrder: input.sortOrder,
      templateVariant: input.templateVariant ?? "default",
      layoutConfig: input.layoutConfig ?? "{}",
    })
    .where(and(eq(letterTypes.villageId, villageId), eq(letterTypes.id, id)));
}

export async function deleteJenisSurat(villageId: number, id: number): Promise<void> {
  await db
    .delete(letterTypes)
    .where(and(eq(letterTypes.villageId, villageId), eq(letterTypes.id, id)));
}

/** Berapa surat yang sudah memakai jenis ini (menghalangi penghapusan). */
export async function countSuratByJenis(villageId: number, typeId: number): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(letters)
    .where(and(eq(letters.villageId, villageId), eq(letters.typeId, typeId)));

  return row?.value ?? 0;
}

// --- Syarat surat ---------------------------------------------------------

const syaratColumns = {
  id: letterRequirements.id,
  name: letterRequirements.name,
  description: letterRequirements.description,
  sortOrder: letterRequirements.sortOrder,
  isActive: letterRequirements.isActive,
};

export async function listSyaratSurat(villageId: number): Promise<SyaratSuratDTO[]> {
  return db
    .select(syaratColumns)
    .from(letterRequirements)
    .where(eq(letterRequirements.villageId, villageId))
    .orderBy(asc(letterRequirements.sortOrder), asc(letterRequirements.name));
}

export async function getSyaratSurat(
  villageId: number,
  id: number,
): Promise<SyaratSuratDTO | null> {
  const [row] = await db
    .select(syaratColumns)
    .from(letterRequirements)
    .where(and(eq(letterRequirements.villageId, villageId), eq(letterRequirements.id, id)))
    .limit(1);

  return row ?? null;
}

export async function syaratSuratNameExists(
  villageId: number,
  name: string,
  excludeId: number | null,
): Promise<boolean> {
  const filters = [eq(letterRequirements.villageId, villageId), eq(letterRequirements.name, name)];
  if (excludeId !== null) filters.push(ne(letterRequirements.id, excludeId));

  const rows = await db
    .select({ id: letterRequirements.id })
    .from(letterRequirements)
    .where(and(...filters))
    .limit(1);

  return rows.length > 0;
}

export async function createSyaratSurat(
  villageId: number,
  input: { name: string; description: string | null; sortOrder: number; isActive: boolean },
): Promise<number> {
  const [inserted] = await db
    .insert(letterRequirements)
    .values({ villageId, ...input })
    .$returningId();

  if (!inserted) throw new Error("Gagal menyimpan syarat surat.");
  return inserted.id;
}

export async function updateSyaratSurat(
  villageId: number,
  id: number,
  input: { name: string; description: string | null; sortOrder: number; isActive: boolean },
): Promise<void> {
  await db
    .update(letterRequirements)
    .set(input)
    .where(and(eq(letterRequirements.villageId, villageId), eq(letterRequirements.id, id)));
}

export async function deleteSyaratSurat(villageId: number, id: number): Promise<void> {
  await db
    .delete(letterRequirements)
    .where(and(eq(letterRequirements.villageId, villageId), eq(letterRequirements.id, id)));
}

/**
 * Berapa jenis surat yang memakai syarat ini.
 *
 * Daftar syarat disimpan sebagai JSON pada `letter_types.syarat_surat`, jadi
 * pencocokan dilakukan di aplikasi (bukan query).
 */
export async function countJenisBySyarat(villageId: number, syaratId: number): Promise<number> {
  const rows = await db
    .select({ syaratSurat: letterTypes.syaratSurat })
    .from(letterTypes)
    .where(eq(letterTypes.villageId, villageId));

  return rows.filter((row) => parseSyaratIds(row.syaratSurat).includes(syaratId)).length;
}
