"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { kirimJawabanSurveiWargaData } from "@/features/pelayanan/application/survei-use-cases";

export async function kirimJawabanSurveiAction(formData: FormData) {
  const id = Number(formData.get("surveyId"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID survei tidak valid.");
  const answers: Array<{ soalId: number; jawaban: string }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("jawaban_")) continue;
    const soalId = Number(key.slice("jawaban_".length));
    if (!Number.isSafeInteger(soalId) || typeof value !== "string")
      throw new Error("Data jawaban tidak valid.");
    answers.push({ soalId, jawaban: value });
  }
  await kirimJawabanSurveiWargaData(id, answers);
  revalidatePath("/layanan-mandiri/survei");
  redirect("/layanan-mandiri/survei/" + id + "?terkirim=1");
}
