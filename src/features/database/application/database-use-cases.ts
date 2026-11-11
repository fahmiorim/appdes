import "server-only";

import type { Readable } from "node:stream";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { isAllowedSqlFile, normalizeSqlFilename } from "@/features/database/domain/database";
import { createSqlBackup } from "@/features/database/infrastructure/backup";
import { restoreSqlDump } from "@/features/database/infrastructure/restore";
import { verifikasiPascaRestore } from "@/features/database/infrastructure/verifikasi-restore";
import { requireSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { validationError } from "@/lib/errors";

function getRequestContext() {
  return {
    ipAddress: null,
    userAgent: null,
  };
}

/**
 * Backup mencakup seluruh basis data (semua desa), sehingga hanya pengelola
 * platform yang boleh menjalankannya — bukan administrator desa.
 */
export async function unduhBackupSql(gzip = true) {
  const user = await requireSuperAdmin();
  const result = await createSqlBackup({ gzip });
  await recordAuditEvent({
    villageId: user.villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.databaseBackup,
    resource: RESOURCES.database,
    resourceId: "backup",
    details: { aksi: "backup", format: gzip ? "gz" : "sql" },
    ...getRequestContext(),
  });
  return result;
}

export async function pulihkanBackupSql(input: {
  filename: string;
  stream: Readable;
  konfirmasi: boolean;
}) {
  const user = await requireSuperAdmin();
  if (!input.konfirmasi) {
    throw validationError("Konfirmasi restore diperlukan untuk melindungi data.");
  }
  if (!isAllowedSqlFile(input.filename)) {
    throw validationError("Hanya berkas .sql atau .sql.gz yang diizinkan.");
  }
  const lower = input.filename.toLowerCase();
  await restoreSqlDump(input.stream, { gzip: lower.endsWith(".sql.gz") });
  await verifikasiPascaRestore();
  await recordAuditEvent({
    villageId: user.villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.databaseRestore,
    resource: RESOURCES.database,
    resourceId: "restore",
    details: { aksi: "restore", namaBerkas: normalizeSqlFilename(input.filename) },
    ...getRequestContext(),
  });
}
