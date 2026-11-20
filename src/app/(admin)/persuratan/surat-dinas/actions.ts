"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  hapusSuratDinasData,
  simpanSuratDinasData,
} from "@/features/surat/application/surat-dinas-use-cases";

function readId(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID surat dinas tidak valid.");
  return id;
}

function readInput(formData: FormData) {
  return {
    letterNumber: formData.get("letterNumber"),
    letterDate: formData.get("letterDate"),
    recipient: formData.get("recipient"),
    recipientAddress: formData.get("recipientAddress"),
    subject: formData.get("subject"),
    content: formData.get("content"),
    classificationId: formData.get("classificationId") || "none",
    archiveFile: formData.get("archiveFile"),
    hapusArsip: formData.get("hapusArsip") === "on",
    archiveLocation: formData.get("archiveLocation"),
  };
}

export async function simpanSuratDinasAction(formData: FormData) {
  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? readId(formData) : null;
  const saved = await simpanSuratDinasData(id, readInput(formData));
  revalidatePath("/persuratan/surat-dinas");
  redirect(`/persuratan/surat-dinas/${saved}/edit?berhasil=disimpan`);
}

export async function hapusSuratDinasAction(formData: FormData) {
  const id = readId(formData);
  await hapusSuratDinasData(id);
  revalidatePath("/persuratan/surat-dinas");
  redirect("/persuratan/surat-dinas?berhasil=dihapus");
}
