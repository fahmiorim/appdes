import "server-only";

import { and, count, desc, eq, like, max, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  incomingLetters,
  letterNumberArchive,
  letters,
  letterTypes,
  outgoingLetters,
  residents,
} from "@/db/schema";
import { ARSIP_MAKS_EKSPOR, ARSIP_PER_HALAMAN } from "@/features/surat/domain/arsip-nomor";
import type { LetterStatus, SuratDetail, SuratListRow } from "@/features/surat/domain/surat";

export interface ListSuratParams {
  villageId: number;
  search: string;
  status: LetterStatus | null;
  page: number;
  pageSize: number;
}

export interface SuratListResult {
  rows: SuratListRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

const listColumns = {
  id: letters.id,
  typeId: letters.typeId,
  residentId: letters.residentId,
  number: letters.number,
  status: letters.status,
  letterDate: letters.letterDate,
  year: sql<number>`EXTRACT(YEAR FROM ${letters.letterDate})`,
  typeName: letters.typeName,
  typeCode: letterTypes.code,
  residentName: residents.name,
  purpose: letters.purpose,
  nilaiIsian: letters.nilaiIsian,
  createdAt: letters.createdAt,
  issuedAt: letters.issuedAt,
  verifikasiOperator: letters.verifikasiOperator,
  verifikasiSekdes: letters.verifikasiSekdes,
  verifikasiKades: letters.verifikasiKades,
  logVerifikasi: letters.logVerifikasi,
  catatanVerifikasi: letters.catatanVerifikasi,
  tte: letters.tte,
};

function buildWhere(villageId: number, search: string, status: LetterStatus | null): SQL {
  const villageFilter = eq(letters.villageId, villageId);
  const filters: SQL[] = [villageFilter];

  if (search) {
    const term = `%${search}%`;
    const searchFilter = or(
      like(letters.number, term),
      like(letters.typeName, term),
      like(letters.purpose, term),
      like(residents.name, term),
    );
    if (searchFilter) filters.push(searchFilter);
  }

  if (status) filters.push(eq(letters.status, status));

  return and(...filters) ?? villageFilter;
}

export async function listSurat(params: ListSuratParams): Promise<SuratListResult> {
  const { villageId, search, status, pageSize } = params;
  const where = buildWhere(villageId, search, status);

  // Hitung total dulu agar nomor halaman di luar rentang dapat dijepit ke
  // halaman terakhir, bukan menghasilkan daftar kosong yang membingungkan.
  const totalRows = await db
    .select({ value: count() })
    .from(letters)
    .leftJoin(letterTypes, eq(letters.typeId, letterTypes.id))
    .leftJoin(residents, eq(letters.residentId, residents.id))
    .where(where);
  const total = Number(totalRows[0]?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, Math.trunc(params.page)), pageCount);

  const rows = await db
    .select(listColumns)
    .from(letters)
    .leftJoin(letterTypes, eq(letters.typeId, letterTypes.id))
    .leftJoin(residents, eq(letters.residentId, residents.id))
    .where(where)
    .orderBy(desc(letters.createdAt), desc(letters.id))
    .limit(pageSize)
    .offset((currentPage - 1) * pageSize);

  return {
    rows: rows.map((row) => ({ ...row, typeCode: row.typeCode ?? "" })),
    total,
    page: currentPage,
    pageSize,
    pageCount,
  };
}

export interface SuratRecapRow {
  status: LetterStatus;
  total: number;
}

/** Jumlah surat per status pada desa ini (untuk rekapitulasi). */
export async function recapSuratByStatus(villageId: number): Promise<SuratRecapRow[]> {
  const rows = await db
    .select({ status: letters.status, total: count() })
    .from(letters)
    .where(eq(letters.villageId, villageId))
    .groupBy(letters.status);

  return rows;
}

export async function getSurat(villageId: number, id: number): Promise<SuratDetail | null> {
  const [row] = await db
    .select({
      ...listColumns,
      createdBy: letters.createdBy,
      content: letters.content,
      tteFile: letters.tteFile,
      verificationToken: letters.verificationToken,
    })
    .from(letters)
    .leftJoin(letterTypes, eq(letters.typeId, letterTypes.id))
    .leftJoin(residents, eq(letters.residentId, residents.id))
    .where(and(eq(letters.villageId, villageId), eq(letters.id, id)))
    .limit(1);

  if (!row) return null;
  return { ...row, typeCode: row.typeCode ?? "" };
}

