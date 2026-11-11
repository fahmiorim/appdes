import { bacaLampiranPengaduan } from "@/features/pengaduan/application/use-cases";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requireUser } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";

/**
 * Sajikan lampiran pengaduan kepada petugas ber-izin.
 *
 * Sebagian besar pengaduan berisi informasi pribadi pelapor, jadi berbeda dari
 * media publik (`/api/publik/media`), route ini WAJIB login dengan izin
 * `read` atas modul `pengaduan`. Tenant diambil dari **sesi** (bukan dari
 * input klien): jalur `<villageId lain>/pengaduan/<berkas>` tidak akan pernah
 * tersaji, walau penggunanya sudah ber-izin di desa masing-masing.
 *
 * Kategori dibatasi pada `pengaduan` saja sehingga route ini tidak bisa
 * dipakai pintu belakang untuk membaca media publik maupun berkas `permohonan`.
 */

/** Peta ekstensi → MIME untuk header respons. */
const MIME_BY_EKSTENSI: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

function mimeDariJalur(jalur: string): string {
  const ekstensi = jalur.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EKSTENSI[ekstensi] ?? "application/octet-stream";
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/pengaduan/lampiran/[...path]">,
) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    const status = isAppError(error) ? appErrorStatus(error.code) : 401;
    return new Response("Anda harus masuk untuk membuka lampiran pengaduan.", { status });
  }

  if (!hasPermission(user.permissions, RESOURCES.pengaduan, "read") || user.villageId === null) {
    return new Response("Anda tidak memiliki hak akses lampiran pengaduan.", { status: 403 });
  }

  const { path: segmen } = await params;
  const relatif = segmen.join("/");

  // Tolak jalur kosong atau traversal eksplisit sebelum menyentuh disk.
  if (
    !relatif ||
    segmen.some((bagian) => bagian === ".." || bagian.includes("..") || /[\\/]/.test(bagian))
  ) {
    return new Response("Jalur lampiran tidak valid.", { status: 400 });
  }

  // Bentuk wajib: `<villageId desa sesi>/pengaduan/<berkas>`.
  if (segmen.length !== 3) {
    return new Response("Lampiran tidak ditemukan.", { status: 404 });
  }
  if (segmen[0] !== String(user.villageId)) {
    return new Response("Lampiran tidak ditemukan.", { status: 404 });
  }
  if (segmen[1] !== "pengaduan") {
    return new Response("Lampiran tidak ditemukan.", { status: 404 });
  }

  try {
    // `bacaLampiranPengaduan` menolak jalur di luar akar penyimpanan.
    const isi = await bacaLampiranPengaduan(relatif);

    return new Response(Buffer.from(isi), {
      headers: {
        "Content-Type": mimeDariJalur(relatif),
        // Respons memuat berkas pribadi warga: jangan pernah disimpen cache.
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("Lampiran tidak ditemukan.", { status: 404 });
    }
    console.error("Gagal membaca lampiran pengaduan:", error);
    return new Response("Gagal membaca lampiran.", { status: 500 });
  }
}
