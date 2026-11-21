"use server";

import { redirect } from "next/navigation";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { kirimPengaduanDenganLampiranData } from "@/features/pengaduan/application/use-cases";
import type { BerkasUnggahan } from "@/features/publik/domain/media";

export async function kirimPengaduanAction(formData: FormData): Promise<never> {
  const desa = await getIdentitasFromRequest();
  const lampiran = formData.get("lampiran");
  let unggahan: BerkasUnggahan | null = null;
  let nomorTiket = "";

  try {
    if (lampiran instanceof File && lampiran.size > 0) {
      unggahan = {
        nama: lampiran.name,
        mime: lampiran.type || null,
        ukuran: lampiran.size,
        isi: new Uint8Array(await lampiran.arrayBuffer()),
      };
    }

    const hasil = await kirimPengaduanDenganLampiranData(
      desa.id,
      {
        kategori: String(formData.get("kategori") ?? "umum"),
        judul: String(formData.get("judul") ?? ""),
        isi: String(formData.get("isi") ?? ""),
        namaPelapor: String(formData.get("namaPelapor") ?? ""),
        nik: String(formData.get("nik") ?? ""),
        telepon: String(formData.get("telepon") ?? ""),
        email: String(formData.get("email") ?? ""),
        alamat: String(formData.get("alamat") ?? ""),
      },
      unggahan,
    );
    nomorTiket = hasil.nomorTiket;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pengaduan gagal dikirim.";
    redirect(`/pengaduan/baru?error=${encodeURIComponent(message)}`);
  }

  // Redirect berada di luar blok try agar exception khusus Next tidak dianggap
  // sebagai kegagalan penyimpanan.
  redirect(`/pengaduan/berhasil?tiket=${encodeURIComponent(nomorTiket)}`);
}
