import "server-only";

import { and, count, desc, eq, like, or } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
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
  input: { page?: number; pageSize?: number; search?: string } = {},
): Promise<AuditLogPage> {
  const pageSize = Math.min(Math.max(input.pageSize ?? 25, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  const search = input.search?.trim();
  const conditions = [eq(auditLogs.villageId, villageId)];

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
