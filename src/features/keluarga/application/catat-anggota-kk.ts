import "server-only";

import {
  bedakanPerubahanAnggota,
  type AnggotaSnapshot,
  type PerubahanAnggota,
} from "@/features/keluarga/domain/keluarga";
import { catatLogAnggotaKk } from "@/features/keluarga/infrastructure/keluarga-repository";

/**
 * Catat perubahan keanggotaan KK dari keadaan sebelum → sesudah.
 *
 * Dipakai oleh use case penduduk (simpan/ubah/hapus) karena keanggotaan KK
 * berubah dari sana. Fungsi sengaja tidak menegakkan izin sendiri: pemanggilnya
 * sudah melewati `requirePermission` untuk modul penduduk, dan pencatatan ini
 * hanya efek samping dari perubahan yang sudah diotorisasi.
 *
 * Kegagalan pencatatan **tidak** membatalkan perubahan data — riwayat bersifat
 * pelengkap, bukan syarat sahnya perubahan.
 */
export async function catatPerubahanAnggotaKk(params: {
  villageId: number;
  residentId: number | null;
  residentName: string;
  sebelum: AnggotaSnapshot | null;
  sesudah: AnggotaSnapshot | null;
  actorId: string | null;
}): Promise<void> {
  const perubahan: PerubahanAnggota[] = bedakanPerubahanAnggota(params.sebelum, params.sesudah);
  if (perubahan.length === 0) return;

  try {
    await catatLogAnggotaKk({
      villageId: params.villageId,
      residentId: params.residentId,
      residentName: params.residentName,
      perubahan,
      actorId: params.actorId,
    });
  } catch {
    // Riwayat pelengkap: jangan gagalkan penyimpanan data penduduk.
  }
}