export async function createSuratDraft(input: {
  villageId: number;
  typeId: number;
  residentId: number | null;
  letterDate: string;
  year: number;
  purpose: string;
  typeName: string;
  /** JSON nilai isian dinamis. */
  nilaiIsian: string | null;
  createdBy: string;
}): Promise<number> {
  const [inserted] = await db
    .insert(letters)
    .values({
      villageId: input.villageId,
      typeId: input.typeId,
      residentId: input.residentId,
      letterDate: input.letterDate,
      year: input.year,
      purpose: input.purpose,
      typeName: input.typeName,
      nilaiIsian: input.nilaiIsian,
      createdBy: input.createdBy,
      status: "draft",
    })
    .$returningId();

  if (!inserted) throw new Error("Gagal menyimpan konsep surat.");
  return inserted.id;
}

export async function updateSuratDraft(
  villageId: number,
  id: number,
  input: {
    typeId: number;
    residentId: number | null;
    letterDate: string;
    year: number;
    purpose: string;
    typeName: string;
    /** JSON nilai isian dinamis. */
    nilaiIsian: string | null;
  },
): Promise<void> {
  await db
    .update(letters)
    .set({
      typeId: input.typeId,
      residentId: input.residentId,
      letterDate: input.letterDate,
      year: input.year,
      purpose: input.purpose,
      typeName: input.typeName,
      nilaiIsian: input.nilaiIsian,
    })
    .where(and(eq(letters.villageId, villageId), eq(letters.id, id)));
}

export async function deleteSurat(villageId: number, id: number): Promise<void> {
  await db.delete(letters).where(and(eq(letters.villageId, villageId), eq(letters.id, id)));
}

export async function issueSuratRecord(
  villageId: number,
  id: number,
  input: {
    number: string;
    sequence: number;
    year: number;
    typeId: number;
    classificationId: number | null;
    typeName: string;
    content: string;
    issuedAt: Date;
    logVerifikasi?: string | null;
    verificationToken?: string | null;
    verificationTokenHash?: string | null;
  },
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(letters)
      .set({
        number: input.number,
        sequence: input.sequence,
        content: input.content,
        isiSurat: input.content,
        status: "issued",
        issuedAt: input.issuedAt,
        verifikasiKades: true,
        logVerifikasi: input.logVerifikasi ?? "kades",
        verificationToken: input.verificationToken ?? null,
        verificationTokenHash: input.verificationTokenHash ?? null,
      })
      .where(and(eq(letters.villageId, villageId), eq(letters.id, id)));

    await tx.insert(letterNumberArchive).values({
      villageId,
      letterId: id,
      number: input.number,
      sequence: input.sequence,
      year: input.year,
      typeId: input.typeId,
      classificationId: input.classificationId,
      typeName: input.typeName,
      issuedAt: input.issuedAt,
    });
  });
}

/**
 * Tandai surat sudah ter-tanda tangan elektronik (`letters.tte`).
 *
 * Hanya dipanggil dari jalur TTE yang berhasil; surat terbit tanpa TTE
 * membiarkan kolom ini `null` (lihat domain/tte.ts).
 */
export async function setSuratTte(
  villageId: number,
  id: number,
  nilai: boolean,
  berkas: string | null = null,
): Promise<void> {
  await db
    .update(letters)
    .set({ tte: nilai, tteFile: nilai ? berkas : null })
    .where(and(eq(letters.villageId, villageId), eq(letters.id, id)));
}

/**
 * Cari surat berdasarkan hash token verifikasi publik, ter-scope tenant.
 * Dipakai halaman `/desa/verifikasi-surat/[token]`. Token mentah tidak
 * dijadikan kunci pencarian; hash SHA-256 yang disimpan di DB dipakai agar
 * halaman publik tidak pernah menerima PK numerik surat.
 */
export async function findSuratByTokenHash(
  villageId: number,
  tokenHash: string,
): Promise<SuratDetail | null> {
  const [row] = await db
    .select({
      id: letters.id,
      typeId: letters.typeId,
      residentId: letters.residentId,
      number: letters.number,
      status: letters.status,
      letterDate: letters.letterDate,
      typeName: letters.typeName,
      typeCode: letterTypes.code,
      year: sql<number>`EXTRACT(YEAR FROM ${letters.letterDate})`,
      residentName: residents.name,
      purpose: letters.purpose,
      nilaiIsian: letters.nilaiIsian,
      content: letters.content,
      tteFile: letters.tteFile,
      verificationToken: letters.verificationToken,
      createdAt: letters.createdAt,
      issuedAt: letters.issuedAt,
      verifikasiOperator: letters.verifikasiOperator,
      verifikasiSekdes: letters.verifikasiSekdes,
      verifikasiKades: letters.verifikasiKades,
      logVerifikasi: letters.logVerifikasi,
      catatanVerifikasi: letters.catatanVerifikasi,
      tte: letters.tte,
      createdBy: letters.createdBy,
    })
    .from(letters)
    .leftJoin(letterTypes, eq(letters.typeId, letterTypes.id))
    .leftJoin(residents, eq(letters.residentId, residents.id))
    .where(and(eq(letters.villageId, villageId), eq(letters.verificationTokenHash, tokenHash)))
    .limit(1);

  if (!row) return null;
  return { ...row, typeCode: row.typeCode ?? "" };
}

