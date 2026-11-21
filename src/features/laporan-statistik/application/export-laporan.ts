import "server-only";

import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type ExportFormat = "csv" | "xlsx" | "pdf";
type ExportData = { title: string; filename: string; columns: string[]; rows: (string | number)[][] };

const csvCell = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';

export async function exportLaporan(data: ExportData, format: ExportFormat): Promise<Response> {
  if (format === "csv") {
    const csv = "\uFEFF" + [data.columns, ...data.rows].map(row => row.map(csvCell).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${data.filename}.csv"`, "Cache-Control": "private, no-store" } });
  }
  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "FlexiDes";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Laporan", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.addRow(data.columns);
    for (const row of data.rows) sheet.addRow(row);
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5141A8" } };
    header.alignment = { vertical: "middle", wrapText: true };
    header.height = 24;
    sheet.columns = data.columns.map((column, index) => ({
      key: "c" + index,
      width: Math.min(42, Math.max(14, column.length + 4, ...data.rows.slice(0, 100).map(row => String(row[index] ?? "").length + 2))),
    }));
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, data.rows.length + 1), column: data.columns.length } };
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${data.filename}.xlsx"`, "Cache-Control": "private, no-store" } });
  }
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 842, pageHeight = 595, margin = 34, rowHeight = 18;
  const pageTitle = data.title.slice(0, 100);
  let page = pdf.addPage([pageWidth, pageHeight]), y = pageHeight - margin;
  const drawHeader = () => {
    page.drawText(pageTitle, { x: margin, y, size: 15, font: bold, color: rgb(0.16, 0.13, 0.35) });
    y -= 28;
    const colWidth = (pageWidth - margin * 2) / Math.max(1, data.columns.length);
    data.columns.forEach((column, i) => page.drawText(column.slice(0, 24), { x: margin + i * colWidth, y, size: 8, font: bold, color: rgb(0.3, 0.25, 0.55), maxWidth: colWidth - 4 }));
    y -= rowHeight;
  };
  drawHeader();
  const colWidth = (pageWidth - margin * 2) / Math.max(1, data.columns.length);
  for (const row of data.rows) {
    if (y < margin + rowHeight) { page = pdf.addPage([pageWidth, pageHeight]); y = pageHeight - margin; drawHeader(); }
    row.forEach((value, i) => page.drawText(String(value ?? "").replace(/[\r\n]+/g, " ").slice(0, 48), { x: margin + i * colWidth, y, size: 7.5, font, color: rgb(0.12, 0.12, 0.18), maxWidth: colWidth - 5 }));
    y -= rowHeight;
  }
  const bytes = await pdf.save();
  return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${data.filename}.pdf"`, "Cache-Control": "private, no-store" } });
}
