import { NextResponse } from "next/server";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import {
  daftarKomentarPublik,
  kirimKomentarPublik,
} from "@/features/kontak/application/kontak-use-cases";
import { bacaPengaturan } from "@/features/pengaturan/application/pengaturan-use-cases";
import { detailBerita } from "@/features/publik/application/konten-publik";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { alamatIp } from "@/lib/client-ip";
import { bacaJsonTerbatas, BodyLimitError } from "@/lib/request-body";

type Context = { params: Promise<{ slug: string }> };
const BODY_LIMIT = 16_384;
function error(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}
async function resolveArticle(context: Context) {
  const [{ slug }, desa] = await Promise.all([context.params, getIdentitasFromRequest()]);
  const article = await detailBerita(desa.id, slug);
  return { desa, article, halaman: article ? `berita:${article.id}` : null };
}

/** GET /api/publik/berita/[slug]/komentar */
export async function GET(request: Request, context: Context) {
  const rate = await batasiPermintaan(`komentar-berita-baca:${alamatIp(request)}`, { batas: 60 });
  if (rate.dibatasi) return error(429, "Terlalu banyak permintaan.");
  let resolved;
  try {
    resolved = await resolveArticle(context);
  } catch {
    return error(400, "Desa tidak valid.");
  }
  if (!resolved.article || !resolved.halaman) return error(404, "Berita tidak ditemukan.");
  const settings = await bacaPengaturan(resolved.desa.id);
  if (!resolved.article.bolehKomentar || !settings.komentarAktif)
    return NextResponse.json({ daftar: [], total: 0, komentarAktif: false });
  const page = Number(new URL(request.url).searchParams.get("page") ?? "1");
  if (!Number.isInteger(page) || page < 1 || page > 10_000)
    return error(400, "Halaman tidak valid.");
  const result = await daftarKomentarPublik({
    villageId: resolved.desa.id,
    filter: { halaman: resolved.halaman, page, pageSize: 10 },
  });
  return NextResponse.json({ ...result, komentarAktif: true });
}

/** POST /api/publik/berita/[slug]/komentar */
export async function POST(request: Request, context: Context) {
  let resolved;
  try {
    resolved = await resolveArticle(context);
  } catch {
    return error(400, "Desa tidak valid.");
  }
  if (!resolved.article || !resolved.halaman) return error(404, "Berita tidak ditemukan.");
  if (!resolved.article.bolehKomentar)
    return error(403, "Komentar untuk berita ini dinonaktifkan.");
  const settings = await bacaPengaturan(resolved.desa.id);
  if (!settings.komentarAktif) return error(403, "Komentar publik sedang dinonaktifkan oleh desa.");
  const rate = await batasiPermintaan(`komentar-berita-kirim:${alamatIp(request)}`, { batas: 10 });
  if (rate.dibatasi) return error(429, "Terlalu banyak komentar. Coba lagi nanti.");
  let body: Record<string, unknown>;
  try {
    body = await bacaJsonTerbatas<Record<string, unknown>>(request, BODY_LIMIT);
  } catch (cause) {
    if (cause instanceof BodyLimitError) return error(413, "Komentar terlalu besar.");
    return error(400, "Format permintaan tidak valid.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return error(400, "Format komentar tidak valid.");
  const nama = typeof body.nama === "string" ? body.nama.trim() : "";
  const isi = typeof body.isi === "string" ? body.isi.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (nama.length < 2 || nama.length > 100) return error(400, "Nama harus 2–100 karakter.");
  if (isi.length < 5 || isi.length > 500) return error(400, "Komentar harus 5–500 karakter.");
  if (email.length > 150 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    return error(400, "Alamat email tidak valid.");
  const id = await kirimKomentarPublik({
    villageId: resolved.desa.id,
    namaPenulis: nama,
    isi,
    email: email || null,
    halaman: resolved.halaman,
  });
  return NextResponse.json({ id, message: "Komentar berhasil dikirim." }, { status: 201 });
}