async function nextSequenceFromLetterArchive(
  letterFilter: SQL,
  archiveFilter: SQL,
): Promise<number> {
  const [[letterRow], [archiveRow]] = await Promise.all([
    db
      .select({ value: max(letters.sequence) })
      .from(letters)
      .where(letterFilter),
    db
      .select({ value: max(letterNumberArchive.sequence) })
      .from(letterNumberArchive)
      .where(archiveFilter),
  ]);

  return Math.max(Number(letterRow?.value ?? 0), Number(archiveRow?.value ?? 0)) + 1;
}

// Mode 2: per jenis surat
export async function nextSuratSequence(
  villageId: number,
  typeId: number,
  year: number,
): Promise<number> {
  return nextSequenceFromLetterArchive(
    and(eq(letters.villageId, villageId), eq(letters.typeId, typeId), eq(letters.year, year))!,
    and(
      eq(letterNumberArchive.villageId, villageId),
      eq(letterNumberArchive.typeId, typeId),
      eq(letterNumberArchive.year, year),
    )!,
  );
}

// Mode 1: seluruh surat layanan per tahun
export async function nextSuratSequenceGlobal(villageId: number, year: number): Promise<number> {
  return nextSequenceFromLetterArchive(
    and(eq(letters.villageId, villageId), eq(letters.year, year))!,
    and(eq(letterNumberArchive.villageId, villageId), eq(letterNumberArchive.year, year))!,
  );
}

// Mode 4: per klasifikasi surat
export async function nextSuratSequenceByKlasifikasi(
  villageId: number,
  classificationId: number,
  year: number,
): Promise<number> {
  const [letterRow] = await db
    .select({ value: max(letters.sequence) })
    .from(letters)
    .leftJoin(letterTypes, eq(letters.typeId, letterTypes.id))
    .where(
      and(
        eq(letters.villageId, villageId),
        eq(letterTypes.classificationId, classificationId),
        eq(letters.year, year),
      ),
    );

  const [archiveRow] = await db
    .select({ value: max(letterNumberArchive.sequence) })
    .from(letterNumberArchive)
    .where(
      and(
        eq(letterNumberArchive.villageId, villageId),
        eq(letterNumberArchive.classificationId, classificationId),
        eq(letterNumberArchive.year, year),
      ),
    );

  return Math.max(Number(letterRow?.value ?? 0), Number(archiveRow?.value ?? 0)) + 1;
}

// Mode 3: gabungan nomor surat dan nomor agenda
export async function nextSuratSequenceCombined(villageId: number, year: number): Promise<number> {
  const [rowLetters, rowArchive, rowIncoming, rowOutgoing] = await Promise.all([
    db
      .select({ value: max(letters.sequence) })
      .from(letters)
      .where(and(eq(letters.villageId, villageId), eq(letters.year, year))),
    db
      .select({ value: max(letterNumberArchive.sequence) })
      .from(letterNumberArchive)
      .where(and(eq(letterNumberArchive.villageId, villageId), eq(letterNumberArchive.year, year))),
    db
      .select({ value: max(incomingLetters.agendaNumber) })
      .from(incomingLetters)
      .where(eq(incomingLetters.villageId, villageId)),
    db
      .select({ value: max(outgoingLetters.agendaNumber) })
      .from(outgoingLetters)
      .where(eq(outgoingLetters.villageId, villageId)),
  ]);

  return (
    Math.max(
      Number(rowLetters[0]?.value ?? 0),
      Number(rowArchive[0]?.value ?? 0),
      Number(rowIncoming[0]?.value ?? 0),
      Number(rowOutgoing[0]?.value ?? 0),
    ) + 1
  );
}

