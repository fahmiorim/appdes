import type { Metadata } from "next";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { laporanDesaTersimpan } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";
import { PrintButton } from "../../../print-button";
import styles from "../../../laporan-statistik.module.css";
export const metadata: Metadata = { title: "Detail Laporan Tersimpan" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("laporan-statistik", "read");
  const villageId = await resolveVillageId(user), { id: raw } = await params, id = Number(raw);
  if (!Number.isInteger(id) || id < 1) notFound();
  const [report] = await db.select().from(laporanDesaTersimpan).where(and(eq(laporanDesaTersimpan.id, id), eq(laporanDesaTersimpan.villageId, villageId))).limit(1);
  if (!report) notFound();
  return <div className={styles["ls-page"]}><header className={styles["ls-heading"]}><div><span className={styles["ls-eyebrow"]}>ARSIP LAPORAN</span><h1>{report.judul}</h1><p>{report.jenis} · Tahun {report.tahun} · Snapshot tersimpan</p></div><div><PrintButton /><a href={`/api/laporan-statistik/tersimpan/${report.id}/ekspor`}>Unduh CSV</a></div></header><p><Link href="/laporan-statistik/laporan-desa">← Kembali ke Laporan Desa</Link></p><section className={styles["ls-card"]}><div className={styles["ls-table"]}><table><thead><tr>{report.kolom.map((c, i) => <th key={i}>{c}</th>)}</tr></thead><tbody>{report.baris.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{typeof cell === "number" ? new Intl.NumberFormat("id-ID").format(cell) : String(cell ?? "")}</td>)}</tr>)}</tbody></table></div><p>{report.baris.length.toLocaleString("id-ID")} baris data · Dibuat {report.createdAt.toLocaleString("id-ID")}</p></section></div>;
}
