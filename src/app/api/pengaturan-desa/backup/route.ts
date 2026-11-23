import { NextResponse } from "next/server";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  getDataBackupDesa,
  pulihkanBackupDesa,
} from "@/features/pengaturan/application/pengaturan-desa-use-cases";
import { requirePermission } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

export const runtime = "nodejs";
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
function handle(error: unknown) {
  if (isAppError(error)) return response({ error: error.message }, appErrorStatus(error.code));
  console.error("Backup konfigurasi desa gagal:", error);
  return response({ error: "Backup konfigurasi gagal diproses." }, 500);
}
export async function GET() {
  try {
    const user = await requirePermission("pengaturan-desa", "read");
    const villageId = await resolveVillageId(user);
    const data = await getDataBackupDesa(villageId);
    const backup = {
      format: "flexidesa-village-settings",
      version: 1,
      createdAt: new Date().toISOString(),
      scope:
        "Konfigurasi desa, profil publik, katalog layanan, tema, dan preferensi. Bukan backup seluruh transaksi.",
      desa: data.desa,
      profil: data.profil,
      kontak: data.kontak,
      integrasi: data.integrasi,
      favicon: data.favicon,
      template: data.template,
      layanan: data.layanan,
      tema: data.tema,
      umum: data.umum,
    };
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="flexidesa-konfigurasi-desa-${villageId}-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handle(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requirePermission("pengaturan-desa", "update");
    const villageId = await resolveVillageId(user);
    const raw = await request.text();
    if (raw.length > 2_000_000) return response({ error: "Berkas backup maksimal 2 MB." }, 413);
    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      return response({ error: "Berkas JSON tidak valid." }, 400);
    }
    const result = await pulihkanBackupDesa(villageId, input, user.id);
    if (result.status === "media-logo-tidak-valid")
      return response(
        {
          error:
            "Referensi logo backup tidak valid atau bukan milik tenant ini. Unggah ulang logo setelah pemulihan.",
        },
        422,
      );
    if (result.status === "media-favicon-tidak-valid")
      return response(
        {
          error:
            "Referensi favicon backup tidak valid atau bukan milik tenant ini. Unggah ulang favicon setelah pemulihan.",
        },
        422,
      );
    return response({
      message:
        "Konfigurasi berhasil dipulihkan. Data transaksi, akun, dan isi berkas media tidak diubah.",
    });
  } catch (error) {
    return handle(error);
  }
}
