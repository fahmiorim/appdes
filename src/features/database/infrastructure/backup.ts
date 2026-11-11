import "server-only";

import { spawn } from "node:child_process";
import { createGzip } from "node:zlib";

import { env } from "@/lib/env";

import { parseDatabaseUrl } from "./database-url";

export async function createSqlBackup(
  options: {
    gzip?: boolean;
  } = {},
): Promise<{ buffer: Buffer; filename: string; mime: string }> {
  const { username, password, host, port, database } = parseDatabaseUrl(env.DATABASE_URL);
  const date = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-sid-${database}-${date}${options.gzip ? ".sql.gz" : ".sql"}`;
  const mime = options.gzip ? "application/gzip" : "application/sql";

  const args = [
    `--host=${host}`,
    `--port=${port}`,
    `--user=${username}`,
    `--single-transaction`,
    `--routines`,
    `--triggers`,
    `--events`,
    `--hex-blob`,
    database,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn("mysqldump", args, {
      env: { ...process.env, MYSQL_PWD: password },
    });
    const chunks: Buffer[] = [];
    let error = "";
    if (options.gzip) {
      const gzip = createGzip({ level: 9 });
      child.stdout.pipe(gzip);
      gzip.on("data", (chunk) => chunks.push(chunk));
    } else {
      child.stdout.on("data", (chunk) => chunks.push(chunk));
    }
    child.stderr.on("data", (chunk) => {
      error += chunk.toString();
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(error || `mysqldump gagal dengan kode ${code}`));
        return;
      }
      resolve({ buffer: Buffer.concat(chunks), filename, mime });
    });
  });
}
