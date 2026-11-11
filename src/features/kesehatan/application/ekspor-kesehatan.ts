import "server-only";

import { getIdentitasByVillage } from "@/features/desa/application/get-identitas";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { KIA_RESOURCE } from "@/features/kesehatan/domain/kesehatan";
import {
  listBulananAnak,
  listIbuHamil,
  listKia,
} from "@/features/kesehatan/infrastructure/kesehatan-repository";
import { csvCell } from "@/lib/csv";
import { requirePermission } from "@/lib/dal";
import { appErrorStatus, isAppError, notFound } from "@/lib/errors";

/** Konteks ekspor kesehatan: desa milik sesi, bukan desa dari input/host publik. */
export async function konteksEksporKesehatan() {
  const user = await requirePermission(KIA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const desa = await getIdentitasByVillage(villageId);

  if (!desa) throw notFound("Identitas desa belum dikonfigurasi.");

  return { desa, villageId };
}

export async function dataEksporKia() {
  const { desa, villageId } = await konteksEksporKesehatan();
  return { desa, rows: await listKia(villageId) };
}

export async function dataEksporIbuHamil() {
  const { desa, villageId } = await konteksEksporKesehatan();
  return { desa, rows: await listIbuHamil(villageId) };
}

export async function dataEksporPemantauanAnak() {
  const { desa, villageId } = await konteksEksporKesehatan();
  return { desa, rows: await listBulananAnak(villageId) };
}

/** Bangun CSV dengan BOM agar karakter Indonesia tetap terbaca di Excel. */
export function csvKesehatan(
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  return `\uFEFF${rows
    .map((row) =>
      row
        .map((value) => csvCell(value === null || value === undefined ? "" : String(value), ","))
        .join(","),
    )
    .join("\r\n")}\r\n`;
}

export function namaBerkasKesehatan(prefix: string, namaDesa: string | null): string {
  const slug =
    (namaDesa ?? "desa")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "desa";

  return `${prefix}-${slug}.csv`;
}

export function responsCsvKesehatan(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export function responsGalatKesehatan(error: unknown): Response {
  if (isAppError(error)) {
    return new Response(error.message, { status: appErrorStatus(error.code) });
  }

  console.error("Gagal membuat ekspor kesehatan:", error);
  return new Response("Gagal membuat ekspor kesehatan.", { status: 500 });
}
