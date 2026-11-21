import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSavedReport } from "@/features/laporan-statistik/application/laporan-statistik-use-cases";

import styles from "../../../laporan-statistik.module.css";
import { PrintButton } from "../../../print-button";

export const metadata: Metadata = { title: "Detail Laporan Tersimpan" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params,
    id = Number(raw);
  if (!Number.isInteger(id) || id < 1) notFound();
  const report = await getSavedReport(id);
  if (!report) notFound();
  return (
    <div className={styles["ls-page"]}>
      <header className={styles["ls-heading"]}>
        <div>
          <span className={styles["ls-eyebrow"]}>ARSIP LAPORAN</span>
          <h1>{report.judul}</h1>
          <p>
            {report.jenis} · Tahun {report.tahun} · Snapshot tersimpan
          </p>
        </div>
        <div>
          <PrintButton />
          <a href={`/api/laporan-statistik/tersimpan/${report.id}/ekspor`}>Unduh CSV</a>
        </div>
      </header>
      <p>
        <Link href="/laporan-statistik/laporan-desa">← Kembali ke Laporan Desa</Link>
      </p>
      <section className={styles["ls-card"]}>
        <div className={styles["ls-table"]}>
          <table>
            <thead>
              <tr>
                {report.kolom.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.baris.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>
                      {typeof cell === "number"
                        ? new Intl.NumberFormat("id-ID").format(cell)
                        : String(cell ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          {report.baris.length.toLocaleString("id-ID")} baris data · Dibuat{" "}
          {report.createdAt.toLocaleString("id-ID")}
        </p>
      </section>
    </div>
  );
}
