import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { getStatistikBantuanUseCase } from "@/features/statistik/application/statistik-use-cases";
import {
  STATISTIK_BANTUAN_KINDS,
  type StatistikBantuanKind,
} from "@/features/statistik/domain/statistik";
import { getCurrentUser } from "@/lib/dal";

export async function GET(request: Request, _context: RouteContext<"/statistik/bantuan/ekspor">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sesi Anda telah berakhir.", { status: 401 });
  if (!hasPermission(user.permissions, RESOURCES.bantuan, "read")) {
    return new Response("Anda tidak memiliki hak akses.", { status: 403 });
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get("kind") ?? "program";
  const kind = (STATISTIK_BANTUAN_KINDS as readonly string[]).includes(requested)
    ? (requested as StatistikBantuanKind)
    : "program";
  const programSlug = url.searchParams.get("programSlug") || undefined;
  const dusun = url.searchParams.get("dusun") || undefined;
  const rw = url.searchParams.get("rw") || undefined;
  const rt = url.searchParams.get("rt") || undefined;
  const periodeMulai = url.searchParams.get("periodeMulai") || undefined;
  const periodeAkhir = url.searchParams.get("periodeAkhir") || undefined;
  const sasaranAngka = Number(url.searchParams.get("sasaran"));
  const sasaran =
    Number.isInteger(sasaranAngka) && sasaranAngka >= 1 && sasaranAngka <= 4
      ? sasaranAngka
      : undefined;
  const villageId = await resolveVillageId(user);
  const result = await getStatistikBantuanUseCase(villageId, {
    kind,
    programSlug,
    sasaran,
    dusun,
    rw,
    rt,
    periodeMulai,
    periodeAkhir,
    perPage: 100,
  });

  const csv = `\uFEFF${[
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
  ]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="statistik-bantuan-${kind}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
