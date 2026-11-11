import "server-only";

import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";

import { env } from "@/lib/env";

import { parseDatabaseUrl } from "./database-url";

/** Sumber dump: Readable (mis. bagian multipart) atau iterable potongan byte. */
export type RestoreSource = Readable | AsyncIterable<Uint8Array>;

/**
 * Salurkan dump langsung ke stdin proses `mysql` tanpa menampung seluruh isi
 * berkas di memori. Penutupan stdin lebih awal oleh `mysql` bukan kegagalan
 * tersendiri: pesan asli diambil dari stderr dan kode keluar proses.
 */
export async function restoreSqlDump(
  source: RestoreSource,
  options: { gzip?: boolean; mysqlBin?: string } = {},
): Promise<void> {
  const { username, password, host, port, database } = parseDatabaseUrl(env.DATABASE_URL);
  const args = [`--host=${host}`, `--port=${port}`, `--user=${username}`, database];

  // Path biner dapat diganti saat pengujian, jadi bukan aset yang perlu ditelusuri.
  const child = spawn(/* turbopackIgnore: true */ options.mysqlBin ?? "mysql", args, {
    env: { ...process.env, MYSQL_PWD: password },
  });

  let pesanGalat = "";
  child.stderr.on("data", (chunk) => {
    pesanGalat += chunk.toString();
  });

  const selesai = new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(pesanGalat.trim() || `mysql restore gagal dengan kode ${code}`));
        return;
      }
      resolve();
    });
  });

  const aliran = source instanceof Readable ? source : Readable.from(source);
  const pengaliran = (
    options.gzip ? pipeline(aliran, createGunzip(), child.stdin) : pipeline(aliran, child.stdin)
  ).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "EPIPE") return;
    child.kill();
    throw error;
  });

  await Promise.all([pengaliran, selesai]);
}
