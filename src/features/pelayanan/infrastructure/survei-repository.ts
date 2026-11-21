import "server-only";

import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { survey, surveyJawaban, surveyResponden, surveySoal } from "@/db/schema";

/**
 * Repository survei & IKM untuk modul pelayanan publik.
 *
 * Seluruh query dibatasi `village_id` tenant sesi. Use case memakai baris
 * mentah di sini karena halaman admin/warga masih menampilkan JSON `pilihan`
 * dan `skor_pilihan` apa adanya; modul analisis punya repository sendiri yang
 * mengembalikan bentuk ter-parse.
 */

/** Daftar survei desa beserta jumlah soal dan responden. */
export async function listSurveiPelayanan(villageId: number) {
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
    .orderBy(desc(survey.createdAt));
  const ids = rows.map((row) => row.id);
  const [questions, respondents] = ids.length
    ? await Promise.all([
        db
          .select({ surveyId: surveySoal.surveyId, total: count() })
          .from(surveySoal)
          .where(eq(surveySoal.villageId, villageId))
          .groupBy(surveySoal.surveyId),
        db
          .select({ surveyId: surveyResponden.surveyId, total: count() })
          .from(surveyResponden)
          .where(eq(surveyResponden.villageId, villageId))
          .groupBy(surveyResponden.surveyId),
      ])
    : [[], []];
  const qMap = new Map(questions.map((row) => [row.surveyId, Number(row.total)]));
  const rMap = new Map(respondents.map((row) => [row.surveyId, Number(row.total)]));
  return rows.map((row) => ({
    ...row,
    totalSoal: qMap.get(row.id) ?? 0,
    totalResponden: rMap.get(row.id) ?? 0,
  }));
}

/** Satu baris survei mentah milik desa ini, atau `null`. */
export async function getSurveiPelayanan(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(survey)
    .where(and(eq(survey.villageId, villageId), eq(survey.id, id)))
    .limit(1);
  return row ?? null;
}

/** Survei aktif yang periodenya mencakup hari ini. */
export async function listSurveiAktifPelayanan(villageId: number) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select({
      id: survey.id,
      judul: survey.judul,
      deskripsi: survey.deskripsi,
      sasaran: survey.sasaran,
      mulai: survey.mulai,
      selesai: survey.selesai,
    })
    .from(survey)
    .where(and(eq(survey.villageId, villageId), eq(survey.aktif, 1)))
    .orderBy(desc(survey.createdAt));
  return rows.filter(
    (row) => (!row.mulai || row.mulai <= today) && (!row.selesai || row.selesai >= today),
  );
}

/** Survei aktif (tanpa batas periode) milik desa ini, atau `null`. */
export async function getSurveiAktifPelayanan(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(survey)
    .where(and(eq(survey.villageId, villageId), eq(survey.id, id), eq(survey.aktif, 1)))
    .limit(1);
  return row ?? null;
}

export async function insertSurveiPelayanan(
  villageId: number,
  values: {
    judul: string;
    deskripsi: string | null;
    sasaran: string | null;
    mulai: string | null;
    selesai: string | null;
    aktif: number;
  },
): Promise<number> {
  const [created] = await db
    .insert(survey)
    .values({ villageId, ...values })
    .$returningId();
  if (!created) throw new Error("Gagal membuat survei.");
  return created.id;
}

export async function updateSurveiPelayanan(
  villageId: number,
  id: number,
  values: {
    judul: string;
    deskripsi: string | null;
    sasaran: string | null;
    mulai: string | null;
    selesai: string | null;
    aktif: number;
  },
): Promise<boolean> {
  const [result] = await db
    .update(survey)
    .set(values)
    .where(and(eq(survey.villageId, villageId), eq(survey.id, id)));
  return result.affectedRows > 0;
}

export async function deleteSurveiPelayanan(villageId: number, id: number): Promise<void> {
  await db.delete(survey).where(and(eq(survey.villageId, villageId), eq(survey.id, id)));
}

/** Jumlah responden satu survei; dipakai sebelum menghapus survei. */
export async function countRespondenSurvei(villageId: number, surveyId: number): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(surveyResponden)
    .where(and(eq(surveyResponden.villageId, villageId), eq(surveyResponden.surveyId, surveyId)));
  return Number(row?.total ?? 0);
}

