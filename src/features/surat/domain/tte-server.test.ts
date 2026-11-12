import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:https";
import type { AddressInfo } from "node:net";
import type { TLSSocket } from "node:tls";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buatTransportTte } from "../infrastructure/tte-https";
import { adalahPdf, buatKlienBsre, parseKonfigTte, tandaiTte, type KonfigTte } from "./tte";
import type { TransportTte } from "./tte-jaringan";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

const SERTIFIKAT = readFileSync(
  new URL("../../../testing/fixtures/tte-lokal/cert.pem", import.meta.url),
  "utf8",
);
const KUNCI = readFileSync(
  new URL("../../../testing/fixtures/tte-lokal/key.pem", import.meta.url),
  "utf8",
);

let server: Server;
let port: number;
let responsJson = false;
let sniTerakhir: string | false | null = null;
const permintaan: {
  method: string | undefined;
  url: string | undefined;
  host: string | undefined;
}[] = [];

const PERMINTAAN = {
  villageId: 1,
  suratId: 9,
  nomor: "009/KIOS/10/2026",
  pdf: PDF,
};

/** Transport nyata, dengan CA uji lokal — verifikasi sertifikat tetap aktif. */
function transportUji(): TransportTte {
  return buatTransportTte({ ca: SERTIFIKAT });
}

/** Alamat publik palsu: lolos kebijakan SSRF tanpa DNS publik. */
const ALAMAT_VALIDASI = "93.184.216.34";

const alamatDiminta: string[] = [];

const resolverLokal = async () => [{ alamat: ALAMAT_VALIDASI, family: 4 }];

/**
 * Jembatan uji: domain tetap menerima alamat hasil validasi (dan dicatat),
 * tetapi koneksi TLS diarahkan ke server lokal. Transport produksi
 * (`buatTransportTte`) selalu menyambung ke `alamat` yang diberikan, sehingga
 * penggantian hanya terjadi di harness test ini.
 */
function transportLokal(): TransportTte {
  const nyata = transportUji();
  return (url, permintaan, alamat) => {
    alamatDiminta.push(alamat);
    return nyata(url, permintaan, "127.0.0.1");
  };
}

function konfig(prefix = ""): KonfigTte {
  return {
    mode: "bsre",
    api: `https://provider.test:${port}${prefix}`,
    username: "desa",
    nik: "3201010101010001",
    password: "rahasia",
    timeout: 5_000,
  };
}

function klienUji() {
  const klien = buatKlienBsre({ transport: transportLokal(), resolver: resolverLokal });
  if (!klien) throw new Error("klien BSrE seharusnya selalu tersedia");
  return klien;
}

beforeAll(async () => {
  server = createServer({ key: KUNCI, cert: SERTIFIKAT }, (req, res) => {
    permintaan.push({ method: req.method, url: req.url, host: req.headers.host });

    if (
      req.method === "POST" &&
      (req.url === "/api/sign/pdf" || req.url === "/bsre/api/sign/pdf")
    ) {
      if (responsJson) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: { file: "unduh/hasil.pdf" } }));
      } else {
        res.writeHead(200, { "content-type": "application/pdf" });
        res.end(Buffer.from(PDF));
      }
      return;
    }

    if (req.method === "GET" && req.url?.endsWith("/unduh/hasil.pdf")) {
      res.writeHead(200, { "content-type": "application/pdf" });
      res.end(Buffer.from(PDF));
      return;
    }

    if (req.method === "GET" && req.url === "/besar.pdf") {
      res.writeHead(200, { "content-type": "application/pdf" });
      res.end(Buffer.from(PDF));
      return;
    }

    if (req.url?.startsWith("/redirect")) {
      res.writeHead(302, { location: "/api/sign/pdf" });
      res.end();
      return;
    }

    res.writeHead(404).end();
  });

  server.on("secureConnection", (socket) => {
    sniTerakhir = (socket as TLSSocket).servername;
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
  sniTerakhir = null;
  permintaan.length = 0;
  alamatDiminta.length = 0;
});

