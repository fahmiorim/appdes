import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { adalahPdf, buatKlienBsre, parseKonfigTte, tandaiTte, type KonfigTte } from "./tte";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

let server: Server;
let port: number;
let responsJson = false;
const permintaan: {
  method: string | undefined;
  url: string | undefined;
  auth: string | undefined;
}[] = [];

const PERMINTAAN = {
  villageId: 1,
  suratId: 9,
  nomor: "009/KIOS/10/2026",
  pdf: PDF,
};

function konfig(): KonfigTte {
  return {
    mode: "bsre",
    api: `http://127.0.0.1:${port}`,
    username: "desa",
    nik: "3201010101010001",
    password: "rahasia",
    ssl: false,
    timeout: 5_000,
  };
}

beforeAll(async () => {
  server = createServer((req, res) => {
    permintaan.push({
      method: req.method,
      url: req.url,
      auth: req.headers.authorization,
    });

    if (req.method === "POST" && req.url === "/api/sign/pdf") {
      if (responsJson) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { file: "/unduh/hasil.pdf" } }));
      } else {
        res.writeHead(200, { "content-type": "application/pdf" });
        res.end(Buffer.from(PDF));
      }
      return;
    }

    if (req.method === "GET" && req.url === "/unduh/hasil.pdf") {
      res.writeHead(200, { "content-type": "application/pdf" });
      res.end(Buffer.from(PDF));
      return;
    }

    res.writeHead(404).end();
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
  responsJson = false;
});

describe("adapter BSrE dengan server HTTP lokal", () => {
  it("mengirim PDF ke endpoint provider dan mengembalikan PDF bertanda tangan", async () => {
    permintaan.length = 0;
    const klien = buatKlienBsre();
    expect(klien).not.toBeNull();

    const hasil = await klien?.(PERMINTAAN, konfig());

    expect(hasil && adalahPdf(hasil)).toBe(true);
    expect(permintaan).toHaveLength(1);
    expect(permintaan[0]).toMatchObject({
      method: "POST",
      url: "/api/sign/pdf",
      auth: `Basic ${Buffer.from("desa:rahasia").toString("base64")}`,
    });
  });

  it("mengunduh berkas hasil dari URL pada respons JSON", async () => {
    permintaan.length = 0;
    responsJson = true;
    const klien = buatKlienBsre();

    const hasil = await klien?.(PERMINTAAN, konfig());

    expect(hasil && adalahPdf(hasil)).toBe(true);
    expect(permintaan.map((item) => `${item.method} ${item.url}`)).toEqual([
      "POST /api/sign/pdf",
      "GET /unduh/hasil.pdf",
    ]);
  });

  it("mode nonaktif tidak menyentuh server dan tidak memblokir surat", async () => {
    permintaan.length = 0;
    const hasil = await tandaiTte(parseKonfigTte({}), PERMINTAAN, null);

    expect(hasil.ok).toBe(false);
    expect(permintaan).toHaveLength(0);
    if (!hasil.ok) expect(hasil.alasan).toContain("dinonaktifkan");
  });
});
