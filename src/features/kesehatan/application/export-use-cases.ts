import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  KIA_RESOURCE,
  STATUS_GIZI_ANAK,
  STATUS_KEHAMILAN,
  STATUS_TIKAR_ANAK,
} from "@/features/kesehatan/domain/kesehatan";
import {
  listBulananAnak,
  listIbuHamil,
} from "@/features/kesehatan/infrastructure/kesehatan-repository";
import { hasPermission } from "@/features/rbac/application/authorization";
import { verifySession } from "@/lib/dal";

/** Helper to build simple CSV from rows */
function buildCsv(header: string, rows: string[][]): string {
  const dataRows = rows.map((r) => r.map((v) => `"${v}"`).join(","));
  return `${header}\n${dataRows.join("\n")}`;
}

/** Export Ibu Hamil data as CSV */
export async function exportRekapIbuHamil(): Promise<{ csv: string; filename: string }> {
  const user = await verifySession();
  if (!user) throw new Error("Sesi Anda telah berakhir.");
  if (!hasPermission(user.permissions, KIA_RESOURCE, "read")) {
    throw new Error("Anda tidak memiliki hak akses.");
  }
  const villageId = await resolveVillageId(user);
  const rows = await listIbuHamil(villageId);

  const header =
    "Posyandu,Status Kehamilan,Usia Kehamilan,Tgl Melahirkan,Pemeriksaan Kehamilan,Konsumsi Pil Fe,Pemeriksaan Nifas,Konseling Gizi,Kunjungan Rumah,Akses Air Bersih,Kepemilikan Jamban,Jaminan Kesehatan";
  const csvRows = rows.map((r) => [
    String(r.posyanduId),
    STATUS_KEHAMILAN.find((s) => s.value === r.statusKehamilan)?.label ?? "-",
    String(r.usiaKehamilan ?? "-"),
    r.tanggalMelahirkan ?? "-",
    r.pemeriksaanKehamilan ? "Ya" : "Tidak",
    r.konsumsiPilFe ? "Ya" : "Tidak",
    r.pemeriksaanNifas ? "Ya" : "Tidak",
    r.konselingGizi ? "Ya" : "Tidak",
    r.kunjunganRumah ? "Ya" : "Tidak",
    r.aksesAirBersih ? "Ya" : "Tidak",
    r.kepemilikanJamban ? "Ya" : "Tidak",
    r.jaminanKesehatan ? "Ya" : "Tidak",
  ]);

  const csv = buildCsv(header, csvRows);
  const filename = `rekap-ibu-hamil-${new Date().toISOString().split("T")[0]}.csv`;
  return { csv, filename };
}

/** Export Bulanan Anak data as CSV */
export async function exportRekapBulananAnak(): Promise<{ csv: string; filename: string }> {
  const user = await verifySession();
  if (!user) throw new Error("Sesi Anda telah berakhir.");
  if (!hasPermission(user.permissions, KIA_RESOURCE, "read")) {
    throw new Error("Anda tidak memiliki hak akses.");
  }
  const villageId = await resolveVillageId(user);
  const rows = await listBulananAnak(villageId);

  const header =
    "Posyandu,Umur (bulan),Status Gizi,Status Tikar,Berat Badan (kg),Tinggi Badan (cm),Imunisasi Dasar,Imunisasi Campak";
  const csvRows = rows.map((r) => [
    String(r.posyanduId),
    String(r.umurBulan),
    STATUS_GIZI_ANAK.find((s) => s.value === r.statusGizi)?.label ?? "-",
    STATUS_TIKAR_ANAK.find((s) => s.value === r.statusTikar)?.label ?? "-",
    r.beratBadan?.toString() ?? "-",
    r.tinggiBadan?.toString() ?? "-",
    r.pemberianImunisasiDasar ? "Ya" : "Tidak",
    r.pemberianImunisasiCampak ? "Ya" : r.pemberianImunisasiCampak === null ? "-" : "Tidak",
  ]);

  const csv = buildCsv(header, csvRows);
  const filename = `rekap-bulanan-anak-${new Date().toISOString().split("T")[0]}.csv`;
  return { csv, filename };
}
