import { NextResponse } from "next/server";

import { exportAuditLogs } from "@/features/audit/application/audit-use-cases";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";

function cell(value: unknown): string {
  const raw = String(value ?? "");
  const protectedValue = /^[=+@-]/.test(raw.trimStart()) ? "'" + raw : raw;
  const escaped = protectedValue.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? '"' + escaped + '"' : escaped;
}

export async function GET() {
  const user = await requirePermission(RESOURCES.auditLog, "read");
  const villageId = await resolveVillageId(user);
  const rows = await exportAuditLogs(villageId);
  const header = [
    "Waktu",
    "Pengguna",
    "Peristiwa",
    "Resource",
    "ID Resource",
    "IP Address",
    "Perangkat",
    "Detail",
  ];
  const csv = [
    header,
    ...rows.map((row) => [
      row.createdAt.toISOString(),
      row.actorName ?? "Sistem",
      row.event,
      row.resource,
      row.resourceId ?? "",
      row.ipAddress ?? "",
      row.userAgent ?? "",
      row.details ?? "",
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="aktivitas-pengguna.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
