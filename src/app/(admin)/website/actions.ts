"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { agendaKegiatan, berita, beritaKategori, dokumenPublik, galeriAlbum, galeriFoto, halamanStatis, menuPublik, slider, theme, widget } from "@/db/schema";
import { updateIdentitas } from "@/features/desa/application/use-cases";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { desaFormSchema } from "@/features/desa/domain/desa";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import type { BerkasUnggahan } from "@/features/publik/domain/media";
import { hapusMedia } from "@/features/publik/infrastructure/media-storage";
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
  const unggahan: Partial<Record<"logo" | "tandaTangan" | "stempel", BerkasUnggahan>> = {};
  for (const field of ["logo", "tandaTangan", "stempel"] as const) {
    const file = fd.get(field);
    if (file instanceof File && file.size > 0) unggahan[field] = { nama: file.name, mime: file.type, ukuran: file.size, isi: new Uint8Array(await file.arrayBuffer()) };
  }
  await updateIdentitas(input, unggahan);
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
  if (linkTipe === "internal" && (!link.startsWith("/") || link.startsWith("//"))) throw new Error("Link internal harus berupa path lokal.");
  if (linkTipe === "eksternal") {
    let url: URL;
    try { url = new URL(link); } catch { throw new Error("URL eksternal tidak valid."); }
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("URL eksternal harus menggunakan HTTP atau HTTPS.");
  }
  if (linkTipe === "halaman") {
    const match = /^\/halaman\/([a-z0-9-]+)$/.exec(link);
    if (!match) throw new Error("Tautan halaman harus menggunakan format /halaman/slug.");
    const [page] = await db.select({ id: halamanStatis.id }).from(halamanStatis).where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.slug, match[1]!), eq(halamanStatis.aktif, true))).limit(1);
    if (!page) throw new Error("Halaman statis tidak ditemukan atau belum dipublikasikan.");
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
  if (tautan) {
    let url: URL;
    try { url = new URL(tautan); } catch { throw new Error("Tautan dokumen tidak valid."); }
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Tautan dokumen harus menggunakan HTTP atau HTTPS.");
  }
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
  const [row] = await db.select({ berkas: dokumenPublik.berkas }).from(dokumenPublik)
    .where(and(eq(dokumenPublik.villageId, villageId), eq(dokumenPublik.id, id))).limit(1);
  if (!row) throw new Error("Dokumen tidak ditemukan.");
  await deleteDokumenPublik(villageId, id);
  if (row.berkas) await hapusMedia(row.berkas);
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

export async function simpanTemaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-pengaturan", "update");
  const villageId = await resolveVillageId(user);
  const [active] = await db.select({ id: theme.id, opsi: theme.opsi }).from(theme)
    .where(and(eq(theme.villageId, villageId), eq(theme.aktif, true))).limit(1);
  if (!active) throw new Error("Tema desa belum disiapkan oleh Super Admin.");
  const warnaUtama = text(fd, "warnaUtama");
  const warnaAksen = text(fd, "warnaAksen");
  const font = text(fd, "font");
  const logoTampil = fd.get("logoTampil") === "on";
  const warna = /^#[0-9a-fA-F]{6}$/;
  if (!warna.test(warnaUtama) || !warna.test(warnaAksen)) throw new Error("Warna tema harus berupa kode HEX enam digit.");
  if (!["system", "sans", "serif"].includes(font)) throw new Error("Pilihan font tidak valid.");
  let opsiLama: Record<string, unknown> = {};
  try { const parsed: unknown = active.opsi ? JSON.parse(active.opsi) : {}; if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) opsiLama = parsed as Record<string, unknown>; } catch { opsiLama = {}; }
  const opsi = { ...opsiLama, branding: { warnaUtama, warnaAksen, font, logoTampil } };
  await db.update(theme).set({ opsi: JSON.stringify(opsi) }).where(and(eq(theme.villageId, villageId), eq(theme.id, active.id)));
  revalidatePath("/website"); revalidatePath("/website/pengaturan");
  redirect("/website/pengaturan?saved=1#tema");
}

export async function ubahMenuWebsiteDetailAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  const nama = text(fd, "nama");
  const link = text(fd, "link");
  const linkTipe = text(fd, "linkTipe");
  const parentId = num(fd, "parentId");
  if (!id || !nama || nama.length > 50 || !link || link.length > 500 || !["internal", "eksternal", "halaman"].includes(linkTipe)) throw new Error("Data menu tidak valid.");
  const [current] = await db.select({ id: menuPublik.id }).from(menuPublik).where(and(eq(menuPublik.villageId, villageId), eq(menuPublik.id, id))).limit(1);
  if (!current) throw new Error("Menu tidak ditemukan.");
  if (linkTipe === "internal" && (!link.startsWith("/") || link.startsWith("//"))) throw new Error("Link internal harus berupa path lokal.");
  if (linkTipe === "eksternal") { let url: URL; try { url = new URL(link); } catch { throw new Error("URL eksternal tidak valid."); } if (!["http:", "https:"].includes(url.protocol)) throw new Error("URL eksternal harus HTTP atau HTTPS."); }
  if (linkTipe === "halaman") {
    const match = /^\/halaman\/([a-z0-9-]+)$/.exec(link);
    if (!match) throw new Error("Tautan halaman harus menggunakan format /halaman/slug.");
    const [page] = await db.select({ id: halamanStatis.id }).from(halamanStatis).where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.slug, match[1]!), eq(halamanStatis.aktif, true))).limit(1);
    if (!page) throw new Error("Halaman statis tidak ditemukan atau belum dipublikasikan.");
  }
  if (parentId) {
    const [parent] = await db.select({ id: menuPublik.id, parentId: menuPublik.parentId }).from(menuPublik).where(and(eq(menuPublik.villageId, villageId), eq(menuPublik.id, parentId))).limit(1);
    if (!parent || parentId === id || parent.parentId !== null) throw new Error("Menu induk harus menu utama pada desa ini.");
  }
  await db.update(menuPublik).set({ nama, link, linkTipe, parentId }).where(and(eq(menuPublik.villageId, villageId), eq(menuPublik.id, id)));
  revalidatePath("/website/halaman"); redirect("/website/halaman?saved=1");
}

export async function tambahBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const judul = text(fd, "judulBerita");
  const slug = slugify(text(fd, "slugBerita") || judul);
  const isi = text(fd, "isiBerita");
  const ringkasan = text(fd, "ringkasanBerita");
  if (!judul || judul.length > 200 || !slug || !isi) throw new Error("Judul, slug, dan isi berita wajib diisi.");
  const [existing] = await db.select({ id: berita.id }).from(berita).where(and(eq(berita.villageId, villageId), eq(berita.slug, slug))).limit(1);
  if (existing) throw new Error("Slug berita sudah digunakan.");
  const kategoriText = text(fd, "kategoriId");
  const kategoriId = kategoriText ? Number(kategoriText) : null;
  if (kategoriId !== null) {
    const [category] = await db.select({ id: beritaKategori.id }).from(beritaKategori).where(and(eq(beritaKategori.villageId, villageId), eq(beritaKategori.id, kategoriId))).limit(1);
    if (!category) throw new Error("Kategori berita tidak ditemukan.");
  }
  const file = fd.get("gambarBerita");
  let gambar: string | null = null;
  if (file instanceof File && file.size > 0) gambar = await simpanBerkasMedia(villageId, { nama: file.name, mime: file.type, ukuran: file.size, isi: new Uint8Array(await file.arrayBuffer()) }, "berita", "gambar");
  const status = text(fd, "statusBerita") === "published" ? "published" : "draft";
  const tanggal = text(fd, "terbitPada");
  const terbitPada = tanggal ? new Date(tanggal) : status === "published" ? new Date() : null;
  await db.insert(berita).values({ villageId, judul, slug, ringkasan: ringkasan || null, isi: sanitasiHtml(isi), kategoriId, gambar, status, terbitPada, headline: fd.get("headline") === "on", slider: fd.get("tampilSlider") === "on" });
  revalidatePath("/website/konten"); revalidatePath("/website"); redirect("/website/konten?saved=1#berita");
}

export async function ubahStatusBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Berita tidak valid.");
  const status = text(fd, "status") === "published" ? "published" : "draft";
  await db.update(berita).set({ status, terbitPada: status === "published" ? new Date() : null }).where(and(eq(berita.villageId, villageId), eq(berita.id, id)));
  revalidatePath("/website/konten"); revalidatePath("/website"); redirect("/website/konten?saved=1#berita");
}

