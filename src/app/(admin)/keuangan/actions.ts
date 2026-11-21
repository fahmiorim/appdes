"use server";

import { revalidatePath } from "next/cache";

import { listKeuangan, saveKeuanganData, saveKeuanganTriwulanData } from "@/features/keuangan/application/keuangan-use-cases";
import { isInputRow } from "@/features/keuangan/domain/keuangan";
import { createPembangunan, deletePembangunan, updatePembangunan } from "@/features/pembangunan/application/use-cases";
import { pembangunanFormSchema } from "@/features/pembangunan/domain/pembangunan";
import { errorState, successState, toErrorState, type ActionState } from "@/lib/action-state";

export async function simpanPaguApbdesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tahun = Number(formData.get("tahun"));
    const data = await listKeuangan(tahun);
    const rows = data.rows.filter((row) => isInputRow(row.templateUuid)).map((row) => ({
      templateUuid: row.templateUuid,
      anggaran: Number(formData.get("anggaran:" + row.templateUuid) ?? 0),
      realisasi: Number(row.realisasi),
    }));
    await saveKeuanganData(tahun, rows);
    revalidatePath("/keuangan");
    revalidatePath("/keuangan/apbdes");
    revalidatePath("/keuangan/realisasi");
    revalidatePath("/keuangan/laporan");
    return successState("Pagu APBDes berhasil disimpan.");
  } catch (error) {
    return toErrorState(error);
  }
}

export async function simpanRealisasiKeuanganAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tahun = Number(formData.get("tahun"));
    const data = await listKeuangan(tahun);
    const rows = data.rows.filter((row) => isInputRow(row.templateUuid)).map((row) => ({
      templateUuid: row.templateUuid,
      anggaran: Number(row.anggaran),
      realisasi: Number(formData.get("realisasi:" + row.templateUuid) ?? row.realisasi),
    }));
    await saveKeuanganData(tahun, rows);
    revalidatePath("/keuangan");
    revalidatePath("/keuangan/realisasi");
    revalidatePath("/keuangan/laporan");
    return successState("Realisasi anggaran berhasil disimpan.");
  } catch (error) {
    return toErrorState(error);
  }
}

export async function simpanRealisasiTriwulanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const tahun = Number(formData.get("tahun"));
    const data = await listKeuangan(tahun);
    const rows = data.rows.filter((row) => row.templateUuid.length === 3 && row.templateUuid.startsWith("5.")).map((row) => ({
      kode: row.templateUuid,
      tw1: Number(formData.get("tw1:" + row.templateUuid) ?? 0),
      tw2: Number(formData.get("tw2:" + row.templateUuid) ?? 0),
      tw3: Number(formData.get("tw3:" + row.templateUuid) ?? 0),
      tw4: Number(formData.get("tw4:" + row.templateUuid) ?? 0),
    }));
    await saveKeuanganTriwulanData(tahun, rows);
    revalidatePath("/keuangan");
    revalidatePath("/keuangan/realisasi");
    return successState("Realisasi triwulan berhasil disimpan.");
  } catch (error) {
    return toErrorState(error);
  }
}

function proyekInput(formData: FormData) {
  return pembangunanFormSchema.parse({
    judul: formData.get("judul"),
    deskripsi: formData.get("deskripsi") ?? "",
    lokasi: formData.get("lokasi") ?? "",
    tahunAnggaran: formData.get("tahunAnggaran"),
    sumberDana: formData.get("sumberDana") ?? "",
    anggaran: formData.get("anggaran") ?? "",
    volume: formData.get("volume") ?? "",
    satuan: formData.get("satuan") ?? "",
    pelaksana: formData.get("pelaksana") ?? "",
    mulai: formData.get("mulai") ?? "",
    selesai: formData.get("selesai") ?? "",
    status: formData.get("status") ?? "rencana",
    progres: formData.get("progres") ?? "0",
    hasil: formData.get("hasil") ?? "",
  });
}

export async function buatKegiatanPembangunanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await createPembangunan(proyekInput(formData));
    revalidatePath("/keuangan");
    revalidatePath("/keuangan/kegiatan");
    revalidatePath("/pembangunan");
    return successState("Kegiatan pembangunan berhasil ditambahkan.");
  } catch (error) {
    return toErrorState(error);
  }
}

export async function ubahKegiatanPembangunanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id) || id < 1) return errorState("ID kegiatan tidak valid.");
    await updatePembangunan(id, proyekInput(formData));
    revalidatePath("/keuangan");
    revalidatePath("/keuangan/kegiatan");
    revalidatePath("/keuangan/kegiatan/" + id);
    revalidatePath("/pembangunan");
    return successState("Kegiatan pembangunan berhasil diperbarui.");
  } catch (error) {
    return toErrorState(error);
  }
}

export async function hapusKegiatanPembangunanAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id < 1) throw new Error("ID kegiatan tidak valid.");
  await deletePembangunan(id);
  revalidatePath("/keuangan");
  revalidatePath("/keuangan/kegiatan");
  revalidatePath("/pembangunan");
}
