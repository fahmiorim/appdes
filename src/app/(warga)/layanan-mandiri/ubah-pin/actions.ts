"use server";

import { redirect } from "next/navigation";

import { ubahPinWarga } from "@/features/warga/application/ubah-pin-use-case";
import { ubahPinSchema } from "@/features/warga/domain/warga";
import { errorState, toErrorState, zodToFieldErrors, type ActionState } from "@/lib/action-state";

/**
 * Server Action ubah PIN.
 *
 * Hanya memanggil use case (bukan repository) agar batas lapisan route →
 * application tetap terjaga. Setelah berhasil, warga diarahkan ke beranda.
 */
export async function ubahPinAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = ubahPinSchema.safeParse({
    pinLama: formData.get("pinLama"),
    pinBaru: formData.get("pinBaru"),
    konfirmasiPin: formData.get("konfirmasiPin"),
  });

  if (!parsed.success) {
    return errorState("Periksa kembali PIN yang Anda masukkan.", zodToFieldErrors(parsed.error));
  }

  try {
    await ubahPinWarga(parsed.data);
  } catch (error) {
    return toErrorState(error);
  }

  redirect("/layanan-mandiri/beranda");
}
