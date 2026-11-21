"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  hapusSoalSurveiData,
  hapusSurveiData,
  simpanSoalSurveiData,
  simpanSurveiData,
} from "@/features/pelayanan/application/survei-use-cases";

export async function simpanSurveiAction(formData: FormData) {
  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? Number(rawId) : null;
  if (id !== null && (!Number.isSafeInteger(id) || id < 1))
    throw new Error("ID survei tidak valid.");
  const saved = await simpanSurveiData(id, {
    judul: String(formData.get("judul") ?? ""),
    deskripsi: String(formData.get("deskripsi") ?? ""),
    sasaran: String(formData.get("sasaran") ?? ""),
    mulai: String(formData.get("mulai") ?? ""),
    selesai: String(formData.get("selesai") ?? ""),
    aktif: formData.get("aktif") === "on",
  });
  revalidatePath("/pelayanan-publik/survei");
  redirect("/pelayanan-publik/survei?tersimpan=" + saved);
}

export async function hapusSurveiAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID survei tidak valid.");
  await hapusSurveiData(id);
  revalidatePath("/pelayanan-publik/survei");
  redirect("/pelayanan-publik/survei?dihapus=1");
}

export async function simpanSoalSurveiAction(formData: FormData) {
  const surveyId = Number(formData.get("surveyId"));
  const rawId = String(formData.get("questionId") ?? "");
  const questionId = rawId ? Number(rawId) : null;
  if (
    !Number.isSafeInteger(surveyId) ||
    surveyId < 1 ||
    (questionId !== null && (!Number.isSafeInteger(questionId) || questionId < 1))
  )
    throw new Error("ID survei atau pertanyaan tidak valid.");
  await simpanSoalSurveiData(surveyId, questionId, {
    pertanyaan: String(formData.get("pertanyaan") ?? ""),
    tipe: String(formData.get("tipe") ?? "text"),
    pilihan: String(formData.get("pilihan") ?? ""),
    bobot: Number(formData.get("bobot") ?? 1),
  });
  revalidatePath("/pelayanan-publik/survei/" + surveyId);
  redirect("/pelayanan-publik/survei/" + surveyId + "?soal=tersimpan");
}

export async function hapusSoalSurveiAction(formData: FormData) {
  const surveyId = Number(formData.get("surveyId"));
  const questionId = Number(formData.get("questionId"));
  if (
    !Number.isSafeInteger(surveyId) ||
    surveyId < 1 ||
    !Number.isSafeInteger(questionId) ||
    questionId < 1
  )
    throw new Error("ID pertanyaan tidak valid.");
  await hapusSoalSurveiData(surveyId, questionId);
  revalidatePath("/pelayanan-publik/survei/" + surveyId);
  redirect("/pelayanan-publik/survei/" + surveyId + "?soal=dihapus");
}
