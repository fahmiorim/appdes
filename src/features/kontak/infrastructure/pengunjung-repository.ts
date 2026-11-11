import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { pengunjungLog } from "@/db/schema";

/**
 * Repository statistik pengunjung.
 */

export interface StatistikPengunjungRow {
  tanggal: string;
  jumlah: number;
}

/**
 * Statistik pengunjung per halaman dalam N hari terakhir.
 */
export async function getStatistikPengunjung(
  villageId: number,
  halaman: string,
  jumlahHari = 30,
): Promise<{
  totalPengunjung: number;
  rataRataHarian: number;
  tren: StatistikPengunjungRow[];
}> {
  // Total pengunjung unik (per hari)
  const countRow = await db
    .select({
      total: sql<number>`SUM(${pengunjungLog.jumlah})`,
    })
    .from(pengunjungLog)
    .where(
      and(
        eq(pengunjungLog.villageId, villageId),
        eq(pengunjungLog.halaman, halaman),
        sql`${pengunjungLog.tanggal} >= DATE_SUB(CURDATE(), INTERVAL ${jumlahHari} DAY)`,
      ),
    );

  // Tren harian
  const tren = await db
    .select({
      tanggal: pengunjungLog.tanggal,
      jumlah: sql<number>`SUM(${pengunjungLog.jumlah})`,
    })
    .from(pengunjungLog)
    .where(
      and(
        eq(pengunjungLog.villageId, villageId),
        eq(pengunjungLog.halaman, halaman),
        sql`${pengunjungLog.tanggal} >= DATE_SUB(CURDATE(), INTERVAL ${jumlahHari} DAY)`,
      ),
    )
    .groupBy(pengunjungLog.tanggal)
    .orderBy(desc(pengunjungLog.tanggal))
    .limit(jumlahHari);
  return {
    totalPengunjung: countRow[0]?.total ?? 0,
    rataRataHarian: Math.round(((countRow[0]?.total ?? 0) / jumlahHari) * 100) / 100,
    tren: tren.map((r) => ({
      tanggal: r.tanggal,
      jumlah: Number(r.jumlah ?? 0),
    })),
  };
}
