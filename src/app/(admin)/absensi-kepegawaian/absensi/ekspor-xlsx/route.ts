import ExcelJS from "exceljs";

import { daftarAbsensiRentang } from "@/features/kepegawaian/application/use-cases";

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
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FlexiDesa";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Rekap Absensi", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Tanggal", key: "tanggal", width: 14 },
    { header: "Nama Pegawai", key: "nama", width: 28 },
    { header: "Jabatan", key: "jabatan", width: 24 },
    { header: "Jam Masuk", key: "jamMasuk", width: 14 },
    { header: "Jam Pulang", key: "jamKeluar", width: 14 },
    { header: "Status", key: "status", width: 18 },
    { header: "Terlambat", key: "terlambat", width: 14 },
    { header: "Catatan", key: "catatan", width: 36 },
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5122C8" } };
  header.alignment = { vertical: "middle", horizontal: "center" };
  for (const row of rows) {
    sheet.addRow({
      ...row,
      terlambat: row.terlambat ? "Ya" : "Tidak",
      status: row.status === "tidak_hadir" ? "Tidak Hadir" : row.status,
    });
  }
  sheet.autoFilter = { from: "A1", to: "H1" };
  sheet.eachRow((row, index) => {
    if (index > 1) row.alignment = { vertical: "middle" };
  });
  const bytes = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-absensi-${tahun}-${bulan.padStart(2, "0")}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
