import { NextResponse } from "next/server";

import {
  PESAN_INDUK_TIDAK_VALID,
  PESAN_TINGKAT_TIDAK_VALID,
  wilayahAdministratif,
} from "@/features/wilayah/application/data-wilayah";

/**
 * Referensi wilayah administratif Kepmendagri untuk picker desa.
 *
 * Data publik (kode dan nama wilayah), jadi tidak memerlukan sesi. Klien hanya
 * meminta satu tingkat per permintaan agar daftar 83 ribu desa tidak dikirim
 * sekaligus:
 * - `/api/wilayah?tingkat=provinsi`
 * - `/api/wilayah?tingkat=kabupaten&induk=11`
 * - `/api/wilayah?tingkat=kecamatan&induk=11.01`
 * - `/api/wilayah?tingkat=desa&induk=11.01.01`
 */
export async function GET(request: Request) {
  const parameter = new URL(request.url).searchParams;
  const tingkat = parameter.get("tingkat");
  const induk = parameter.get("induk");

  const hasil = wilayahAdministratif(tingkat, induk);

  if (hasil.status === "tingkat-tidak-valid") {
    return NextResponse.json({ error: PESAN_TINGKAT_TIDAK_VALID }, { status: 400 });
  }

  if (hasil.status === "induk-tidak-valid") {
    return NextResponse.json({ error: PESAN_INDUK_TIDAK_VALID }, { status: 400 });
  }

  return NextResponse.json(
    { data: hasil.data },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
  );
}
