import "server-only";

import { and, asc, count, desc, eq, inArray, max } from "drizzle-orm";

import { db } from "@/db";
import { survey, surveyJawaban, surveyResponden, surveySoal } from "@/db/schema";
import {
  normalizeTipeSoal,
  parsePilihanSoal,
  parseSkorPilihanSoal,
  type JawabanRow,
  type RespondenRow,
  type SoalRow,
  type SurveyRow,
} from "@/features/survey/domain/survey";

/**
 * Repository survei untuk panel admin.
 *
 * Hanya tabel `survey` yang menyimpan `village_id`; tabel anak di-scope lewat
 * survei induknya. Karena itu setiap operasi pada soal/responden harus
 * didahului pemeriksaan kepemilikan survei di use case.
 */

/**
 * Hitungan soal & responden per survei.
 *
 * Memakai query agregat terpisah, bukan subquery berkorelasi: Drizzle
 * merender kolom di dalam subquery tanpa kualifikasi tabel, sehingga `id` pada
 * `where survey_id = id` menunjuk `survey_soal.id`/`survey_responden.id` dan
 * hitungan selalu 0.
 */
async function hitungAnakSurvei(
  surveyIds: readonly number[],
): Promise<{ soal: Map<number, number>; responden: Map<number, number> }> {
  if (surveyIds.length === 0) return { soal: new Map(), responden: new Map() };

  const ids = [...surveyIds];
  const [soalRows, respondenRows] = await Promise.all([
    db
      .select({ surveyId: surveySoal.surveyId, jumlah: count() })
      .from(surveySoal)
      .where(inArray(surveySoal.surveyId, ids))
      .groupBy(surveySoal.surveyId),
    db
      .select({ surveyId: surveyResponden.surveyId, jumlah: count() })
      .from(surveyResponden)
      .where(inArray(surveyResponden.surveyId, ids))
      .groupBy(surveyResponden.surveyId),
  ]);

  return {
    soal: new Map(soalRows.map((row) => [row.surveyId, Number(row.jumlah ?? 0)])),
    responden: new Map(respondenRows.map((row) => [row.surveyId, Number(row.jumlah ?? 0)])),
  };
}

/** Daftar survei desa (termasuk yang nonaktif) beserta jumlah soal/responden. */
export async function listSurvey(villageId: number): Promise<SurveyRow[]> {
  const rows = await db
    .select({
      id: survey.id,
      judul: survey.judul,
      deskripsi: survey.deskripsi,
      sasaran: survey.sasaran,
      mulai: survey.mulai,
      selesai: survey.selesai,
      aktif: survey.aktif,
      createdAt: survey.createdAt,
    })
    .from(survey)
    .where(eq(survey.villageId, villageId))
    .orderBy(desc(survey.createdAt), desc(survey.id));

  const hitung = await hitungAnakSurvei(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    judul: row.judul,
    deskripsi: row.deskripsi,
    sasaran: row.sasaran,
    mulai: row.mulai,
    selesai: row.selesai,
    aktif: row.aktif === 1,
    jumlahSoal: hitung.soal.get(row.id) ?? 0,
    jumlahResponden: hitung.responden.get(row.id) ?? 0,
    createdAt: row.createdAt,
  }));
}

/** Satu survei milik desa ini, atau `null`. */
export async function getSurvey(villageId: number, id: number): Promise<SurveyRow | null> {
  const [row] = await db
    .select({
      id: survey.id,
      judul: survey.judul,
      deskripsi: survey.deskripsi,
      sasaran: survey.sasaran,
      mulai: survey.mulai,
      selesai: survey.selesai,
      aktif: survey.aktif,
      createdAt: survey.createdAt,
    })
    .from(survey)
    .where(and(eq(survey.villageId, villageId), eq(survey.id, id)))
    .limit(1);

  if (!row) return null;

  const hitung = await hitungAnakSurvei([row.id]);

  return {
    id: row.id,
    judul: row.judul,
    deskripsi: row.deskripsi,
    sasaran: row.sasaran,
    mulai: row.mulai,
    selesai: row.selesai,
    aktif: row.aktif === 1,
    jumlahSoal: hitung.soal.get(row.id) ?? 0,
    jumlahResponden: hitung.responden.get(row.id) ?? 0,
    createdAt: row.createdAt,
  };
}

export interface SurveyValues {
  judul: string;
  deskripsi: string | null;
  sasaran: string | null;
  mulai: string | null;
  selesai: string | null;
  aktif: boolean;
}

