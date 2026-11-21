"use server";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { lacakPengaduanData } from "@/features/pengaduan/application/use-cases";
import type { PengaduanLacak } from "@/features/pengaduan/domain/pengaduan";

export interface StateLacakPengaduan {
  error: string | null;
  hasil: PengaduanLacak | null;
}

export async function lacakPengaduanAction(
  _previous: StateLacakPengaduan,
  formData: FormData,
): Promise<StateLacakPengaduan> {
  try {
    const desa = await getIdentitasFromRequest();
    const hasil = await lacakPengaduanData(desa.id, {
      nomorTiket: String(formData.get("nomorTiket") ?? ""),
      identitas: String(formData.get("identitas") ?? ""),
    });
    return hasil
      ? { error: null, hasil }
      : {
          error:
            "Tiket atau identitas pelapor tidak cocok. Periksa kembali data yang Anda masukkan.",
          hasil: null,
        };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Pengaduan tidak dapat dilacak saat ini.",
      hasil: null,
    };
  }
}
