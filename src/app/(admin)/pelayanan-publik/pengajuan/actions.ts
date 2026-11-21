"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ubahStatusPengajuanData,
  unggahHasilPengajuanAdminData,
} from "@/features/pelayanan/application/pengajuan-use-cases";
import type { BerkasUnggahan } from "@/features/publik/domain/media";

export async function ubahStatusPengajuanAction(f: FormData) {
  const id = Number(f.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID pengajuan tidak valid.");
  await ubahStatusPengajuanData(id, {
    status: String(f.get("status") ?? ""),
    catatanPetugas: String(f.get("catatanPetugas") ?? ""),
    alasanPenolakan: String(f.get("alasanPenolakan") ?? ""),
  });
  revalidatePath("/pelayanan-publik/pengajuan");
  revalidatePath("/pelayanan-publik/pengajuan/" + id);
  redirect("/pelayanan-publik/pengajuan/" + id + "?tersimpan=1");
}

export async function unggahHasilPengajuanAction(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID pengajuan tidak valid.");
  const files = formData
    .getAll("dokumenHasil")
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length < 1 || files.length > 10) throw new Error("Pilih 1 sampai 10 dokumen hasil.");
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > 50 * 1024 * 1024) throw new Error("Total ukuran dokumen hasil maksimal 50 MB.");
  const unggahan: BerkasUnggahan[] = [];
  for (const file of files)
    unggahan.push({
      nama: file.name,
      mime: file.type || null,
      ukuran: file.size,
      isi: new Uint8Array(await file.arrayBuffer()),
    });
  await unggahHasilPengajuanAdminData(id, unggahan);
  revalidatePath("/pelayanan-publik/pengajuan/" + id);
  redirect("/pelayanan-publik/pengajuan/" + id + "?hasil=1");
}
