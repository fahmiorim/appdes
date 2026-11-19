"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { galeriAlbum, galeriFoto, halamanStatis } from "@/db/schema";
import { updateIdentitas } from "@/features/desa/application/use-cases";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { desaFormSchema } from "@/features/desa/domain/desa";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import {
  createDokumenPublik,
  createMenuPublik,
  deleteDokumenPublik,
  deleteMenuPublik,
  dokumenSlugExists,
  listMenuPublik,
  updateDokumenPublik,
  updateMenuPublik,
} from "@/features/publik/infrastructure/content-repository";
import { requirePermission } from "@/lib/dal";
import { sanitasiHtml } from "@/lib/sanitize";

const text = (fd: FormData, key: string) => {
  const value = fd.get(key);
  return typeof value === "string" ? value.trim() : "";
};
const num = (fd: FormData, key: string) => {
  const value = Number(text(fd, key));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
};
const slugify = (value: string) =>
  value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 190);

export async function simpanIdentitasWebsiteAction(fd: FormData): Promise<void> {
  const input = desaFormSchema.parse({
    namaDesa: text(fd, "namaDesa"), kodeDesa: text(fd, "kodeDesa"), kodePos: text(fd, "kodePos"),
    namaKecamatan: text(fd, "namaKecamatan"), kodeKecamatan: text(fd, "kodeKecamatan"),
    namaKabupaten: text(fd, "namaKabupaten"), kodeKabupaten: text(fd, "kodeKabupaten"),
    namaPropinsi: text(fd, "namaPropinsi"), kodePropinsi: text(fd, "kodePropinsi"),
    alamatKantor: text(fd, "alamatKantor"), namaKepalaDesa: text(fd, "namaKepalaDesa"),
    nipKepalaDesa: text(fd, "nipKepalaDesa"), emailDesa: text(fd, "emailDesa"),
    telepon: text(fd, "telepon"), website: text(fd, "website"), logo: text(fd, "logo"),
    tandaTangan: text(fd, "tandaTangan"), stempel: text(fd, "stempel"),
    penomoranSurat: text(fd, "penomoranSurat") || "2",
  });
  await updateIdentitas(input);
  revalidatePath("/website");
  revalidatePath("/website/pengaturan");
  redirect("/website/pengaturan?saved=1");
}

export async function tambahMenuWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const nama = text(fd, "nama");
  const link = text(fd, "link");
  const linkTipe = text(fd, "linkTipe") || "internal";
  if (!nama || !link || nama.length > 50 || link.length > 500 || !["internal", "eksternal", "halaman"].includes(linkTipe)) {
    throw new Error("Data menu tidak valid.");
  }
  const parentId = num(fd, "parentId");
  const menu = await listMenuPublik(villageId, true);
  if (parentId && !menu.some((item) => item.id === parentId && item.parentId === null)) {
    throw new Error("Menu induk tidak ditemukan pada desa ini.");
  }
  await createMenuPublik(villageId, { nama, link, linkTipe, parentId, urut: Number(text(fd, "urut")) || 0, aktif: true });
  revalidatePath("/website/halaman");
  redirect("/website/halaman?saved=1");
}

export async function ubahMenuWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Menu tidak valid.");
  const menu = await listMenuPublik(villageId, true);
  if (!menu.some((item) => item.id === id)) throw new Error("Menu tidak ditemukan.");
  await updateMenuPublik(villageId, id, { aktif: text(fd, "aktif") === "true" });
  revalidatePath("/website/halaman");
  redirect("/website/halaman?saved=1");
}

export async function hapusMenuWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Menu tidak valid.");
  const menu = await listMenuPublik(villageId, true);
  if (!menu.some((item) => item.id === id)) throw new Error("Menu tidak ditemukan.");
  if (menu.some((item) => item.parentId === id)) throw new Error("Pindahkan atau hapus submenu terlebih dahulu.");
  await deleteMenuPublik(villageId, id);
  revalidatePath("/website/halaman");
  redirect("/website/halaman?deleted=1");
}

export async function tambahHalamanWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const judul = text(fd, "judul");
  const slug = slugify(text(fd, "slug") || judul);
  const isi = text(fd, "isi");
  if (!judul || judul.length > 200 || !slug || !isi) throw new Error("Judul, slug, dan isi halaman wajib diisi.");
  const [existing] = await db.select({ id: halamanStatis.id }).from(halamanStatis)
    .where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.slug, slug))).limit(1);
  if (existing) throw new Error("Slug halaman sudah digunakan.");
  await db.insert(halamanStatis).values({ villageId, judul, slug, isi: sanitasiHtml(isi), aktif: fd.get("aktif") === "on" });
  revalidatePath("/website/halaman");
  redirect("/website/halaman?saved=1");
}

