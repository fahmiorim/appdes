"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hapusSurveiData, simpanSurveiData } from "@/features/pelayanan/application/survei-use-cases";

export async function simpanSurveiAction(formData: FormData) {
  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? Number(rawId) : null;
  if (id !== null && (!Number.isSafeInteger(id) || id < 1)) throw new Error("ID survei tidak valid.");
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
