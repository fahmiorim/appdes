import "server-only";

import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { suplemen, suplemenTerdata } from "@/db/schema/suplemen";

export interface SuplemenPublikRingkas {
  id: number;
  nama: string;
  slug: string;
  sasaran: number;
  keterangan: string | null;
  jumlahTerdata: number;
}

/** Daftar suplemen desa + jumlah data terhimpun. */
export async function listSuplemenPublik(villageId: number): Promise<SuplemenPublikRingkas[]> {
  const [rows, jumlah] = await Promise.all([
    db
      .select({
        id: suplemen.id,
        nama: suplemen.nama,
        slug: suplemen.slug,
        sasaran: suplemen.sasaran,
        keterangan: suplemen.keterangan,
      })
      .from(suplemen)
      .where(eq(suplemen.villageId, villageId))
      .orderBy(suplemen.nama),
    db
      .select({ suplemenId: suplemenTerdata.suplemenId, total: count() })
      .from(suplemenTerdata)
      .where(eq(suplemenTerdata.villageId, villageId))
      .groupBy(suplemenTerdata.suplemenId),
  ]);

  const petaJumlah = new Map(jumlah.map((row) => [row.suplemenId, Number(row.total)]));

  return rows.map((row) => ({ ...row, jumlahTerdata: petaJumlah.get(row.id) ?? 0 }));
}

export interface SuplemenPublikDetail extends SuplemenPublikRingkas {
  /** Nama kolom isian yang muncul pada data terhimpun (tanpa nilai pribadi). */
  kolomIsian: string[];
}

/** Detail suplemen berdasarkan slug; hanya metadata agregat yang dipublikasikan. */
export async function getSuplemenPublikBySlug(
  villageId: number,
  slug: string,
): Promise<SuplemenPublikDetail | null> {
  const [row] = await db
    .select({
      id: suplemen.id,
      nama: suplemen.nama,
      slug: suplemen.slug,
      sasaran: suplemen.sasaran,
      keterangan: suplemen.keterangan,
    })
    .from(suplemen)
    .where(and(eq(suplemen.villageId, villageId), eq(suplemen.slug, slug)))
    .limit(1);

  if (!row) return null;

  const terdata = await db
    .select({ isian: suplemenTerdata.dataFormIsian })
    .from(suplemenTerdata)
    // Slug hanya boleh membuka data terdata milik desa yang sama dengan
    // suplemen; relasi legacy lintas desa tidak ikut dihitung atau dibaca.
    .where(and(eq(suplemenTerdata.suplemenId, row.id), eq(suplemenTerdata.villageId, villageId)));

  const kolom = new Set<string>();
  for (const item of terdata) {
    if (item.isian && typeof item.isian === "object" && !Array.isArray(item.isian)) {
      for (const key of Object.keys(item.isian as Record<string, unknown>)) kolom.add(key);
    }
  }

  return { ...row, jumlahTerdata: terdata.length, kolomIsian: [...kolom].sort() };
}
