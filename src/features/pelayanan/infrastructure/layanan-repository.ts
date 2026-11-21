import "server-only";

import { and, count, desc, eq, like, or } from "drizzle-orm";

import { db } from "@/db";
import { layananPublik, pengajuanLayanan } from "@/db/schema";
import { conflict } from "@/lib/errors";

import type { LayananInput } from "../domain/layanan";

export async function listLayanan(villageId: number, cari = "") {
  const where = [eq(layananPublik.villageId, villageId)];
  if (cari.trim()) {
    const q = `%${cari.trim()}%`;
    const cond = or(like(layananPublik.nama, q), like(layananPublik.kategori, q));
    if (cond) where.push(cond);
  }
  return db
    .select()
    .from(layananPublik)
    .where(and(...where))
    .orderBy(desc(layananPublik.updatedAt), desc(layananPublik.id));
}
export async function getLayanan(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(layananPublik)
    .where(and(eq(layananPublik.villageId, villageId), eq(layananPublik.id, id)))
    .limit(1);
  return row ?? null;
}
export async function saveLayanan(villageId: number, id: number | null, input: LayananInput) {
  if (id === null) {
    const [r] = await db
      .insert(layananPublik)
      .values({ villageId, ...input })
      .$returningId();
    if (!r) throw new Error("Gagal menyimpan layanan.");
    return r.id;
  }
  const [r] = await db
    .update(layananPublik)
    .set(input)
    .where(and(eq(layananPublik.villageId, villageId), eq(layananPublik.id, id)));
  if (!r.affectedRows) throw new Error("Layanan tidak ditemukan.");
  return id;
}
export async function removeLayanan(villageId: number, id: number) {
  const [used] = await db
    .select({ total: count() })
    .from(pengajuanLayanan)
    .where(and(eq(pengajuanLayanan.villageId, villageId), eq(pengajuanLayanan.layananId, id)));
  if (Number(used?.total ?? 0) > 0)
    throw conflict("Layanan sudah memiliki riwayat pengajuan. Nonaktifkan layanan, jangan hapus.");
  const [r] = await db
    .delete(layananPublik)
    .where(and(eq(layananPublik.villageId, villageId), eq(layananPublik.id, id)));
  return r.affectedRows > 0;
}
export async function countLayanan(villageId: number) {
  const [r] = await db
    .select({ total: count() })
    .from(layananPublik)
    .where(eq(layananPublik.villageId, villageId));
  return Number(r?.total ?? 0);
}