export async function tambahAgendaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const judul = text(fd, "judulAgenda");
  const mulai = text(fd, "mulaiAgenda");
  const selesai = text(fd, "selesaiAgenda");
  if (!judul || judul.length > 200 || !/^\d{4}-\d{2}-\d{2}$/.test(mulai)) throw new Error("Judul dan tanggal mulai agenda wajib diisi.");
  if (selesai && (!/^\d{4}-\d{2}-\d{2}$/.test(selesai) || selesai < mulai)) throw new Error("Tanggal selesai tidak valid.");
  await db.insert(agendaKegiatan).values({ villageId, judul, mulai, selesai: selesai || null, jamMulai: text(fd, "jamMulai") || null, jamSelesai: text(fd, "jamSelesai") || null, kategori: text(fd, "kategoriAgenda") || "umum", status: "rencana", lokasi: text(fd, "lokasiAgenda") || null, deskripsi: text(fd, "deskripsiAgenda") || null, tayang: fd.get("tayangAgenda") === "on" });
  revalidatePath("/website/konten"); revalidatePath("/website"); redirect("/website/konten?saved=1#agenda");
}

export async function ubahStatusAgendaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Agenda tidak valid.");
  await db.update(agendaKegiatan).set({ tayang: text(fd, "tayang") === "true" }).where(and(eq(agendaKegiatan.villageId, villageId), eq(agendaKegiatan.id, id)));
  revalidatePath("/website/konten"); revalidatePath("/website"); redirect("/website/konten?saved=1#agenda");
}

export async function tambahWidgetWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const judul = text(fd, "judulWidget");
  const jenis = Number(text(fd, "jenisWidget"));
  if (!Number.isInteger(jenis) || jenis < 1 || jenis > 6) throw new Error("Jenis widget tidak valid.");
  await db.insert(widget).values({ villageId, judul: judul || null, isi: text(fd, "isiWidget") || null, jenis, pengaturan: null, urut: Math.max(0, Number(text(fd, "urutWidget")) || 0), aktif: fd.get("aktifWidget") === "on" });
  revalidatePath("/website/halaman"); redirect("/website/halaman?saved=1#widget");
}

export async function ubahStatusWidgetWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Widget tidak valid.");
  await db.update(widget).set({ aktif: text(fd, "aktif") === "true" }).where(and(eq(widget.villageId, villageId), eq(widget.id, id)));
  revalidatePath("/website/halaman"); redirect("/website/halaman?saved=1#widget");
}

export async function tambahSliderWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const file = fd.get("gambarSlider");
  if (!(file instanceof File) || file.size === 0) throw new Error("Gambar slider wajib dipilih.");
  const gambar = await simpanBerkasMedia(villageId, { nama: file.name, mime: file.type, ukuran: file.size, isi: new Uint8Array(await file.arrayBuffer()) }, "slider", "gambar");
  const tautan = text(fd, "tautanSlider");
  if (tautan) { let url: URL; try { url = new URL(tautan); } catch { throw new Error("Tautan slider tidak valid."); } if (!["http:", "https:"].includes(url.protocol)) throw new Error("Tautan slider harus HTTP atau HTTPS."); }
  await db.insert(slider).values({ villageId, gambar, judul: text(fd, "judulSlider") || null, keterangan: text(fd, "keteranganSlider") || null, tautan: tautan || null, urut: Math.max(0, Number(text(fd, "urutSlider")) || 0), aktif: fd.get("aktifSlider") === "on" });
  revalidatePath("/website/konten"); revalidatePath("/website"); redirect("/website/konten?saved=1#slider");
}

export async function ubahStatusSliderWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Slider tidak valid.");
  await db.update(slider).set({ aktif: text(fd, "aktif") === "true" }).where(and(eq(slider.villageId, villageId), eq(slider.id, id)));
  revalidatePath("/website/konten"); revalidatePath("/website"); redirect("/website/konten?saved=1#slider");
}


export async function hapusBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Berita tidak valid.");
  const [row] = await db.select({ gambar: berita.gambar }).from(berita).where(and(eq(berita.villageId, villageId), eq(berita.id, id))).limit(1);
  if (!row) throw new Error("Berita tidak ditemukan.");
  await db.delete(berita).where(and(eq(berita.villageId, villageId), eq(berita.id, id)));
  if (row.gambar) await hapusMedia(row.gambar);
  revalidatePath("/website/konten"); revalidatePath("/website"); redirect("/website/konten?deleted=1#berita");
}