/** Soal mentah satu survei, terurut. */
export async function listSoalPelayanan(villageId: number, surveyId: number) {
  return db
    .select()
    .from(surveySoal)
    .where(and(eq(surveySoal.villageId, villageId), eq(surveySoal.surveyId, surveyId)))
    .orderBy(surveySoal.urutan, surveySoal.id);
}

/** Satu baris soal mentah milik survei di desa ini, atau `null`. */
export async function getSoalPelayanan(villageId: number, surveyId: number, soalId: number) {
  const [row] = await db
    .select({ id: surveySoal.id })
    .from(surveySoal)
    .where(
      and(
        eq(surveySoal.villageId, villageId),
        eq(surveySoal.surveyId, surveyId),
        eq(surveySoal.id, soalId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Jumlah jawaban yang sudah memakai satu soal. */
export async function countJawabanSoal(villageId: number, soalId: number): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(surveyJawaban)
    .where(and(eq(surveyJawaban.villageId, villageId), eq(surveyJawaban.soalId, soalId)));
  return Number(row?.total ?? 0);
}

export async function insertSoalPelayanan(
  villageId: number,
  surveyId: number,
  values: {
    pertanyaan: string;
    tipe: string;
    pilihan: string | null;
    skorPilihan: string | null;
    bobot: number;
  },
): Promise<number> {
  const [created] = await db
    .insert(surveySoal)
    .values({ villageId, surveyId, ...values })
    .$returningId();
  if (!created) throw new Error("Gagal menambahkan pertanyaan.");
  return created.id;
}

export async function updateSoalPelayanan(
  villageId: number,
  surveyId: number,
  soalId: number,
  values: {
    pertanyaan: string;
    tipe: string;
    pilihan: string | null;
    skorPilihan: string | null;
    bobot: number;
  },
): Promise<void> {
  await db
    .update(surveySoal)
    .set(values)
    .where(
      and(
        eq(surveySoal.villageId, villageId),
        eq(surveySoal.surveyId, surveyId),
        eq(surveySoal.id, soalId),
      ),
    );
}

export async function deleteSoalPelayanan(
  villageId: number,
  surveyId: number,
  soalId: number,
): Promise<void> {
  await db
    .delete(surveySoal)
    .where(
      and(
        eq(surveySoal.villageId, villageId),
        eq(surveySoal.surveyId, surveyId),
        eq(surveySoal.id, soalId),
      ),
    );
}

/** Responden satu survei, terbaru lebih dulu. */
export async function listRespondenPelayanan(villageId: number, surveyId: number) {
  return db
    .select()
    .from(surveyResponden)
    .where(and(eq(surveyResponden.villageId, villageId), eq(surveyResponden.surveyId, surveyId)))
    .orderBy(desc(surveyResponden.createdAt));
}

/** Seluruh jawaban milik desa ini (disaring ke survei terkait oleh use case). */
export async function listJawabanPelayanan(villageId: number) {
  return db.select().from(surveyJawaban).where(eq(surveyJawaban.villageId, villageId));
}

/**
 * Simpan responden dan jawabannya dalam satu transaksi.
 *
 * Bila `nik` diisi dan sudah pernah dipakai pada survei yang sama, tidak ada
 * baris yang ditulis dan hasilnya `duplikat` agar use case dapat memberi pesan
 * konflik tanpa menaruh aturan bisnis di lapisan repository.
 */
export async function insertRespondenPelayanan(
  villageId: number,
  surveyId: number,
  input: { nama: string; nik: string | null },
  jawaban: readonly { soalId: number; jawaban: string }[],
): Promise<{ id: number } | { duplikat: true }> {
  return db.transaction(async (tx) => {
    if (input.nik) {
      const [previous] = await tx
        .select({ id: surveyResponden.id })
        .from(surveyResponden)
        .where(
          and(
            eq(surveyResponden.villageId, villageId),
            eq(surveyResponden.surveyId, surveyId),
            eq(surveyResponden.nik, input.nik),
          ),
        )
        .limit(1);
      if (previous) return { duplikat: true } as const;
    }
    const [created] = await tx
      .insert(surveyResponden)
      .values({
        villageId,
        surveyId,
        nama: input.nama,
        nik: input.nik,
      })
      .$returningId();
    if (!created) throw new Error("Jawaban survei gagal disimpan.");
    await tx.insert(surveyJawaban).values(
      jawaban.map((item) => ({
        villageId,
        respondenId: created.id,
        soalId: item.soalId,
        jawaban: item.jawaban,
      })),
    );
    return { id: created.id } as const;
  });
}
