import "server-only";

import { and, count, desc, eq, gte, like, lte, or } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { residents } from "@/db/schema/resident";
import { residentMutations } from "@/db/schema/resident-mutation";
import type {
  ListRiwayatParams,
  ListRiwayatResult,
  MutationType,
  RiwayatPendudukRow,
} from "@/features/penduduk/domain/riwayat-penduduk";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

const riwayatColumns = {
  id: residentMutations.id,
  villageId: residentMutations.villageId,
  residentId: residentMutations.residentId,
  type: residentMutations.type,
  eventDate: residentMutations.eventDate,
  reportedAt: residentMutations.reportedAt,
  actorId: residentMutations.actorId,
  reason: residentMutations.reason,
  notes: residentMutations.notes,
  referenceNo: residentMutations.referenceNo,
  fromRegionId: residentMutations.fromRegionId,
  toRegionId: residentMutations.toRegionId,
  fromAddress: residentMutations.fromAddress,
  toAddress: residentMutations.toAddress,
  meta: residentMutations.meta,
  residentName: residents.name,
  residentNationalId: residents.nationalId,
  actorName: users.name,
};

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return String(value ?? "");
}

function whereRiwayat(villageId: number, params: ListRiwayatParams) {
  const conditions = [eq(residentMutations.villageId, villageId)];

  if (params.type && params.type !== "all") {
    conditions.push(eq(residentMutations.type, params.type as MutationType));
  }
  if (params.from) {
    conditions.push(gte(residentMutations.eventDate, params.from));
  }
  if (params.to) {
    conditions.push(lte(residentMutations.eventDate, params.to));
  }
  if (params.q && params.q.trim()) {
    const term = `%${params.q.trim()}%`;
    conditions.push(
      or(
        like(residents.name, term),
        like(residents.nationalId, term),
        like(residentMutations.referenceNo, term),
      )!,
    );
  }

  return and(...conditions);
}

export async function listRiwayatPenduduk(
  villageId: number,
  params: ListRiwayatParams,
): Promise<ListRiwayatResult> {
  const page = Math.max(1, params.page ?? DEFAULT_PAGE);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? DEFAULT_PER_PAGE));
  const offset = (page - 1) * perPage;
  const whereClause = whereRiwayat(villageId, params);

  const rows = await db
    .select(riwayatColumns)
    .from(residentMutations)
    .leftJoin(residents, eq(residents.id, residentMutations.residentId))
    .leftJoin(users, eq(users.id, residentMutations.actorId))
    .where(whereClause)
    .orderBy(desc(residentMutations.eventDate), desc(residentMutations.id))
    .limit(perPage)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: count() })
    .from(residentMutations)
    .leftJoin(residents, eq(residents.id, residentMutations.residentId))
    .where(whereClause);

  return {
    rows: rows.map((row) => ({
      ...row,
      eventDate: toDateString(row.eventDate),
      meta: row.meta ?? null,
    })),
    total: Number(totalRow?.count ?? 0),
    page,
    perPage,
  };
}

/** Semua baris yang cocok filter, tanpa pagination — untuk ekspor CSV. */
export async function listRiwayatPendudukExport(
  villageId: number,
  params: ListRiwayatParams,
): Promise<RiwayatPendudukRow[]> {
  const rows = await db
    .select(riwayatColumns)
    .from(residentMutations)
    .leftJoin(residents, eq(residents.id, residentMutations.residentId))
    .leftJoin(users, eq(users.id, residentMutations.actorId))
    .where(whereRiwayat(villageId, params))
    .orderBy(desc(residentMutations.eventDate), desc(residentMutations.id));

  return rows.map((row) => ({
    ...row,
    eventDate: toDateString(row.eventDate),
    meta: row.meta ?? null,
  }));
}

export async function getRiwayatByResident(
  villageId: number,
  residentId: number,
  limit = 10,
): Promise<RiwayatPendudukRow[]> {
  const rows = await db
    .select(riwayatColumns)
    .from(residentMutations)
    .leftJoin(residents, eq(residents.id, residentMutations.residentId))
    .leftJoin(users, eq(users.id, residentMutations.actorId))
    .where(
      and(eq(residentMutations.villageId, villageId), eq(residentMutations.residentId, residentId)),
    )
    .orderBy(desc(residentMutations.eventDate), desc(residentMutations.id))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    eventDate: toDateString(row.eventDate),
    meta: row.meta ?? null,
  }));
}

/**
 * Simpan penduduk baru sekaligus catatan mutasinya dalam satu transaksi.
 *
 * Dipakai pencatatan kelahiran dan kedatangan: jika salah satu gagal, tidak ada
 * penduduk tanpa riwayat (atau sebaliknya).
 */
export async function simpanPendudukBaruDanMutasi(
  penduduk: typeof residents.$inferInsert,
  mutasi: Omit<typeof residentMutations.$inferInsert, "residentId">,
): Promise<number> {
  return db.transaction(async (tx) => {
    const [inserted] = await tx.insert(residents).values(penduduk).$returningId();

    if (!inserted) throw new Error("Gagal menyimpan data penduduk.");

    await tx.insert(residentMutations).values({ ...mutasi, residentId: inserted.id });

    return inserted.id;
  });
}

/** Ubah status kependudukan dan catat mutasinya dalam satu transaksi. */
export async function ubahStatusPendudukDanMutasi(
  villageId: number,
  residentId: number,
  lifeStatus: (typeof residents.$inferSelect)["lifeStatus"],
  mutasi: Omit<typeof residentMutations.$inferInsert, "residentId">,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(residents)
      .set({ lifeStatus, updatedAt: new Date() })
      .where(and(eq(residents.id, residentId), eq(residents.villageId, villageId)));

    await tx.insert(residentMutations).values({ ...mutasi, residentId });
  });
}
