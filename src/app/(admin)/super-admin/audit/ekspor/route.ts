import { NextResponse } from "next/server";

import { AUDIT_EVENT_LABELS, type AuditEvent } from "@/features/audit/domain/audit";
import { eksporAuditPlatform } from "@/features/multi-desa/application/audit-platform-use-cases";
import { toCsv } from "@/lib/csv";
import { isAppError } from "@/lib/errors";

/**
 * Unduh audit trail platform sebagai CSV.
 *
 * Guard dan filter dijalankan oleh use case (`requireSuperAdmin`), sehingga
 * route ini tidak dapat dipakai akun desa untuk membaca data tenant lain.
 * Data pribadi tidak pernah masuk laporan: hanya aktor, peristiwa, desa, dan
 * metadata teknis.
 */

function label(event: string): string {
  return event in AUDIT_EVENT_LABELS ? AUDIT_EVENT_LABELS[event as AuditEvent] : event;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { rows, terpotong } = await eksporAuditPlatform({
      search: searchParams.get("q"),
      desa: searchParams.get("desa"),
      event: searchParams.get("event"),
    });

    const csv = `\uFEFF${toCsv([
      ["Waktu", "Aktor", "Peristiwa", "Kode peristiwa", "Resource", "ID resource", "Desa", "IP"],
      ...rows.map((baris) => [
        baris.createdAt.toISOString(),
        baris.actorName ?? "Sistem",
        label(baris.event),
        baris.event,
        baris.resource,
        baris.resourceId ?? "",
        baris.villageName ?? "Platform",
        baris.ipAddress ?? "",
      ]),
    ])}`;

    const tanggal = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="audit-platform-${tanggal}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
        "X-Audit-Terpotong": terpotong ? "1" : "0",
      },
    });
  } catch (error) {
    if (isAppError(error) && (error.code === "FORBIDDEN" || error.code === "UNAUTHENTICATED")) {
      return new NextResponse("Anda tidak memiliki hak akses.", {
        status: error.code === "UNAUTHENTICATED" ? 401 : 403,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    throw error;
  }
}
