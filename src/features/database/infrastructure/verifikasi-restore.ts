import "server-only";

import mysql, { type RowDataPacket } from "mysql2/promise";

import { TABEL_WAJIB_RESTORE, tabelHilang } from "@/features/database/domain/database";
import { env } from "@/lib/env";

/** Daftar tabel pada basis data target (dipakai untuk verifikasi pasca-restore). */
export async function daftarTabelDatabase(dsn: string = env.DATABASE_URL): Promise<string[]> {
  const koneksi = await mysql.createConnection(dsn);
  try {
    const [baris] = await koneksi.query<RowDataPacket[]>("SHOW TABLES");
    return baris.map((row) => String(Object.values(row)[0] ?? ""));
  } finally {
    await koneksi.end();
  }
}

/**
 * Pastikan restore menghasilkan skema inti, bukan basis data kosong/terpotong.
 * Melempar galat berisi daftar tabel yang hilang agar operator dapat memulihkan
 * backup sebelumnya.
 */
export async function verifikasiPascaRestore(
  dsn?: string,
  wajib: readonly string[] = TABEL_WAJIB_RESTORE,
): Promise<void> {
  const hilang = tabelHilang(await daftarTabelDatabase(dsn), wajib);
  if (hilang.length > 0) {
    throw new Error(
      `Restore tidak lengkap: tabel wajib tidak ditemukan (${hilang.join(", ")}). ` +
        "Pulihkan backup sebelumnya dan periksa berkas dump.",
    );
  }
}
