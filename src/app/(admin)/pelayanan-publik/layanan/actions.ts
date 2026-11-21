"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  hapusLayananData,
  simpanLayananData,
} from "@/features/pelayanan/application/layanan-use-cases";

function nilai(f: FormData) {
  return {
    nama: String(f.get("nama") ?? ""),
    kategori: String(f.get("kategori") ?? "administrasi"),
    deskripsi: String(f.get("deskripsi") ?? ""),
    persyaratan: String(f.get("persyaratan") ?? ""),
    estimasiHari: Number(f.get("estimasiHari")),
    biaya: Number(f.get("biaya")),
    metode: String(f.get("metode") ?? "online_dan_langsung"),
    aktif: f.get("aktif") === "on",
  };
}
export async function simpanLayananAction(f: FormData) {
  const raw = String(f.get("id") ?? "");
  const id = raw ? Number(raw) : null;
  if (id !== null && (!Number.isSafeInteger(id) || id < 1))
    throw new Error("ID layanan tidak valid.");
  const saved = await simpanLayananData(id, nilai(f));
  revalidatePath("/pelayanan-publik/layanan");
  redirect("/pelayanan-publik/layanan?tersimpan=" + saved);
}
export async function hapusLayananAction(f: FormData) {
  const id = Number(f.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID layanan tidak valid.");
  await hapusLayananData(id);
  revalidatePath("/pelayanan-publik/layanan");
  redirect("/pelayanan-publik/layanan?dihapus=1");
}
