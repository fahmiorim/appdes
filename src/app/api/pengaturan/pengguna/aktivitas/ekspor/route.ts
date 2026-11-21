import { NextResponse } from "next/server";
import { listAuditLogs } from "@/features/audit/infrastructure/audit-repository";
import { requirePermission } from "@/lib/dal";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";

function cell(value: unknown): string {
  const raw = String(value ?? "");
  const protectedValue = /^[\\s]*[=+@-]/.test(raw) ? "'" + raw : raw;
  const escaped = protectedValue.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? '"' + escaped + '"' : escaped;
}

export async function GET() {
  const user = await requirePermission(RESOURCES.auditLog, "read");
  const villageId = await resolveVillageId(user);
  const first = await listAuditLogs(villageId, { page: 1, pageSize: 100 });
  const pages = await Promise.all(Array.from(
    { length: Math.max(0, Math.min(first.pageCount, 100) - 1) },
    (_, index) => listAuditLogs(villageId, { page: index + 2, pageSize: 100 }),
  ));
  const rows = [...first.rows, ...pages.flatMap((page) => page.rows)];
  const header = ["Waktu", "Pengguna", "Peristiwa", "Resource", "ID Resource", "IP Address", "Perangkat", "Detail"];
  const csv = [header, ...rows.map((row) => [
    row.createdAt.toISOString(), row.actorName ?? "Sistem", row.event, row.resource,
    row.resourceId ?? "", row.ipAddress ?? "", row.userAgent ?? "", row.details ?? "",
  ])].map((row) => row.map(cell).join(",")).join("\r\n");
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="aktivitas-pengguna.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
