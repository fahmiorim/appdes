import "server-only";

import { and, count, desc, eq, gte, like, or } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs, users, villages } from "@/db/schema";
import type { AuditEventInput, AuditLogRow } from "@/features/audit/domain/audit";

export interface AuditLogPage {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export async function appendAuditLog(input: AuditEventInput): Promise<void> {
  await db.insert(auditLogs).values({
    villageId: input.villageId,
    actorId: input.actorId ?? null,
    event: input.event,
    resource: input.resource,
    resourceId: input.resourceId ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    details: input.details ? JSON.stringify(input.details) : null,
  });
}

const columns = {
  id: auditLogs.id,
  villageId: auditLogs.villageId,
  actorId: auditLogs.actorId,
  actorName: users.name,
  event: auditLogs.event,
  resource: auditLogs.resource,
  resourceId: auditLogs.resourceId,
  ipAddress: auditLogs.ipAddress,
  userAgent: auditLogs.userAgent,
  details: auditLogs.details,
  createdAt: auditLogs.createdAt,
} as const;

export async function listAuditLogs(
  villageId: number,
  input: {
    page?: number;
    pageSize?: number;
    search?: string;
    resource?: string;
    resourceId?: string;
    event?: string;
    createdAfter?: Date;
  } = {},
): Promise<AuditLogPage> {
  const pageSize = Math.min(Math.max(input.pageSize ?? 25, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  const search = input.search?.trim();
  const conditions = [eq(auditLogs.villageId, villageId)];
  if (input.resource) conditions.push(eq(auditLogs.resource, input.resource));
  if (input.resourceId) conditions.push(eq(auditLogs.resourceId, input.resourceId));
  if (input.event) conditions.push(eq(auditLogs.event, input.event));
  if (input.createdAfter) conditions.push(gte(auditLogs.createdAt, input.createdAfter));

  if (search) {
    const pattern = `%${search}%`;
    const match = or(
      like(auditLogs.event, pattern),
      like(auditLogs.resource, pattern),
      like(auditLogs.resourceId, pattern),
      like(users.name, pattern),
    );
    if (match) conditions.push(match);
  }

  const [rows, totalRows] = await Promise.all([
    db
      .select(columns)
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(and(...conditions)),
  ]);

  const total = totalRows[0]?.value ?? 0;
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export interface AuditLogPlatformRow extends AuditLogRow {
  /** Nama desa pemilik peristiwa; `null` untuk peristiwa tingkat platform. */
  villageName: string | null;
}

export interface AuditLogPlatformPage {
  rows: AuditLogPlatformRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Audit trail lintas tenant untuk konsol platform.
 *
 * Berbeda dari `listAuditLogs` yang selalu dibatasi satu `villageId`, fungsi ini
 * sengaja tidak memfilter tenant karena pemakainya adalah pengelola platform.
 * Guard otorisasi berada di use case, bukan di repository; jangan panggil
 * fungsi ini dari route atau komponen desa.
 */
export async function listAuditLogsLintasDesa(
  input: {
    page?: number;
    pageSize?: number;
    search?: string;
    /** Batasi ke satu desa; `undefined` = semua desa dan peristiwa platform. */
    villageId?: number;
    /** Batasi ke satu jenis peristiwa. */
    event?: string;
  } = {},
): Promise<AuditLogPlatformPage> {
  const pageSize = Math.min(Math.max(input.pageSize ?? 25, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  const search = input.search?.trim();
  const conditions = [];

  if (input.villageId !== undefined) {
    conditions.push(eq(auditLogs.villageId, input.villageId));
  }

  if (input.event) {
    conditions.push(eq(auditLogs.event, input.event));
  }

  if (search) {
    const pattern = `%${search}%`;
    const match = or(
      like(auditLogs.event, pattern),
      like(auditLogs.resource, pattern),
      like(auditLogs.resourceId, pattern),
      like(users.name, pattern),
      like(villages.name, pattern),
    );
    if (match) conditions.push(match);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({ ...columns, villageName: villages.name })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .leftJoin(villages, eq(auditLogs.villageId, villages.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ value: count() })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .leftJoin(villages, eq(auditLogs.villageId, villages.id))
      .where(where),
  ]);

  const total = totalRows[0]?.value ?? 0;
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function countAuditEvents(
  villageId: number,
  createdAfter: Date,
): Promise<Record<string, number>> {
  const rows = await db
    .select({ event: auditLogs.event, total: count() })
    .from(auditLogs)
    .where(and(eq(auditLogs.villageId, villageId), gte(auditLogs.createdAt, createdAfter)))
    .groupBy(auditLogs.event);
  return Object.fromEntries(rows.map((row) => [row.event, Number(row.total)]));
}
