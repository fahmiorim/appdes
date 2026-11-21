import "server-only";

import type { AuditEventInput } from "@/features/audit/domain/audit";
import { appendAuditLog, countAuditEvents, listAuditLogs } from "@/features/audit/infrastructure/audit-repository";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";
import { logger } from "@/lib/logger";

/**
 * Audit tidak boleh membatalkan operasi utama ketika sink pencatatan sedang
 * bermasalah, tetapi kegagalannya tetap terlihat di logger terstruktur.
 */
export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await appendAuditLog(input);
  } catch (error) {
    logger.error("Gagal menyimpan audit trail", { error, event: input.event });
  }
}

export async function getAuditLogPageData(input: { page?: number; search?: string; event?: string; createdAfter?: Date }) {
  const user = await requirePermission(RESOURCES.auditLog, "read");
  const villageId = await resolveVillageId(user);
  const createdAfter = input.createdAfter ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [page, stats] = await Promise.all([
    listAuditLogs(villageId, { ...input, pageSize: 25 }),
    countAuditEvents(villageId, createdAfter),
  ]);
  return { ...page, stats };
}
