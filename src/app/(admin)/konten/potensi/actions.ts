"use server";

import { revalidatePath } from "next/cache";

import { hapusPotensiAdmin, simpanPotensiAdmin } from "@/features/publik/application/konten-admin";

const categories = new Set([
  "pertanian",
  "perkebunan",
  "peternakan",
  "perikanan",
  "umkm",
  "wisata",
]);
function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}
function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 170);
}
function metrics(raw: string) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((line, index) => {
      const [label = "", ...rest] = line.split("|");
      return {
        label: label.trim().slice(0, 100),
        nilai: rest.join("|").trim().slice(0, 100),
        urut: index,
      };
    })
    .filter((item) => item.label && item.nilai);
}
function refresh() {
  revalidatePath("/konten/potensi");
  revalidatePath("/potensi");
  revalidatePath("/profil");
}

export async function simpanPotensi(form: FormData) {
  const id = Number(value(form, "id") || 0);
  const kategori = value(form, "kategori");
  const judul = value(form, "judul").slice(0, 160);
  const slug = slugify(value(form, "slug") || judul);
  const ringkasan = value(form, "ringkasan").slice(0, 500) || null;
  const deskripsi = value(form, "deskripsi").slice(0, 10000) || null;
  const gambar = value(form, "gambar").slice(0, 255) || null;
  const lokasi = value(form, "lokasi").slice(0, 200) || null;
  const kontak = value(form, "kontak").slice(0, 150) || null;
  const unggulan = value(form, "unggulan") === "on";
  const aktif = value(form, "aktif") === "on";
  const indikator = metrics(value(form, "indikator"));
  if (!categories.has(kategori) || !judul || !slug)
    throw new Error("Kategori, judul, dan slug wajib diisi dengan benar.");
  await simpanPotensiAdmin({
    id,
    kategori,
    judul,
    slug,
    ringkasan,
    deskripsi,
    gambar,
    lokasi,
    kontak,
    unggulan,
    aktif,
    indikator,
  });
  refresh();
}

export async function hapusPotensi(form: FormData) {
  const id = Number(value(form, "id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID potensi tidak valid.");
  await hapusPotensiAdmin(id);
  refresh();
}
