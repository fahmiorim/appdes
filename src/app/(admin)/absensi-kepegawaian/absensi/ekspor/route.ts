import { daftarAbsensi } from "@/features/kepegawaian/application/use-cases";

function csv(value: unknown): string {
  const text = String(value ?? "");
  return '"' + text.replace(/"/g, '""') + '"';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("tanggal");
  const tanggal =
    raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? raw
      : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const rows = await daftarAbsensi(tanggal);
  const lines = [
    ["Tanggal", "Nama Pegawai", "Jabatan", "Jam Masuk", "Jam Pulang", "Status", "Catatan"]
      .map(csv)
      .join(","),
    ...rows.map((x) =>
      [tanggal, x.nama, x.jabatan, x.jamMasuk, x.jamKeluar, x.status ?? "tidak_hadir", x.catatan]
        .map(csv)
        .join(","),
    ),
  ];
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rekap-absensi-${tanggal}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