export async function insertSurvey(villageId: number, input: SurveyValues): Promise<number> {
  const [row] = await db
    .insert(survey)
    .values({ villageId, ...input, aktif: input.aktif ? 1 : 0 })
    .$returningId();

  if (!row) throw new Error("Gagal menyimpan survei.");
  return row.id;
}

export async function updateSurvey(
  villageId: number,
  id: number,
  input: SurveyValues,
): Promise<boolean> {
  const [result] = await db
    .update(survey)
    .set({ ...input, aktif: input.aktif ? 1 : 0 })
    .where(and(eq(survey.villageId, villageId), eq(survey.id, id)));

  return result.affectedRows > 0;
}

export async function deleteSurvey(villageId: number, id: number): Promise<boolean> {
  const [result] = await db
    .delete(survey)
    .where(and(eq(survey.villageId, villageId), eq(survey.id, id)));

  return result.affectedRows > 0;
}

/** Soal satu survei, terurut menurut urutan lalu id. */
export async function listSoal(surveyId: number): Promise<SoalRow[]> {
  const rows = await db
    .select({
      id: surveySoal.id,
      surveyId: surveySoal.surveyId,
      pertanyaan: surveySoal.pertanyaan,
      tipe: surveySoal.tipe,
      pilihan: surveySoal.pilihan,
      bobot: surveySoal.bobot,
      skorPilihan: surveySoal.skorPilihan,
      indikatorId: surveySoal.indikatorId,
      urutan: surveySoal.urutan,
    })
    .from(surveySoal)
    .where(eq(surveySoal.surveyId, surveyId))
    .orderBy(asc(surveySoal.urutan), asc(surveySoal.id));

  return rows.map((row) => ({
    id: row.id,
    surveyId: row.surveyId,
    pertanyaan: row.pertanyaan,
    tipe: normalizeTipeSoal(row.tipe),
    pilihan: parsePilihanSoal(row.pilihan),
    bobot: row.bobot ?? 1,
    skorPilihan: parseSkorPilihanSoal(row.skorPilihan),
    indikatorId: row.indikatorId ?? null,
    urutan: row.urutan ?? 0,
  }));
}

/** Satu soal milik survei, atau `null`. */
export async function getSoal(surveyId: number, soalId: number): Promise<SoalRow | null> {
  const [row] = await db
    .select({
      id: surveySoal.id,
      surveyId: surveySoal.surveyId,
      pertanyaan: surveySoal.pertanyaan,
      tipe: surveySoal.tipe,
      pilihan: surveySoal.pilihan,
      bobot: surveySoal.bobot,
      skorPilihan: surveySoal.skorPilihan,
      indikatorId: surveySoal.indikatorId,
      urutan: surveySoal.urutan,
    })
    .from(surveySoal)
    .where(and(eq(surveySoal.surveyId, surveyId), eq(surveySoal.id, soalId)))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    surveyId: row.surveyId,
    pertanyaan: row.pertanyaan,
    tipe: normalizeTipeSoal(row.tipe),
    pilihan: parsePilihanSoal(row.pilihan),
    bobot: row.bobot ?? 1,
    skorPilihan: parseSkorPilihanSoal(row.skorPilihan),
    indikatorId: row.indikatorId ?? null,
    urutan: row.urutan ?? 0,
  };
}

interface SoalValues {
  pertanyaan: string;
  tipe: string;
  pilihan: string | null;
  bobot: number;
  skorPilihan: string | null;
  indikatorId: number | null;
  urutan: number;
}

export async function insertSoal(surveyId: number, values: SoalValues): Promise<number> {
  const [row] = await db
    .insert(surveySoal)
    .values({ surveyId, ...values })
    .$returningId();

  if (!row) throw new Error("Gagal menyimpan pertanyaan.");
  return row.id;
}

export async function updateSoal(
  surveyId: number,
  soalId: number,
  values: SoalValues,
): Promise<boolean> {
  const [result] = await db
    .update(surveySoal)
    .set(values)
    .where(and(eq(surveySoal.surveyId, surveyId), eq(surveySoal.id, soalId)));

  return result.affectedRows > 0;
}

/** Hapus soal; jawaban terkait ikut terhapus lewat `ON DELETE CASCADE`. */
export async function deleteSoal(surveyId: number, soalId: number): Promise<boolean> {
  const [result] = await db
    .delete(surveySoal)
    .where(and(eq(surveySoal.surveyId, surveyId), eq(surveySoal.id, soalId)));

  return result.affectedRows > 0;
}