export async function hapusAgendaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Agenda tidak valid.");
  await db.delete(agendaKegiatan).where(and(eq(agendaKegiatan.villageId, villageId), eq(agendaKegiatan.id, id)));
  revalidatePath("/website/konten"); revalidatePath("/website"); redirect("/website/konten?deleted=1#agenda");
}

export async function hapusSliderWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Slider tidak valid.");
  const [row] = await db.select({ gambar: slider.gambar }).from(slider).where(and(eq(slider.villageId, villageId), eq(slider.id, id))).limit(1);
  if (!row) throw new Error("Slider tidak ditemukan.");
  await db.delete(slider).where(and(eq(slider.villageId, villageId), eq(slider.id, id)));
  await hapusMedia(row.gambar);
  revalidatePath("/website/konten"); revalidatePath("/website"); redirect("/website/konten?deleted=1#slider");
}


export async function ubahHalamanWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  const judul = text(fd, "judul");
  const slug = slugify(text(fd, "slug") || judul);
  const isi = text(fd, "isi");
  if (!id || !judul || judul.length > 200 || !slug || !isi) throw new Error("Data halaman tidak lengkap.");
  const [existing] = await db.select({ id: halamanStatis.id }).from(halamanStatis)
    .where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.slug, slug))).limit(1);
  const [current] = await db.select({ id: halamanStatis.id }).from(halamanStatis)
    .where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.id, id))).limit(1);
  if (!current) throw new Error("Halaman tidak ditemukan.");
  if (existing && existing.id !== id) throw new Error("Slug halaman sudah digunakan.");
  await db.update(halamanStatis).set({ judul, slug, isi: sanitasiHtml(isi) })
    .where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.id, id)));
  revalidatePath("/website/halaman"); redirect("/website/halaman?saved=1");
}


export async function tambahKategoriBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const nama = text(fd, "namaKategori");
  const slug = slugify(text(fd, "slugKategori") || nama).slice(0, 100);
  if (!nama || nama.length > 100 || !slug) throw new Error("Nama kategori dan slug wajib diisi.");
  const [existing] = await db.select({ id: beritaKategori.id }).from(beritaKategori).where(and(eq(beritaKategori.villageId, villageId), eq(beritaKategori.slug, slug))).limit(1);
  if (existing) throw new Error("Slug kategori sudah digunakan.");
  await db.insert(beritaKategori).values({ villageId, nama, slug, aktif: true, urut: 0 });
  revalidatePath("/website/konten"); redirect("/website/konten?saved=1#berita");
}

export async function hapusFotoGaleriWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Foto tidak valid.");
  const [row] = await db.select({ gambar: galeriFoto.gambar }).from(galeriFoto).where(and(eq(galeriFoto.villageId, villageId), eq(galeriFoto.id, id))).limit(1);
  if (!row) throw new Error("Foto tidak ditemukan.");
  await db.delete(galeriFoto).where(and(eq(galeriFoto.villageId, villageId), eq(galeriFoto.id, id)));
  await hapusMedia(row.gambar);
  revalidatePath("/website/konten"); redirect("/website/konten?deleted=1#galeri");
}


export async function ubahDokumenWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-dokumen", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  const nama = text(fd, "nama");
  const slug = slugify(text(fd, "slug") || nama);
  const kategori = text(fd, "kategori") || "informasi_publik";
  if (!id || !nama || nama.length > 200 || !slug || !["informasi_publik", "produk_hukum", "lainnya"].includes(kategori)) throw new Error("Data dokumen tidak valid.");
  const [current] = await db.select({ berkas: dokumenPublik.berkas }).from(dokumenPublik).where(and(eq(dokumenPublik.villageId, villageId), eq(dokumenPublik.id, id))).limit(1);
  if (!current) throw new Error("Dokumen tidak ditemukan.");
  const [existing] = await db.select({ id: dokumenPublik.id }).from(dokumenPublik).where(and(eq(dokumenPublik.villageId, villageId), eq(dokumenPublik.slug, slug))).limit(1);
  if (existing && existing.id !== id) throw new Error("Slug dokumen sudah digunakan.");
  const file = fd.get("berkas");
  let berkas = current.berkas;
  if (file instanceof File && file.size > 0) berkas = await simpanBerkasMedia(villageId, { nama: file.name, mime: file.type, ukuran: file.size, isi: new Uint8Array(await file.arrayBuffer()) }, "dokumen", "berkas");
  const tautan = text(fd, "tautan");
  if (!berkas && !tautan) throw new Error("Dokumen harus memiliki berkas atau tautan.");
  if (tautan) { let url: URL; try { url = new URL(tautan); } catch { throw new Error("Tautan dokumen tidak valid."); } if (!["http:", "https:"].includes(url.protocol)) throw new Error("Tautan dokumen harus HTTP atau HTTPS."); }
  const tahunText = text(fd, "tahun");
  const tahun = tahunText ? Number(tahunText) : null;
  if (tahun !== null && (!Number.isInteger(tahun) || tahun < 1900 || tahun > 2200)) throw new Error("Tahun dokumen tidak valid.");
  await db.update(dokumenPublik).set({ nama, slug, kategori, jenis: text(fd, "jenis") || null, nomor: text(fd, "nomor") || null, tahun, berkas, tautan: tautan || null, keterangan: text(fd, "keterangan") || null }).where(and(eq(dokumenPublik.villageId, villageId), eq(dokumenPublik.id, id)));
  if (file instanceof File && file.size > 0 && current.berkas) await hapusMedia(current.berkas);
  revalidatePath("/website/dokumen"); revalidatePath("/website"); redirect("/website/dokumen?saved=1");
}


