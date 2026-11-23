import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { villages } from "@/db/schema";
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

/** Mode penomoran surat pada baris desa (sumber kebenaran mesin penomoran). */
export async function bacaPenomoranSurat(villageId: number): Promise<number | null> {
  const [row] = await db
    .select({ penomoranSurat: villages.penomoranSurat })
    .from(villages)
    .where(eq(villages.id, villageId))
    .limit(1);
  return row?.penomoranSurat ?? null;
}

/** Perbarui mode penomoran surat satu desa. */
export async function simpanPenomoranSurat(villageId: number, mode: number): Promise<void> {
  await db.update(villages).set({ penomoranSurat: mode }).where(eq(villages.id, villageId));
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
