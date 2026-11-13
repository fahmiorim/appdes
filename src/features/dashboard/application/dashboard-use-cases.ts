import "server-only";

import {
  getDashboardStats,
  type DashboardStats,
} from "@/features/dashboard/infrastructure/dashboard-repository";

/** Ringkasan statistik dashboard untuk satu desa. */
export async function dashboardStats(villageId: number): Promise<DashboardStats> {
  return getDashboardStats(villageId);
}