export async function hapusWidgetWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Widget tidak valid.");
  await db.delete(widget).where(and(eq(widget.villageId, villageId), eq(widget.id, id)));
  revalidatePath("/website/halaman"); redirect("/website/halaman?deleted=1#widget");
}

export async function hapusAlbumGaleriWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Album tidak valid.");
  const photos = await db.select({ gambar: galeriFoto.gambar }).from(galeriFoto).where(and(eq(galeriFoto.villageId, villageId), eq(galeriFoto.albumId, id)));
  const [album] = await db.select({ sampul: galeriAlbum.sampul }).from(galeriAlbum).where(and(eq(galeriAlbum.villageId, villageId), eq(galeriAlbum.id, id))).limit(1);
  if (!album) throw new Error("Album tidak ditemukan.");
  await db.delete(galeriAlbum).where(and(eq(galeriAlbum.villageId, villageId), eq(galeriAlbum.id, id)));
  for (const photo of photos) await hapusMedia(photo.gambar);
  if (album.sampul) await hapusMedia(album.sampul);
  revalidatePath("/website/konten"); revalidatePath("/website"); redirect("/website/konten?deleted=1#galeri");
}


export async function ubahBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  const judul = text(fd, "judulBerita");
  const slug = slugify(text(fd, "slugBerita") || judul);
  const isi = text(fd, "isiBerita");
  if (!id || !judul || judul.length > 200 || !slug || !isi) throw new Error("Data berita tidak valid.");
  const [current] = await db.select({ gambar: berita.gambar }).from(berita)
    .where(and(eq(berita.villageId, villageId), eq(berita.id, id))).limit(1);
  if (!current) throw new Error("Berita tidak ditemukan.");
  const [duplicate] = await db.select({ id: berita.id }).from(berita)
    .where(and(eq(berita.villageId, villageId), eq(berita.slug, slug))).limit(1);
  if (duplicate && duplicate.id !== id) throw new Error("Slug berita sudah digunakan.");
  const kategoriText = text(fd, "kategoriId");
  const kategoriId = kategoriText ? Number(kategoriText) : null;
  if (kategoriId !== null) {
    const [category] = await db.select({ id: beritaKategori.id }).from(beritaKategori)
      .where(and(eq(beritaKategori.villageId, villageId), eq(beritaKategori.id, kategoriId))).limit(1);
    if (!category) throw new Error("Kategori berita tidak ditemukan pada desa ini.");
  }
  const file = fd.get("gambarBerita");
  let gambar = current.gambar;
  if (file instanceof File && file.size > 0) gambar = await simpanBerkasMedia(villageId,
    { nama: file.name, mime: file.type, ukuran: file.size, isi: new Uint8Array(await file.arrayBuffer()) }, "berita", "gambar");
  const status = text(fd, "statusBerita") === "published" ? "published" : "draft";
  const tanggal = text(fd, "terbitPada");
  const terbitPada = tanggal ? new Date(tanggal) : status === "published" ? new Date() : null;
  await db.update(berita).set({ judul, slug, isi: sanitasiHtml(isi), ringkasan: text(fd, "ringkasanBerita") || null,
    kategoriId, gambar, status, terbitPada, headline: fd.get("headline") === "on", slider: fd.get("tampilSlider") === "on" })
    .where(and(eq(berita.villageId, villageId), eq(berita.id, id)));
  if (file instanceof File && file.size > 0 && current.gambar) await hapusMedia(current.gambar);
  revalidatePath("/website/konten"); revalidatePath("/website");
  redirect("/website/konten?saved=1#berita");
}

