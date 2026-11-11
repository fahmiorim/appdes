import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { pengaturanDesa } from "@/db/schema/pengaturan";

/** Seluruh baris pengaturan satu desa (kunci belum dikenal diabaikan pemanggil). */
export async function listPengaturan(
  villageId: number,
): Promise<Array<{ kunci: string; nilai: string | null }>> {
  return db
    .select({ kunci: pengaturanDesa.kunci, nilai: pengaturanDesa.nilai })
    .from(pengaturanDesa)
    .where(eq(pengaturanDesa.villageId, villageId));
}

/** Simpan/ubah beberapa kunci sekaligus (upsert per kunci). */
export async function simpanPengaturan(
  villageId: number,
  entries: ReadonlyArray<{ kunci: string; nilai: string }>,
): Promise<void> {
  for (const entry of entries) {
    await db
      .insert(pengaturanDesa)
      .values({ villageId, kunci: entry.kunci, nilai: entry.nilai })
      .onDuplicateKeyUpdate({ set: { nilai: entry.nilai } });
  }
}
