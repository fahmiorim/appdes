"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  hapusBukuAgendaData,
  simpanBukuAgendaData,
} from "@/features/surat/application/buku-agenda-use-cases";

function readId(formData: FormData): number {
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID agenda tidak valid.");
  return id;
}
function input(formData: FormData) {
  return {
    agendaNumber: formData.get("agendaNumber"),
    receivedDate: formData.get("receivedDate"),
    letterNumber: formData.get("letterNumber"),
    letterDate: formData.get("letterDate"),
    sender: formData.get("sender"),
    recipient: formData.get("recipient"),
    classificationId: formData.get("classificationId") || "none",
    summary: formData.get("summary"),
    disposition: formData.get("disposition"),
    sentDate: formData.get("sentDate"),
    archiveLocation: formData.get("archiveLocation"),
  };
}
export async function simpanSuratMasukAction(formData: FormData) {
  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? readId(formData) : null;
  const saved = await simpanBukuAgendaData("masuk", id, input(formData));
  revalidatePath("/persuratan/surat-masuk");
  redirect(`/persuratan/surat-masuk/${saved}/edit?berhasil=disimpan`);
}
export async function hapusSuratMasukAction(formData: FormData) {
  const id = readId(formData);
  await hapusBukuAgendaData("masuk", id);
  revalidatePath("/persuratan/surat-masuk");
  redirect("/persuratan/surat-masuk?berhasil=dihapus");
}
export async function simpanSuratKeluarAction(formData: FormData) {
  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? readId(formData) : null;
  const saved = await simpanBukuAgendaData("keluar", id, input(formData));
  revalidatePath("/persuratan/surat-keluar");
  redirect(`/persuratan/surat-keluar/${saved}/edit?berhasil=disimpan`);
}
export async function hapusSuratKeluarAction(formData: FormData) {
  const id = readId(formData);
  await hapusBukuAgendaData("keluar", id);
  revalidatePath("/persuratan/surat-keluar");
  redirect("/persuratan/surat-keluar?berhasil=dihapus");
}
