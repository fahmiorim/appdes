import { listKeluarga } from "@/features/keluarga/application/use-cases";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const first = await listKeluarga({ search, page: 1, pageSize: 1000 });
  const pages = await Promise.all(
    Array.from({ length: Math.max(0, first.pageCount - 1) }, (_, index) =>
      listKeluarga({ search, page: index + 2, pageSize: 1000 }),
    ),
  );
  const rows = [...first.rows, ...pages.flatMap((page) => page.rows)];
  const csv = `\uFEFF${toCsv([
    ["Nomor KK", "Kepala Keluarga", "Jumlah Anggota", "Alamat", "Wilayah"],
    ...rows.map((row) => [
      row.number,
      row.headName ?? "",
      String(row.memberCount),
      row.address ?? "",
      row.regionLabel ?? "",
    ]),
  ])}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="data-kartu-keluarga.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
