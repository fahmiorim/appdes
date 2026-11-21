"use server";

import { revalidatePath } from "next/cache";

import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";

import {
  ajukanCuti,
  catatAbsensiManual,
  putuskanCuti,
  simpanKuotaCuti,
  simpanPegawai,
  tambahRiwayatPegawai,
  simpanDokumenPegawai,
  simpanPengaturanKehadiran,
} from "@/features/kepegawaian/application/use-cases";

function text(fd: FormData, key: string): string {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function number(fd: FormData, key: string): number {
  const value = Number(text(fd, key));
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Nilai ${key} tidak valid.`);
  return value;
}
function nullable(fd: FormData, key: string): string | null { return text(fd, key) || null; }
function refresh() {
  revalidatePath("/absensi-kepegawaian");
  revalidatePath("/absensi-kepegawaian/absensi");
  revalidatePath("/absensi-kepegawaian/pegawai");
  revalidatePath("/absensi-kepegawaian/cuti-izin");
}

export async function simpanPegawaiAction(fd: FormData) {
  const id = text(fd, "id") ? number(fd, "id") : undefined;
  const perangkatId = text(fd, "perangkatId") ? number(fd, "perangkatId") : null;
  await simpanPegawai({
    id, perangkatId, nama: text(fd, "nama"), nip: nullable(fd, "nip"), nik: nullable(fd, "nik"),
    jabatan: nullable(fd, "jabatan"), jenisKelamin: nullable(fd, "jenisKelamin"),
    tempatLahir: nullable(fd, "tempatLahir"), tanggalLahir: nullable(fd, "tanggalLahir"),
    alamat: nullable(fd, "alamat"), telepon: nullable(fd, "telepon"), email: nullable(fd, "email"),
    pendidikan: nullable(fd, "pendidikan"), statusPegawai: text(fd, "statusPegawai") || "tetap",
    status: text(fd, "status") || "aktif", tanggalMasuk: nullable(fd, "tanggalMasuk"),
    tanggalKeluar: nullable(fd, "tanggalKeluar"),
  });
  refresh();
}

export async function absensiManualAction(fd: FormData) {
  await catatAbsensiManual({
    pegawaiId: number(fd, "pegawaiId"), tanggal: text(fd, "tanggal"),
    jamMasuk: nullable(fd, "jamMasuk") ?? undefined, jamKeluar: nullable(fd, "jamKeluar") ?? undefined,
    status: text(fd, "status"), catatan: nullable(fd, "catatan") ?? undefined,
  });
  refresh();
}

export async function ajukanCutiAction(fd: FormData) {
  let lampiran:string|null=null;
  const file=fd.get("lampiran");
  if(file instanceof File && file.size>0) {
    if(!["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Lampiran harus berupa PDF, JPG, PNG, atau WEBP.");
    const user=await requirePermission("cuti-izin","update");
    const villageId=await resolveVillageId(user);
    lampiran=await simpanBerkasMedia(villageId,{nama:file.name,mime:file.type,ukuran:file.size,isi:new Uint8Array(await file.arrayBuffer())},"umum","lampiran");
  }
  await ajukanCuti({
    pegawaiId: number(fd, "pegawaiId"), jenis: text(fd, "jenis"),
    mulai: text(fd, "mulai"), selesai: text(fd, "selesai"), alasan: text(fd, "alasan"), lampiran,
  });
  refresh();
}

export async function putuskanCutiAction(fd: FormData) {
  const status = text(fd, "status");
  if (status !== "disetujui" && status !== "ditolak") throw new Error("Keputusan tidak valid.");
  await putuskanCuti(number(fd, "id"), status, text(fd, "catatan"));
  refresh();
}

export async function simpanKuotaCutiAction(fd: FormData) {
  const total = Number(text(fd, "total"));
  const tahun = Number(text(fd, "tahun"));
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2200) throw new Error("Tahun tidak valid.");
  await simpanKuotaCuti(number(fd, "pegawaiId"), tahun, total);
  refresh();
}


export async function tambahRiwayatPegawaiAction(fd: FormData) {
  await tambahRiwayatPegawai({
    pegawaiId:number(fd,"pegawaiId"), jabatan:text(fd,"jabatan"), unitKerja:nullable(fd,"unitKerja"),
    nomorSk:nullable(fd,"nomorSk"), mulai:text(fd,"mulai"), selesai:nullable(fd,"selesai"),
    keterangan:nullable(fd,"keterangan"),
  });
  refresh();
}

export async function unggahDokumenPegawaiAction(fd: FormData) {
  const pegawaiId=number(fd,"pegawaiId");
  const judul=text(fd,"judul");
  const file=fd.get("berkas");
  if(!(file instanceof File)||file.size===0) throw new Error("Pilih berkas dokumen terlebih dahulu.");
  if(!["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("Dokumen harus berupa PDF, JPG, PNG, atau WEBP.");
  const user=await requirePermission("kepegawaian","update");
  const villageId=await resolveVillageId(user);
  const berkas=await simpanBerkasMedia(villageId,{nama:file.name,mime:file.type,ukuran:file.size,isi:new Uint8Array(await file.arrayBuffer())},"umum","berkas");
  await simpanDokumenPegawai({pegawaiId,judul,kategori:text(fd,"kategori")||"lainnya",nomor:nullable(fd,"nomor"),tanggal:nullable(fd,"tanggal"),berkas});
  refresh();
}


export async function simpanPengaturanKehadiranAction(fd: FormData) {
  const hariLibur=fd.getAll("hariLibur").map((x)=>Number(x));
  await simpanPengaturanKehadiran({jamMasuk:text(fd,"jamMasuk"),jamKeluar:text(fd,"jamKeluar"),hariLibur});
  refresh();
}
