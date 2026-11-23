"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ajukanMutasi,
  buatJadwalPemeliharaan,
  hapusDokumenInventarisUseCase,
  hapusInventarisKategori,
  hapusJadwalPemeliharaan,
  saveInventaris,
  saveInventarisKategori,
  setujuiMutasiData,
  tolakMutasiData,
  ubahStatusPemeliharaan,
  unggahDokumenInventaris,
} from "@/features/inventaris/application/inventaris-use-cases";
import {
  inventarisFormSchema,
  inventarisKategoriFormSchema,
  inventarisMutasiFormSchema,
} from "@/features/inventaris/domain/inventaris";

const text = (fd: FormData, key: string) => {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
};
const optionalNumber = (value: string) => (value === "" ? undefined : Number(value));
const positiveId = (value: string) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID tidak valid.");
  return id;
};
const refresh = () => {
  for (const path of [
    "/inventaris",
    "/inventaris/dashboard",
    "/inventaris/pengelolaan",
    "/inventaris/mutasi",
    "/inventaris/laporan",
  ])
    revalidatePath(path);
};

export async function simpanInventarisAction(fd: FormData) {
  const id = text(fd, "id") ? positiveId(text(fd, "id")) : undefined;
  const parsed = inventarisFormSchema.parse({
    kategoriId: text(fd, "kategoriId") ? Number(text(fd, "kategoriId")) : "",
    nomorInventaris: text(fd, "nomorInventaris"),
    namaBarang: text(fd, "namaBarang"),
    kodeBarang: text(fd, "kodeBarang"),
    merk: text(fd, "merk"),
    tipe: text(fd, "tipe"),
    spesifikasi: text(fd, "spesifikasi"),
    jumlah: Number(text(fd, "jumlah") || 1),
    satuan: text(fd, "satuan") || "buah",
    hargaSatuan: optionalNumber(text(fd, "hargaSatuan")),
    akumulasiPenyusutan: Number(text(fd, "akumulasiPenyusutan") || 0),
    umurManfaatBulan: optionalNumber(text(fd, "umurManfaatBulan")),
    nilaiResidu: Number(text(fd, "nilaiResidu") || 0),
    tanggalMulaiPenyusutan: text(fd, "tanggalMulaiPenyusutan"),
    tahunPembelian: optionalNumber(text(fd, "tahunPembelian")),
    tanggalPembelian: text(fd, "tanggalPembelian"),
    asal: text(fd, "asal") || undefined,
    donatur: text(fd, "donatur"),
    kondisi: text(fd, "kondisi") || "baik",
    lokasi: text(fd, "lokasi"),
    keterangan: text(fd, "keterangan"),
    penanggungJawab: text(fd, "penanggungJawab"),
    jabatanPenanggungJawab: text(fd, "jabatanPenanggungJawab"),
    teleponPenanggungJawab: text(fd, "teleponPenanggungJawab"),
  });
  await saveInventaris(parsed, id);
  refresh();
  redirect(id ? "/inventaris/" + id + "?saved=1" : "/inventaris?created=1");
}

export async function simpanKategoriInventarisAction(fd: FormData) {
  const id = text(fd, "id") ? positiveId(text(fd, "id")) : undefined;
  const parsed = inventarisKategoriFormSchema.parse({
    kode: text(fd, "kode"),
    nama: text(fd, "nama"),
    golongan: text(fd, "golongan"),
    keterangan: text(fd, "keterangan"),
  });
  await saveInventarisKategori(parsed, id);
  refresh();
  redirect("/inventaris?categorySaved=1");
}

export async function hapusKategoriInventarisAction(fd: FormData) {
  await hapusInventarisKategori(positiveId(text(fd, "id")));
  refresh();
  redirect("/inventaris?categoryDeleted=1");
}

