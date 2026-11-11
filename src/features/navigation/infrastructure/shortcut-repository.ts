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

/** Ganti seluruh pintasan pengguna. Daftar kosong berarti kembali ke bawaan. */
export async function simpanShortcut(userId: string, hrefs: readonly string[]): Promise<void> {
  await db.delete(penggunaShortcut).where(eq(penggunaShortcut.userId, userId));

  if (hrefs.length === 0) return;

  await db.insert(penggunaShortcut).values(
    hrefs.map((href, urut) => ({
      userId,
      href,
      urut,
    })),
  );
}

/** Hapus satu pintasan (dipakai saat pengguna mengurangi pilihan). */
export async function hapusShortcut(userId: string, href: string): Promise<void> {
  await db
    .delete(penggunaShortcut)
    .where(and(eq(penggunaShortcut.userId, userId), eq(penggunaShortcut.href, href)));
}
