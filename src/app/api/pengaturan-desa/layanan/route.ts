import { NextResponse } from "next/server";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  listLayananDesaAdmin,
  nonaktifkanLayananDesa,
  tambahLayananDesa,
  ubahLayananDesa,
} from "@/features/pengaturan/application/pengaturan-desa-use-cases";
import { requirePermission } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

const response = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
function error(e: unknown) {
  if (isAppError(e)) return response({ error: e.message }, appErrorStatus(e.code));
  console.error("Pengaturan layanan desa gagal:", e);
  return response({ error: "Pengaturan layanan gagal diproses." }, 500);
}
function idValid(id: number): boolean {
  return Number.isInteger(id) && id >= 1;
}
export async function GET() {
  try {
    const user = await requirePermission("pengaturan-desa", "read"),
      villageId = await resolveVillageId(user);
    return response({ data: await listLayananDesaAdmin(villageId) });
  } catch (e) {
    return error(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requirePermission("pengaturan-desa", "update"),
      villageId = await resolveVillageId(user),
      body: unknown = await request.json();
    const id = await tambahLayananDesa(villageId, body);
    return response({ message: "Layanan berhasil ditambahkan.", id }, 201);
  } catch (e) {
    return error(e);
  }
}
export async function PUT(request: Request) {
  try {
    const user = await requirePermission("pengaturan-desa", "update"),
      villageId = await resolveVillageId(user),
      body = (await request.json()) as { id?: unknown; data?: unknown },
      id = Number(body.id);
    if (!idValid(id)) return response({ error: "ID layanan tidak valid." }, 400);
    const ditemukan = await ubahLayananDesa(villageId, id, body.data);
    if (!ditemukan) return response({ error: "Layanan tidak ditemukan." }, 404);
    return response({ message: "Layanan berhasil diperbarui." });
  } catch (e) {
    return error(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const user = await requirePermission("pengaturan-desa", "delete"),
      villageId = await resolveVillageId(user),
      id = Number(new URL(request.url).searchParams.get("id"));
    if (!idValid(id)) return response({ error: "ID layanan tidak valid." }, 400);
    const ditemukan = await nonaktifkanLayananDesa(villageId, id);
    if (!ditemukan) return response({ error: "Layanan tidak ditemukan." }, 404);
    return response({
      message: "Layanan berhasil dinonaktifkan. Riwayat permohonan tetap dipertahankan.",
    });
  } catch (e) {
    return error(e);
  }
}
