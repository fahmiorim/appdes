#!/usr/bin/env node
/**
 * Runner integration test.
 *
 * Default (`npm run test:integration`):
 * - jika `TEST_DATABASE_URL` atau `TEST_DATABASE_ACK=1` tidak tersedia, cetak
 *   status SKIPPED secara eksplisit lalu keluar 0;
 * - jika tersedia, jalankan Vitest integration dengan guard database uji.
 *
 * Mode CI (`npm run test:integration:ci`, `--require-db`):
 * - environment wajib tersedia. Bila tidak, keluar 1 agar CI tidak pernah
 *   melaporkan integration test sebagai lulus hanya karena di-skip.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requireDb = process.argv.includes("--require-db");
const punyaDsn = Boolean(process.env.TEST_DATABASE_URL?.trim());
const punyaAck = process.env.TEST_DATABASE_ACK === "1";

if (!punyaDsn || !punyaAck) {
  const alasan = [
    !punyaDsn ? "TEST_DATABASE_URL belum diisi" : null,
    !punyaAck ? "TEST_DATABASE_ACK bukan 1" : null,
  ]
    .filter(Boolean)
    .join("; ");

  const pesan = `[integration-db] SKIPPED - ${alasan}. Integration test TIDAK dijalankan dan status ini bukan bukti integrasi lulus.`;

  if (requireDb) {
    process.stderr.write(`${pesan} Mode CI mewajibkan database uji disposable.\n`);
    process.exit(1);
  }

  process.stdout.write(`${pesan}\n`);
  process.stdout.write(
    "[integration-db] Siapkan MySQL disposable, lalu set TEST_DATABASE_URL=mysql://user:pass@127.0.0.1:3306/desa_test dan TEST_DATABASE_ACK=1.\n",
  );
  process.exit(0);
}

const root = fileURLToPath(new URL("..", import.meta.url));
const executable = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vitest.cmd" : "vitest",
);

const hasil = spawnSync(executable, ["run", "--config", "vitest.integration.config.mts"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

if (hasil.error) {
  process.stderr.write(`[integration-db] Gagal menjalankan Vitest: ${hasil.error.message}\n`);
  process.exit(1);
}

process.exit(hasil.status ?? 1);
