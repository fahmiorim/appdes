import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { survey, surveySoal, surveyResponden, surveyJawaban } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { hasPermission } from "@/features/rbac/application/authorization";
import { requirePermission } from "@/lib/dal";
import { notFound, validationError, conflict } from "@/lib/errors";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { hitungSkorResponden, klasifikasiSkor } from "@/features/analisis/domain/skor";

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
    const [created] = await db.insert(survey).values({ villageId, ...values }).$returningId();
    if (!created) throw new Error("Gagal membuat survei.");
    return created.id;
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
  const lines = raw.pilihan.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  const choices: string[] = [];
  const scoreMap: Record<string, number> = {};
  for (const line of lines) {
    const [labelRaw, scoreRaw] = line.split("|");
    const label = labelRaw?.trim() ?? "";
    const score = Number(scoreRaw?.trim());
    if (!label || label.length > 200 || !scoreRaw || !Number.isFinite(score) || score < 0 || score > 5) {
      throw validationError("Setiap opsi harus ditulis Label|Skor dengan skor 0 sampai 5.");
    }
    if (choices.includes(label)) throw validationError("Opsi jawaban tidak boleh duplikat.");
    choices.push(label);
    scoreMap[label] = score;
  }
  if (raw.tipe === "choice" && (choices.length < 2 || choices.length > 20)) throw validationError("Pertanyaan pilihan harus memiliki 2–20 opsi.");
  const bobot = Math.max(1, Math.min(100, Math.trunc(raw.bobot || 1)));
  const values = { pertanyaan, tipe: raw.tipe, pilihan: raw.tipe === "choice" ? JSON.stringify(choices) : null,
    skorPilihan: raw.tipe === "choice" ? JSON.stringify(scoreMap) : null, bobot };
  if (questionId === null) {
    const [created] = await db.insert(surveySoal).values({ villageId, surveyId, ...values }).$returningId();
    if (!created) throw new Error("Gagal menambahkan pertanyaan.");
    return created.id;
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


export async function getHasilSurveiData(id: number) {
  const user = await requirePermission(RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [row] = await db.select().from(survey)
    .where(and(eq(survey.villageId, villageId), eq(survey.id, id))).limit(1);
  if (!row) throw notFound("Survei tidak ditemukan.");
  const [questions, respondents, answers] = await Promise.all([
    db.select().from(surveySoal).where(and(eq(surveySoal.villageId, villageId), eq(surveySoal.surveyId, id))).orderBy(surveySoal.urutan, surveySoal.id),
    db.select().from(surveyResponden).where(and(eq(surveyResponden.villageId, villageId), eq(surveyResponden.surveyId, id))).orderBy(desc(surveyResponden.createdAt)),
    db.select().from(surveyJawaban).where(eq(surveyJawaban.villageId, villageId)),
  ]);
  const respondentIds = new Set(respondents.map((item) => item.id));
  const questionIds = new Set(questions.map((question) => question.id));
  const surveyAnswers = answers.filter((answer) => respondentIds.has(answer.respondenId) && questionIds.has(answer.soalId));
  const byRespondent = new Map<number, Map<number, string>>();
  for (const answer of surveyAnswers) {
    const map = byRespondent.get(answer.respondenId) ?? new Map<number, string>();
    map.set(answer.soalId, answer.jawaban ?? "");
    byRespondent.set(answer.respondenId, map);
  }
  const scoreQuestions = questions.filter((question) => question.tipe === "choice" || question.tipe === "number").map((question) => {
    let skorPilihan: Record<string, number> = {};
    try {
      const parsed: unknown = question.skorPilihan ? JSON.parse(question.skorPilihan) : {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) skorPilihan = parsed as Record<string, number>;
    } catch { /* Skor pilihan belum dikonfigurasi. */ }
    return { id: question.id, tipe: question.tipe ?? "text", bobot: question.bobot, skorPilihan, indikatorId: question.indikatorId };
  });
  const scores = respondents.map((respondent) => hitungSkorResponden(scoreQuestions, {
    respondenId: respondent.id, nama: respondent.nama, jawaban: byRespondent.get(respondent.id) ?? new Map(),
  }));
  const scored = scores.filter((score) => {
    const map = byRespondent.get(score.respondenId);
    return scoreQuestions.some((question) => {
      const answer = map?.get(question.id)?.trim();
      return !!answer && (question.tipe === "choice" ? typeof question.skorPilihan[answer] === "number" : question.tipe === "number" && Number.isFinite(Number(answer)));
    });
  });
  const average = scored.length ? Math.round(scored.reduce((sum, score) => sum + score.skor, 0) / scored.length * 10) / 10 : null;
  const distribution = ["Sangat Baik", "Baik", "Cukup", "Kurang"].map((label) => ({
    label, total: scored.filter((score) => score.klasifikasi === label).length,
  }));
  const questionStats = questions.map((question) => {
    const items = surveyAnswers.filter((answer) => answer.soalId === question.id && (answer.jawaban ?? "").trim());
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.jawaban ?? "", (counts.get(item.jawaban ?? "") ?? 0) + 1);
    return { id: question.id, pertanyaan: question.pertanyaan, tipe: question.tipe ?? "text", total: items.length,
      pilihan: [...counts.entries()].sort((a,b) => b[1]-a[1]).slice(0,10).map(([jawaban,total])=>({jawaban,total})) };
  });
  const comments = questions.filter((question) => question.tipe === "text").flatMap((question) =>
    surveyAnswers.filter((answer) => answer.soalId === question.id && (answer.jawaban ?? "").trim())
      .map((answer) => ({ pertanyaan: question.pertanyaan, jawaban: answer.jawaban ?? "" })))
    .slice(0,100);
  return { row, totalResponden: respondents.length, scoredCount: scored.length, average,
    klasifikasi: average === null ? "Belum ada penilaian" : klasifikasiSkor(average),
    distribution, questionStats, comments, canExport: hasPermission(user.permissions, RESOURCE, "read") };
}