export async function ajukanMutasiInventarisAction(fd: FormData) {
  const parsed = inventarisMutasiFormSchema.parse({
    inventarisId: Number(text(fd, "inventarisId")),
    jenis: text(fd, "jenis"),
    tanggalMutasi: text(fd, "tanggalMutasi"),
    lokasiBaru: text(fd, "lokasiBaru"),
    kondisiBaru: text(fd, "kondisiBaru") || undefined,
    jumlahMutasi: Number(text(fd, "jumlahMutasi") || 1),
    alasan: text(fd, "alasan"),
    keterangan: text(fd, "keterangan"),
  });
  await ajukanMutasi(parsed);
  refresh();
  redirect("/inventaris/mutasi?submitted=1");
}

export async function setujuiMutasiInventarisAction(fd: FormData) {
  await setujuiMutasiData(positiveId(text(fd, "id")));
  refresh();
  redirect("/inventaris/mutasi?updated=1");
}

export async function tolakMutasiInventarisAction(fd: FormData) {
  await tolakMutasiData(positiveId(text(fd, "id")), text(fd, "catatanPenolakan"));
  refresh();
  redirect("/inventaris/mutasi?updated=1");
}

export async function buatJadwalPemeliharaanAction(fd: FormData) {
  await buatJadwalPemeliharaan({
    inventarisId: positiveId(text(fd, "inventarisId")),
    jenis: text(fd, "jenis"),
    tanggalRencana: text(fd, "tanggalRencana"),
    biaya: Number(text(fd, "biaya") || 0),
    pelaksana: text(fd, "pelaksana"),
    deskripsi: text(fd, "deskripsi"),
  });
  refresh();
  redirect("/inventaris/mutasi?maintenanceSaved=1");
}

export async function ubahStatusPemeliharaanAction(fd: FormData) {
  const status = text(fd, "status");
  if (
    status !== "terjadwal" &&
    status !== "dalam_proses" &&
    status !== "selesai" &&
    status !== "dibatalkan"
  )
    throw new Error("Status pemeliharaan tidak valid.");
  await ubahStatusPemeliharaan({
    id: positiveId(text(fd, "id")),
    status,
    jenis: text(fd, "jenis"),
    tanggalRencana: text(fd, "tanggalRencana"),
    biaya: Number(text(fd, "biaya") || 0),
    kondisiSetelah: (text(fd, "kondisiSetelah") || undefined) as
      "baik" | "rusak_ringan" | "rusak_berat" | "dalam_perbaikan" | undefined,
    pelaksana: text(fd, "pelaksana"),
    deskripsi: text(fd, "deskripsi"),
    tanggalSelesai: text(fd, "tanggalSelesai"),
    hasil: text(fd, "hasil"),
  });
  refresh();
  redirect("/inventaris/mutasi?maintenanceUpdated=1");
}

export async function hapusJadwalPemeliharaanAction(fd: FormData) {
  await hapusJadwalPemeliharaan(positiveId(text(fd, "id")));
  refresh();
  redirect("/inventaris/mutasi?maintenanceDeleted=1");
}

export async function unggahDokumenInventarisAction(fd: FormData) {
  const file = fd.get("berkas");
  if (!(file instanceof File) || file.size === 0) throw new Error("Pilih berkas dokumen.");
  await unggahDokumenInventaris({
    inventarisId: positiveId(text(fd, "inventarisId")),
    nama: text(fd, "nama") || file.name,
    namaFile: file.name,
    mime: file.type,
    ukuran: file.size,
    isi: new Uint8Array(await file.arrayBuffer()),
  });
  refresh();
  redirect("/inventaris/" + text(fd, "inventarisId") + "?documentSaved=1");
}

export async function hapusDokumenInventarisAction(fd: FormData) {
  const inventarisId = positiveId(text(fd, "inventarisId"));
  await hapusDokumenInventarisUseCase(positiveId(text(fd, "id")));
  refresh();
  redirect("/inventaris/" + inventarisId + "?documentDeleted=1");
}
