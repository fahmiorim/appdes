import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  letterRequirements,
  letters,
  letterTypes,
  permohonanSurat,
  residents,
  users,
} from "@/db/schema";
import {
  canTransitionPermohonan,
  statusPermohonan,
  type JenisSuratWarga,
  type PermohonanStatus,
  type SyaratSuratWarga,
} from "@/features/layanan-mandiri/domain/layanan-mandiri";
import { parseSyaratIds } from "@/features/surat/domain/isian";
import { conflict, notFound } from "@/lib/errors";

export async function listSuratMandiri(villageId: number) {
  return db
    .select()
    .from(letterTypes)
    .where(and(eq(letterTypes.villageId, villageId), eq(letterTypes.isActive, true)))
    .orderBy(asc(letterTypes.sortOrder));
}

/**
 * Jenis surat aktif + syarat nyata (bukan `[]`).
 *
 * `letter_types.syarat_surat` berisi id syarat; namanya harus diambil dari
 * `letter_requirements` pada desa yang sama agar warga melihat persyaratan
 * yang benar dan operator dapat memeriksa unggahannya.
 */
export async function listSuratUntukWarga(villageId: number): Promise<JenisSuratWarga[]> {
  const rows = await db
    .select({
      id: letterTypes.id,
      kode: letterTypes.code,
      nama: letterTypes.name,
      formIsian: letterTypes.formIsian,
      syaratSurat: letterTypes.syaratSurat,
    })
    .from(letterTypes)
    .where(and(eq(letterTypes.villageId, villageId), eq(letterTypes.isActive, true)))
    .orderBy(asc(letterTypes.sortOrder), asc(letterTypes.name));

  const syaratIds = [...new Set(rows.flatMap((row) => parseSyaratIds(row.syaratSurat)))];
  const requirementRows =
    syaratIds.length === 0
      ? []
      : await db
          .select({
            id: letterRequirements.id,
            nama: letterRequirements.name,
            keterangan: letterRequirements.description,
          })
          .from(letterRequirements)
          .where(
            and(
              eq(letterRequirements.villageId, villageId),
              eq(letterRequirements.isActive, true),
              inArray(letterRequirements.id, syaratIds),
            ),
          );

  const requirementMap = new Map<number, SyaratSuratWarga>(
    requirementRows.map((row) => [
      row.id,
      { id: row.id, nama: row.nama, keterangan: row.keterangan },
    ]),
  );

  return rows.map((row) => ({
    id: row.id,
    kode: row.kode,
    nama: row.nama,
    formIsian: row.formIsian,
    syarat: parseSyaratIds(row.syaratSurat)
      .map((id) => requirementMap.get(id))
      .filter((item): item is SyaratSuratWarga => item !== undefined),
  }));
}

/** Satu jenis surat aktif untuk halaman form warga. */
export async function getSuratUntukWarga(
  villageId: number,
  letterTypeId: number,
): Promise<JenisSuratWarga | null> {
  const semua = await listSuratUntukWarga(villageId);
  return semua.find((item) => item.id === letterTypeId) ?? null;
}

/** Permohonan milik seorang warga; selalu disaring `residentId` sesi. */
export async function listPermohonanWarga(villageId: number, residentId: number) {
  return db
    .select({
      id: permohonanSurat.id,
      letterTypeId: permohonanSurat.letterTypeId,
      letterId: permohonanSurat.letterId,
      status: permohonanSurat.status,
      alasan: permohonanSurat.alasan,
      keterangan: permohonanSurat.keterangan,
      noAntrian: permohonanSurat.noAntrian,
      syarat: permohonanSurat.syarat,
      createdAt: permohonanSurat.createdAt,
      namaSurat: letterTypes.name,
      letterNumber: letters.number,
      verificationToken: letters.verificationToken,
    })
    .from(permohonanSurat)
    .leftJoin(
      letterTypes,
      and(eq(permohonanSurat.letterTypeId, letterTypes.id), eq(letterTypes.villageId, villageId)),
    )
    .leftJoin(
      letters,
      and(eq(permohonanSurat.letterId, letters.id), eq(letters.villageId, villageId)),
    )
    .where(
      and(eq(permohonanSurat.villageId, villageId), eq(permohonanSurat.residentId, residentId)),
    )
    .orderBy(desc(permohonanSurat.createdAt));
}

/** Penduduk berdasarkan ID dan tenant; dipakai untuk validasi identitas kiosk/session. */
export async function findPendudukById(villageId: number, residentId: number) {
  const [row] = await db
    .select({ id: residents.id })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.id, residentId)))
    .limit(1);
  return row ?? null;
}

