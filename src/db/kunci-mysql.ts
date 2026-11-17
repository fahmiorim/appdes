import type { RowDataPacket } from "mysql2/promise";

import { pool } from "@/db";

/**
 * Kunci penamaan MySQL (`GET_LOCK`) untuk operasi baca-ubah-tulis lintas
 * permintaan.
 *
 * Beberapa operasi harus membaca state (nilai agregasi keuangan, pemakaian
 * disk media), memutuskannya di aplikasi, lalu menulis. Transaksi saja tidak
 * cukup bila baris yang dibaca belum ada: `SELECT ... FOR UPDATE` tidak
 * mengunci baris yang belum lahir. `GET_LOCK` memberi serialisasi per kunci
 * logis dan bekerja antar-instance karena hidup di server MySQL, bukan di
 * memori proses.
 *
 * Kunci dipegang pada koneksi tersendiri, **di luar** transaksi kerja. Urutan
 * ini penting: bila kunci dilepas di dalam transaksi, transaksi berikutnya
 * dapat memperoleh kunci sebelum commit selesai dan membaca state lama. Di
 * sini `blok` menyelesaikan transaksi (commit) lebih dulu, baru kunci dilepas.
 *
 * Bila koneksi kunci terputus, MySQL melepas kuncinya otomatis.
 */

/** Batas tunggu perolehan kunci; cukup untuk operasi pendek, bukan antrean. */
export const TIMEOUT_KUNCI_DETIK = 10;

/**
 * Jalankan `blok` sambil memegang kunci `nama`.
 *
 * Kunci selalu dilepas di `finally`, termasuk saat `blok` melempar error, agar
 * kegagalan validasi tidak menahan operasi lain sampai timeout.
 *
 * @throws Error bila kunci tidak diperoleh dalam `TIMEOUT_KUNCI_DETIK`.
 */
export async function denganKunciMysql<T>(nama: string, blok: () => Promise<T>): Promise<T> {
  const koneksi = await pool.getConnection();
  try {
    const [baris] = await koneksi.query<(RowDataPacket & { ok: number | null })[]>(
      "SELECT GET_LOCK(?, ?) AS ok",
      [nama, TIMEOUT_KUNCI_DETIK],
    );
    if (Number(baris[0]?.ok) !== 1) {
      throw new Error(
        `Operasi lain sedang berjalan pada ${nama.split(":")[0]}. Coba lagi beberapa saat lagi.`,
      );
    }

    try {
      return await blok();
    } finally {
      await koneksi.query("SELECT RELEASE_LOCK(?)", [nama]);
    }
  } finally {
    koneksi.release();
  }
}
