import { getPengajuanExportData } from "@/features/pelayanan/application/pengajuan-use-cases";

function csv(value: unknown) {
  const text = value instanceof Date ? value.toLocaleString("id-ID") : String(value ?? "");
  return '"' + text.replaceAll('"', '""') + '"';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const statusValue = url.searchParams.get("status") ?? "";
  const allowed = ["diajukan", "diverifikasi", "diproses", "selesai", "ditolak"];
  const status = allowed.includes(statusValue) ? statusValue : undefined;
  const q = (url.searchParams.get("q") ?? "").slice(0, 100);
  const data = await getPengajuanExportData(status, q);
  const header = [
    "No. Tiket",
    "Nama Pemohon",
    "NIK",
    "Telepon",
    "Layanan",
    "Keperluan",
    "Tanggal Pengajuan",
    "Status",
  ];
  const rows = data.rows.map((row) => [
    row.nomorTiket,
    row.namaPemohon,
    row.nik,
    row.telepon,
    row.namaLayanan,
    row.keperluan,
    row.createdAt,
    row.status,
  ]);
  const body = "\uFEFF" + [header, ...rows].map((row) => row.map(csv).join(",")).join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="laporan-pengajuan-layanan.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
