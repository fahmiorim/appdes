import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { kirimNotifikasi } from "./kirim-notifikasi";

const { envUji, values } = vi.hoisted(() => ({
  envUji: {
    WHATSAPP_API_URL: undefined as string | undefined,
    WHATSAPP_TOKEN: undefined as string | undefined,
    RESEND_API_KEY: undefined as string | undefined,
    RESEND_FROM: undefined as string | undefined,
  },
  values: vi.fn(),
}));

vi.mock("@/lib/env", () => ({ env: envUji }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock("@/db", () => ({
  db: { insert: vi.fn(() => ({ values })) },
}));
vi.mock("@/db/schema/notifikasi-terkirim", () => ({ notifikasiTerkirim: {} }));

interface PermintaanProvider {
  method: string | undefined;
  url: string | undefined;
  authorization: string | undefined;
  body: string;
}

let server: Server;
let port: number;
let permintaan: PermintaanProvider[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += String(chunk);
    });
    req.on("end", () => {
      permintaan.push({
        method: req.method,
        url: req.url,
        authorization: req.headers.authorization,
        body,
      });

      if (req.url === "/gagal") {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "provider down" }));
        return;
      }

      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: "wa-1", terkirim: true }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  permintaan = [];
  envUji.WHATSAPP_API_URL = undefined;
  envUji.WHATSAPP_TOKEN = undefined;
  envUji.RESEND_API_KEY = undefined;
  envUji.RESEND_FROM = undefined;
  values.mockResolvedValue(undefined);
});

describe("kirimNotifikasi WhatsApp", () => {
  it("melewati pengiriman tanpa konfigurasi dan mencatat bukti dilewati", async () => {
    const hasil = await kirimNotifikasi({
      villageId: 7,
      residentId: 3,
      jenis: "permohonan.status",
      kanal: "whatsapp",
      target: "08123456789",
      pesan: "Status berubah.",
    });

    expect(hasil).toMatchObject({ sukses: false, dilewati: true });
    expect(hasil.error).toContain("belum dikonfigurasi");
    expect(permintaan).toHaveLength(0);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        villageId: 7,
        kanal: "whatsapp",
        target: "08123456789",
        sukses: false,
        dilewati: true,
      }),
    );
  });

  it("mengirim ke server provider dengan bearer token dan body yang benar", async () => {
    envUji.WHATSAPP_API_URL = `http://127.0.0.1:${port}/kirim`;
    envUji.WHATSAPP_TOKEN = "token-uji";

    const hasil = await kirimNotifikasi({
      villageId: 7,
      residentId: 3,
      jenis: "permohonan.status",
      kanal: "whatsapp",
      target: "08123456789",
      pesan: "Permohonan Anda selesai.",
    });

    expect(hasil).toEqual({ sukses: true, dilewati: false, error: undefined });
    expect(permintaan).toHaveLength(1);
    expect(permintaan[0]).toMatchObject({
      method: "POST",
      url: "/kirim",
      authorization: "Bearer token-uji",
    });
    expect(JSON.parse(permintaan[0]?.body ?? "{}")).toEqual({
      phone: "08123456789",
      message: "Permohonan Anda selesai.",
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        sukses: true,
        dilewati: false,
        responsProvider: JSON.stringify({ id: "wa-1", terkirim: true }),
      }),
    );
  });

  it("mencatat penolakan HTTP provider tanpa melempar", async () => {
    envUji.WHATSAPP_API_URL = `http://127.0.0.1:${port}/gagal`;
    envUji.WHATSAPP_TOKEN = "token-uji";

    const hasil = await kirimNotifikasi({
      villageId: 7,
      jenis: "permohonan.status",
      kanal: "whatsapp",
      target: "08123456789",
      pesan: "Status berubah.",
    });

    expect(hasil).toMatchObject({ sukses: false, dilewati: false });
    expect(hasil.error).toContain("HTTP 500");
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ sukses: false, dilewati: false }),
    );
  });

  it("tetap mengembalikan hasil provider saat penyimpanan bukti gagal", async () => {
    envUji.WHATSAPP_API_URL = `http://127.0.0.1:${port}/kirim`;
    envUji.WHATSAPP_TOKEN = "token-uji";
    values.mockRejectedValueOnce(new Error("database down"));

    await expect(
      kirimNotifikasi({
        villageId: 7,
        jenis: "permohonan.status",
        kanal: "whatsapp",
        target: "08123456789",
        pesan: "Status berubah.",
      }),
    ).resolves.toMatchObject({ sukses: true, dilewati: false });
  });
});
