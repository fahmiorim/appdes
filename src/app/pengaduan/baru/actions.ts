"use server";

import { redirect } from "next/navigation";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { kirimPengaduanData } from "@/features/pengaduan/application/use-cases";
import { hapusMedia, simpanUnggahanMedia } from "@/features/publik/infrastructure/media-storage";

export async function kirimPengaduanAction(formData: FormData): Promise<never> {
  const desa = await getIdentitasFromRequest();
  const lampiran = formData.get("lampiran");
  let jalurLampiran: string | null = null;
  let nomorTiket = "";

  try {
    if (lampiran instanceof File && lampiran.size > 0) {
      const saved = await simpanUnggahanMedia(desa.id, "pengaduan", {
        nama: lampiran.name,
        mime: lampiran.type || null,
        ukuran: lampiran.size,
        isi: new Uint8Array(await lampiran.arrayBuffer()),
      });
      jalurLampiran = saved.jalur;
    }

    const hasil = await kirimPengaduanData(desa.id, {
      kategori: String(formData.get("kategori") ?? "umum"),
      judul: String(formData.get("judul") ?? ""),
      isi: String(formData.get("isi") ?? ""),
      namaPelapor: String(formData.get("namaPelapor") ?? ""),
      nik: String(formData.get("nik") ?? ""),
      telepon: String(formData.get("telepon") ?? ""),
      email: String(formData.get("email") ?? ""),
      alamat: String(formData.get("alamat") ?? ""),
    }, jalurLampiran);
    nomorTiket = hasil.nomorTiket;
  } catch (error) {
    if (jalurLampiran) await hapusMedia(jalurLampiran).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Pengaduan gagal dikirim.";
    redirect(`/pengaduan/baru?error=${encodeURIComponent(message)}`);
  }

  // Redirect berada di luar blok try agar exception khusus Next tidak dianggap
  // sebagai kegagalan penyimpanan.
  redirect(`/pengaduan/berhasil?tiket=${encodeURIComponent(nomorTiket)}`);
}
