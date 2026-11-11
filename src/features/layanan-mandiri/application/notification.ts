import { labelPermohonanStatus } from "@/features/layanan-mandiri/domain/layanan-mandiri";
import { findWargaEmailByResident } from "@/features/layanan-mandiri/infrastructure/layanan-mandiri-repository";
import { kirimNotifikasiWarga } from "@/features/notifikasi/application/kirim-notifikasi";

/**
 * Kirim notifikasi perubahan status permohonan lewat email dan/atau WhatsApp.
 *
 * Setiap percobaan dicatat pada `notifikasi_terkirim` sebagai bukti pengiriman.
 * Kegagalan provider tidak membatalkan perubahan status yang sudah tersimpan.
 */
export async function notifyPermohonanStatusChange(input: {
  villageId: number;
  residentId: number;
  noAntrian: string | null;
  statusLama: number;
  statusBaru: number;
  alasan?: string | null;
  noHpAktif?: string | null;
}): Promise<void> {
  const [email] = await Promise.all([findWargaEmailByResident(input.villageId, input.residentId)]);

  const nomor = input.noAntrian ?? "permohonan Anda";
  const pesan = [
    `Status permohonan surat ${nomor} berubah dari ${labelPermohonanStatus(input.statusLama)} menjadi ${labelPermohonanStatus(input.statusBaru)}.`,
    input.alasan ? `Catatan operator: ${input.alasan}` : null,
    "Buka area Layanan Mandiri untuk melihat rincian.",
  ]
    .filter((baris): baris is string => baris !== null)
    .join("\n");

  await kirimNotifikasiWarga({
    villageId: input.villageId,
    residentId: input.residentId,
    jenis: "permohonan.status",
    subjek: `[Layanan Desa] Status Permohonan ${nomor}`,
    pesan,
    email,
    telepon: input.noHpAktif ?? null,
  });
}
