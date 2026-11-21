"use server";

import { revalidatePath } from "next/cache";

import {
  ajukanCuti,
  catatAbsensiManual,
  putuskanCuti,
  simpanKuotaCuti,
  simpanPegawai,
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
  await ajukanCuti({
    pegawaiId: number(fd, "pegawaiId"), jenis: text(fd, "jenis"),
    mulai: text(fd, "mulai"), selesai: text(fd, "selesai"), alasan: text(fd, "alasan"),
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
