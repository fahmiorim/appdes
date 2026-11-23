import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  getDataPengaturanDesa,
  simpanIntegrasiDesa,
  simpanKontakDesa,
  simpanProfilDesa,
  terapkanTemplateDesa,
} from "@/features/pengaturan/application/pengaturan-desa-use-cases";
import { simpanPengaturanTenant } from "@/features/pengaturan/application/pengaturan-use-cases";
import { requirePermission } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

export const runtime = "nodejs";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const umumSchema = z.object({
  komentarAktif: z.boolean(),
  beritaBeranda: z.coerce.number().int().min(1).max(12),
  pendaftaranWargaAktif: z.boolean(),
  penomoranSurat: z.coerce.number().int().min(1).max(4),
});
function handleError(error: unknown) {
  if (isAppError(error)) return json({ error: error.message }, appErrorStatus(error.code));
  console.error("Pengaturan desa gagal diproses:", error);
  return json({ error: "Pengaturan desa gagal diproses." }, 500);
}
export async function GET() {
  try {
    const user = await requirePermission("pengaturan-desa", "read"),
      villageId = await resolveVillageId(user);
    return json(await getDataPengaturanDesa(villageId));
  } catch (error) {
    return handleError(error);
  }
}
export async function PUT(request: Request) {
  try {
    const user = await requirePermission("pengaturan-desa", "update"),
      villageId = await resolveVillageId(user);
    const body = (await request.json()) as { section?: string; data?: unknown };
    if (body.section === "profil") {
      await simpanProfilDesa(villageId, body.data);
      return json({ message: "Profil dan identitas desa berhasil disimpan." });
    }
    if (body.section === "kontak") {
      await simpanKontakDesa(villageId, body.data);
      return json({ message: "Kontak dan lokasi berhasil disimpan." });
    }
    if (body.section === "integrasi") {
      await simpanIntegrasiDesa(villageId, body.data);
      return json({ message: "Pengaturan integrasi berhasil disimpan." });
    }
    if (body.section === "umum") {
      const s = umumSchema.safeParse(body.data);
      if (!s.success)
        return json({ error: s.error.issues[0]?.message ?? "Pengaturan umum tidak valid." }, 422);
      await simpanPengaturanTenant(villageId, s.data, user.id);
      return json({ message: "Preferensi umum berhasil disimpan." });
    }
    if (body.section === "tampilan") {
      const message = await terapkanTemplateDesa(villageId, body.data);
      return json({ message });
    }
    return json({ error: "Bagian pengaturan tidak dikenal." }, 400);
  } catch (error) {
    return handleError(error);
  }
}
