"use server";

import { revalidatePath } from "next/cache";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  generateApbdesTemplate,
  parseApbdesFile,
  transformToUpsert,
  validateApbdesRows,
  type ApbdesImportResult,
  type ApbdesValidationResult,
} from "@/features/keuangan/domain/apbdes-import";
import { KEUANGAN_RESOURCE } from "@/features/keuangan/domain/keuangan";
import {
  listTemplateUuid,
  upsertKeuanganBatch,
} from "@/features/keuangan/infrastructure/keuangan-repository";
import { errorState, successState, toErrorState, type ActionState } from "@/lib/action-state";
import { requirePermission } from "@/lib/dal";

const KEUANGAN_PATH = "/keuangan/anggaran";

/**
 * Download template APBDes Excel.
 */
export async function downloadApbdesTemplateAction(): Promise<Buffer> {
  const user = await requirePermission(KEUANGAN_RESOURCE, "read");
  await resolveVillageId(user);

  return generateApbdesTemplate();
}

/**
 * Validasi file APBDes tanpa menyimpan (preview).
 */
export async function validateApbdesFileAction(
  _prev: ActionState<{
    results: ApbdesValidationResult[];
    validCount: number;
    errorCount: number;
  }>,
  formData: FormData,
): Promise<
  ActionState<{
    results: ApbdesValidationResult[];
    validCount: number;
    errorCount: number;
  }>
> {
  await requirePermission(KEUANGAN_RESOURCE, "update");

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorState("File tidak valid.");
  }

  if (file.size === 0) {
    return errorState("File kosong.");
  }

  if (file.size > 10 * 1024 * 1024) {
    return errorState("Ukuran file maksimal 10 MB.");
  }

  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ];
  if (!allowedTypes.includes(file.type)) {
    return errorState("Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await parseApbdesFile(buffer, file.name);
    const { validRows, results } = validateApbdesRows(rows);

    return successState(
      `Validasi selesai: ${validRows.length} baris valid, ${results.length - validRows.length} baris error.`,
      {
        results,
        validCount: validRows.length,
        errorCount: results.length - validRows.length,
      },
    );
  } catch (err) {
    console.error("Gagal validasi file APBDes:", err);
    return toErrorState(err);
  }
}

/**
 * Impor APBDes dari file Excel/CSV.
 * Transaksional: all-or-nothing.
 */
export async function imporApbdesAction(
  _prev: ActionState<ApbdesImportResult>,
  formData: FormData,
): Promise<ActionState<ApbdesImportResult>> {
  const user = await requirePermission(KEUANGAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const file = formData.get("file");
  const tahunRaw = formData.get("tahun");

  if (!(file instanceof File)) {
    return errorState("File tidak valid.");
  }

  if (file.size === 0) {
    return errorState("File kosong.");
  }

  if (file.size > 10 * 1024 * 1024) {
    return errorState("Ukuran file maksimal 10 MB.");
  }

  const tahun = typeof tahunRaw === "string" ? Number(tahunRaw) : Number.NaN;
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) {
    return errorState("Tahun anggaran tidak valid.");
  }

  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ];
  if (!allowedTypes.includes(file.type)) {
    return errorState("Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await parseApbdesFile(buffer, file.name);
    const { validRows, results } = validateApbdesRows(rows);

    if (validRows.length === 0) {
      return errorState("Tidak ada baris valid untuk diimpor.");
    }

    // Get all template codes that exist in DB
    const allTemplateCodes = await listTemplateUuid();

    // Filter valid rows to only those with existing template codes
    const upsertRows = validRows.filter((row) => allTemplateCodes.has(row.kode_rekening.trim()));

    if (upsertRows.length === 0) {
      return errorState("Tidak ada kode rekening yang cocok dengan template sistem.");
    }

    // Transform to upsert format
    const upsertData = transformToUpsert(upsertRows, villageId, tahun, user.id);

    // Transactional upsert
    await upsertKeuanganBatch(upsertData);

    // Build error report for invalid rows
    const errors = results
      .filter((r) => !r.valid)
      .map((r) => ({
        row: rows.indexOf(r.row) + 2, // +2 for header + 1-based
        kode_rekening: r.row.kode_rekening,
        errors: r.errors,
      }));

    // Also add rows with non-existing template codes as errors
    const missingTemplateRows = validRows.filter(
      (row) => !allTemplateCodes.has(row.kode_rekening.trim()),
    );
    for (const row of missingTemplateRows) {
      errors.push({
        row: rows.indexOf(row) + 2,
        kode_rekening: row.kode_rekening,
        errors: [`Kode rekening tidak ditemukan di template sistem: ${row.kode_rekening}`],
      });
    }

    const result: ApbdesImportResult = {
      success: upsertRows.length,
      errors,
    };

    revalidatePath(KEUANGAN_PATH);
    revalidatePath("/keuangan");

    return successState(
      `Impor selesai: ${upsertRows.length} rekening diperbarui/ditambahkan.`,
      result,
    );
  } catch (err) {
    console.error("Gagal impor APBDes:", err);
    return toErrorState(err);
  }
}
