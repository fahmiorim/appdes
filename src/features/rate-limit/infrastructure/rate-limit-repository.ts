import "server-only";

import { createHmac } from "node:crypto";
import type { RowDataPacket } from "mysql2";

import { pool } from "@/db";
import { env } from "@/lib/env";

import { milidetikKeKuotaBerikutnya, saringPermintaanAktif } from "../domain/rate-limit";

let cleanupTerakhir = 0;
const JEDA_PEMBERSIHAN_MS = 60_000;

export interface CatatanRateLimit {
  jumlah: number;
  resetMs: number;
}

/** Records an exact sliding window under a transaction shared by all instances. */
export async function catatPermintaanRateLimit(
  key: string,
  batas: number,
  jendelaMs: number,
  sekarang: number,
): Promise<CatatanRateLimit> {
  const keyHash = createHmac("sha256", env.BETTER_AUTH_SECRET).update(key).digest("hex");
  const connection = await pool.getConnection();

  let transactionStarted = false;
  try {
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.execute(
      `INSERT IGNORE INTO rate_limit_entries
        (key_hash, request_times, expires_at)
       VALUES (?, JSON_ARRAY(), ?)`,
      [keyHash, sekarang + jendelaMs],
    );
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT CAST(request_times AS CHAR) AS request_times
       FROM rate_limit_entries WHERE key_hash = ? FOR UPDATE`,
      [keyHash],
    );
    const raw = rows[0]?.request_times;
    if (typeof raw !== "string") throw new Error("Catatan rate limit tidak ditemukan.");

    const tersimpan: unknown = JSON.parse(raw);
    if (
      !Array.isArray(tersimpan) ||
      !tersimpan.every((waktu) => Number.isSafeInteger(waktu) && waktu >= 0)
    ) {
      throw new Error("Catatan rate limit tidak valid.");
    }

    const aktif = saringPermintaanAktif(tersimpan as number[], sekarang, jendelaMs);
    // Permintaan saat ini ikut dihitung, tetapi hanya disimpan selama kuota
    // masih tersedia. Menyimpan percobaan yang sudah ditolak akan membuat
    // array tumbuh tanpa batas, sedangkan tidak menghitungnya membuat
    // permintaan ke-(batas+1) tetap lolos (kuota tidak pernah terlampaui).
    const jumlah = aktif.length + 1;
    if (aktif.length < batas) aktif.push(sekarang);

    const resetMs = milidetikKeKuotaBerikutnya(aktif, sekarang, jendelaMs);
    const expiresAt = sekarang + resetMs;
    await connection.execute(
      `UPDATE rate_limit_entries
       SET request_times = ?, expires_at = ?
       WHERE key_hash = ?`,
      [JSON.stringify(aktif), expiresAt, keyHash],
    );
    await connection.commit();

    bersihkanRateLimitKedaluwarsa(sekarang);
    return { jumlah, resetMs };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw error;
  } finally {
    connection.release();
  }
}

function bersihkanRateLimitKedaluwarsa(sekarang: number): void {
  if (sekarang - cleanupTerakhir < JEDA_PEMBERSIHAN_MS) return;
  cleanupTerakhir = sekarang;
  void pool
    .execute("DELETE FROM rate_limit_entries WHERE expires_at <= ?", [sekarang])
    .catch(() => {
      cleanupTerakhir = 0;
    });
}
