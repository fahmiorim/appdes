import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { daftarAbsensiRentang } from "@/features/kepegawaian/application/use-cases";

function amanPdf(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .slice(0, 52);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const now = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const [year, month] = now.split("-");
  const tahun = url.searchParams.get("tahun") ?? year;
  const bulan = url.searchParams.get("bulan") ?? month;
  if (!/^\d{4}$/.test(tahun) || Number(tahun) < 2000 || Number(tahun) > 2200 || !/^\d{1,2}$/.test(bulan) || Number(bulan) < 1 || Number(bulan) > 12) {
    return new Response("Periode laporan tidak valid.", { status: 400 });
  }
  const mulai = `${tahun}-${bulan.padStart(2, "0")}-01`;
  const selesai = new Date(Date.UTC(Number(tahun), Number(bulan), 0)).toISOString().slice(0, 10);
  const rows = await daftarAbsensiRentang(mulai, selesai);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 842;
  const pageHeight = 595;
  const columns = [
    { title: "Tanggal", x: 30, width: 66 },
    { title: "Nama Pegawai", x: 100, width: 145 },
    { title: "Jabatan", x: 250, width: 115 },
    { title: "Masuk", x: 370, width: 48 },
    { title: "Pulang", x: 422, width: 48 },
    { title: "Status", x: 474, width: 85 },
    { title: "Terlambat", x: 564, width: 55 },
    { title: "Catatan", x: 624, width: 185 },
  ];
  const perPage = 25;
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    page.drawText("LAPORAN ABSENSI PEGAWAI", { x: 30, y: 555, size: 16, font: bold, color: rgb(0.22, 0.12, 0.48) });
    page.drawText(`Periode: ${mulai} s.d. ${selesai}`, { x: 30, y: 536, size: 9, font });
    page.drawText(`Total baris: ${rows.length} | Halaman ${pageIndex + 1}/${totalPages}`, { x: 650, y: 555, size: 8, font });
    page.drawLine({ start: { x: 30, y: 525 }, end: { x: 812, y: 525 }, thickness: 1, color: rgb(0.78, 0.74, 0.86) });
    for (const column of columns) page.drawText(column.title, { x: column.x, y: 508, size: 8, font: bold });
    page.drawLine({ start: { x: 30, y: 500 }, end: { x: 812, y: 500 }, thickness: 0.7, color: rgb(0.65, 0.61, 0.72) });
    const batch = rows.slice(pageIndex * perPage, (pageIndex + 1) * perPage);
    batch.forEach((row, index) => {
      const y = 482 - index * 17;
      const values = [
        row.tanggal,
        row.nama,
        row.jabatan,
        row.jamMasuk,
        row.jamKeluar,
        row.status === "tidak_hadir" ? "Tidak Hadir" : row.status,
        row.terlambat ? "Ya" : "Tidak",
        row.catatan,
      ];
      values.forEach((value, columnIndex) => {
        const column = columns[columnIndex];
        page.drawText(amanPdf(value).slice(0, Math.floor(column.width / 4.5)), {
          x: column.x, y, size: 7, font,
        });
      });
      if (index % 2 === 1) page.drawLine({ start: { x: 30, y: y - 5 }, end: { x: 812, y: y - 5 }, thickness: 0.25, color: rgb(0.9, 0.88, 0.93) });
    });
    if (batch.length === 0) page.drawText("Tidak ada data absensi pada periode ini.", { x: 30, y: 480, size: 9, font });
    page.drawText("FlexiDesa - Sistem Informasi Desa", { x: 30, y: 22, size: 7, font, color: rgb(0.45, 0.42, 0.5) });
  }
  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-absensi-${tahun}-${bulan.padStart(2, "0")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
