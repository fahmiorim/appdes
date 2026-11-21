"use server";

import { revalidatePath } from "next/cache";

import {
  hapusAnggotaLembaga, hapusAreaPeta, hapusJabatanPerangkat, hapusLembagaDesa, hapusPerangkatDesa,
  simpanAnggotaLembaga, simpanAreaPeta, simpanJabatanPerangkat, simpanLembagaDesa, simpanPerangkatDesa, simpanRiwayatJabatan, hapusRiwayatJabatan,
} from "@/features/pemerintahan/application/use-cases";
import { hapusWilayah, simpanWilayah } from "@/features/wilayah/application/use-cases";

const value = (fd: FormData, key: string) => {
  const item = fd.get(key);
  return typeof item === "string" ? item.trim() : "";
};
const numberOrNull = (v: string) => v && Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
const dateOrNull = (v: string) => v || null;
const refresh = () => {
  for (const path of ["/pemerintahan-desa", "/pemerintahan-desa/perangkat", "/pemerintahan-desa/lembaga", "/pemerintahan-desa/wilayah", "/pemerintahan", "/perangkat", "/wilayah"]) revalidatePath(path);
};

export async function simpanPerangkatAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  const nama = value(fd, "nama");
  if (!nama) throw new Error("Nama perangkat wajib diisi.");
  await simpanPerangkatDesa(id, {
    nama, gelarDepan: value(fd, "gelarDepan") || null, gelarBelakang: value(fd, "gelarBelakang") || null,
    jabatanId: numberOrNull(value(fd, "jabatanId")), nip: value(fd, "nip") || null, nik: value(fd, "nik") || null,
    jenisKelamin: value(fd, "jenisKelamin") || null, tempatLahir: value(fd, "tempatLahir") || null,
    tanggalLahir: dateOrNull(value(fd, "tanggalLahir")), foto: value(fd, "foto") || null,
    status: value(fd, "status") || "aktif", periode: value(fd, "periode") || null,
    pendidikan: value(fd, "pendidikan") || null, telepon: value(fd, "telepon") || null,
    email: value(fd, "email") || null, alamat: value(fd, "alamat") || null,
    nomorSkPengangkatan: value(fd, "nomorSkPengangkatan") || null,
    tanggalPengangkatan: dateOrNull(value(fd, "tanggalPengangkatan")),
    atasanId: numberOrNull(value(fd, "atasanId")), urut: Number(value(fd, "urut") || 0),
  });
  refresh();
}

export async function hapusPerangkatAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  if (!id) throw new Error("ID perangkat tidak valid.");
  await hapusPerangkatDesa(id);
  refresh();
}

export async function simpanLembagaAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  const nama = value(fd, "nama");
  if (!nama) throw new Error("Nama lembaga wajib diisi.");
  await simpanLembagaDesa(id, {
    nama, jenis: value(fd, "jenis") || "lainnya", deskripsi: value(fd, "deskripsi") || null,
    tugasFungsi: value(fd, "tugasFungsi") || null, dasarHukum: value(fd, "dasarHukum") || null,
    masaBaktiMulai: dateOrNull(value(fd, "masaBaktiMulai")), masaBaktiSelesai: dateOrNull(value(fd, "masaBaktiSelesai")),
    status: value(fd, "status") || "aktif", tampilPublik: value(fd, "tampilPublik") === "on",
    urut: Number(value(fd, "urut") || 0),
  });
  refresh();
}

export async function hapusLembagaAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  if (!id) throw new Error("ID lembaga tidak valid.");
  await hapusLembagaDesa(id);
  refresh();
}

export async function simpanAnggotaLembagaAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  const lembagaId = numberOrNull(value(fd, "lembagaId"));
  const nama = value(fd, "nama");
  if (!lembagaId || !nama) throw new Error("Lembaga dan nama anggota wajib diisi.");
  await simpanAnggotaLembaga(id, {
    lembagaId, nama, jabatan: value(fd, "jabatan") || null, foto: value(fd, "foto") || null,
    periodeMulai: dateOrNull(value(fd, "periodeMulai")), periodeSelesai: dateOrNull(value(fd, "periodeSelesai")),
    aktif: value(fd, "aktif") !== "off", tampilPublik: value(fd, "tampilPublik") === "on",
    urut: Number(value(fd, "urut") || 0),
  });
  refresh();
}

export async function hapusAnggotaLembagaAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  if (!id) throw new Error("ID anggota tidak valid.");
  await hapusAnggotaLembaga(id);
  refresh();
}

export async function simpanWilayahAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  const dusun = value(fd, "dusun");
  if (!dusun) throw new Error("Nama dusun wajib diisi.");
  await simpanWilayah(id, {
    dusun, rw: value(fd, "rw"), rt: value(fd, "rt"), urut: Number(value(fd, "urut") || 0),
  });
  refresh();
}

export async function hapusWilayahAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  if (!id) throw new Error("ID wilayah tidak valid.");
  await hapusWilayah(id);
  refresh();
}

export async function simpanAreaPetaAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  const nama = value(fd, "nama");
  if (!nama) throw new Error("Nama area wajib diisi.");
  await simpanAreaPeta(id, {
    nama, path: value(fd, "path") || null, enabled: value(fd, "enabled") === "on" ? 1 : 0,
    sortOrder: Number(value(fd, "sortOrder") || 0), refPolygon: numberOrNull(value(fd, "refPolygon")),
  });
  refresh();
}

export async function hapusAreaPetaAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  if (!id) throw new Error("ID area tidak valid.");
  await hapusAreaPeta(id);
  refresh();
}

export async function simpanJabatanAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  const nama = value(fd, "nama");
  if (!nama) throw new Error("Nama jabatan wajib diisi.");
  await simpanJabatanPerangkat(id, nama, Number(value(fd, "urut") || 0));
  refresh();
}

export async function hapusJabatanAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  if (!id) throw new Error("ID jabatan tidak valid.");
  await hapusJabatanPerangkat(id);
  refresh();
}

export async function simpanRiwayatAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  const perangkatId = numberOrNull(value(fd, "perangkatId"));
  const jabatan = value(fd, "jabatan");
  if (!perangkatId || !jabatan) throw new Error("Perangkat dan jabatan wajib diisi.");
  await simpanRiwayatJabatan(id, {
    perangkatId, jabatan, nomorSk: value(fd, "nomorSk") || null,
    mulai: value(fd, "mulai") || null, selesai: value(fd, "selesai") || null,
    keterangan: value(fd, "keterangan") || null,
  });
  refresh();
}

export async function hapusRiwayatAction(fd: FormData) {
  const id = numberOrNull(value(fd, "id"));
  if (!id) throw new Error("ID riwayat tidak valid.");
  await hapusRiwayatJabatan(id);
  refresh();
}
