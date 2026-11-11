import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { toCsv } from "@/features/penduduk/domain/laporan-penduduk";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { getStatistikPendudukUseCase } from "@/features/statistik/application/statistik-use-cases";
import {
  STATISTIK_PENDUDUK_KINDS,
  type StatistikPendudukKind,
} from "@/features/statistik/domain/statistik";
import { getCurrentUser } from "@/lib/dal";

export async function GET(request: Request, _context: RouteContext<"/statistik/penduduk/ekspor">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sesi Anda telah berakhir.", { status: 401 });
  if (!hasPermission(user.permissions, RESOURCES.laporanPenduduk, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get("kind") ?? "gender";
  const kind = (STATISTIK_PENDUDUK_KINDS as readonly string[]).includes(requested)
    ? (requested as StatistikPendudukKind)
    : "gender";
  const villageId = await resolveVillageId(user);
  const result = await getStatistikPendudukUseCase(villageId, { kind, perPage: 100 });

  const csv = `\uFEFF${toCsv([
    ["Kategori", "Total", "Laki-laki", "Perempuan", "Persentase"],
    ...result.rows.map((row) => [
      row.label,
      String(row.total),
      String(row.male),
      String(row.female),
      `${row.percentage}%`,
    ]),
    [
      "Total",
      String(result.summary.total),
      String(result.summary.male),
      String(result.summary.female),
      "100%",
    ],
  ])}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="statistik-${kind}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
