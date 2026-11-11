import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  buildKiaCsv,
  bulananAnakSchema,
  hitungSkorcardKia,
  ibuHamilSchema,
  KIA_RESOURCE,
  kiaRekapFilename,
  kiaSchema,
  posyanduSchema,
} from "@/features/kesehatan/domain/kesehatan";
import {
  createBulananAnak,
  createIbuHamil,
  createKia,
  createPosyandu,
  deleteBulananAnak,
  deleteIbuHamil,
  deleteKia,
  deletePosyandu,
  listBulananAnak,
  listIbuHamil,
  listKia,
  listPosyandu,
  updateBulananAnak,
  updateIbuHamil,
  updateKia,
  updatePosyandu,
} from "@/features/kesehatan/infrastructure/kesehatan-repository";
import { listPendudukOptions } from "@/features/penduduk/infrastructure/penduduk-repository";
import type { Action } from "@/features/rbac/domain/permission";
import { requirePermission } from "@/lib/dal";
import { AppError } from "@/lib/errors";

async function konteksKia(action: Action): Promise<number> {
  const user = await requirePermission(KIA_RESOURCE, action);
  return resolveVillageId(user);
}

function validasiId(id: number): void {
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError("VALIDATION", "ID tidak valid.");
  }
}

/** Data halaman pemantauan anak beserta opsi posyandu dan KIA. */
export async function muatPemantauanAnakData() {
  const villageId = await konteksKia("read");
  return Promise.all([listBulananAnak(villageId), listPosyandu(villageId), listKia(villageId)]);
}

/** Data halaman pemantauan ibu hamil beserta opsi posyandu dan KIA. */
export async function muatPemantauanIbuHamilData() {
  const villageId = await konteksKia("read");
  return Promise.all([listIbuHamil(villageId), listPosyandu(villageId), listKia(villageId)]);
}

/** Data halaman KIA beserta opsi penduduk dan posyandu. */
export async function muatKiaData() {
  const villageId = await konteksKia("read");
  return Promise.all([listKia(villageId), listPendudukOptions(villageId), listPosyandu(villageId)]);
}

/** Daftar posyandu desa untuk halaman admin. */
export async function daftarPosyanduData() {
  const villageId = await konteksKia("read");
  return listPosyandu(villageId);
}

export async function tambahPosyandu(
  input: Omit<Parameters<typeof createPosyandu>[0], "villageId">,
) {
  const villageId = await konteksKia("update");
  const parsed = posyanduSchema.omit({ id: true, villageId: true }).parse(input);
  return createPosyandu({ ...parsed, villageId });
}

export async function ubahPosyandu(id: number, input: unknown) {
  validasiId(id);
  const villageId = await konteksKia("update");
  const parsed = posyanduSchema.omit({ id: true, villageId: true }).partial().parse(input);
  return updatePosyandu(id, villageId, parsed);
}

export async function hapusPosyandu(id: number) {
  validasiId(id);
  const villageId = await konteksKia("delete");
  return deletePosyandu(id, villageId);
}

export async function tambahKia(input: Omit<Parameters<typeof createKia>[0], "villageId">) {
  const villageId = await konteksKia("update");
  const parsed = kiaSchema.omit({ id: true, villageId: true }).parse(input);
  return createKia({ ...parsed, villageId });
}

export async function ubahKia(id: number, input: unknown) {
  validasiId(id);
  const villageId = await konteksKia("update");
  const parsed = kiaSchema.omit({ id: true, villageId: true }).partial().parse(input);
  return updateKia(id, villageId, parsed);
}

export async function hapusKia(id: number) {
  validasiId(id);
  const villageId = await konteksKia("delete");
  return deleteKia(id, villageId);
}

export async function tambahIbuHamil(
  input: Omit<Parameters<typeof createIbuHamil>[0], "villageId">,
) {
  const villageId = await konteksKia("update");
  const parsed = ibuHamilSchema.omit({ id: true, villageId: true }).parse(input);
  return createIbuHamil({ ...parsed, villageId });
}

export async function ubahIbuHamil(id: number, input: unknown) {
  validasiId(id);
  const villageId = await konteksKia("update");
  const parsed = ibuHamilSchema.omit({ id: true, villageId: true }).partial().parse(input);
  return updateIbuHamil(id, villageId, parsed);
}

export async function hapusIbuHamil(id: number) {
  validasiId(id);
  const villageId = await konteksKia("delete");
  return deleteIbuHamil(id, villageId);
}

export async function tambahBulananAnak(
  input: Omit<Parameters<typeof createBulananAnak>[0], "villageId">,
) {
  const villageId = await konteksKia("update");
  const parsed = bulananAnakSchema.omit({ id: true, villageId: true }).parse(input);
  return createBulananAnak({ ...parsed, villageId });
}

export async function ubahBulananAnak(id: number, input: unknown) {
  validasiId(id);
  const villageId = await konteksKia("update");
  const parsed = bulananAnakSchema.omit({ id: true, villageId: true }).partial().parse(input);
  return updateBulananAnak(id, villageId, parsed);
}

export async function hapusBulananAnak(id: number) {
  validasiId(id);
  const villageId = await konteksKia("delete");
  return deleteBulananAnak(id, villageId);
}

/** Ekspor rekapitulasi KIA sebagai CSV dengan filter opsional status gizi/tikar. */
export async function exportRekapKia(
  params: {
    statusGizi?: number;
    statusTikar?: number;
    posyanduId?: number;
  } = {},
): Promise<{ csv: string; filename: string }> {
  const villageId = await konteksKia("read");

  const bulananRows = await listBulananAnak(villageId);

  let filteredBulanan = bulananRows;
  if (params.statusGizi !== undefined) {
    filteredBulanan = filteredBulanan.filter((row) => row.statusGizi === params.statusGizi);
  }
  if (params.statusTikar !== undefined) {
    filteredBulanan = filteredBulanan.filter((row) => row.statusTikar === params.statusTikar);
  }

  const kiaRows = await listKia(villageId);
  const kiaMap = new Map(kiaRows.map((row) => [row.id, row]));

  const posyanduRows = await listPosyandu(villageId);
  const posyanduMap = new Map(posyanduRows.map((p) => [p.id, p.nama]));

  const csvRows = filteredBulanan.map((row) => ({
    statusGizi: row.statusGizi,
    statusTikar: row.statusTikar,
    posyanduId: row.posyanduId as number | undefined,
    posyanduName: row.posyanduId !== undefined ? posyanduMap.get(row.posyanduId) || "-" : "-",
    ibuName: kiaMap.get(row.kiaId)?.ibuName ?? "-",
    konversi:
      row.statusGizi === 4 || row.statusTikar === 4
        ? "Tinggi"
        : row.statusGizi >= 3 || row.statusTikar >= 3
          ? "Sedang"
          : "Rendah",
  }));

  const skorcard = hitungSkorcardKia(
    csvRows.map((row) => ({
      statusGizi: row.statusGizi,
      statusTikar: row.statusTikar,
      posyanduId: row.posyanduId,
    })),
  );

  return {
    csv: buildKiaCsv({
      namaDesa: null,
      judulPemilihan: "KIA - Kesehatan Ibu dan Anak",
      tanggalPemilihan: new Date().toISOString().slice(0, 10),
      rows: csvRows,
      total: skorcard.total,
      stunting: skorcard.stunting,
      konversiPersentase: skorcard.konversi,
    }),
    filename: kiaRekapFilename(null),
  };
}
