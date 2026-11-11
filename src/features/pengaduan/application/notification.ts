import { Resend } from "resend";

import { kirimPesanWhatsApp } from "@/features/notifikasi/infrastructure/whatsapp-baileys";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Kirim email saat status pengaduan berubah.
 *
 * Tanpa kredensial Resend, pengiriman dilewati dan dicatat; gangguan provider
 * tidak membatalkan perubahan status yang sudah disimpan.
 */
export async function notifyStatusChange(
  nomorTiket: string,
  email: string,
  statusBaru: string,
  statusLama: string,
): Promise<{
  success: boolean;
  message: string;
  skipped: boolean;
  data?: unknown;
  error?: string;
}> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn(
      `[notifikasi] RESEND_API_KEY tidak dikonfigurasi; email pengaduan ${nomorTiket} dilewati.`,
      {},
    );
    return {
      success: false,
      message: "Pengiriman email dilewati karena Resend belum dikonfigurasi.",
      skipped: true,
    };
  }

  const from = env.RESEND_FROM;
  if (!from) {
    logger.error(
      `[notifikasi] RESEND_FROM tidak dikonfigurasi; email pengaduan ${nomorTiket} gagal.`,
      {},
    );
    return {
      success: false,
      message: "Pengiriman email gagal karena alamat pengirim belum dikonfigurasi.",
      skipped: true,
      error: "RESEND_FROM tidak dikonfigurasi.",
    };
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [email],
      subject: `[Notifikasi] Status Pengaduan ${nomorTiket} Berubah`,
      html: `
        <p>Hai,</p>
        <p>Status pengaduan dengan nomor <strong>${escapeHtml(nomorTiket)}</strong> telah berubah.</p>
        <p><strong>Dari:</strong> ${escapeHtml(formatStatusForNotifikasi(statusLama))}</p>
        <p><strong>Menjadi:</strong> ${escapeHtml(formatStatusForNotifikasi(statusBaru))}</p>
        <p>Terima kasih telah menggunakan layanan pengaduan desa.</p>
      `,
    });

    if (error) {
      logger.warn(`[notifikasi] Resend menolak email pengaduan ${nomorTiket}.`, {
        error: error.message,
      });
      return {
        success: false,
        message: "Resend gagal menerima email notifikasi.",
        error: error.message,
        skipped: false,
      };
    }

    if (!data) {
      logger.warn(`[notifikasi] Resend tidak mengonfirmasi email pengaduan ${nomorTiket}.`, {});
      return {
        success: false,
        message: "Resend tidak mengonfirmasi pengiriman email.",
        error: "Respons Resend tidak berisi data email.",
        skipped: false,
      };
    }

    logger.info(`[notifikasi] Email pengaduan ${nomorTiket} diterima Resend.`, {
      emailId: data.id,
    });
    return { success: true, message: "Email diterima Resend.", data, skipped: false };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Kesalahan pengiriman email tidak diketahui.";
    logger.warn(`[notifikasi] Gagal menghubungi Resend untuk pengaduan ${nomorTiket}.`, {
      error: message,
    });
    return {
      success: false,
      message: "Gagal mengirim notifikasi email.",
      error: message,
      skipped: false,
    };
  }
}
/**
 * Kirim notifikasi WhatsApp saat status pengaduan berubah.
 * Menggunakan provider eksternal atau mencatat log bukti pengiriman jika belum dikonfigurasi.
 */
export async function notifyStatusChangeWhatsApp(
  nomorTiket: string,
  telepon: string,
  statusBaru: string,
  statusLama: string,
): Promise<{
  success: boolean;
  message: string;
  skipped: boolean;
  data?: unknown;
  error?: string;
}> {
  const pesan = `Halo, status pengaduan ${nomorTiket} telah berubah dari ${formatStatusForNotifikasi(statusLama)} menjadi ${formatStatusForNotifikasi(statusBaru)}. Terima kasih.`;
  const hasil = await kirimPesanWhatsApp(telepon, pesan);

  if (hasil.dilewati) {
    logger.warn(
      `[notifikasi-wa] WhatsApp belum tertaut; pesan untuk pengaduan ${nomorTiket} dilewati.`,
      {},
    );
    return {
      success: false,
      message: "Pengiriman WhatsApp dilewati karena WhatsApp belum tertaut.",
      error: hasil.pesanError,
      skipped: true,
    };
  }

  if (!hasil.sukses) {
    logger.warn(`[notifikasi-wa] Gagal mengirim pesan WhatsApp untuk pengaduan ${nomorTiket}.`, {
      error: hasil.pesanError,
    });
    return {
      success: false,
      message: "Gagal mengirim notifikasi WhatsApp.",
      error: hasil.pesanError,
      skipped: false,
      data: hasil.respons,
    };
  }

  logger.info(`[notifikasi-wa] Pesan WhatsApp pengaduan ${nomorTiket} berhasil dikirim.`, {});
  return {
    success: true,
    message: "Pesan WhatsApp berhasil dikirim.",
    data: hasil.respons,
    skipped: false,
  };
}

/** Format status sesuai enum domain pengaduan. */
export function formatStatusForNotifikasi(status: string): string {
  switch (status) {
    case "baru":
      return "Baru";
    case "diproses":
      return "Diproses";
    case "selesai":
      return "Selesai";
    case "ditolak":
      return "Ditolak";
    default:
      return status;
  }
}
