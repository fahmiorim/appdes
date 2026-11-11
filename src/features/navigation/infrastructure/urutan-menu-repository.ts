import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { penggunaMenuUrutan } from "@/db/schema/pengguna-menu-urutan";

/** Slug menu tingkat atas milik satu pengguna, berurutan. */
export async function listUrutanMenu(userId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: penggunaMenuUrutan.slug })
    .from(penggunaMenuUrutan)
    .where(eq(penggunaMenuUrutan.userId, userId))
    .orderBy(asc(penggunaMenuUrutan.urut), asc(penggunaMenuUrutan.id));

  return rows.map((row) => row.slug);
}

/** Ganti seluruh urutan menu pengguna. Daftar kosong berarti kembali ke bawaan. */
export async function simpanUrutanMenu(userId: string, slugs: readonly string[]): Promise<void> {
  await db.delete(penggunaMenuUrutan).where(eq(penggunaMenuUrutan.userId, userId));

  if (slugs.length === 0) return;

  await db.insert(penggunaMenuUrutan).values(
    slugs.map((slug, urut) => ({
      userId,
      slug,
      urut,
    })),
  );
}