describe("transport HTTPS TTE", () => {
  it("menyambung ke alamat ter-pin sambil mengirim SNI dan Host hostname provider", async () => {
    const respons = await transportUji()(
      new URL(`https://provider.test:${port}/besar.pdf`),
      { method: "GET", headers: {}, signal: AbortSignal.timeout(5_000) },
      "127.0.0.1",
    );

    expect(respons.status).toBe(200);
    expect(adalahPdf(await respons.baca(1024))).toBe(true);
    expect(sniTerakhir).toBe("provider.test");
    expect(permintaan[0]?.host).toBe(`provider.test:${port}`);
  });

  it("menolak hostname yang tidak cocok dengan sertifikat (verifikasi tetap aktif)", async () => {
    await expect(
      transportUji()(
        new URL(`https://salah.test:${port}/besar.pdf`),
        { method: "GET", headers: {}, signal: AbortSignal.timeout(5_000) },
        "127.0.0.1",
      ),
    ).rejects.toThrow(/altname|ERR_TLS_CERT_ALTNAME_INVALID/i);
  });

  it("menolak respons yang melebihi batas byte", async () => {
    const respons = await transportUji()(
      new URL(`https://provider.test:${port}/besar.pdf`),
      { method: "GET", headers: {}, signal: AbortSignal.timeout(5_000) },
      "127.0.0.1",
    );

    await expect(respons.baca(5)).rejects.toThrow("melebihi batas ukuran");
  });

  it("menolak alamat tujuan yang bukan IP dan sinyal yang sudah dibatalkan", async () => {
    await expect(
      transportUji()(
        new URL(`https://provider.test:${port}/besar.pdf`),
        { method: "GET", headers: {}, signal: AbortSignal.timeout(5_000) },
        "provider.test",
      ),
    ).rejects.toThrow("tidak valid");

    await expect(
      transportUji()(
        new URL(`https://provider.test:${port}/besar.pdf`),
        { method: "GET", headers: {}, signal: AbortSignal.abort() },
        "127.0.0.1",
      ),
    ).rejects.toThrow("batas waktu");
  });
});

describe("adapter BSrE dengan server HTTPS lokal", () => {
  it("mengirim PDF ke endpoint provider dan mengembalikan PDF bertanda tangan", async () => {
    const hasil = await klienUji()(PERMINTAAN, konfig());

    expect(adalahPdf(hasil)).toBe(true);
    expect(permintaan).toHaveLength(1);
    expect(permintaan[0]).toMatchObject({
      method: "POST",
      url: "/api/sign/pdf",
      host: `provider.test:${port}`,
    });
    expect(sniTerakhir).toBe("provider.test");
    // Domain meneruskan alamat hasil validasi, bukan hostname yang bisa
    // diresolusi ulang (bukti pinning di batas transport).
    expect(alamatDiminta).toEqual([ALAMAT_VALIDASI]);
  });

  it("mengunduh berkas hasil dari URL relatif dengan path prefix dipertahankan", async () => {
    responsJson = true;
    const hasil = await klienUji()(PERMINTAAN, konfig("/bsre"));

    expect(adalahPdf(hasil)).toBe(true);
    expect(permintaan.map((item) => `${item.method} ${item.url}`)).toEqual([
      "POST /bsre/api/sign/pdf",
      "GET /bsre/unduh/hasil.pdf",
    ]);
  });

  it("menolak redirect provider tanpa mengikuti tujuan redirect", async () => {
    const klien = buatKlienBsre({ transport: transportLokal(), resolver: resolverLokal });
    if (!klien) throw new Error("klien BSrE seharusnya selalu tersedia");

    await expect(
      klien(PERMINTAAN, { ...konfig(), api: `https://provider.test:${port}/redirect` }),
    ).rejects.toThrow("Redirect provider TTE ditolak");
  });

  it("mode nonaktif tidak menyentuh server dan tidak memblokir surat", async () => {
    const hasil = await tandaiTte(parseKonfigTte({}), PERMINTAAN, null);

    expect(hasil.ok).toBe(false);
    expect(permintaan).toHaveLength(0);
    if (!hasil.ok) expect(hasil.alasan).toContain("dinonaktifkan");
  });
});
