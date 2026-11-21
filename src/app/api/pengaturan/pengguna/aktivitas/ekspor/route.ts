import { NextResponse } from "next/server";
import { listAuditLogs } from "@/features/audit/infrastructure/audit-repository";
import { requirePermission } from "@/lib/dal";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";

export async function GET() {
  const user = await requirePermission(RESOURCES.auditLog, "read");
  const villageId = await resolveVillageId(user);
  const first = await listAuditLogs(villageId,{page:1,pageSize:100});
  const pages = await Promise.all(Array.from({length:Math.max(0,Math.min(first.pageCount,100)-1)},(_,i)=>listAuditLogs(villageId,{page:i+2,pageSize:100})));
  const rows = [...first.rows,...pages.flatMap((p)=>p.rows)];
  const header = ["Waktu","Pengguna","Peristiwa","Resource","ID Resource","IP Address","Perangkat","Detail"];
  const csv = [header,...rows.map((r)=>[r.createdAt.toISOString(),r.actorName??"Sistem",r.event,r.resource,r.resourceId??"",r.ipAddress??"",r.userAgent??"",r.details??""])].map((row)=>row.map((v)=>{const s=String(v).replace(/"/g,'""');return /[",\r\n]/.test(s)?`"${s}"`:s;}).join(",")).join("\r\n");
  return new NextResponse("\uFEFF"+csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="aktivitas-pengguna.csv"',"Cache-Control":"private, no-store"}});
}
