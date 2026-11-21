"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  hapusPengaduanData,
  tanggapiPengaduanData,
} from "@/features/pengaduan/application/use-cases";
import { tanggapanFormSchema } from "@/features/pengaduan/domain/pengaduan";

function ambilId(formData: FormData): number {
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID pengaduan tidak valid.");
  return id;
}

export async function simpanTanggapanPengaduanAction(formData: FormData): Promise<never> {
  const id = ambilId(formData);
  const parsed = tanggapanFormSchema.safeParse({
    status: String(formData.get("status") ?? ""),
    tanggapan: String(formData.get("tanggapan") ?? ""),
    publik: formData.get("publik") === "on",
  });
  if (!parsed.success) {
    const pesan = parsed.error.issues[0]?.message ?? "Tanggapan tidak valid.";
    redirect(`/pengaduan-admin/${id}?error=${encodeURIComponent(pesan)}`);
  }

  const hasil = await tanggapiPengaduanData(id, parsed.data);
  revalidatePath("/pengaduan-admin");
  revalidatePath(`/pengaduan-admin/${id}`);
  revalidatePath("/pengaduan");
  const gagal = [hasil.notification, hasil.whatsappNotification].includes("failed");
  const dilewati = [hasil.notification, hasil.whatsappNotification].includes("skipped");
  const info = gagal
    ? "Tanggapan tersimpan, tetapi salah satu notifikasi gagal dikirim. Periksa konfigurasi email/WhatsApp."
    : dilewati
      ? "Tanggapan tersimpan. Salah satu kanal notifikasi belum dikonfigurasi."
      : "Tanggapan berhasil disimpan dan notifikasi dikirim jika kontak tersedia.";
  redirect(`/pengaduan-admin/${id}?berhasil=${encodeURIComponent(info)}`);
}

export async function hapusPengaduanAction(formData: FormData): Promise<never> {
  const id = ambilId(formData);
  await hapusPengaduanData(id);
  revalidatePath("/pengaduan-admin");
  revalidatePath("/pengaduan");
  redirect("/pengaduan-admin?berhasil=dihapus");
}
