import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { bacaBerkasMediaPublik } from "@/features/publik/application/media-publik";
import { CSP_MEDIA_SANDBOX, isKategoriMediaPublik } from "@/features/publik/domain/media";
import { isAppError } from "@/lib/errors";

/**
 * Sajikan media situs publik.
 *
 * Jalur berbentuk `/<villageId>/<kategori>/<berkas>`. Segmen pertama **wajib**
 * sama dengan `villageId` desa pemilik host permintaan, sehingga media satu
 * desa tidak dapat dibaca dengan menebak URL desa lain (isolasi tenant).
 *
 * Cache publik agresif karena nama berkas mengandung cap waktu (immutable).
 */

/** Peta ekstensi → MIME untuk header respons. */
const MIME_BY_EKSTENSI: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

function mimeDariJalur(jalur: string): string {
  const ekstensi = jalur.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EKSTENSI[ekstensi] ?? "application/octet-stream";
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/publik/media/[...path]">,
) {
  const { path: segmen } = await params;
  const relatif = segmen.join("/");

  // Tolak jalur kosong atau traversal eksplisit sebelum menyentuh disk.
  if (
    !relatif ||
    segmen.some((bagian) => bagian === ".." || bagian.includes("..") || /[\\/]/.test(bagian))
  ) {
    return new Response("Jalur media tidak valid.", { status: 400 });
  }

  let desa;
  try {
    desa = await getIdentitasFromRequest();
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      return new Response("Desa tidak ditemukan.", { status: 404 });
    }
    throw error;
  }

  // Segmen pertama harus menunjuk desa pemilik host.
  if (segmen[0] !== String(desa.id)) {
    return new Response("Media tidak ditemukan.", { status: 404 });
  }

  // Hanya kategori publik yang boleh disajikan. `permohonan` berisi berkas
  // pribadi warga dan hanya dapat diakses lewat route ber-otentikasi.
  if (!isKategoriMediaPublik(segmen[1] ?? "")) {
    return new Response("Media tidak ditemukan.", { status: 404 });
  }

  try {
    // Wrapper application memvalidasi jalur agar tidak keluar dari akar penyimpanan.
    const isi = await bacaBerkasMediaPublik(relatif);
    const mime = mimeDariJalur(relatif);
    const headers: Record<string, string> = {
      "Content-Type": mime,
      // URL memuat villageId, tetapi cache bersama juga harus memisahkan
      // respons menurut host agar media satu desa tidak tersaji ke host lain.
      Vary: "Host",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };

    // SVG adalah dokumen aktif. Berkas SVG yang dibuka langsung dapat memuat
    // skrip pada origin aplikasi, jadi sandboxkan dokumennya tanpa merusak
    // penggunaan SVG sebagai <img> di halaman publik.
    if (mime === "image/svg+xml") {
      headers["Content-Security-Policy"] = CSP_MEDIA_SANDBOX;
    }

    return new Response(Buffer.from(isi), { headers });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("Media tidak ditemukan.", { status: 404 });
    }
    console.error("Gagal membaca media publik:", error);
    return new Response("Gagal membaca media.", { status: 500 });
  }
}
