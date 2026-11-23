"use server";

import { revalidatePath } from "next/cache";

import { tinjauRegistrasiWargaAdmin } from "@/features/registrasi-warga/application/registrasi-warga-use-cases";

export async function tinjauRegistrasiWargaAction(input: {
  id: number;
  keputusan: "setujui" | "tolak";
  catatan?: string;
}) {
  try {
    const credential = await tinjauRegistrasiWargaAdmin(input);
    revalidatePath("/pengaturan/pengguna/pendaftaran");
    revalidatePath("/pengaturan/pengguna");
    return {
      ok: true,
      message:
        input.keputusan === "setujui"
          ? "Pendaftaran disetujui. Simpan PIN awal ini dan serahkan kepada warga."
          : "Pengajuan ditolak.",
      credential,
    };
  } catch (error) {
    const { toErrorState } = await import("@/lib/action-state");
    const state = toErrorState(error);
    return {
      ok: false,
      message: "message" in state ? state.message : "Pengajuan tidak dapat diproses.",
      credential: null,
    };
  }
}