/** Urutan berikutnya untuk soal baru. */
export async function nextUrutanSoal(surveyId: number): Promise<number> {
  const [row] = await db
    .select({ value: max(surveySoal.urutan) })
    .from(surveySoal)
    .where(eq(surveySoal.surveyId, surveyId));

  return Number(row?.value ?? 0) + 1;
}

/** Responden satu survei beserta jumlah jawaban yang tersimpan. */
export async function listResponden(surveyId: number): Promise<RespondenRow[]> {
  const rows = await db
    .select({
      id: surveyResponden.id,
      nama: surveyResponden.nama,
      nik: surveyResponden.nik,
      createdAt: surveyResponden.createdAt,
    })
    .from(surveyResponden)
    .where(eq(surveyResponden.surveyId, surveyId))
    .orderBy(asc(surveyResponden.id));

  const jawabanRows =
    rows.length === 0
      ? []
      : await db
          .select({ respondenId: surveyJawaban.respondenId, jumlah: count() })
          .from(surveyJawaban)
          .innerJoin(surveySoal, eq(surveyJawaban.soalId, surveySoal.id))
          .where(
            and(
              eq(surveySoal.surveyId, surveyId),
              inArray(
                surveyJawaban.respondenId,
                rows.map((row) => row.id),
              ),
            ),
          )
          .groupBy(surveyJawaban.respondenId);
  const jawabanByResponden = new Map(
    jawabanRows.map((row) => [row.respondenId, Number(row.jumlah ?? 0)]),
  );

  return rows.map((row) => ({
    id: row.id,
    nama: row.nama,
    nik: row.nik,
    createdAt: row.createdAt,
    jumlahJawaban: jawabanByResponden.get(row.id) ?? 0,
  }));
}

/** Satu responden milik survei, atau `null`. */
export async function getResponden(surveyId: number, respondenId: number) {
  const [row] = await db
    .select({
      id: surveyResponden.id,
      nama: surveyResponden.nama,
      nik: surveyResponden.nik,
      createdAt: surveyResponden.createdAt,
    })
    .from(surveyResponden)
    .where(and(eq(surveyResponden.surveyId, surveyId), eq(surveyResponden.id, respondenId)))
    .limit(1);

  return row ?? null;
}

/** Simpan responden beserta seluruh jawabannya dalam satu transaksi. */
export async function insertResponden(
  surveyId: number,
  input: { nama: string; nik: string | null },
  jawaban: readonly { soalId: number; jawaban: string }[],
): Promise<number> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(surveyResponden)
      .values({ surveyId, nama: input.nama, nik: input.nik })
      .$returningId();

    if (!row) throw new Error("Gagal menyimpan responden.");

    if (jawaban.length > 0) {
      await tx.insert(surveyJawaban).values(
        jawaban.map((item) => ({
          respondenId: row.id,
          soalId: item.soalId,
          jawaban: item.jawaban,
        })),
      );
    }

    return row.id;
  });
}

/** Hapus responden; jawaban terkait ikut terhapus lewat cascade. */
export async function deleteResponden(surveyId: number, respondenId: number): Promise<boolean> {
  const [result] = await db
    .delete(surveyResponden)
    .where(and(eq(surveyResponden.surveyId, surveyId), eq(surveyResponden.id, respondenId)));

  return result.affectedRows > 0;
}

/** Seluruh jawaban satu survei (untuk rekap). */
export async function listJawaban(surveyId: number): Promise<JawabanRow[]> {
  const rows = await db
    .select({
      respondenId: surveyJawaban.respondenId,
      soalId: surveyJawaban.soalId,
      jawaban: surveyJawaban.jawaban,
    })
    .from(surveyJawaban)
    .innerJoin(surveySoal, eq(surveyJawaban.soalId, surveySoal.id))
    .where(eq(surveySoal.surveyId, surveyId));

  return rows.map((row) => ({
    respondenId: row.respondenId,
    soalId: row.soalId,
    jawaban: row.jawaban ?? "",
  }));
}

/** Jawaban milik satu responden, dikunci per id soal. */
export async function listJawabanResponden(
  surveyId: number,
  respondenId: number,
): Promise<Map<number, string>> {
  const rows = await db
    .select({ soalId: surveyJawaban.soalId, jawaban: surveyJawaban.jawaban })
    .from(surveyJawaban)
    .innerJoin(surveySoal, eq(surveyJawaban.soalId, surveySoal.id))
    .where(and(eq(surveySoal.surveyId, surveyId), eq(surveyJawaban.respondenId, respondenId)));

  return new Map(rows.map((row) => [row.soalId, row.jawaban ?? ""]));
}