export async function ubahStatusHalamanWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Halaman tidak valid.");
  await db.update(halamanStatis).set({ aktif: text(fd, "aktif") === "true" })
    .where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.id, id)));
  revalidatePath("/website/halaman");
  redirect("/website/halaman?saved=1");
}

export async function hapusHalamanWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Halaman tidak valid.");
  await db.delete(halamanStatis).where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.id, id)));
  revalidatePath("/website/halaman");
  redirect("/website/halaman?deleted=1");
}

export async function tambahDokumenWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-dokumen", "update");
  const villageId = await resolveVillageId(user);
  const nama = text(fd, "nama");
  const kategori = text(fd, "kategori") || "informasi_publik";
  if (!nama || nama.length > 200) throw new Error("Nama dokumen wajib diisi (maksimal 200 karakter).");
  if (!["informasi_publik", "produk_hukum", "lainnya"].includes(kategori)) throw new Error("Kategori dokumen tidak valid.");
  const slug = slugify(text(fd, "slug") || nama);
  if (!slug) throw new Error("Slug dokumen tidak valid.");
  if (await dokumenSlugExists(villageId, slug)) throw new Error("Slug dokumen sudah digunakan.");
  const file = fd.get("berkas");
  let berkas: string | null = null;
  if (file instanceof File && file.size > 0) {
    berkas = await simpanBerkasMedia(villageId, { nama: file.name, mime: file.type, ukuran: file.size, isi: new Uint8Array(await file.arrayBuffer()) }, "dokumen", "berkas");
  }
  const tautan = text(fd, "tautan");
  if (!berkas && !tautan) throw new Error("Unggah PDF/gambar atau isi tautan dokumen.");
  const tahunText = text(fd, "tahun");
  const tahun = tahunText ? Number(tahunText) : null;
  if (tahun !== null && (!Number.isInteger(tahun) || tahun < 1900 || tahun > 2200)) throw new Error("Tahun dokumen tidak valid.");
  await createDokumenPublik(villageId, { nama, slug, kategori, jenis: text(fd, "jenis") || null, nomor: text(fd, "nomor") || null, tahun, berkas, tautan: tautan || null, keterangan: text(fd, "keterangan") || null, aktif: fd.get("aktif") === "on" });
  revalidatePath("/website/dokumen");
  redirect("/website/dokumen?saved=1");
}

export async function ubahStatusDokumenWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-dokumen", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Dokumen tidak valid.");
  await updateDokumenPublik(villageId, id, { aktif: text(fd, "aktif") === "true" });
  revalidatePath("/website/dokumen");
  redirect("/website/dokumen?saved=1");
}

export async function hapusDokumenWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-dokumen", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Dokumen tidak valid.");
  await deleteDokumenPublik(villageId, id);
  revalidatePath("/website/dokumen");
  redirect("/website/dokumen?deleted=1");
}

export async function tambahAlbumWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const nama = text(fd, "namaAlbum");
  const slug = slugify(text(fd, "slugAlbum") || nama);
  if (!nama || nama.length > 150 || !slug) throw new Error("Nama dan slug album wajib diisi.");
  const [existing] = await db.select({ id: galeriAlbum.id }).from(galeriAlbum)
    .where(and(eq(galeriAlbum.villageId, villageId), eq(galeriAlbum.slug, slug))).limit(1);
  if (existing) throw new Error("Slug album sudah digunakan.");
  await db.insert(galeriAlbum).values({ villageId, nama, slug, keterangan: text(fd, "keteranganAlbum") || null, aktif: true, urut: 0 });
  revalidatePath("/website/konten");
  redirect("/website/konten?saved=1#galeri");
}

export async function unggahFotoWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const albumId = num(fd, "albumId");
  if (!albumId) throw new Error("Pilih album galeri.");
  const [album] = await db.select({ id: galeriAlbum.id }).from(galeriAlbum)
    .where(and(eq(galeriAlbum.villageId, villageId), eq(galeriAlbum.id, albumId))).limit(1);
  if (!album) throw new Error("Album tidak ditemukan pada desa ini.");
  const file = fd.get("gambar");
  if (!(file instanceof File) || file.size === 0) throw new Error("Pilih berkas gambar.");
  const gambar = await simpanBerkasMedia(villageId, { nama: file.name, mime: file.type, ukuran: file.size, isi: new Uint8Array(await file.arrayBuffer()) }, "galeri", "gambar");
  await db.insert(galeriFoto).values({ villageId, albumId, gambar, judul: text(fd, "judulFoto") || null, keterangan: text(fd, "keteranganFoto") || null, aktif: true, slider: false, urut: 0 });
  revalidatePath("/website/konten");
  redirect("/website/konten?saved=1#galeri");
}