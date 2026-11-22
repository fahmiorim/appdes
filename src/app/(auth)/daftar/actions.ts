"use server";

import { revalidatePath } from "next/cache";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { kirimPengajuanRegistrasiWarga } from "@/features/registrasi-warga/application/registrasi-warga-use-cases";
import { toErrorState } from "@/lib/action-state";

export async function ajukanAkunWargaAction(input: { nik: string; nama: string; noHp: string }) {
  try {
    const desa = await getIdentitasFromRequest();
    await kirimPengajuanRegistrasiWarga(desa.id, input);
    revalidatePath("/daftar");
    return { ok: true, message: "Pengajuan terkirim. Administrator desa akan memeriksa data Anda sebelum akun diaktifkan." };
  } catch (error) {
    const state = toErrorState(error);
    return { ok: false, message: state.message || "Pengajuan belum dapat diproses. Periksa kembali data Anda." };
  }
}
