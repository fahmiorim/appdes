import { listPenduduk } from "@/features/penduduk/application/use-cases";
import { toCsv } from "@/features/penduduk/domain/laporan-penduduk";
import {
  calculateAge,
  GENDER_LABELS,
  LIFE_STATUS_LABELS,
  parseFilterPenduduk,
} from "@/features/penduduk/domain/penduduk";
import { isAppError } from "@/lib/errors";

export async function GET(request: Request, _context: RouteContext<"/penduduk/ekspor">) {
  const url = new URL(request.url);
  const filter = parseFilterPenduduk({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    gender: url.searchParams.get("gender") ?? undefined,
    religionId: url.searchParams.get("religionId") ?? undefined,
    educationId: url.searchParams.get("educationId") ?? undefined,
    occupationId: url.searchParams.get("occupationId") ?? undefined,
    maritalStatusId: url.searchParams.get("maritalStatusId") ?? undefined,
    dusun: url.searchParams.get("dusun") ?? undefined,
    rw: url.searchParams.get("rw") ?? undefined,
    rt: url.searchParams.get("rt") ?? undefined,
    umurMin: url.searchParams.get("umurMin") ?? undefined,
    umurMax: url.searchParams.get("umurMax") ?? undefined,
  });

  let result;
  try {
    result = await listPenduduk({ filter, page: 1, pageSize: 100000 });
  } catch (error) {
    if (isAppError(error) && error.code === "FORBIDDEN") {
      return new Response("Anda tidak memiliki hak akses.", { status: 403 });
    }
    if (isAppError(error) && error.code === "UNAUTHENTICATED") {
      return new Response("Sesi Anda telah berakhir.", { status: 401 });
    }
    throw error;
  }

  const rows = result.rows.map((row, index) => [
    String(index + 1),
    row.nationalId ?? "-",
    row.name,
    row.familyNumber ?? "-",
    GENDER_LABELS[row.gender],
    row.birthPlace ?? "-",
    row.birthDate ?? "-",
    calculateAge(row.birthDate)?.toString() ?? "-",
    row.religionName ?? "-",
    row.regionLabel ?? "-",
    LIFE_STATUS_LABELS[row.lifeStatus],
  ]);

  const csv = `\uFEFF${toCsv([
    [
      "No",
      "NIK",
      "Nama",
      "No. KK",
      "Jenis Kelamin",
      "Tempat Lahir",
      "Tanggal Lahir",
      "Usia",
      "Agama",
      "Wilayah",
      "Status",
    ],
    ...rows,
  ])}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="data-penduduk.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
