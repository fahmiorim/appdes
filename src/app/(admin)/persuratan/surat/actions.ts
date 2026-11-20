"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ajukanVerifikasiSuratData,
  createSuratDraftData,
  deleteSuratData,
  rejectSuratData,
  updateSuratDraftData,
  verifySuratData,
} from "@/features/surat/application/surat-use-cases";
import { suratFormSchema, type VerificationStep } from "@/features/surat/domain/surat";

function angkaId(formData: FormData): number {
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID surat tidak valid.");
  return id;
}

function ambilInputSurat(formData: FormData) {
  const isiSurat: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("isian.") && typeof value === "string") {
      isiSurat[key.slice("isian.".length)] = value;
    }
  }
  const pengikut = formData.getAll("pengikut").map((value) => Number(value));
  const luar = formData.getAll("luar").map((value) => {
    try {
      return JSON.parse(String(value)) as unknown;
    } catch {
      return null;
    }
  });
  return suratFormSchema.safeParse({
    typeId: String(formData.get("typeId") ?? ""),
    residentId: String(formData.get("residentId") ?? "none"),
    letterDate: String(formData.get("letterDate") ?? ""),
    purpose: String(formData.get("purpose") ?? ""),
    isiSurat,
    pengikut,
    luar,
  });
}

export async function buatKonsepSuratAction(formData: FormData) {
  const parsed = ambilInputSurat(formData);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Periksa kembali data surat.";
    redirect(`/persuratan/surat/baru?error=${encodeURIComponent(message)}`);
  }

  const { id } = await createSuratDraftData(parsed.data);
  revalidatePath("/persuratan/surat");
  redirect(`/persuratan/surat/${id}?berhasil=dibuat`);
}

export async function perbaruiKonsepSuratAction(formData: FormData) {
  const id = angkaId(formData);
  const parsed = ambilInputSurat(formData);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Periksa kembali data surat.";
    redirect(`/persuratan/surat/${id}/edit?error=${encodeURIComponent(message)}`);
  }

  await updateSuratDraftData(id, parsed.data);
  revalidatePath("/persuratan/surat");
  revalidatePath(`/persuratan/surat/${id}`);
  redirect(`/persuratan/surat/${id}?berhasil=diperbarui`);
}

export async function ajukanVerifikasiSuratAction(formData: FormData) {
  const id = angkaId(formData);
  const konfirmasiSyarat = formData.get("konfirmasiSyarat") === "on";
  await ajukanVerifikasiSuratData(id, konfirmasiSyarat);
  revalidatePath("/persuratan/surat");
  revalidatePath(`/persuratan/surat/${id}`);
  redirect(`/persuratan/surat/${id}?berhasil=diajukan`);
}

export async function verifikasiSuratAction(formData: FormData) {
  const id = angkaId(formData);
  const step = String(formData.get("step") ?? "");
  if (step !== "operator" && step !== "sekdes" && step !== "kades") {
    throw new Error("Tahap verifikasi tidak valid.");
  }
  await verifySuratData(id, step as VerificationStep);
  revalidatePath("/persuratan/surat");
  revalidatePath("/persuratan/arsip");
  revalidatePath("/persuratan/dashboard");
  revalidatePath(`/persuratan/surat/${id}`);
  redirect(`/persuratan/surat/${id}?berhasil=diverifikasi`);
}

export async function tolakSuratAction(formData: FormData) {
  const id = angkaId(formData);
  const alasan = String(formData.get("alasan") ?? "").trim();
  if (alasan.length < 3 || alasan.length > 1000) {
    throw new Error("Alasan penolakan wajib diisi (3–1.000 karakter).");
  }
  await rejectSuratData(id, alasan);
  revalidatePath("/persuratan/surat");
  revalidatePath(`/persuratan/surat/${id}`);
  redirect(`/persuratan/surat/${id}?berhasil=ditolak`);
}

export async function hapusKonsepSuratAction(formData: FormData) {
  const id = angkaId(formData);
  await deleteSuratData(id);
  revalidatePath("/persuratan/surat");
  redirect("/persuratan/surat?berhasil=dihapus");
}
