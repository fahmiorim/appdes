import "server-only";

import { Resend } from "resend";

import { catatPengiriman } from "@/features/notifikasi/infrastructure/notifikasi-repository";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export type KanalNotifikasi = "email" | "whatsapp";

export interface KirimNotifikasiInput {
  villageId: number;
  residentId?: number | null;
  /** Jenis peristiwa, mis. `permohonan.status` atau `registrasi-warga.disetujui`. */
  jenis: string;
  kanal: KanalNotifikasi;
  target: string;
  subjek?: string;
  pesan: string;
}

export interface HasilNotifikasi {
  sukses: boolean;
  dilewati: boolean;
  error?: string;
}

interface Bukti {
  sukses: boolean;
  dilewati: boolean;
  respons: unknown;
  pesanError?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function kirimEmail(target: string, subjek: string, pesan: string): Promise<Bukti> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.RESEND_FROM;

  if (!apiKey || !from) {
    logger.warn("[notifikasi] Resend belum dikonfigurasi; email dilewati.", { target });
    return {
      sukses: false,
      dilewati: true,
      respons: null,
      pesanError: "Resend belum dikonfigurasi.",
    };
  }

  try {
    const { data, error } = await new Resend(apiKey).emails.send({
      from,
      to: [target],
      subject: subjek,
      html: `<p>${escapeHtml(pesan).replaceAll("\n", "<br />")}</p>`,
    });

    if (error) {
      return {
        sukses: false,
        dilewati: false,
        respons: data ?? null,
        pesanError: error.message,
      };
    }

    return { sukses: true, dilewati: false, respons: data ?? null };
  } catch (error) {
    return {
      sukses: false,
      dilewati: false,
      respons: null,
      pesanError: error instanceof Error ? error.message : "Kesalahan email tidak diketahui.",
    };
  }
}

async function kirimWhatsApp(target: string, pesan: string): Promise<Bukti> {
  const apiUrl = env.WHATSAPP_API_URL;
  const token = env.WHATSAPP_TOKEN;

  if (!apiUrl || !token) {
    logger.warn("[notifikasi] WhatsApp API belum dikonfigurasi; pesan dilewati.", { target });
    return {
      sukses: false,
      dilewati: true,
      respons: null,
      pesanError: "WhatsApp API belum dikonfigurasi.",
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ phone: target, message: pesan }),
    });
    const respons = (await response.json().catch(() => null)) as unknown;

    return {
      sukses: response.ok,
      dilewati: false,
      respons,
      pesanError: response.ok ? undefined : `Provider menolak: HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      sukses: false,
      dilewati: false,
      respons: null,
      pesanError:
        error instanceof Error ? error.message : "Kesalahan pengiriman WhatsApp tidak diketahui.",
    };
  }
}

/**
 * Kirim satu notifikasi lalu catat bukti pengiriman.
 *
 * Tidak pernah melempar: kegagalan provider dicatat sebagai bukti gagal agar
 * alur bisnis (mis. persetujuan permohonan) tidak ikut batal.
 */
export async function kirimNotifikasi(input: KirimNotifikasiInput): Promise<HasilNotifikasi> {
  const hasil =
    input.kanal === "email"
      ? await kirimEmail(input.target, input.subjek ?? "Notifikasi Desa", input.pesan)
      : await kirimWhatsApp(input.target, input.pesan);

  try {
    await catatPengiriman({
      villageId: input.villageId,
      residentId: input.residentId ?? null,
      jenis: input.jenis,
      kanal: input.kanal,
      target: input.target,
      subjek: input.subjek ?? null,
      pesan: input.pesan,
      sukses: hasil.sukses,
      dilewati: hasil.dilewati,
      responsProvider:
        hasil.respons === null || hasil.respons === undefined
          ? null
          : JSON.stringify(hasil.respons).slice(0, 4000),
      pesanError: hasil.pesanError ?? null,
    });
  } catch (error) {
    logger.warn("[notifikasi] Gagal menyimpan bukti pengiriman.", {
      error: error instanceof Error ? error.message : "kesalahan tidak diketahui",
    });
  }

  return { sukses: hasil.sukses, dilewati: hasil.dilewati, error: hasil.pesanError };
}

/** Kirim ke semua kanal yang tersedia untuk satu warga. */
export async function kirimNotifikasiWarga(input: {
  villageId: number;
  residentId: number;
  jenis: string;
  subjek: string;
  pesan: string;
  email?: string | null;
  telepon?: string | null;
}): Promise<void> {
  const kiriman: Promise<HasilNotifikasi>[] = [];

  if (input.email) {
    kiriman.push(
      kirimNotifikasi({
        villageId: input.villageId,
        residentId: input.residentId,
        jenis: input.jenis,
        kanal: "email",
        target: input.email,
        subjek: input.subjek,
        pesan: input.pesan,
      }),
    );
  }

  if (input.telepon) {
    kiriman.push(
      kirimNotifikasi({
        villageId: input.villageId,
        residentId: input.residentId,
        jenis: input.jenis,
        kanal: "whatsapp",
        target: input.telepon,
        subjek: input.subjek,
        pesan: input.pesan,
      }),
    );
  }

  await Promise.all(kiriman);
}
