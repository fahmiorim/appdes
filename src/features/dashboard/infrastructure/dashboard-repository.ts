import "server-only";

import { count, eq } from "drizzle-orm";

import { db } from "@/db";
import { families, letters, residents } from "@/db/schema";

export interface DashboardStats {
  residents: number;
  families: number;
  letters: number;
}

/** Statistik dashboard yang seluruh query-nya dibatasi tenant aktif. */
export async function getDashboardStats(villageId: number): Promise<DashboardStats> {
  const [residentRows, familyRows, letterRows] = await Promise.all([
    db.select({ total: count() }).from(residents).where(eq(residents.villageId, villageId)),
    db.select({ total: count() }).from(families).where(eq(families.villageId, villageId)),
    db.select({ total: count() }).from(letters).where(eq(letters.villageId, villageId)),
  ]);

  return {
    residents: residentRows[0]?.total ?? 0,
    families: familyRows[0]?.total ?? 0,
    letters: letterRows[0]?.total ?? 0,
  };
}
