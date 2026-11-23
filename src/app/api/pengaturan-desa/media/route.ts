import { NextResponse } from "next/server";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  hapusMediaIdentitas,
  simpanMediaIdentitas,
} from "@/features/pengaturan/application/pengaturan-desa-use-cases";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import { requirePermission } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

export const runtime = "nodejs";
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
function handle(e: unknown) {
  if (isAppError(e)) return response({ error: e.message }, appErrorStatus(e.code));
  console.error("Unggah identitas desa gagal:", e);
  return response({ error: e instanceof Error ? e.message : "Unggah media gagal." }, 500);
}
export async function POST(request: Request) {
  try {
    const user = await requirePermission("pengaturan-desa", "update"),
      villageId = await resolveVillageId(user),
      form = await request.formData();
    const field = form.get("field"),
      file = form.get("file");
    if (field !== "logo" && field !== "favicon")
      return response({ error: "Jenis media tidak valid." }, 400);
    if (!(file instanceof File) || file.size === 0)
      return response({ error: "Pilih berkas gambar terlebih dahulu." }, 400);
    if (field === "logo" && file.size > 2 * 1024 * 1024)
      return response({ error: "Logo maksimal 2 MB." }, 413);
    if (field === "favicon" && (file.size > 1024 * 1024 || file.type !== "image/png"))
      return response({ error: "Favicon hanya PNG dengan ukuran maksimal 1 MB." }, 422);
    if (field === "logo" && !["image/jpeg", "image/png", "image/svg+xml"].includes(file.type))
      return response({ error: "Logo harus JPG, PNG, atau SVG." }, 422);
    const path = await simpanBerkasMedia(
      villageId,
      {
        nama: file.name,
        mime: file.type,
        ukuran: file.size,
        isi: new Uint8Array(await file.arrayBuffer()),
      },
      "umum",
      field,
    );
    await simpanMediaIdentitas(villageId, field, path);
    return response({
      message: field === "logo" ? "Logo desa berhasil diunggah." : "Favicon berhasil diunggah.",
      path,
    });
  } catch (e) {
    return handle(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const user = await requirePermission("pengaturan-desa", "update"),
      villageId = await resolveVillageId(user),
      field = new URL(request.url).searchParams.get("field");
    if (field !== "logo" && field !== "favicon")
      return response({ error: "Jenis media tidak valid." }, 400);
    await hapusMediaIdentitas(villageId, field);
    return response({ message: "Media identitas berhasil dihapus." });
  } catch (e) {
    return handle(e);
  }
}
