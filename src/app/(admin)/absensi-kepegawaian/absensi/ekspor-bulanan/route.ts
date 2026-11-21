import { daftarAbsensiRentang } from "@/features/kepegawaian/application/use-cases";

function csv(value: unknown): string {
  let text = String(value ?? "");
  const first = text[0];
  if (
    first === "=" ||
    first === "+" ||
    first === "-" ||
    first === "@" ||
    first === "\t" ||
    first === "\r"
  )
    text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const now = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const tahun = url.searchParams.get("tahun") ?? now.slice(0, 4);
  const bulan = url.searchParams.get("bulan") ?? now.slice(5, 7);
  if (
    !/^\d{4}$/.test(tahun) ||
    Number(tahun) < 2000 ||
    Number(tahun) > 2200 ||
    !/^\d{1,2}$/.test(bulan) ||
    Number(bulan) < 1 ||
    Number(bulan) > 12
  ) {
    return new Response("Periode laporan tidak valid.", { status: 400 });
  }
  const mulai = `${tahun}-${bulan.padStart(2, "0")}-01`;
  const selesai = new Date(Date.UTC(Number(tahun), Number(bulan), 0)).toISOString().slice(0, 10);
  const rows = await daftarAbsensiRentang(mulai, selesai);
  const lines = [
    [
      "Tanggal",
      "Nama Pegawai",
      "Jabatan",
      "Jam Masuk",
      "Jam Pulang",
      "Status",
      "Terlambat",
      "Catatan",
    ]
      .map(csv)
      .join(","),
    ...rows.map((row) =>
      [
        row.tanggal,
        row.nama,
        row.jabatan,
        row.jamMasuk,
        row.jamKeluar,
        row.status,
        row.terlambat ? "Ya" : "Tidak",
        row.catatan,
      ]
        .map(csv)
        .join(","),
    ),
  ];
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-absensi-${tahun}-${bulan.padStart(2, "0")}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
