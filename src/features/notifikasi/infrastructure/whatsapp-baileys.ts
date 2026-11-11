import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import type { WASocket } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";

import { normalisasiNomorWhatsApp } from "@/features/notifikasi/domain/whatsapp";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Koneksi WhatsApp lewat Baileys (WhatsApp Web multi-device).
 *
 * Berbeda dari provider HTTP, Baileys membutuhkan satu soket berumur panjang.
 * Soket disimpan pada `globalThis` agar hot-reload Next.js tidak membuka sesi
 * baru setiap kali modul dievaluasi. Sesi disimpan di `storage/whatsapp-auth`
 * (sudah di-.gitignore) sehingga cukup memindai QR sekali.
 *
 * Saat pertama dijalankan, QR dicetak ke log server. Bila belum tertaut,
 * pengiriman dilewati dengan pesan yang jelas — bukan dianggap terkirim.
 * Baileys tidak cocok untuk platform serverless; jalankan aplikasi sebagai
 * proses Node persisten (VPS, Docker, PM2).
 */
export interface HasilKirimWhatsApp {
  sukses: boolean;
  dilewati: boolean;
  respons: unknown;
  pesanError?: string;
}

type StatusKoneksi = "idle" | "menghubungkan" | "siap" | "tertutup";

interface StateWhatsApp {
  socket: WASocket | null;
  status: StatusKoneksi;
  tunggu: Promise<void> | null;
  selesaikan: (() => void) | null;
  percobaan: number;
  timer: ReturnType<typeof setTimeout> | null;
}

const KUNCI_GLOBAL = "__appdesWhatsApp";
const global = globalThis as unknown as { [KUNCI_GLOBAL]?: StateWhatsApp };

const state: StateWhatsApp = (global[KUNCI_GLOBAL] ??= {
  socket: null,
  status: "idle",
  tunggu: null,
  selesaikan: null,
  percobaan: 0,
  timer: null,
});

const BATAS_TUNGGU_MS = 20_000;

function selesaikanTunggu(): void {
  state.selesaikan?.();
  state.selesaikan = null;
}

function jadwalkanUlang(): void {
  if (state.timer) clearTimeout(state.timer);

  state.percobaan += 1;
  const jeda = Math.min(30_000, 2 ** Math.min(state.percobaan, 5) * 1_000);

  state.timer = setTimeout(() => {
    state.timer = null;
    state.status = "idle";
    void mulaiKoneksi();
  }, jeda);
  state.timer.unref?.();
}

async function mulaiKoneksi(): Promise<void> {
  if (state.status === "menghubungkan" && state.tunggu) return state.tunggu;

  state.status = "menghubungkan";
  state.tunggu = new Promise<void>((resolve) => {
    state.selesaikan = resolve;
  });

  try {
    const {
      default: makeWASocket,
      DisconnectReason,
      // Nama asli berawalan "use" sehingga dikira React Hook oleh eslint.
      useMultiFileAuthState: muatStateAuth,
    } = await import("@whiskeysockets/baileys");
    const { default: pino } = await import("pino");

    const direktori = path.resolve(process.cwd(), env.WHATSAPP_AUTH_DIR ?? "storage/whatsapp-auth");
    mkdirSync(direktori, { recursive: true });

    const { state: authState, saveCreds } = await muatStateAuth(direktori);
    const socket = makeWASocket({
      auth: authState,
      logger: pino({ level: "silent" }),
      markOnlineOnConnect: false,
    });

    state.socket = socket;
    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", (update) => {
      if (update.qr) {
        logger.info(
          "[whatsapp] Pindai QR di bawah: WhatsApp > Perangkat tertaut > Tautkan perangkat.",
        );
        qrcode.generate(update.qr, { small: true });
      }

      if (update.connection === "open") {
        state.status = "siap";
        state.percobaan = 0;
        logger.info("[whatsapp] Terhubung ke WhatsApp.");
        selesaikanTunggu();
      }

      if (update.connection === "close") {
        const kode = (
          update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined
        )?.output?.statusCode;

        state.status = "tertutup";
        state.socket = null;
        selesaikanTunggu();

        if (kode === DisconnectReason.loggedOut) {
          logger.warn(
            "[whatsapp] Sesi keluar dari perangkat. Hapus folder sesi lalu pindai QR baru.",
          );
          return;
        }

        logger.warn("[whatsapp] Koneksi terputus; mencoba menghubungkan ulang.");
        jadwalkanUlang();
      }
    });
  } catch (error) {
    state.status = "tertutup";
    selesaikanTunggu();
    logger.error("[whatsapp] Gagal memulai koneksi Baileys.", {
      error: error instanceof Error ? error.message : "kesalahan tidak diketahui",
    });
  }

  return state.tunggu ?? Promise.resolve();
}

async function dapatkanSocket(): Promise<WASocket | null> {
  if (state.status === "siap" && state.socket) return state.socket;

  if (state.status !== "menghubungkan") void mulaiKoneksi();

  await Promise.race([
    state.tunggu ?? Promise.resolve(),
    new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, BATAS_TUNGGU_MS);
      timer.unref?.();
    }),
  ]);

  return state.status === "siap" ? state.socket : null;
}

export async function kirimPesanWhatsApp(
  target: string,
  pesan: string,
): Promise<HasilKirimWhatsApp> {
  const jid = normalisasiNomorWhatsApp(target);
  if (!jid) {
    return {
      sukses: false,
      dilewati: false,
      respons: null,
      pesanError: "Nomor WhatsApp tidak valid.",
    };
  }

  const socket = await dapatkanSocket();
  if (!socket) {
    return {
      sukses: false,
      dilewati: true,
      respons: null,
      pesanError: "WhatsApp belum tertaut. Pindai QR pada log server lalu coba lagi.",
    };
  }

  try {
    const hasil = await socket.sendMessage(jid, { text: pesan });

    return {
      sukses: true,
      dilewati: false,
      respons: { id: hasil?.key?.id ?? null, jid },
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
