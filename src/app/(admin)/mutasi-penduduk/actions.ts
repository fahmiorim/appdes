"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  catatDatang,
  catatKelahiran,
  catatKematian,
  catatPerubahan,
  catatPindahKeluar,
} from "@/features/penduduk/application/riwayat-penduduk-use-cases";
import type {
  CatatDatangInput,
  CatatKelahiranInput,
  CatatPerubahanInput,
} from "@/features/penduduk/domain/riwayat-penduduk";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function optionalId(form: FormData, key: string): number | null {
  const value = text(form, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
async function selesai() {
  revalidatePath("/mutasi-penduduk");
  revalidatePath("/penduduk");
  revalidatePath("/penduduk/dashboard");
  revalidatePath("/keluarga");
  revalidatePath("/statistik/penduduk");
  redirect("/mutasi-penduduk");
}
export async function catatKelahiranAction(form: FormData) {
  await catatKelahiran({
    eventDate: text(form, "eventDate"),
    name: text(form, "name"),
    nationalId: text(form, "nationalId"),
    gender: text(form, "gender") as CatatKelahiranInput["gender"],
    familyId: optionalId(form, "familyId"),
    familyRelationId: optionalId(form, "familyRelationId"),
    regionId: optionalId(form, "regionId"),
    address: text(form, "address"),
    fatherName: text(form, "fatherName"),
    motherName: text(form, "motherName"),
    reason: text(form, "reason"),
    notes: text(form, "notes"),
    referenceNo: text(form, "referenceNo"),
  });
  await selesai();
}
export async function catatDatangAction(form: FormData) {
  await catatDatang({
    eventDate: text(form, "eventDate"),
    name: text(form, "name"),
    nationalId: text(form, "nationalId"),
    gender: text(form, "gender") as CatatDatangInput["gender"],
    birthDate: text(form, "birthDate"),
    birthPlace: text(form, "birthPlace"),
    familyId: optionalId(form, "familyId"),
    familyRelationId: optionalId(form, "familyRelationId"),
    regionId: optionalId(form, "regionId"),
    address: text(form, "address"),
    fromAddress: text(form, "fromAddress"),
    reason: text(form, "reason"),
    notes: text(form, "notes"),
    referenceNo: text(form, "referenceNo"),
  });
  await selesai();
}
export async function catatKematianAction(form: FormData) {
  await catatKematian({
    residentId: Number(text(form, "residentId")),
    eventDate: text(form, "eventDate"),
    reason: text(form, "reason"),
    notes: text(form, "notes"),
    referenceNo: text(form, "referenceNo"),
  });
  await selesai();
}
export async function catatPindahKeluarAction(form: FormData) {
  await catatPindahKeluar({
    residentId: Number(text(form, "residentId")),
    eventDate: text(form, "eventDate"),
    toAddress: text(form, "toAddress"),
    destination: text(form, "destination"),
    reason: text(form, "reason"),
    notes: text(form, "notes"),
    referenceNo: text(form, "referenceNo"),
  });
  await selesai();
}
export async function catatPerubahanAction(form: FormData) {
  await catatPerubahan({
    residentId: Number(text(form, "residentId")),
    eventDate: text(form, "eventDate"),
    lifeStatus: text(form, "lifeStatus") as CatatPerubahanInput["lifeStatus"],
    reason: text(form, "reason"),
    notes: text(form, "notes"),
    referenceNo: text(form, "referenceNo"),
  });
  await selesai();
}