export async function ubahAgendaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id"), judul = text(fd, "judulAgenda");
  const mulai = text(fd, "mulaiAgenda"), selesai = text(fd, "selesaiAgenda");
  if (!id || !judul || judul.length > 200 || !/^\\d{4}-\\d{2}-\\d{2}$/.test(mulai)) throw new Error("Data agenda tidak valid.");
  if (selesai && (!/^\\d{4}-\\d{2}-\\d{2}$/.test(selesai) || selesai < mulai)) throw new Error("Tanggal selesai tidak valid.");
  const [existing] = await db.select({ id: agendaKegiatan.id }).from(agendaKegiatan)
    .where(and(eq(agendaKegiatan.villageId, villageId), eq(agendaKegiatan.id, id))).limit(1);
  if (!existing) throw new Error("Agenda tidak ditemukan.");
  await db.update(agendaKegiatan).set({ judul, mulai, selesai: selesai || null, jamMulai: text(fd, "jamMulai") || null,
    jamSelesai: text(fd, "jamSelesai") || null, kategori: text(fd, "kategoriAgenda") || "umum",
    lokasi: text(fd, "lokasiAgenda") || null, deskripsi: text(fd, "deskripsiAgenda") || null })
    .where(and(eq(agendaKegiatan.villageId, villageId), eq(agendaKegiatan.id, id)));
  revalidatePath("/website/konten"); revalidatePath("/website");
  redirect("/website/konten?saved=1#agenda");
}

export async function ubahAlbumWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id"), nama = text(fd, "namaAlbum");
  const slug = slugify(text(fd, "slugAlbum") || nama);
  if (!id || !nama || nama.length > 150 || !slug) throw new Error("Data album tidak valid.");
  const [current] = await db.select({ id: galeriAlbum.id }).from(galeriAlbum)
    .where(and(eq(galeriAlbum.villageId, villageId), eq(galeriAlbum.id, id))).limit(1);
  if (!current) throw new Error("Album tidak ditemukan.");
  const [duplicate] = await db.select({ id: galeriAlbum.id }).from(galeriAlbum)
    .where(and(eq(galeriAlbum.villageId, villageId), eq(galeriAlbum.slug, slug))).limit(1);
  if (duplicate && duplicate.id !== id) throw new Error("Slug album sudah digunakan.");
  await db.update(galeriAlbum).set({ nama, slug, keterangan: text(fd, "keteranganAlbum") || null })
    .where(and(eq(galeriAlbum.villageId, villageId), eq(galeriAlbum.id, id)));
  revalidatePath("/website/konten"); revalidatePath("/website");
  redirect("/website/konten?saved=1#galeri");
}

export async function ubahFotoGaleriWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id"), albumId = num(fd, "albumId");
  if (!id || !albumId) throw new Error("Data foto tidak valid.");
  const [photo] = await db.select({ gambar: galeriFoto.gambar }).from(galeriFoto)
    .where(and(eq(galeriFoto.villageId, villageId), eq(galeriFoto.id, id))).limit(1);
  const [album] = await db.select({ id: galeriAlbum.id }).from(galeriAlbum)
    .where(and(eq(galeriAlbum.villageId, villageId), eq(galeriAlbum.id, albumId))).limit(1);
  if (!photo || !album) throw new Error("Foto atau album tidak ditemukan pada desa ini.");
  const file = fd.get("gambar");
  let gambar = photo.gambar;
  if (file instanceof File && file.size > 0) gambar = await simpanBerkasMedia(villageId,
    { nama: file.name, mime: file.type, ukuran: file.size, isi: new Uint8Array(await file.arrayBuffer()) }, "galeri", "gambar");
  await db.update(galeriFoto).set({ albumId, gambar, judul: text(fd, "judulFoto") || null,
    keterangan: text(fd, "keteranganFoto") || null })
    .where(and(eq(galeriFoto.villageId, villageId), eq(galeriFoto.id, id)));
  if (file instanceof File && file.size > 0) await hapusMedia(photo.gambar);
  revalidatePath("/website/konten"); revalidatePath("/website");
  redirect("/website/konten?saved=1#galeri");
}