/** Penduduk desa berdasarkan NIK. */
export async function findPendudukByNik(villageId: number, nik: string) {
  const [row] = await db
    .select({ id: residents.id, nama: residents.name })
    .from(residents)
    .where(and(eq(residents.villageId, villageId), eq(residents.nationalId, nik)))
    .limit(1);
  return row ?? null;
}

/** Satu permohonan milik warga (untuk unduh berkas syarat). */
export async function getPermohonanWarga(villageId: number, residentId: number, id: number) {
  const [row] = await db
    .select()
    .from(permohonanSurat)
    .where(
      and(
        eq(permohonanSurat.villageId, villageId),
        eq(permohonanSurat.residentId, residentId),
        eq(permohonanSurat.id, id),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Satu permohonan pada desa (untuk operator). */
export async function getPermohonan(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(permohonanSurat)
    .where(and(eq(permohonanSurat.villageId, villageId), eq(permohonanSurat.id, id)))
    .limit(1);
  return row ?? null;
}

/** Email akun warga yang tertaut ke penduduk (untuk notifikasi status). */
export async function findWargaEmailByResident(
  villageId: number,
  residentId: number,
): Promise<string | null> {
  const [row] = await db
    .select({ email: users.email })
    .from(users)
    .where(
      and(eq(users.villageId, villageId), eq(users.residentId, residentId), eq(users.active, true)),
    )
    .limit(1);

  return row?.email ?? null;
}

/** Permohonan yang tertaut ke surat dinas tertentu. */
export async function findPermohonanByLetterId(villageId: number, letterId: number) {
  const [row] = await db
    .select({
      id: permohonanSurat.id,
      residentId: permohonanSurat.residentId,
      noAntrian: permohonanSurat.noAntrian,
      status: permohonanSurat.status,
    })
    .from(permohonanSurat)
    .where(and(eq(permohonanSurat.villageId, villageId), eq(permohonanSurat.letterId, letterId)))
    .limit(1);

  return row ?? null;
}

export async function listPermohonan(villageId: number) {
  return db
    .select({
      id: permohonanSurat.id,
      idPemohon: permohonanSurat.residentId,
      idSurat: permohonanSurat.letterTypeId,
      letterId: permohonanSurat.letterId,
      status: permohonanSurat.status,
      alasan: permohonanSurat.alasan,
      keterangan: permohonanSurat.keterangan,
      noAntrian: permohonanSurat.noAntrian,
      syarat: permohonanSurat.syarat,
      isianForm: permohonanSurat.isianForm,
      noHpAktif: permohonanSurat.noHpAktif,
      createdAt: permohonanSurat.createdAt,
      namaSurat: letterTypes.name,
      formIsian: letterTypes.formIsian,
      namaPemohon: residents.name,
      nikPemohon: residents.nationalId,
      letterNumber: letters.number,
    })
    .from(permohonanSurat)
    .leftJoin(
      letterTypes,
      and(eq(permohonanSurat.letterTypeId, letterTypes.id), eq(letterTypes.villageId, villageId)),
    )
    .leftJoin(
      residents,
      and(eq(permohonanSurat.residentId, residents.id), eq(residents.villageId, villageId)),
    )
    .leftJoin(letters, and(eq(permohonanSurat.letterId, letters.id), eq(letters.villageId, villageId)))
    .where(eq(permohonanSurat.villageId, villageId))
    .orderBy(desc(permohonanSurat.createdAt));
}

export async function buatPermohonan(data: {
  villageId: number;
  residentId: number;
  letterTypeId: number;
  isianForm?: string;
  noHpAktif?: string;
  keterangan?: string;
  syarat?: string;
  noAntrian?: string;
}) {
  // Pertahanan terakhir di boundary persistence: kedua foreign reference
  // harus benar-benar dimiliki tenant yang sama sebelum row dibuat.
  return db.transaction(async (tx) => {
    const [resident] = await tx
      .select({ id: residents.id })
      .from(residents)
      .where(and(eq(residents.id, data.residentId), eq(residents.villageId, data.villageId)))
      .limit(1);
    if (!resident) throw notFound("Penduduk tidak ditemukan pada desa ini.");

    const [letterType] = await tx
      .select({ id: letterTypes.id })
      .from(letterTypes)
      .where(
        and(
          eq(letterTypes.id, data.letterTypeId),
          eq(letterTypes.villageId, data.villageId),
          eq(letterTypes.isActive, true),
        ),
      )
      .limit(1);
    if (!letterType) throw notFound("Jenis surat tidak ditemukan atau sedang tidak aktif.");

    const [row] = await tx
      .insert(permohonanSurat)
      .values({
        villageId: data.villageId,
        residentId: data.residentId,
        letterTypeId: data.letterTypeId,
        isianForm: data.isianForm || null,
        noHpAktif: data.noHpAktif || null,
        keterangan: data.keterangan || null,
        syarat: data.syarat || null,
        status: 1,
        noAntrian: data.noAntrian || `AN-${Date.now()}`,
      })
      .$returningId();
    return row?.id;
  });
}

function validStatus(status: number): PermohonanStatus {
  const value = statusPermohonan(status);
  if (!value) throw conflict("Status permohonan tidak valid.");
  return value;
}

export async function prosesPermohonan(
  villageId: number,
  id: number,
  status: number,
  alasan?: string,
) {
  const nextStatus = Number(validStatus(status));

  const [current] = await db
    .select({ status: permohonanSurat.status })
    .from(permohonanSurat)
    .where(and(eq(permohonanSurat.villageId, villageId), eq(permohonanSurat.id, id)))
    .limit(1);

  if (!current) throw conflict("Permohonan tidak ditemukan.");

  const dari = statusPermohonan(current.status);
  const ke = statusPermohonan(nextStatus);
  if (!dari || !ke || !canTransitionPermohonan(dari, ke)) {
    throw conflict("Perubahan status permohonan tidak sesuai alur.");
  }

  const [result] = await db
    .update(permohonanSurat)
    .set({ status: nextStatus, alasan: alasan || null })
    .where(and(eq(permohonanSurat.villageId, villageId), eq(permohonanSurat.id, id)));

  if (result.affectedRows === 0) throw conflict("Permohonan tidak ditemukan.");
}

export async function kembalikanPermohonan(villageId: number, id: number, alasan: string) {
  const [result] = await db
    .update(permohonanSurat)
    .set({ status: 0, alasan })
    .where(
      and(
        eq(permohonanSurat.villageId, villageId),
        eq(permohonanSurat.id, id),
        inArray(permohonanSurat.status, [1, 2]),
      ),
    );

  if (result.affectedRows === 0) {
    throw conflict("Permohonan tidak ditemukan atau tidak dapat dikembalikan pada tahap ini.");
  }
}

/** Hubungkan permohonan ke surat dinas yang dibuat operator. */
export async function tautkanSuratPermohonan(
  villageId: number,
  id: number,
  letterId: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    const [letter] = await tx
      .select({ id: letters.id })
      .from(letters)
      .where(and(eq(letters.id, letterId), eq(letters.villageId, villageId)))
      .limit(1);
    if (!letter) throw notFound("Surat dinas tidak ditemukan pada desa ini.");

    const [result] = await tx
      .update(permohonanSurat)
      .set({ letterId, status: 2 })
      .where(
        and(
          eq(permohonanSurat.villageId, villageId),
          eq(permohonanSurat.id, id),
          eq(permohonanSurat.status, 1),
        ),
      );

    if (result.affectedRows === 0) {
      throw conflict("Permohonan tidak ditemukan atau sudah diproses.");
    }
  });
}

/** Batalkan permohonan oleh pemilik (warga). Hanya diperbolehkan sebelum diambil. */
export async function batalkanPermohonanWarga(
  villageId: number,
  residentId: number,
  id: number,
  alasan: string,
) {
  const [result] = await db
    .update(permohonanSurat)
    .set({ status: 5, alasan })
    .where(
      and(
        eq(permohonanSurat.villageId, villageId),
        eq(permohonanSurat.residentId, residentId),
        eq(permohonanSurat.id, id),
        inArray(permohonanSurat.status, [0, 1, 2, 3]),
      ),
    );

  if (result.affectedRows === 0) {
    throw conflict("Permohonan tidak ditemukan atau tidak dapat dibatalkan pada tahap ini.");
  }
}

/**
 * Sinkronkan status permohonan saat surat terhubung diterbitkan/ditolak.
 *
 * Dipanggil dari alur persuratan agar warga melihat status yang konsisten.
 */
export async function sinkronStatusSuratPermohonan(
  villageId: number,
  letterId: number,
  status: 3 | 5,
  alasan?: string,
): Promise<void> {
  const statusYangBoleh = status === 3 ? ([1, 2] as const) : ([1, 2, 3] as const);

  await db
    .update(permohonanSurat)
    .set({ status, alasan: alasan ?? null })
    .where(
      and(
        eq(permohonanSurat.villageId, villageId),
        eq(permohonanSurat.letterId, letterId),
        inArray(permohonanSurat.status, [...statusYangBoleh]),
      ),
    );
}
