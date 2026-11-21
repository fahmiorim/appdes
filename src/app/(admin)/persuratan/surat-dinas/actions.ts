"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { BerkasUnggahan } from "@/features/publik/domain/media";
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
    archiveFile: "",
    hapusArsip: formData.get("hapusArsip") === "on",
    archiveLocation: formData.get("archiveLocation"),
  };
}

async function readPdfUpload(formData: FormData): Promise<BerkasUnggahan | null> {
  const value = formData.get("archiveUpload");
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > 20 * 1024 * 1024) throw new Error("Ukuran PDF maksimal 20 MB.");
  return {
    nama: value.name,
    mime: value.type || null,
    ukuran: value.size,
    isi: new Uint8Array(await value.arrayBuffer()),
  };
}

export async function simpanSuratDinasAction(formData: FormData) {
  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? readId(formData) : null;
  const upload = await readPdfUpload(formData);
  const saved = await simpanSuratDinasData(id, readInput(formData), upload);
  revalidatePath("/persuratan/surat-dinas");
  revalidatePath(`/persuratan/surat-dinas/${saved}/edit`);
  revalidatePath(`/api/admin/persuratan/surat-dinas/${saved}/lampiran`);
  redirect(`/persuratan/surat-dinas/${saved}/edit?berhasil=disimpan`);
}

export async function hapusSuratDinasAction(formData: FormData) {
  const id = readId(formData);
  await hapusSuratDinasData(id);
  revalidatePath("/persuratan/surat-dinas");
  redirect("/persuratan/surat-dinas?berhasil=dihapus");
}
