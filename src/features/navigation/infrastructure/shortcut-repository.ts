import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { penggunaShortcut } from "@/db/schema/pengguna-shortcut";

/** Href pintasan milik satu pengguna, berurutan. */
export async function listShortcut(userId: string): Promise<string[]> {
  const rows = await db
    .select({ href: penggunaShortcut.href })
    .from(penggunaShortcut)
    .where(eq(penggunaShortcut.userId, userId))
    .orderBy(asc(penggunaShortcut.urut), asc(penggunaShortcut.id));

  return rows.map((row) => row.href);
}

/**
 * Ganti seluruh pintasan pengguna. Daftar kosong berarti kembali ke bawaan.
 *
 * Hapus dan sisip ulang berada dalam satu transaksi agar kegagalan insert tidak
 * meninggalkan pengguna tanpa pintasan (daftar lama sudah terhapus).
 */
export async function simpanShortcut(userId: string, hrefs: readonly string[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(penggunaShortcut).where(eq(penggunaShortcut.userId, userId));

    if (hrefs.length === 0) return;

    await tx.insert(penggunaShortcut).values(
      hrefs.map((href, urut) => ({
        userId,
        href,
        urut,
      })),
    );
  });
}

/** Hapus satu pintasan (dipakai saat pengguna mengurangi pilihan). */
export async function hapusShortcut(userId: string, href: string): Promise<void> {
  await db
    .delete(penggunaShortcut)
    .where(and(eq(penggunaShortcut.userId, userId), eq(penggunaShortcut.href, href)));
}
