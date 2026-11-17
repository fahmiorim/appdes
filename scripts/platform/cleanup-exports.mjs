/**
 * Bersihkan berkas ekspor tenant yang sudah kedaluwarsa.
 *
 * Ekspor data tenant ditulis ke `storage/exports/<villageId>/` dengan masa
 * berlaku 30 hari (`tenant_exports.kedaluwarsa_pada`). Tanpa penjadwal, berkas
 * dan barisnya menumpuk selamanya — termasuk salinan data pribadi yang sudah
 * seharusnya hilang. Skrip ini adalah jalur operasional untuk membersihkannya
 * dari cron/systemd timer.
 *
 * Aturan keamanan:
 * - Hanya menghapus berkas di bawah `storage/exports`. Path dari database tetap
 *   diverifikasi ulang; path absolut, `..`, atau awalan yang mirip ditolak.
 * - Baris `tenant_exports` yang kedaluwarsa selalu dihapus, termasuk saat
 *   berkasnya sudah tidak ada, supaya catatan tidak menunjuk berkas hantu.
 * - Idempoten: menjalankannya dua kali tidak berefek tambahan.
 * - `--dry-run` hanya melaporkan, tidak menyentuh berkas maupun database.
 * - Tidak pernah menghapus data desa, hanya artefak ekspornya.
 *
 * Aturan pemilihan baris dan penjagaan path **tidak** ditulis di sini: keduanya
 * berasal dari `src/features/multi-desa/domain/ekspor-kedaluwarsa.mjs`, sumber
 * yang sama dengan `bersihkanEksporKedaluwarsa()` di
 * `lifecycle-tenant-repository.ts`.
 *
 * Pemakaian:
 *   npm run platform:cleanup-exports -- --dry-run
 *   npm run platform:cleanup-exports -- --json
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mysql from "mysql2/promise";

import {
  hapusBerkasEkspor,
  periksaBerkasEkspor,
  pilihKedaluwarsa,
} from "../../src/features/multi-desa/domain/ekspor-kedaluwarsa.mjs";

const PREFIX = "[platform:cleanup-exports]";
const UKURAN_BATCH = 500;
const BANTUAN = `Pemakaian:
  node scripts/platform/cleanup-exports.mjs [--dry-run] [--json]

Opsi:
  --dry-run   Laporkan berkas/baris yang akan dihapus tanpa mengubah apa pun.
  --json      Cetak ringkasan mesin (satu baris JSON) ke stdout.
  --help      Tampilkan bantuan ini.`;

/** Muat `.env` tanpa menimpa environment yang sudah disetel pemanggil. */
function muatEnv() {
  if (!fs.existsSync(".env")) return;
  for (const baris of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const cocok = baris.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!cocok) continue;
    const [, kunci, nilai] = cocok;
    if (process.env[kunci] !== undefined) continue;
    process.env[kunci] = nilai.replace(/^["']|["']$/g, "");
  }
}

function gagal(pesan) {
  const error = new Error(pesan);
  error.pesanPengguna = pesan;
  throw error;
}

/**
 * Urai argumen CLI.
 *
 * Fungsi murni agar dapat diuji tanpa database maupun filesystem.
 */
export function parseArgumen(argv) {
  const hasil = { dryRun: false, json: false, help: false };
  const sisa = [...argv];

  while (sisa.length > 0) {
    const arg = sisa.shift();

    if (arg === "--help" || arg === "-h") {
      hasil.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      hasil.dryRun = true;
      continue;
    }
    if (arg === "--json") {
      hasil.json = true;
      continue;
    }

    gagal(`Argumen tidak dikenal: ${arg}`);
  }

  return hasil;
}

/**
 * Ambil metadata ekspor lalu saring dengan aturan bersama.
 *
 * Query sengaja tanpa kondisi SQL sendiri: satu-satunya definisi
 * "kedaluwarsa" ada di `pilihKedaluwarsa`, sehingga CLI dan repository tidak
 * dapat menyimpang. Tabel hanya berisi ekspor maksimal 30 hari.
 */
async function ambilKedaluwarsa(koneksi) {
  const [baris] = await koneksi.query(
    `SELECT id, berkas, kedaluwarsa_pada AS kedaluwarsaPada
       FROM tenant_exports
      ORDER BY kedaluwarsa_pada ASC, id ASC`,
  );
  return pilihKedaluwarsa(baris);
}

/** Hapus baris `tenant_exports` per batch agar IN-list tidak membengkak. */
async function hapusBaris(koneksi, daftar) {
  let barisDihapus = 0;
  for (let mulai = 0; mulai < daftar.length; mulai += UKURAN_BATCH) {
    const potongan = daftar.slice(mulai, mulai + UKURAN_BATCH).map((catatan) => catatan.id);
    if (potongan.length === 0) continue;
    const [hasil] = await koneksi.query("DELETE FROM tenant_exports WHERE id IN (?)", [potongan]);
    barisDihapus += Number(hasil.affectedRows ?? 0);
  }
  return barisDihapus;
}

async function main() {
  muatEnv();

  const opsi = parseArgumen(process.argv.slice(2));
  if (opsi.help) {
    process.stdout.write(`${BANTUAN}\n`);
    return;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) gagal("DATABASE_URL belum disetel.");

  const akarEkspor = path.join(process.cwd(), "storage", "exports");

  const koneksi = await mysql.createConnection(databaseUrl);
  let ringkasan;
  try {
    const kedaluwarsa = await ambilKedaluwarsa(koneksi);
    const berkas = opsi.dryRun
      ? periksaBerkasEkspor(akarEkspor, kedaluwarsa)
      : await hapusBerkasEkspor(akarEkspor, kedaluwarsa);
    const barisDihapus = opsi.dryRun ? 0 : await hapusBaris(koneksi, kedaluwarsa);

    ringkasan = {
      ok: true,
      dryRun: opsi.dryRun,
      diperiksa: kedaluwarsa.length,
      ...berkas,
      barisDihapus,
    };
  } finally {
    await koneksi.end();
  }

  if (opsi.json) {
    process.stdout.write(`${JSON.stringify(ringkasan)}\n`);
    return;
  }

  const awalan = opsi.dryRun ? "Akan dihapus" : "Dihapus";
  process.stdout.write(
    `${PREFIX} ${awalan}: ${ringkasan.diperiksa} catatan ekspor kedaluwarsa ` +
      `(berkas=${ringkasan.berkasDihapus}, tidak ada=${ringkasan.berkasTidakAda}, ` +
      `dilewati=${ringkasan.berkasDilewati}, baris=${ringkasan.barisDihapus}).\n`,
  );
  if (ringkasan.berkasDilewati > 0) {
    process.stdout.write(
      `${PREFIX} ${ringkasan.berkasDilewati} berkas dilewati karena path di luar ` +
        `storage/exports atau tidak dapat dihapus; periksa manual.\n`,
    );
  }
}

const dijalankanLangsung =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (dijalankanLangsung) {
  main().catch((error) => {
    const pesan = error?.pesanPengguna ?? error?.message ?? String(error);
    console.error(`${PREFIX} ${pesan}`);
    process.exit(1);
  });
}
