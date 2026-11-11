import "server-only";

import type { AuditEventInput } from "@/features/audit/domain/audit";
import { appendAuditLog, listAuditLogs } from "@/features/audit/infrastructure/audit-repository";
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

export async function getAuditLogPageData(input: { page?: number; search?: string }) {
  const user = await requirePermission(RESOURCES.auditLog, "read");
  const villageId = await resolveVillageId(user);
  return listAuditLogs(villageId, { ...input, pageSize: 25 });
}
