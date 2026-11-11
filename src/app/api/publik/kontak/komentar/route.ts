import { NextResponse } from "next/server";

import { alamatIp } from "@/features/api-publik/application/public-api";
import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import {
  daftarKomentarPublik,
  kirimKomentarPublik,
} from "@/features/kontak/application/kontak-use-cases";
import { bacaPengaturan } from "@/features/pengaturan/application/pengaturan-use-cases";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { bacaJsonTerbatas, BodyLimitError } from "@/lib/request-body";

const BATAS_BODY = 16_384;
const BATAS_KIRIM_PER_MENIT = 20;
const BATAS_HALAMAN = 10_000;

function galat(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** GET /api/publik/kontak/komentar — daftar komentar publik yang aktif. */
export async function GET(request: Request) {
  let desa;
  try {
    desa = await getIdentitasFromRequest();
  } catch {
    return galat(400, "Desa tidak valid");
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  if (!Number.isInteger(page) || page < 1 || page > BATAS_HALAMAN) {
    return galat(400, "Nomor halaman tidak valid");
  }

  const result = await daftarKomentarPublik({
    villageId: desa.id,
    filter: { halaman: "kontak", page, pageSize: 10 },
  });

  return NextResponse.json(result);
}

/** POST /api/publik/kontak/komentar — kirim komentar publik baru. */
export async function POST(request: Request) {
  let desa;
  try {
    desa = await getIdentitasFromRequest();
  } catch {
    return galat(400, "Desa tidak valid");
  }

  const pengaturan = await bacaPengaturan(desa.id);
  if (!pengaturan.komentarAktif) {
    return galat(403, "Komentar dinonaktifkan oleh desa");
  }

  const batas = await batasiPermintaan(`komentar-publik:${alamatIp(request)}`, {
    batas: BATAS_KIRIM_PER_MENIT,
  });
  if (batas.dibatasi) {
    return galat(429, "Terlalu banyak permintaan. Coba lagi beberapa saat.");
  }

  let body: Record<string, unknown>;
  try {
    body = await bacaJsonTerbatas<Record<string, unknown>>(request, BATAS_BODY);
  } catch (error) {
    if (error instanceof BodyLimitError) {
      return galat(413, "Body terlalu besar");
    }
    return galat(400, "Body tidak valid");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return galat(400, "Body tidak valid");
  }

  const nama = typeof body.nama === "string" ? body.nama.trim() : "";
  const isi = typeof body.isi === "string" ? body.isi.trim() : "";

  if (nama.length < 2 || nama.length > 100) {
    return galat(400, "Nama harus 2-100 karakter");
  }
  if (isi.length < 5 || isi.length > 2000) {
    return galat(400, "Isi komentar harus 5-2000 karakter");
  }

  const id = await kirimKomentarPublik({
    villageId: desa.id,
    namaPenulis: nama,
    isi,
  });

  return NextResponse.json({ id }, { status: 201 });
}
