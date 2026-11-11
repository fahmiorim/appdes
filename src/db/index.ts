import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import { env } from "@/lib/env";

import * as schema from "./schema";

/**
 * Koneksi database tunggal (connection pool) untuk seluruh aplikasi.
 *
 * Pool disimpan pada `globalThis` saat non-produksi agar tidak membuat koneksi
 * baru setiap kali modul di-reload (HMR) oleh Next.js dev server.
 */
const globalForDb = globalThis as unknown as { __desaPool?: mysql.Pool };

export const pool =
  globalForDb.__desaPool ??
  mysql.createPool({
    uri: env.DATABASE_URL,
    connectionLimit: 10,
    waitForConnections: true,
    enableKeepAlive: true,
    // `dateStrings: false` → kolom DATETIME dikembalikan sebagai Date.
    timezone: "Z",
  });

if (env.NODE_ENV !== "production") {
  globalForDb.__desaPool = pool;
}

export const db = drizzle(pool, { schema, mode: "default" });

export type Database = typeof db;
export { schema };
