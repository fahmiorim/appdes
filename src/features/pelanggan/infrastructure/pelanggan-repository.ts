import "server-only";

import { and, desc, eq, like, or } from "drizzle-orm";

import { db } from "@/db";
import { pelanggan, type NewPelanggan, type Pelanggan } from "@/db/schema/pelanggan";

export async function listPelanggan(
  villageId: number,
  opts?: { q?: string },
): Promise<Pelanggan[]> {
  const where = [eq(pelanggan.villageId, villageId)];
  if (opts?.q) {
    where.push(
      or(
        like(pelanggan.nama, `%${opts.q}%`),
        like(pelanggan.kontak ?? "", `%${opts.q}%`),
        like(pelanggan.alamat ?? "", `%${opts.q}%`),
        like(pelanggan.keterangan ?? "", `%${opts.q}%`),
        like(pelanggan.noKerjasama ?? "", `%${opts.q}%`),
      )!,
    );
  }
  return db
    .select()
    .from(pelanggan)
    .where(and(...where))
    .orderBy(desc(pelanggan.id));
}

export async function findPelanggan(villageId: number, id: number): Promise<Pelanggan | null> {
  const row = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.id, id), eq(pelanggan.villageId, villageId)),
  });
  return row ?? null;
}

export async function createPelanggan(data: NewPelanggan): Promise<number> {
  const result = await db.insert(pelanggan).values(data);
  const insertId = result[0].insertId;
  return typeof insertId === "bigint" ? Number(insertId) : insertId;
}

export async function updatePelanggan(
  id: number,
  villageId: number,
  data: Partial<NewPelanggan>,
): Promise<void> {
  await db
    .update(pelanggan)
    .set(data)
    .where(and(eq(pelanggan.id, id), eq(pelanggan.villageId, villageId)));
}

export async function deletePelanggan(id: number, villageId: number): Promise<void> {
  await db.delete(pelanggan).where(and(eq(pelanggan.id, id), eq(pelanggan.villageId, villageId)));
}

export async function updateStatusLangganan(
  id: number,
  villageId: number,
  data: Partial<
    Pick<
      NewPelanggan,
      "statusLangganan" | "tanggalMulai" | "tanggalSelesai" | "noKerjasama" | "keteranganLangganan"
    >
  >,
): Promise<void> {
  await db
    .update(pelanggan)
    .set(data)
    .where(and(eq(pelanggan.id, id), eq(pelanggan.villageId, villageId)));
}
