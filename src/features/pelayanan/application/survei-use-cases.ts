import "server-only";

import { hitungSkorResponden, klasifikasiSkor } from "@/features/analisis/domain/skor";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  countJawabanSoal,
  countRespondenSurvei,
  deleteSoalPelayanan,
  deleteSurveiPelayanan,
  getSoalPelayanan,
  getSurveiAktifPelayanan,
  getSurveiPelayanan,
  insertRespondenPelayanan,
  insertSoalPelayanan,
  insertSurveiPelayanan,
  listJawabanPelayanan,
  listRespondenPelayanan,
  listSoalPelayanan,
  listSurveiAktifPelayanan,
  listSurveiPelayanan,
  updateSoalPelayanan,
  updateSurveiPelayanan,
} from "@/features/pelayanan/infrastructure/survei-repository";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { getWargaProfile } from "@/features/warga/infrastructure/warga-repository";
import { requirePermission, requireWargaAktif } from "@/lib/dal";
import { conflict, notFound, validationError } from "@/lib/errors";

const RESOURCE = RESOURCES.analisisSurvei;

export async function getSurveiPageData() {
  const user = await requirePermission(RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const rows = await listSurveiPelayanan(villageId);
  return {
    rows,
    canCreate: hasPermission(user.permissions, RESOURCE, "update"),
    canUpdate: hasPermission(user.permissions, RESOURCE, "update"),
    canDelete: hasPermission(user.permissions, RESOURCE, "delete"),
  };
}

export async function getSurveiEditorData(id?: number) {
  const user = await requirePermission(RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  if (!id) return null;
  const row = await getSurveiPelayanan(villageId, id);
  if (!row) throw notFound("Survei tidak ditemukan.");
  return row;
}

export async function simpanSurveiData(
  id: number | null,
  raw: {
    judul: string;
    deskripsi: string;
    sasaran: string;
    mulai: string;
    selesai: string;
    aktif: boolean;
  },
) {
  const user = await requirePermission(RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const judul = raw.judul.trim();
  if (judul.length < 3 || judul.length > 200)
    throw validationError("Judul survei wajib 3–200 karakter.");
  if (raw.mulai && raw.selesai && raw.selesai < raw.mulai)
    throw validationError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  const values = {
    judul,
    deskripsi: raw.deskripsi.trim() || null,
    sasaran: raw.sasaran.trim() || null,
    mulai: raw.mulai || null,
    selesai: raw.selesai || null,
    aktif: raw.aktif ? 1 : 0,
  };
  if (id === null) {
    return insertSurveiPelayanan(villageId, values);
  }
  const existing = await getSurveiPelayanan(villageId, id);
  if (!existing) throw notFound("Survei tidak ditemukan.");
  await updateSurveiPelayanan(villageId, id, values);
  return id;
}

export async function hapusSurveiData(id: number) {
  const user = await requirePermission(RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  const existing = await getSurveiPelayanan(villageId, id);
  if (!existing) throw notFound("Survei tidak ditemukan.");
  const used = await countRespondenSurvei(villageId, id);
  if (used > 0)
    throw conflict(
      "Survei sudah memiliki responden. Nonaktifkan survei agar hasil dan riwayat tetap tersimpan.",
    );
  await deleteSurveiPelayanan(villageId, id);
}

export async function getSurveiDetailData(id: number) {
  const user = await requirePermission(RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const row = await getSurveiPelayanan(villageId, id);
  if (!row) throw notFound("Survei tidak ditemukan.");
  const [questions, totalResponden] = await Promise.all([
    listSoalPelayanan(villageId, id),
    countRespondenSurvei(villageId, id),
  ]);
  return {
    row,
    questions,
    totalResponden,
    canUpdate: hasPermission(user.permissions, RESOURCE, "update"),
    canDelete: hasPermission(user.permissions, RESOURCE, "delete"),
  };
}

export async function simpanSoalSurveiData(
  surveyId: number,
  questionId: number | null,
  raw: {
    pertanyaan: string;
    tipe: string;
    pilihan: string;
    bobot: number;
  },
) {
  const user = await requirePermission(RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const parent = await getSurveiPelayanan(villageId, surveyId);
  if (!parent) throw notFound("Survei tidak ditemukan.");
  const pertanyaan = raw.pertanyaan.trim();
  if (pertanyaan.length < 3 || pertanyaan.length > 2000)
    throw validationError("Pertanyaan wajib 3–2.000 karakter.");
  if (!["text", "number", "choice"].includes(raw.tipe))
    throw validationError("Tipe pertanyaan tidak valid.");
  const lines = raw.pilihan
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const choices: string[] = [];
  const scoreMap: Record<string, number> = {};
  for (const line of lines) {
    const [labelRaw, scoreRaw] = line.split("|");
    const label = labelRaw?.trim() ?? "";
    const score = Number(scoreRaw?.trim());
    if (
      !label ||
      label.length > 200 ||
      !scoreRaw ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 5
    ) {
      throw validationError("Setiap opsi harus ditulis Label|Skor dengan skor 0 sampai 5.");
    }
    if (choices.includes(label)) throw validationError("Opsi jawaban tidak boleh duplikat.");
    choices.push(label);
    scoreMap[label] = score;
  }
  if (raw.tipe === "choice" && (choices.length < 2 || choices.length > 20))
    throw validationError("Pertanyaan pilihan harus memiliki 2–20 opsi.");
  const bobot = Math.max(1, Math.min(100, Math.trunc(raw.bobot || 1)));
  const values = {
    pertanyaan,
    tipe: raw.tipe,
    pilihan: raw.tipe === "choice" ? JSON.stringify(choices) : null,
    skorPilihan: raw.tipe === "choice" ? JSON.stringify(scoreMap) : null,
    bobot,
  };
  if (questionId === null) {
    return insertSoalPelayanan(villageId, surveyId, values);
  }
  const existing = await getSoalPelayanan(villageId, surveyId, questionId);
  if (!existing) throw notFound("Pertanyaan tidak ditemukan.");
  const hasAnswers = await countJawabanSoal(villageId, questionId);
  if (hasAnswers > 0)
    throw conflict(
      "Pertanyaan sudah memiliki jawaban. Duplikasi survei untuk mengubah pertanyaan tanpa mengubah hasil historis.",
    );
  await updateSoalPelayanan(villageId, surveyId, questionId, values);
  return questionId;
}

export async function hapusSoalSurveiData(surveyId: number, questionId: number) {
  const user = await requirePermission(RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  const existing = await getSoalPelayanan(villageId, surveyId, questionId);
  if (!existing) throw notFound("Pertanyaan tidak ditemukan.");
  const used = await countJawabanSoal(villageId, questionId);
  if (used > 0)
    throw conflict(
      "Pertanyaan sudah memiliki jawaban. Pertanyaan tidak dapat dihapus agar hasil survei tetap utuh.",
    );
  await deleteSoalPelayanan(villageId, surveyId, questionId);
}

export async function getHasilSurveiData(id: number) {
  const user = await requirePermission(RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const row = await getSurveiPelayanan(villageId, id);
  if (!row) throw notFound("Survei tidak ditemukan.");
  const [questions, respondents, answers] = await Promise.all([
    listSoalPelayanan(villageId, id),
    listRespondenPelayanan(villageId, id),
    listJawabanPelayanan(villageId),
  ]);
  const respondentIds = new Set(respondents.map((item) => item.id));
  const questionIds = new Set(questions.map((question) => question.id));
  const surveyAnswers = answers.filter(
    (answer) => respondentIds.has(answer.respondenId) && questionIds.has(answer.soalId),
  );
  const byRespondent = new Map<number, Map<number, string>>();
  for (const answer of surveyAnswers) {
    const map = byRespondent.get(answer.respondenId) ?? new Map<number, string>();
    map.set(answer.soalId, answer.jawaban ?? "");
    byRespondent.set(answer.respondenId, map);
  }
  const scoreQuestions = questions
    .filter((question) => question.tipe === "choice" || question.tipe === "number")
    .map((question) => {
      let skorPilihan: Record<string, number> = {};
      try {
        const parsed: unknown = question.skorPilihan ? JSON.parse(question.skorPilihan) : {};
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
          skorPilihan = parsed as Record<string, number>;
      } catch {
        /* Skor pilihan belum dikonfigurasi. */
      }
      return {
        id: question.id,
        tipe: question.tipe ?? "text",
        bobot: question.bobot,
        skorPilihan,
        indikatorId: question.indikatorId,
      };
    });
  const scores = respondents.map((respondent) =>
    hitungSkorResponden(scoreQuestions, {
      respondenId: respondent.id,
      nama: respondent.nama,
      jawaban: byRespondent.get(respondent.id) ?? new Map(),
    }),
  );
  const scored = scores.filter((score) => {
    const map = byRespondent.get(score.respondenId);
    return scoreQuestions.some((question) => {
      const answer = map?.get(question.id)?.trim();
      return (
        !!answer &&
        (question.tipe === "choice"
          ? typeof question.skorPilihan[answer] === "number"
          : question.tipe === "number" && Number.isFinite(Number(answer)))
      );
    });
  });
  const average = scored.length
    ? Math.round((scored.reduce((sum, score) => sum + score.skor, 0) / scored.length) * 10) / 10
    : null;
  const distribution = ["Sangat Baik", "Baik", "Cukup", "Kurang"].map((label) => ({
    label,
    total: scored.filter((score) => score.klasifikasi === label).length,
  }));
  const questionStats = questions.map((question) => {
    const items = surveyAnswers.filter(
      (answer) => answer.soalId === question.id && (answer.jawaban ?? "").trim(),
    );
    const counts = new Map<string, number>();
    for (const item of items)
      counts.set(item.jawaban ?? "", (counts.get(item.jawaban ?? "") ?? 0) + 1);
    return {
      id: question.id,
      pertanyaan: question.pertanyaan,
      tipe: question.tipe ?? "text",
      total: items.length,
      pilihan: [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([jawaban, total]) => ({ jawaban, total })),
    };
  });
  const comments = questions
    .filter((question) => question.tipe === "text")
    .flatMap((question) =>
      surveyAnswers
        .filter((answer) => answer.soalId === question.id && (answer.jawaban ?? "").trim())
        .map((answer) => ({ pertanyaan: question.pertanyaan, jawaban: answer.jawaban ?? "" })),
    )
    .slice(0, 100);
  return {
    row,
    totalResponden: respondents.length,
    scoredCount: scored.length,
    average,
    klasifikasi: average === null ? "Belum ada penilaian" : klasifikasiSkor(average),
    distribution,
    questionStats,
    comments,
    canExport: hasPermission(user.permissions, RESOURCE, "read"),
  };
}

export async function getSurveiWargaPageData() {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  return listSurveiAktifPelayanan(villageId);
}

export async function getFormSurveiWargaData(id: number) {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const today = new Date().toISOString().slice(0, 10);
  const row = await getSurveiAktifPelayanan(villageId, id);
  if (!row || (row.mulai && row.mulai > today) || (row.selesai && row.selesai < today))
    throw notFound("Survei tidak tersedia saat ini.");
  const questions = await listSoalPelayanan(villageId, id);
  return { row, questions };
}

export async function kirimJawabanSurveiWargaData(
  id: number,
  rawAnswers: Array<{ soalId: number; jawaban: string }>,
) {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const profile = await getWargaProfile(villageId, user.residentId);
  if (!profile) throw notFound("Profil warga tidak ditemukan.");
  const form = await getFormSurveiWargaData(id);
  if (!form.questions.length) throw validationError("Survei belum memiliki pertanyaan.");
  if (rawAnswers.length !== form.questions.length)
    throw validationError("Jawab seluruh pertanyaan sebelum mengirim survei.");
  const answerMap = new Map<number, string>();
  for (const item of rawAnswers) {
    const answer = item.jawaban.trim();
    if (
      !Number.isSafeInteger(item.soalId) ||
      answer.length < 1 ||
      answer.length > 4000 ||
      answerMap.has(item.soalId)
    )
      throw validationError("Jawaban survei tidak valid.");
    answerMap.set(item.soalId, answer);
  }
  for (const question of form.questions) {
    const answer = answerMap.get(question.id);
    if (!answer) throw validationError("Seluruh pertanyaan wajib dijawab.");
    if (question.tipe === "choice") {
      let choices: unknown = [];
      try {
        choices = question.pilihan ? JSON.parse(question.pilihan) : [];
      } catch {
        /* konfigurasi rusak */
      }
      if (!Array.isArray(choices) || !choices.includes(answer))
        throw validationError("Pilihan jawaban tidak sesuai pertanyaan.");
    }
    if (
      question.tipe === "number" &&
      (!Number.isFinite(Number(answer)) || Number(answer) < 0 || Number(answer) > 5)
    )
      throw validationError("Jawaban angka harus antara 0 sampai 5.");
  }
  if (
    answerMap.size !== form.questions.length ||
    form.questions.some((question) => !answerMap.has(question.id))
  )
    throw validationError("Pertanyaan survei tidak cocok.");
  const hasil = await insertRespondenPelayanan(
    villageId,
    id,
    { nama: profile.name, nik: profile.nationalId },
    form.questions.map((question) => ({
      soalId: question.id,
      jawaban: answerMap.get(question.id) ?? "",
    })),
  );
  if ("duplikat" in hasil) throw conflict("Anda sudah pernah mengisi survei ini.");
}
