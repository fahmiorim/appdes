import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { survey, surveySoal, surveyResponden, surveyJawaban } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { hasPermission } from "@/features/rbac/application/authorization";
import { requirePermission } from "@/lib/dal";
import { notFound, validationError, conflict } from "@/lib/errors";
import { RESOURCES } from "@/features/rbac/domain/resources";

const RESOURCE = RESOURCES.analisisSurvei;

export async function getSurveiPageData() {
  const user = await requirePermission(RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const rows = await db.select({
    id: survey.id, judul: survey.judul, deskripsi: survey.deskripsi,
    sasaran: survey.sasaran, mulai: survey.mulai, selesai: survey.selesai,
    aktif: survey.aktif, createdAt: survey.createdAt,
  }).from(survey).where(eq(survey.villageId, villageId)).orderBy(desc(survey.createdAt));
  const ids = rows.map((row) => row.id);
  const [questions, respondents] = ids.length ? await Promise.all([
    db.select({ surveyId: surveySoal.surveyId, total: count() }).from(surveySoal)
      .where(eq(surveySoal.villageId, villageId)).groupBy(surveySoal.surveyId),
    db.select({ surveyId: surveyResponden.surveyId, total: count() }).from(surveyResponden)
      .where(eq(surveyResponden.villageId, villageId)).groupBy(surveyResponden.surveyId),
  ]) : [[], []];
  const qMap = new Map(questions.map((row) => [row.surveyId, Number(row.total)]));
  const rMap = new Map(respondents.map((row) => [row.surveyId, Number(row.total)]));
  return {
    rows: rows.map((row) => ({ ...row, totalSoal: qMap.get(row.id) ?? 0, totalResponden: rMap.get(row.id) ?? 0 })),
    canCreate: hasPermission(user.permissions, RESOURCE, "create"),
    canUpdate: hasPermission(user.permissions, RESOURCE, "update"),
    canDelete: hasPermission(user.permissions, RESOURCE, "delete"),
  };
}

export async function getSurveiEditorData(id?: number) {
  const user = await requirePermission(RESOURCE, id ? "update" : "create");
  const villageId = await resolveVillageId(user);
  if (!id) return null;
  const [row] = await db.select().from(survey)
    .where(and(eq(survey.villageId, villageId), eq(survey.id, id))).limit(1);
  if (!row) throw notFound("Survei tidak ditemukan.");
  return row;
}

export async function simpanSurveiData(id: number | null, raw: {
  judul: string; deskripsi: string; sasaran: string; mulai: string; selesai: string; aktif: boolean;
}) {
  const user = await requirePermission(RESOURCE, id ? "update" : "create");
  const villageId = await resolveVillageId(user);
  const judul = raw.judul.trim();
  if (judul.length < 3 || judul.length > 200) throw validationError("Judul survei wajib 3–200 karakter.");
  if (raw.mulai && raw.selesai && raw.selesai < raw.mulai) throw validationError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  const values = {
    judul, deskripsi: raw.deskripsi.trim() || null, sasaran: raw.sasaran.trim() || null,
    mulai: raw.mulai || null, selesai: raw.selesai || null, aktif: raw.aktif ? 1 : 0,
  };
  if (id === null) {
    const [created] = await db.insert(survey).values({ villageId, ...values });
    return Number(created.insertId);
  }
  const [existing] = await db.select({ id: survey.id }).from(survey)
    .where(and(eq(survey.villageId, villageId), eq(survey.id, id))).limit(1);
  if (!existing) throw notFound("Survei tidak ditemukan.");
  await db.update(survey).set(values).where(and(eq(survey.villageId, villageId), eq(survey.id, id)));
  return id;
}

export async function hapusSurveiData(id: number) {
  const user = await requirePermission(RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  const [existing] = await db.select({ id: survey.id }).from(survey)
    .where(and(eq(survey.villageId, villageId), eq(survey.id, id))).limit(1);
  if (!existing) throw notFound("Survei tidak ditemukan.");
  const [used] = await db.select({ total: count() }).from(surveyResponden)
    .where(and(eq(surveyResponden.villageId, villageId), eq(surveyResponden.surveyId, id)));
  if (Number(used?.total ?? 0) > 0) throw conflict("Survei sudah memiliki responden. Nonaktifkan survei agar hasil dan riwayat tetap tersimpan.");
  await db.delete(survey).where(and(eq(survey.villageId, villageId), eq(survey.id, id)));
}


export async function getSurveiDetailData(id: number) {
  const user = await requirePermission(RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [row] = await db.select().from(survey)
    .where(and(eq(survey.villageId, villageId), eq(survey.id, id))).limit(1);
  if (!row) throw notFound("Survei tidak ditemukan.");
  const questions = await db.select().from(surveySoal)
    .where(and(eq(surveySoal.villageId, villageId), eq(surveySoal.surveyId, id)))
    .orderBy(surveySoal.urutan, surveySoal.id);
  const [respondents] = await db.select({ total: count() }).from(surveyResponden)
    .where(and(eq(surveyResponden.villageId, villageId), eq(surveyResponden.surveyId, id)));
  return { row, questions, totalResponden: Number(respondents?.total ?? 0),
    canUpdate: hasPermission(user.permissions, RESOURCE, "update"),
    canDelete: hasPermission(user.permissions, RESOURCE, "delete") };
}

export async function simpanSoalSurveiData(surveyId: number, questionId: number | null, raw: {
  pertanyaan: string; tipe: string; pilihan: string; bobot: number;
}) {
  const user = await requirePermission(RESOURCE, questionId ? "update" : "create");
  const villageId = await resolveVillageId(user);
  const [parent] = await db.select({ id: survey.id }).from(survey)
    .where(and(eq(survey.villageId, villageId), eq(survey.id, surveyId))).limit(1);
  if (!parent) throw notFound("Survei tidak ditemukan.");
  const pertanyaan = raw.pertanyaan.trim();
  if (pertanyaan.length < 3 || pertanyaan.length > 2000) throw validationError("Pertanyaan wajib 3–2.000 karakter.");
  if (!["text", "number", "choice"].includes(raw.tipe)) throw validationError("Tipe pertanyaan tidak valid.");
  const choices = raw.pilihan.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (raw.tipe === "choice" && (choices.length < 2 || choices.length > 20)) throw validationError("Pertanyaan pilihan harus memiliki 2–20 opsi.");
  const bobot = Math.max(1, Math.min(100, Math.trunc(raw.bobot || 1)));
  const values = { pertanyaan, tipe: raw.tipe, pilihan: raw.tipe === "choice" ? JSON.stringify(choices) : null, bobot };
  if (questionId === null) {
    const [created] = await db.insert(surveySoal).values({ villageId, surveyId, ...values });
    return Number(created.insertId);
  }
  const [existing] = await db.select({ id: surveySoal.id }).from(surveySoal)
    .where(and(eq(surveySoal.villageId, villageId), eq(surveySoal.surveyId, surveyId), eq(surveySoal.id, questionId))).limit(1);
  if (!existing) throw notFound("Pertanyaan tidak ditemukan.");
  await db.update(surveySoal).set(values)
    .where(and(eq(surveySoal.villageId, villageId), eq(surveySoal.surveyId, surveyId), eq(surveySoal.id, questionId)));
  return questionId;
}

export async function hapusSoalSurveiData(surveyId: number, questionId: number) {
  const user = await requirePermission(RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  const [existing] = await db.select({ id: surveySoal.id }).from(surveySoal)
    .where(and(eq(surveySoal.villageId, villageId), eq(surveySoal.surveyId, surveyId), eq(surveySoal.id, questionId))).limit(1);
  if (!existing) throw notFound("Pertanyaan tidak ditemukan.");
  const [used] = await db.select({ total: count() }).from(surveyJawaban)
    .where(and(eq(surveyJawaban.villageId, villageId), eq(surveyJawaban.soalId, questionId)));
  if (Number(used?.total ?? 0) > 0) throw conflict("Pertanyaan sudah memiliki jawaban. Pertanyaan tidak dapat dihapus agar hasil survei tetap utuh.");
  await db.delete(surveySoal).where(and(eq(surveySoal.villageId, villageId), eq(surveySoal.surveyId, surveyId), eq(surveySoal.id, questionId)));
}
