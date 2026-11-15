/**
 * Capture visual QA halaman publik pada desktop 1440 dan mobile 390.
 *
 * Untuk setiap route:
 * 1. pastikan halaman merespons HTTP 200 untuk tenant contoh (`sukamaju.localhost`)
 *    — screenshot halaman error tidak dihitung lulus;
 * 2. ambil screenshot full-page lewat Playwright CLI (`npx --yes playwright`),
 *    sehingga tidak perlu menambah dependency ke `package.json`;
 * 3. simpan gambar referensi desain di samping hasil capture untuk dibandingkan.
 *
 * Browser: default `chromium` milik Playwright (`npx playwright install chromium`).
 * Bila Chrome/Edge sudah terpasang, setel `VISUAL_QA_CHANNEL=chrome` (atau
 * `msedge`) agar tidak perlu mengunduh browser.
 *
 * Hasil ditulis ke `artifacts/visual-qa/<waktu>/` (gitignored).
 */
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ringkasTarget, validasiEnvVisual } from "./guard.mjs";

const AKAR = fileURLToPath(new URL("../../", import.meta.url));
const HOST_TENANT = "sukamaju.localhost";

const ROUTES = [
  "agenda",
  "galeri",
  "galeri/kegiatan-desa",
  "data/statistik",
  "pemerintahan",
  "wilayah",
  "profil/sejarah",
  "profil/visi-misi",
  "dokumen",
  "potensi",
  "kontak",
  "pengaduan",
  "transparansi/apbdes",
  "layanan",
  "layanan/surat",
  "profil",
];

const VIEWPORT = {
  desktop: "1440,1000",
  mobile: "390,844",
};

const REFERENSI = [
  ["docs/account/Modern Indonesian Village Login Portal.png", "reference/login.png"],
  ["docs/public/Agenda Kegiatan Desa Suka Maju.png", "reference/agenda.png"],
  ["docs/public/Suka Maju Village Gallery Dashboard.png", "reference/galeri.png"],
  ["docs/public/Desa Suka Maju Photo Gallery.png", "reference/galeri-detail.png"],
  ["docs/public/Data Statistik Desa Suka Maju Dashboard.png", "reference/statistik.png"],
  ["docs/public/Pemerintahan Desa Suka Maju Dashboard.png", "reference/pemerintahan.png"],
  ["docs/public/Wilayah Desa Suka Maju.png", "reference/wilayah.png"],
  ["docs/public/Sejarah Desa Suka Maju_ Jejak Perjalanan Desa.png", "reference/sejarah.png"],
  ["docs/public/Visi & Misi Desa Suka Maju.png", "reference/visi-misi.png"],
  ["docs/public/Potensi Desa Suka Maju Dashboard.png", "reference/potensi.png"],
  ["docs/public/Desa Suka Maju APBDes Dashboard.png", "reference/apbdes.png"],
  ["docs/public/Desa Sukamaju Online Services.png", "reference/layanan.png"],
  ["docs/public/Suka Maju Online Letter Services Dashboard.png", "reference/layanan-surat.png"],
  ["docs/public/Kontak & Pengaduan Desa Suka Maju.png", "reference/kontak-pengaduan.png"],
  ["docs/public/Profil Desa Suka Maju_ Informasi dan Potensi Desa.png", "reference/profil.png"],
];

function bacaAppUrl(sumber = process.env) {
  const mentah = (sumber.VISUAL_QA_APP_URL ?? "http://127.0.0.1:3000").trim();
  let url;
  try {
    url = new URL(mentah);
  } catch {
    throw new Error(`[visual-qa] VISUAL_QA_APP_URL bukan URL yang valid: ${mentah}`);
  }
  const hostLokal = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
  if (!hostLokal.has(url.hostname)) {
    throw new Error(
      `[visual-qa] Host aplikasi "${url.hostname}" ditolak. Visual QA hanya untuk server lokal.`,
    );
  }
  return url;
}

/** Cek HTTP 200 untuk tenant contoh; kembalikan body singkat bila gagal. */
function periksaHalaman(appUrl, route) {
  return new Promise((resolve) => {
    const permintaan = http.get(
      {
        host: appUrl.hostname,
        port: appUrl.port || 80,
        path: `/${route}`,
        headers: { Host: `${HOST_TENANT}${appUrl.port ? `:${appUrl.port}` : ""}` },
      },
      (respons) => {
        let cuplikan = "";
        respons.on("data", (chunk) => {
          if (cuplikan.length < 400) cuplikan += chunk.toString("utf8");
        });
        respons.on("end", () => {
          resolve({ status: respons.statusCode ?? 0, cuplikan: cuplikan.slice(0, 200) });
        });
      },
    );
    permintaan.on("error", (error) => resolve({ status: 0, cuplikan: error.message }));
    permintaan.setTimeout(30_000, () => {
      permintaan.destroy(new Error("timeout 30 detik"));
    });
  });
}

/** Jalankan Playwright CLI (diunduh lewat npx, bukan dependency proyek). */
function ambilScreenshot(url, berkas, viewport) {
  const args = ["--yes", "playwright", "screenshot", "--browser", "chromium"];
  const kanal = process.env.VISUAL_QA_CHANNEL?.trim();
  if (kanal) args.push("--channel", kanal);
  args.push("--viewport-size", viewport, "--full-page", url, berkas);

  const hasil = spawnSync("npx", args, {
    cwd: AKAR,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  return hasil.status === 0;
}

const konfigurasi = validasiEnvVisual();
const appUrl = bacaAppUrl();
const cap = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const direktori = path.join(AKAR, "artifacts", "visual-qa", cap);

await mkdir(path.join(direktori, "reference"), { recursive: true });

process.stdout.write(
  `[visual-qa] Database target: ${ringkasTarget(konfigurasi)}\n[visual-qa] Aplikasi: ${appUrl.origin} (Host: ${HOST_TENANT})\n[visual-qa] Hasil: artifacts/visual-qa/${cap}/\n`,
);

const gagal = [];

for (const route of ROUTES) {
  const slug = route.replaceAll("/", "-");
  const { status, cuplikan } = await periksaHalaman(appUrl, route);
  if (status !== 200) {
    gagal.push(`/${route} → HTTP ${status}${cuplikan ? ` (${cuplikan})` : ""}`);
    process.stderr.write(`[visual-qa] ${route}: HTTP ${status}\n`);
    continue;
  }

  for (const [nama, viewport] of Object.entries(VIEWPORT)) {
    const berkas = path.join(direktori, `${slug}-${nama}.png`);
    const url = `http://${HOST_TENANT}${appUrl.port ? `:${appUrl.port}` : ""}/${route}`;
    if (!ambilScreenshot(url, berkas, viewport)) {
      gagal.push(`/${route} (${nama}) → screenshot gagal`);
      continue;
    }
    const info = await stat(berkas).catch(() => null);
    if (!info || info.size === 0) {
      gagal.push(`/${route} (${nama}) → berkas screenshot kosong`);
      continue;
    }
    process.stdout.write(`[visual-qa] ${route} ${nama}: ${(info.size / 1024).toFixed(0)} KB\n`);
  }
}

for (const [sumber, tujuan] of REFERENSI) {
  await copyFile(path.join(AKAR, sumber), path.join(direktori, tujuan)).catch(() => undefined);
}

if (gagal.length > 0) {
  process.stderr.write(`\n[visual-qa] ${gagal.length} masalah:\n`);
  for (const masalah of gagal) process.stderr.write(`  - ${masalah}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `\n[visual-qa] Selesai: ${ROUTES.length} route × 2 viewport. Bandingkan dengan folder reference/.\n`,
  );
}
