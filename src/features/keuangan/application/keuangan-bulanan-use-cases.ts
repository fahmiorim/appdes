import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { formatMoney, KEUANGAN_RESOURCE, sumMoney } from "@/features/keuangan/domain/keuangan";
import {
  listKeuanganBulanan,
  saveKeuanganBulanan,
} from "@/features/keuangan/infrastructure/keuangan-bulanan-repository";
import { requirePermission } from "@/lib/dal";
import { conflict } from "@/lib/errors";

const NAMA_BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;
function money(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000_000)
    throw conflict("Nilai target/realisasi bulanan tidak valid.");
  return formatMoney(BigInt(Math.round(n * 100)));
}
export async function getKeuanganBulanan(tahunParam?: number) {
  const user = await requirePermission(KEUANGAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const tahun =
    Number.isInteger(tahunParam) && (tahunParam ?? 0) >= 2000 && (tahunParam ?? 0) <= 2100
      ? (tahunParam as number)
      : new Date().getFullYear();
  const stored = await listKeuanganBulanan(villageId, tahun);
  const byMonth = new Map(stored.map((x) => [x.bulan, x]));
  const rows = NAMA_BULAN.map((label, index) => {
    const row = byMonth.get(index + 1);
    return {
      bulan: index + 1,
      label,
      target: row?.target ?? "0.00",
      realisasi: row?.realisasi ?? "0.00",
    };
  });
  const totalTarget = sumMoney(rows.map((x) => x.target));
  const totalRealisasi = sumMoney(rows.map((x) => x.realisasi));
  return { tahun, rows, totalTarget, totalRealisasi };
}
export async function simpanKeuanganBulanan(tahun: number, inputs: unknown[]) {
  const user = await requirePermission(KEUANGAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100)
    throw conflict("Tahun anggaran tidak valid.");
  if (!Array.isArray(inputs) || inputs.length !== 12)
    throw conflict("Data target dan realisasi harus berisi 12 bulan.");
  const rows = inputs.map((item, index) => {
    if (!item || typeof item !== "object") throw conflict("Data bulanan tidak valid.");
    const row = item as { bulan?: unknown; target?: unknown; realisasi?: unknown };
    if (row.bulan !== index + 1) throw conflict("Urutan bulan tidak valid.");
    return { bulan: index + 1, target: money(row.target), realisasi: money(row.realisasi) };
  });
  await saveKeuanganBulanan(villageId, tahun, user.id, rows);
  return { tahun };
}