export async function ubahSliderWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Slider tidak valid.");
  const [current] = await db.select({ gambar: slider.gambar }).from(slider)
    .where(and(eq(slider.villageId, villageId), eq(slider.id, id))).limit(1);
  if (!current) throw new Error("Slider tidak ditemukan.");
  const file = fd.get("gambarSlider");
  let gambar = current.gambar;
  if (file instanceof File && file.size > 0) gambar = await simpanBerkasMedia(villageId,
    { nama: file.name, mime: file.type, ukuran: file.size, isi: new Uint8Array(await file.arrayBuffer()) }, "slider", "gambar");
  const tautan = text(fd, "tautanSlider");
  if (tautan) { let url: URL; try { url = new URL(tautan); } catch { throw new Error("Tautan slider tidak valid."); }
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Tautan slider harus HTTP atau HTTPS."); }
  await db.update(slider).set({ gambar, judul: text(fd, "judulSlider") || null,
    keterangan: text(fd, "keteranganSlider") || null, tautan: tautan || null,
    urut: Math.max(0, Number(text(fd, "urutSlider")) || 0) })
    .where(and(eq(slider.villageId, villageId), eq(slider.id, id)));
  if (file instanceof File && file.size > 0) await hapusMedia(current.gambar);
  revalidatePath("/website/konten"); revalidatePath("/website");
  redirect("/website/konten?saved=1#slider");
}

export async function ubahKategoriBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id"), nama = text(fd, "namaKategori");
  const slug = slugify(text(fd, "slugKategori") || nama).slice(0, 100);
  if (!id || !nama || nama.length > 100 || !slug) throw new Error("Data kategori tidak valid.");
  const [current] = await db.select({ id: beritaKategori.id }).from(beritaKategori)
    .where(and(eq(beritaKategori.villageId, villageId), eq(beritaKategori.id, id))).limit(1);
  if (!current) throw new Error("Kategori tidak ditemukan.");
  const [duplicate] = await db.select({ id: beritaKategori.id }).from(beritaKategori)
    .where(and(eq(beritaKategori.villageId, villageId), eq(beritaKategori.slug, slug))).limit(1);
  if (duplicate && duplicate.id !== id) throw new Error("Slug kategori sudah digunakan.");
  await db.update(beritaKategori).set({ nama, slug })
    .where(and(eq(beritaKategori.villageId, villageId), eq(beritaKategori.id, id)));
  revalidatePath("/website/konten"); revalidatePath("/website");
  redirect("/website/konten?saved=1#berita");
}

export async function hapusKategoriBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Kategori tidak valid.");
  const [current] = await db.select({ id: beritaKategori.id }).from(beritaKategori)
    .where(and(eq(beritaKategori.villageId, villageId), eq(beritaKategori.id, id))).limit(1);
  if (!current) throw new Error("Kategori tidak ditemukan.");
  const [used] = await db.select({ id: berita.id }).from(berita)
    .where(and(eq(berita.villageId, villageId), eq(berita.kategoriId, id))).limit(1);
  if (used) throw new Error("Kategori masih digunakan berita. Pindahkan berita ke kategori lain terlebih dahulu.");
  await db.delete(beritaKategori).where(and(eq(beritaKategori.villageId, villageId), eq(beritaKategori.id, id)));
  revalidatePath("/website/konten"); redirect("/website/konten?deleted=1#berita");
}

export async function ubahWidgetWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id"), jenis = Number(text(fd, "jenisWidget"));
  if (!id || !Number.isInteger(jenis) || jenis < 1 || jenis > 6) throw new Error("Data widget tidak valid.");
  const [current] = await db.select({ id: widget.id }).from(widget).where(and(eq(widget.villageId, villageId), eq(widget.id, id))).limit(1);
  if (!current) throw new Error("Widget tidak ditemukan.");
  await db.update(widget).set({ judul: text(fd, "judulWidget") || null, isi: text(fd, "isiWidget") || null, jenis,
    urut: Math.max(0, Number(text(fd, "urutWidget")) || 0) })
    .where(and(eq(widget.villageId, villageId), eq(widget.id, id)));
  revalidatePath("/website/halaman"); revalidatePath("/website"); redirect("/website/halaman?saved=1#widget");
}