export async function suratNumberExists(villageId: number, number: string): Promise<boolean> {
  const [letterRow, archiveRow] = await Promise.all([
    db
      .select({ id: letters.id })
      .from(letters)
      .where(and(eq(letters.villageId, villageId), eq(letters.number, number)))
      .limit(1),
    db
      .select({ id: letterNumberArchive.id })
      .from(letterNumberArchive)
      .where(
        and(eq(letterNumberArchive.villageId, villageId), eq(letterNumberArchive.number, number)),
      )
      .limit(1),
  ]);

  return Boolean(letterRow[0] || archiveRow[0]);
}

// Deteksi duplikat lintas agenda (mode 3).
export async function suratNumberExistsWithAgenda(
  villageId: number,
  number: string,
): Promise<boolean> {
  if (await suratNumberExists(villageId, number)) return true;

  const [rowIncoming] = await db
    .select({ id: incomingLetters.id })
    .from(incomingLetters)
    .where(and(eq(incomingLetters.villageId, villageId), eq(incomingLetters.letterNumber, number)))
    .limit(1);
  if (rowIncoming) return true;

  const [rowOutgoing] = await db
    .select({ id: outgoingLetters.id })
    .from(outgoingLetters)
    .where(and(eq(outgoingLetters.villageId, villageId), eq(outgoingLetters.letterNumber, number)))
    .limit(1);
  return Boolean(rowOutgoing);
}

/**
 * Cari surat terbit berdasarkan nomor (API eksternal).
 *
 * Hanya metadata yang aman dibagikan; data pribadi pemohon tidak ikut.
 */
export async function findSuratByNumber(
  villageId: number,
  number: string,
): Promise<{
  id: number;
  number: string;
  typeName: string;
  status: LetterStatus;
  letterDate: string;
  issuedAt: Date | null;
  tte: boolean | null;
} | null> {
  const [row] = await db
    .select({
      id: letters.id,
      number: letters.number,
      typeName: letters.typeName,
      status: letters.status,
      letterDate: letters.letterDate,
      issuedAt: letters.issuedAt,
      tte: letters.tte,
    })
    .from(letters)
    .where(and(eq(letters.villageId, villageId), eq(letters.number, number)))
    .limit(1);

  if (!row || !row.number) return null;
  return { ...row, number: row.number };
}

export interface ListLetterNumberArchiveParams {
  q?: string;
  year?: number;
  typeId?: number;
  classificationId?: number;
  page?: number;
  pageSize?: number;
}

/** Daftar nomor terbit yang tetap dipertahankan meski surat sumber dihapus. */
export async function listLetterNumberArchive(
  villageId: number,
  params: ListLetterNumberArchiveParams = {},
) {
  const filters: SQL[] = [eq(letterNumberArchive.villageId, villageId)];
  const query = params.q?.trim();
  if (query) {
    const search = or(
      like(letterNumberArchive.number, `%${query}%`),
      like(letterNumberArchive.typeName, `%${query}%`),
    );
    if (search) filters.push(search);
  }
  if (params.year !== undefined) {
    filters.push(eq(letterNumberArchive.year, params.year));
  }
  if (params.typeId !== undefined) {
    filters.push(eq(letterNumberArchive.typeId, params.typeId));
  }
  if (params.classificationId !== undefined) {
    filters.push(eq(letterNumberArchive.classificationId, params.classificationId));
  }

  const pageSize = Math.min(Math.max(params.pageSize ?? ARSIP_PER_HALAMAN, 1), ARSIP_MAKS_EKSPOR);
  const page = Math.max(params.page ?? 1, 1);
  const where = and(...filters) ?? eq(letterNumberArchive.villageId, -1);
  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(letterNumberArchive)
      .where(where)
      .orderBy(desc(letterNumberArchive.issuedAt), desc(letterNumberArchive.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(letterNumberArchive).where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize };
}

// Verifikasi berjenjang
export async function updateSuratVerification(
  villageId: number,
  id: number,
  input: {
    verifikasiOperator?: boolean | null;
    verifikasiSekdes?: boolean | null;
    verifikasiKades?: boolean | null;
    logVerifikasi?: string | null;
    catatanVerifikasi?: string | null;
    tte?: boolean | null;
    status?: LetterStatus;
  },
): Promise<void> {
  await db
    .update(letters)
    .set(input)
    .where(and(eq(letters.villageId, villageId), eq(letters.id, id)));
}

export async function rejectSurat(villageId: number, id: number, reason: string): Promise<void> {
  await db
    .update(letters)
    .set({
      verifikasiOperator: null,
      verifikasiSekdes: null,
      verifikasiKades: null,
      logVerifikasi: "ditolak",
      catatanVerifikasi: reason,
      status: "draft",
    })
    .where(and(eq(letters.villageId, villageId), eq(letters.id, id)));
}
