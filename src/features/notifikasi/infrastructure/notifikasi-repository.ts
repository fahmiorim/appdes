import "server-only";

import { and, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { notifikasiTerkirim } from "@/db/schema/notifikasi-terkirim";

import type { FilterNotifikasi } from "../domain/notifikasi";

/** Baris bukti pengiriman yang siap disimpan. */
export type BuktiNotifikasiBaru = typeof notifikasiTerkirim.$inferInsert;

export interface BarisNotifikasi {
  id: number;
  jenis: string;
  kanal: string;
  target: string;
  subjek: string | null;
  sukses: boolean;
  dilewati: boolean;
  pesanError: string | null;
  createdAt: Date;
}

export interface RingkasanNotifikasi {
  total: number;
  sukses: number;
  gagal: number;
  dilewati: number;
}

function kondisi(villageId: number, filter: FilterNotifikasi) {
  const syarat = [eq(notifikasiTerkirim.villageId, villageId)];

  if (filter.kanal) syarat.push(eq(notifikasiTerkirim.kanal, filter.kanal));
  if (filter.status === "sukses") syarat.push(eq(notifikasiTerkirim.sukses, true));
  if (filter.status === "dilewati") syarat.push(eq(notifikasiTerkirim.dilewati, true));
  if (filter.status === "gagal") {
    syarat.push(eq(notifikasiTerkirim.sukses, false), eq(notifikasiTerkirim.dilewati, false));
  }

  return and(...syarat);
}

/** Simpan bukti pengiriman (sukses maupun gagal). */
export async function catatPengiriman(bukti: BuktiNotifikasiBaru): Promise<void> {
  await db.insert(notifikasiTerkirim).values(bukti);
}

/** Riwayat notifikasi terbaru (maksimal 50 baris). */
export async function listNotifikasi(
  villageId: number,
  filter: FilterNotifikasi,
): Promise<BarisNotifikasi[]> {
  return db
    .select({
      id: notifikasiTerkirim.id,
      jenis: notifikasiTerkirim.jenis,
      kanal: notifikasiTerkirim.kanal,
      target: notifikasiTerkirim.target,
      subjek: notifikasiTerkirim.subjek,
      sukses: notifikasiTerkirim.sukses,
      dilewati: notifikasiTerkirim.dilewati,
      pesanError: notifikasiTerkirim.pesanError,
      createdAt: notifikasiTerkirim.createdAt,
    })
    .from(notifikasiTerkirim)
    .where(kondisi(villageId, filter))
    .orderBy(desc(notifikasiTerkirim.createdAt), desc(notifikasiTerkirim.id))
    .limit(50);
}

/** Hitung ringkasan seluruh riwayat desa (tanpa filter). */
export async function ringkasanNotifikasi(villageId: number): Promise<RingkasanNotifikasi> {
  const [row] = await db
    .select({
      total: count(),
      sukses: sql<number>`coalesce(sum(case when ${notifikasiTerkirim.sukses} = 1 then 1 else 0 end), 0)`,
      dilewati: sql<number>`coalesce(sum(case when ${notifikasiTerkirim.dilewati} = 1 then 1 else 0 end), 0)`,
    })
    .from(notifikasiTerkirim)
    .where(eq(notifikasiTerkirim.villageId, villageId));

  const total = Number(row?.total ?? 0);
  const sukses = Number(row?.sukses ?? 0);
  const dilewati = Number(row?.dilewati ?? 0);

  return { total, sukses, gagal: Math.max(total - sukses - dilewati, 0), dilewati };
}
