import { NextResponse } from "next/server";

import {
  indukValid,
  isTingkatWilayah,
  TINGKAT_WILAYAH,
} from "@/features/wilayah/domain/data-wilayah";
import { daftarWilayah } from "@/features/wilayah/infrastructure/data-wilayah-repository";

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

  if (!isTingkatWilayah(tingkat)) {
    return NextResponse.json(
      { error: `Parameter tingkat harus salah satu: ${TINGKAT_WILAYAH.join(", ")}.` },
      { status: 400 },
    );
  }

  if (!indukValid(tingkat, induk)) {
    return NextResponse.json({ error: "Kode induk wilayah tidak valid." }, { status: 400 });
  }

  return NextResponse.json(
    { data: daftarWilayah(tingkat, induk) },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
  );
}
