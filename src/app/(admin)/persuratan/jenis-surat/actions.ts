"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  hapusJenisSuratData,
  hapusKlasifikasiSuratData,
  hapusSyaratSuratData,
  simpanJenisSuratData,
  simpanKlasifikasiSuratData,
  simpanSyaratSuratData,
} from "@/features/surat/application/jenis-surat-use-cases";

function ambilBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}
function ambilAngka(formData: FormData, key: string, fallback = 0) {
  const value = String(formData.get(key) ?? "");
  return value.trim() === "" ? fallback : Number(value);
}
function ambilString(formData: FormData, key: string, fallback = "") {
  return String(formData.get(key) ?? fallback);
}
function ambilInput(formData: FormData) {
  return {
    code: ambilString(formData, "code"),
    name: ambilString(formData, "name"),
    classificationId: ambilString(formData, "classificationId", "none"),
    templateBody: ambilString(formData, "templateBody"),
    templateBodyAlt: ambilString(formData, "templateBodyAlt"),
    formIsian: ambilString(formData, "formIsian", "[]"),
    syaratSurat: JSON.stringify(
      formData
        .getAll("syaratSurat")
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
    requiresResident: ambilBoolean(formData, "requiresResident"),
    isActive: ambilBoolean(formData, "isActive"),
    numberFormat: ambilString(formData, "numberFormat"),
    validityMonths: ambilAngka(formData, "validityMonths", 1),
    sortOrder: ambilAngka(formData, "sortOrder", 0),
    templateVariant: ambilString(formData, "templateVariant", "default"),
    layoutConfig: ambilString(formData, "layoutConfig", "{}"),
  };
}
export async function simpanJenisSuratAction(formData: FormData) {
  const rawId = String(formData.get("id") ?? "");
  const id = rawId ? Number(rawId) : null;
  if (id !== null && (!Number.isSafeInteger(id) || id < 1))
    throw new Error("ID jenis surat tidak valid.");
  const savedId = await simpanJenisSuratData(id, ambilInput(formData));
  revalidatePath("/persuratan/jenis-surat");
  revalidatePath("/persuratan/surat/baru");
  redirect(`/persuratan/jenis-surat/${savedId}/edit?berhasil=disimpan`);
}
export async function hapusJenisSuratAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID jenis surat tidak valid.");
  await hapusJenisSuratData(id);
  revalidatePath("/persuratan/jenis-surat");
  redirect("/persuratan/jenis-surat?berhasil=dihapus");
}

function idOpsional(formData: FormData): number | null {
  const raw = String(formData.get("id") ?? "");
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID tidak valid.");
  return id;
}
export async function simpanKlasifikasiSuratAction(formData: FormData) {
  const id = await simpanKlasifikasiSuratData(idOpsional(formData), {
    code: ambilString(formData, "code"),
    name: ambilString(formData, "name"),
  });
  revalidatePath("/persuratan/master");
  revalidatePath("/persuratan/jenis-surat");
  redirect(`/persuratan/master?berhasil=klasifikasi-${id}`);
}
export async function hapusKlasifikasiSuratAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID klasifikasi tidak valid.");
  await hapusKlasifikasiSuratData(id);
  revalidatePath("/persuratan/master");
  revalidatePath("/persuratan/jenis-surat");
  redirect("/persuratan/master?berhasil=klasifikasi-dihapus");
}
export async function simpanSyaratSuratAction(formData: FormData) {
  const id = await simpanSyaratSuratData(idOpsional(formData), {
    name: ambilString(formData, "name"),
    description: ambilString(formData, "description"),
    sortOrder: ambilAngka(formData, "sortOrder", 0),
    isActive: ambilBoolean(formData, "isActive"),
  });
  revalidatePath("/persuratan/master");
  revalidatePath("/persuratan/jenis-surat");
  redirect(`/persuratan/master?berhasil=syarat-${id}`);
}
export async function hapusSyaratSuratAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID persyaratan tidak valid.");
  await hapusSyaratSuratData(id);
  revalidatePath("/persuratan/master");
  revalidatePath("/persuratan/jenis-surat");
  redirect("/persuratan/master?berhasil=syarat-dihapus");
}
