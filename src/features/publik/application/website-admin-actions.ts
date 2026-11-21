"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { updateIdentitas } from "@/features/desa/application/use-cases";
import { desaFormSchema } from "@/features/desa/domain/desa";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import type { BerkasUnggahan } from "@/features/publik/domain/media";
import {
  createDokumenPublik,
  createMenuPublik,
  createSlider,
  createWidget,
  deleteDokumenPublik,
  deleteMenuPublik,
  deleteSlider,
  deleteWidget,
  dokumenSlugExists,
  listMenuPublik,
  updateDokumenPublik,
  updateMenuPublik,
  updateSlider,
  updateWidget,
} from "@/features/publik/infrastructure/content-repository";
import { hapusMedia } from "@/features/publik/infrastructure/media-storage";
import {
  ambilGambarBerita,
  ambilGambarFoto,
  ambilGambarSlider,
  ambilTemaAktifDenganOpsi,
  buatAgenda,
  buatAlbum,
  buatBerita,
  buatFoto,
  buatHalamanStatis,
  buatKategoriBerita,
  cariAgendaById,
  cariAlbumById,
  cariAlbumBySlug,
  cariBeritaById,
  cariBeritaBySlug,
  cariBeritaDenganKategori,
  cariDokumenById,
  cariDokumenBySlug,
  cariHalamanStatisAktifBySlug,
  cariHalamanStatisById,
  cariHalamanStatisBySlug,
  cariKategoriById,
  cariKategoriBySlug,
  cariMenuById,
  cariMenuInduk,
  cariWidgetById,
  hapusAgenda,
  hapusAlbum,
  hapusBerita,
  hapusFoto,
  hapusHalamanStatis,
  hapusKategoriBerita,
  listGambarFotoByAlbum,
  ubahAgenda,
  ubahAlbum,
  ubahBerita,
  ubahDokumen,
  ubahFoto,
  ubahHalamanStatis,
  ubahKategoriBerita,
  ubahMenuDetail,
  ubahOpsiTema,
  ubahSlider,
  ubahStatusAgenda,
  ubahStatusBerita,
  ubahStatusHalamanStatis,
} from "@/features/publik/infrastructure/website-admin-repository";
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
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 190);

export async function simpanIdentitasWebsiteAction(fd: FormData): Promise<void> {
  const input = desaFormSchema.parse({
    namaDesa: text(fd, "namaDesa"),
    kodeDesa: text(fd, "kodeDesa"),
    kodePos: text(fd, "kodePos"),
    namaKecamatan: text(fd, "namaKecamatan"),
    kodeKecamatan: text(fd, "kodeKecamatan"),
    namaKabupaten: text(fd, "namaKabupaten"),
    kodeKabupaten: text(fd, "kodeKabupaten"),
    namaPropinsi: text(fd, "namaPropinsi"),
    kodePropinsi: text(fd, "kodePropinsi"),
    alamatKantor: text(fd, "alamatKantor"),
    namaKepalaDesa: text(fd, "namaKepalaDesa"),
    nipKepalaDesa: text(fd, "nipKepalaDesa"),
    emailDesa: text(fd, "emailDesa"),
    telepon: text(fd, "telepon"),
    website: text(fd, "website"),
    logo: text(fd, "logo"),
    tandaTangan: text(fd, "tandaTangan"),
    stempel: text(fd, "stempel"),
    penomoranSurat: text(fd, "penomoranSurat") || "2",
  });
  const unggahan: Partial<Record<"logo" | "tandaTangan" | "stempel", BerkasUnggahan>> = {};
  for (const field of ["logo", "tandaTangan", "stempel"] as const) {
    const file = fd.get(field);
    if (file instanceof File && file.size > 0)
      unggahan[field] = {
        nama: file.name,
        mime: file.type,
        ukuran: file.size,
        isi: new Uint8Array(await file.arrayBuffer()),
      };
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
  if (
    !nama ||
    !link ||
    nama.length > 50 ||
    link.length > 500 ||
    !["internal", "eksternal", "halaman"].includes(linkTipe)
  ) {
    throw new Error("Data menu tidak valid.");
  }
  if (linkTipe === "internal" && (!link.startsWith("/") || link.startsWith("//")))
    throw new Error("Link internal harus berupa path lokal.");
  if (linkTipe === "eksternal") {
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      throw new Error("URL eksternal tidak valid.");
    }
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("URL eksternal harus menggunakan HTTP atau HTTPS.");
  }
  if (linkTipe === "halaman") {
    const match = /^\/halaman\/([a-z0-9-]+)$/.exec(link);
    if (!match) throw new Error("Tautan halaman harus menggunakan format /halaman/slug.");
    const page = await cariHalamanStatisAktifBySlug(villageId, match[1]!);
    if (!page) throw new Error("Halaman statis tidak ditemukan atau belum dipublikasikan.");
  }
  const parentId = num(fd, "parentId");
  const menu = await listMenuPublik(villageId, true);
  if (parentId && !menu.some((item) => item.id === parentId && item.parentId === null)) {
    throw new Error("Menu induk tidak ditemukan pada desa ini.");
  }
  await createMenuPublik(villageId, {
    nama,
    link,
    linkTipe,
    parentId,
    urut: Number(text(fd, "urut")) || 0,
    aktif: true,
  });
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
  if (menu.some((item) => item.parentId === id))
    throw new Error("Pindahkan atau hapus submenu terlebih dahulu.");
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
  if (!judul || judul.length > 200 || !slug || !isi)
    throw new Error("Judul, slug, dan isi halaman wajib diisi.");
  const existing = await cariHalamanStatisBySlug(villageId, slug);
  if (existing) throw new Error("Slug halaman sudah digunakan.");
  await buatHalamanStatis(villageId, {
    judul,
    slug,
    isi: sanitasiHtml(isi),
    aktif: fd.get("aktif") === "on",
  });
  revalidatePath("/website/halaman");
  redirect("/website/halaman?saved=1");
}

export async function ubahStatusHalamanWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Halaman tidak valid.");
  await ubahStatusHalamanStatis(villageId, id, text(fd, "aktif") === "true");
  revalidatePath("/website/halaman");
  redirect("/website/halaman?saved=1");
}

export async function hapusHalamanWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Halaman tidak valid.");
  await hapusHalamanStatis(villageId, id);
  revalidatePath("/website/halaman");
  redirect("/website/halaman?deleted=1");
}

export async function tambahDokumenWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-dokumen", "update");
  const villageId = await resolveVillageId(user);
  const nama = text(fd, "nama");
  const kategori = text(fd, "kategori") || "informasi_publik";
  if (!nama || nama.length > 200)
    throw new Error("Nama dokumen wajib diisi (maksimal 200 karakter).");
  if (!["informasi_publik", "produk_hukum", "lainnya"].includes(kategori))
    throw new Error("Kategori dokumen tidak valid.");
  const slug = slugify(text(fd, "slug") || nama);
  if (!slug) throw new Error("Slug dokumen tidak valid.");
  if (await dokumenSlugExists(villageId, slug)) throw new Error("Slug dokumen sudah digunakan.");
  const file = fd.get("berkas");
  let berkas: string | null = null;
  if (file instanceof File && file.size > 0) {
    berkas = await simpanBerkasMedia(
      villageId,
      {
        nama: file.name,
        mime: file.type,
        ukuran: file.size,
        isi: new Uint8Array(await file.arrayBuffer()),
      },
      "dokumen",
      "berkas",
    );
  }
  const tautan = text(fd, "tautan");
  if (!berkas && !tautan) throw new Error("Unggah PDF/gambar atau isi tautan dokumen.");
  if (tautan) {
    let url: URL;
    try {
      url = new URL(tautan);
    } catch {
      throw new Error("Tautan dokumen tidak valid.");
    }
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Tautan dokumen harus menggunakan HTTP atau HTTPS.");
  }
  const tahunText = text(fd, "tahun");
  const tahun = tahunText ? Number(tahunText) : null;
  if (tahun !== null && (!Number.isInteger(tahun) || tahun < 1900 || tahun > 2200))
    throw new Error("Tahun dokumen tidak valid.");
  await createDokumenPublik(villageId, {
    nama,
    slug,
    kategori,
    jenis: text(fd, "jenis") || null,
    nomor: text(fd, "nomor") || null,
    tahun,
    berkas,
    tautan: tautan || null,
    keterangan: text(fd, "keterangan") || null,
    aktif: fd.get("aktif") === "on",
  });
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
  const row = await cariDokumenById(villageId, id);
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
  const existing = await cariAlbumBySlug(villageId, slug);
  if (existing) throw new Error("Slug album sudah digunakan.");
  await buatAlbum(villageId, {
    nama,
    slug,
    keterangan: text(fd, "keteranganAlbum") || null,
  });
  revalidatePath("/website/konten");
  redirect("/website/konten?saved=1#galeri");
}

export async function unggahFotoWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const albumId = num(fd, "albumId");
  if (!albumId) throw new Error("Pilih album galeri.");
  const album = await cariAlbumById(villageId, albumId);
  if (!album) throw new Error("Album tidak ditemukan pada desa ini.");
  const file = fd.get("gambar");
  if (!(file instanceof File) || file.size === 0) throw new Error("Pilih berkas gambar.");
  const gambar = await simpanBerkasMedia(
    villageId,
    {
      nama: file.name,
      mime: file.type,
      ukuran: file.size,
      isi: new Uint8Array(await file.arrayBuffer()),
    },
    "galeri",
    "gambar",
  );
  await buatFoto(villageId, {
    albumId,
    gambar,
    judul: text(fd, "judulFoto") || null,
    keterangan: text(fd, "keteranganFoto") || null,
  });
  revalidatePath("/website/konten");
  redirect("/website/konten?saved=1#galeri");
}

export async function simpanTemaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-pengaturan", "update");
  const villageId = await resolveVillageId(user);
  const active = await ambilTemaAktifDenganOpsi(villageId);
  if (!active) throw new Error("Tema desa belum disiapkan oleh Super Admin.");
  const warnaUtama = text(fd, "warnaUtama");
  const warnaAksen = text(fd, "warnaAksen");
  const font = text(fd, "font");
  const logoTampil = fd.get("logoTampil") === "on";
  const warna = /^#[0-9a-fA-F]{6}$/;
  if (!warna.test(warnaUtama) || !warna.test(warnaAksen))
    throw new Error("Warna tema harus berupa kode HEX enam digit.");
  if (!["system", "sans", "serif"].includes(font)) throw new Error("Pilihan font tidak valid.");
  let opsiLama: Record<string, unknown> = {};
  try {
    const parsed: unknown = active.opsi ? JSON.parse(active.opsi) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      opsiLama = parsed as Record<string, unknown>;
  } catch {
    opsiLama = {};
  }
  const opsi = { ...opsiLama, branding: { warnaUtama, warnaAksen, font, logoTampil } };
  await ubahOpsiTema(villageId, active.id, JSON.stringify(opsi));
  revalidatePath("/website");
  revalidatePath("/website/pengaturan");
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
  if (
    !id ||
    !nama ||
    nama.length > 50 ||
    !link ||
    link.length > 500 ||
    !["internal", "eksternal", "halaman"].includes(linkTipe)
  )
    throw new Error("Data menu tidak valid.");
  const current = await cariMenuById(villageId, id);
  if (!current) throw new Error("Menu tidak ditemukan.");
  if (linkTipe === "internal" && (!link.startsWith("/") || link.startsWith("//")))
    throw new Error("Link internal harus berupa path lokal.");
  if (linkTipe === "eksternal") {
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      throw new Error("URL eksternal tidak valid.");
    }
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("URL eksternal harus HTTP atau HTTPS.");
  }
  if (linkTipe === "halaman") {
    const match = /^\/halaman\/([a-z0-9-]+)$/.exec(link);
    if (!match) throw new Error("Tautan halaman harus menggunakan format /halaman/slug.");
    const page = await cariHalamanStatisAktifBySlug(villageId, match[1]!);
    if (!page) throw new Error("Halaman statis tidak ditemukan atau belum dipublikasikan.");
  }
  if (parentId) {
    const parent = await cariMenuInduk(villageId, parentId);
    if (!parent || parentId === id || parent.parentId !== null)
      throw new Error("Menu induk harus menu utama pada desa ini.");
  }
  await ubahMenuDetail(villageId, id, { nama, link, linkTipe, parentId });
  revalidatePath("/website/halaman");
  redirect("/website/halaman?saved=1");
}

export async function tambahBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const judul = text(fd, "judulBerita");
  const slug = slugify(text(fd, "slugBerita") || judul);
  const isi = text(fd, "isiBerita");
  const ringkasan = text(fd, "ringkasanBerita");
  if (!judul || judul.length > 200 || !slug || !isi)
    throw new Error("Judul, slug, dan isi berita wajib diisi.");
  const existing = await cariBeritaBySlug(villageId, slug);
  if (existing) throw new Error("Slug berita sudah digunakan.");
  const kategoriText = text(fd, "kategoriId");
  const kategoriId = kategoriText ? Number(kategoriText) : null;
  if (kategoriId !== null) {
    const category = await cariKategoriById(villageId, kategoriId);
    if (!category) throw new Error("Kategori berita tidak ditemukan.");
  }
  const file = fd.get("gambarBerita");
  let gambar: string | null = null;
  if (file instanceof File && file.size > 0)
    gambar = await simpanBerkasMedia(
      villageId,
      {
        nama: file.name,
        mime: file.type,
        ukuran: file.size,
        isi: new Uint8Array(await file.arrayBuffer()),
      },
      "berita",
      "gambar",
    );
  const status = text(fd, "statusBerita") === "published" ? "published" : "draft";
  const tanggal = text(fd, "terbitPada");
  const terbitPada = tanggal ? new Date(tanggal) : status === "published" ? new Date() : null;
  await buatBerita(villageId, {
    judul,
    slug,
    ringkasan: ringkasan || null,
    isi: sanitasiHtml(isi),
    kategoriId,
    gambar,
    status,
    terbitPada,
    headline: fd.get("headline") === "on",
    slider: fd.get("tampilSlider") === "on",
  });
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?saved=1#berita");
}

export async function ubahStatusBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Berita tidak valid.");
  const status = text(fd, "status") === "published" ? "published" : "draft";
  await ubahStatusBerita(villageId, id, status);
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?saved=1#berita");
}

export async function tambahAgendaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const judul = text(fd, "judulAgenda");
  const mulai = text(fd, "mulaiAgenda");
  const selesai = text(fd, "selesaiAgenda");
  if (!judul || judul.length > 200 || !/^\d{4}-\d{2}-\d{2}$/.test(mulai))
    throw new Error("Judul dan tanggal mulai agenda wajib diisi.");
  if (selesai && (!/^\d{4}-\d{2}-\d{2}$/.test(selesai) || selesai < mulai))
    throw new Error("Tanggal selesai tidak valid.");
  await buatAgenda(villageId, {
    judul,
    mulai,
    selesai: selesai || null,
    jamMulai: text(fd, "jamMulai") || null,
    jamSelesai: text(fd, "jamSelesai") || null,
    kategori: text(fd, "kategoriAgenda") || "umum",
    lokasi: text(fd, "lokasiAgenda") || null,
    deskripsi: text(fd, "deskripsiAgenda") || null,
    tayang: fd.get("tayangAgenda") === "on",
  });
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?saved=1#agenda");
}

export async function ubahStatusAgendaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Agenda tidak valid.");
  await ubahStatusAgenda(villageId, id, text(fd, "tayang") === "true");
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?saved=1#agenda");
}

export async function tambahWidgetWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const judul = text(fd, "judulWidget");
  const jenis = Number(text(fd, "jenisWidget"));
  if (!Number.isInteger(jenis) || jenis < 1 || jenis > 6)
    throw new Error("Jenis widget tidak valid.");
  await createWidget(villageId, {
    judul: judul || null,
    isi: text(fd, "isiWidget") || null,
    jenis,
    pengaturan: null,
    urut: Math.max(0, Number(text(fd, "urutWidget")) || 0),
    aktif: fd.get("aktifWidget") === "on",
  });
  revalidatePath("/website/halaman");
  redirect("/website/halaman?saved=1#widget");
}

export async function ubahStatusWidgetWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Widget tidak valid.");
  await updateWidget(villageId, id, { aktif: text(fd, "aktif") === "true" });
  revalidatePath("/website/halaman");
  redirect("/website/halaman?saved=1#widget");
}

export async function tambahSliderWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const file = fd.get("gambarSlider");
  if (!(file instanceof File) || file.size === 0) throw new Error("Gambar slider wajib dipilih.");
  const gambar = await simpanBerkasMedia(
    villageId,
    {
      nama: file.name,
      mime: file.type,
      ukuran: file.size,
      isi: new Uint8Array(await file.arrayBuffer()),
    },
    "slider",
    "gambar",
  );
  const tautan = text(fd, "tautanSlider");
  if (tautan) {
    let url: URL;
    try {
      url = new URL(tautan);
    } catch {
      throw new Error("Tautan slider tidak valid.");
    }
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Tautan slider harus HTTP atau HTTPS.");
  }
  await createSlider(villageId, {
    gambar,
    judul: text(fd, "judulSlider") || null,
    keterangan: text(fd, "keteranganSlider") || null,
    tautan: tautan || null,
    urut: Math.max(0, Number(text(fd, "urutSlider")) || 0),
    aktif: fd.get("aktifSlider") === "on",
  });
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?saved=1#slider");
}

export async function ubahStatusSliderWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Slider tidak valid.");
  await updateSlider(villageId, id, { aktif: text(fd, "aktif") === "true" });
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?saved=1#slider");
}

export async function hapusBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Berita tidak valid.");
  const row = await ambilGambarBerita(villageId, id);
  if (!row) throw new Error("Berita tidak ditemukan.");
  await hapusBerita(villageId, id);
  if (row.gambar) await hapusMedia(row.gambar);
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?deleted=1#berita");
}

export async function hapusAgendaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Agenda tidak valid.");
  await hapusAgenda(villageId, id);
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?deleted=1#agenda");
}

export async function hapusSliderWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Slider tidak valid.");
  const row = await ambilGambarSlider(villageId, id);
  if (!row) throw new Error("Slider tidak ditemukan.");
  await deleteSlider(villageId, id);
  await hapusMedia(row.gambar);
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?deleted=1#slider");
}

export async function ubahHalamanWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  const judul = text(fd, "judul");
  const slug = slugify(text(fd, "slug") || judul);
  const isi = text(fd, "isi");
  if (!id || !judul || judul.length > 200 || !slug || !isi)
    throw new Error("Data halaman tidak lengkap.");
  const existing = await cariHalamanStatisBySlug(villageId, slug);
  const current = await cariHalamanStatisById(villageId, id);
  if (!current) throw new Error("Halaman tidak ditemukan.");
  if (existing && existing.id !== id) throw new Error("Slug halaman sudah digunakan.");
  await ubahHalamanStatis(villageId, id, { judul, slug, isi: sanitasiHtml(isi) });
  revalidatePath("/website/halaman");
  redirect("/website/halaman?saved=1");
}

export async function tambahKategoriBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const nama = text(fd, "namaKategori");
  const slug = slugify(text(fd, "slugKategori") || nama).slice(0, 100);
  if (!nama || nama.length > 100 || !slug) throw new Error("Nama kategori dan slug wajib diisi.");
  const existing = await cariKategoriBySlug(villageId, slug);
  if (existing) throw new Error("Slug kategori sudah digunakan.");
  await buatKategoriBerita(villageId, nama, slug);
  revalidatePath("/website/konten");
  redirect("/website/konten?saved=1#berita");
}

export async function hapusFotoGaleriWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Foto tidak valid.");
  const row = await ambilGambarFoto(villageId, id);
  if (!row) throw new Error("Foto tidak ditemukan.");
  await hapusFoto(villageId, id);
  await hapusMedia(row.gambar);
  revalidatePath("/website/konten");
  redirect("/website/konten?deleted=1#galeri");
}

export async function ubahDokumenWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-dokumen", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  const nama = text(fd, "nama");
  const slug = slugify(text(fd, "slug") || nama);
  const kategori = text(fd, "kategori") || "informasi_publik";
  if (
    !id ||
    !nama ||
    nama.length > 200 ||
    !slug ||
    !["informasi_publik", "produk_hukum", "lainnya"].includes(kategori)
  )
    throw new Error("Data dokumen tidak valid.");
  const current = await cariDokumenById(villageId, id);
  if (!current) throw new Error("Dokumen tidak ditemukan.");
  const existing = await cariDokumenBySlug(villageId, slug);
  if (existing && existing.id !== id) throw new Error("Slug dokumen sudah digunakan.");
  const file = fd.get("berkas");
  let berkas = current.berkas;
  if (file instanceof File && file.size > 0)
    berkas = await simpanBerkasMedia(
      villageId,
      {
        nama: file.name,
        mime: file.type,
        ukuran: file.size,
        isi: new Uint8Array(await file.arrayBuffer()),
      },
      "dokumen",
      "berkas",
    );
  const tautan = text(fd, "tautan");
  if (!berkas && !tautan) throw new Error("Dokumen harus memiliki berkas atau tautan.");
  if (tautan) {
    let url: URL;
    try {
      url = new URL(tautan);
    } catch {
      throw new Error("Tautan dokumen tidak valid.");
    }
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Tautan dokumen harus HTTP atau HTTPS.");
  }
  const tahunText = text(fd, "tahun");
  const tahun = tahunText ? Number(tahunText) : null;
  if (tahun !== null && (!Number.isInteger(tahun) || tahun < 1900 || tahun > 2200))
    throw new Error("Tahun dokumen tidak valid.");
  await ubahDokumen(villageId, id, {
    nama,
    slug,
    kategori,
    jenis: text(fd, "jenis") || null,
    nomor: text(fd, "nomor") || null,
    tahun,
    berkas,
    tautan: tautan || null,
    keterangan: text(fd, "keterangan") || null,
  });
  if (file instanceof File && file.size > 0 && current.berkas) await hapusMedia(current.berkas);
  revalidatePath("/website/dokumen");
  revalidatePath("/website");
  redirect("/website/dokumen?saved=1");
}

export async function hapusWidgetWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Widget tidak valid.");
  await deleteWidget(villageId, id);
  revalidatePath("/website/halaman");
  redirect("/website/halaman?deleted=1#widget");
}

export async function hapusAlbumGaleriWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Album tidak valid.");
  const photos = await listGambarFotoByAlbum(villageId, id);
  const album = await cariAlbumById(villageId, id);
  if (!album) throw new Error("Album tidak ditemukan.");
  await hapusAlbum(villageId, id);
  for (const photo of photos) await hapusMedia(photo.gambar);
  if (album.sampul) await hapusMedia(album.sampul);
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?deleted=1#galeri");
}

export async function ubahBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  const judul = text(fd, "judulBerita");
  const slug = slugify(text(fd, "slugBerita") || judul);
  const isi = text(fd, "isiBerita");
  if (!id || !judul || judul.length > 200 || !slug || !isi)
    throw new Error("Data berita tidak valid.");
  const current = await cariBeritaById(villageId, id);
  if (!current) throw new Error("Berita tidak ditemukan.");
  const duplicate = await cariBeritaBySlug(villageId, slug);
  if (duplicate && duplicate.id !== id) throw new Error("Slug berita sudah digunakan.");
  const kategoriText = text(fd, "kategoriId");
  const kategoriId = kategoriText ? Number(kategoriText) : null;
  if (kategoriId !== null) {
    const category = await cariKategoriById(villageId, kategoriId);
    if (!category) throw new Error("Kategori berita tidak ditemukan pada desa ini.");
  }
  const file = fd.get("gambarBerita");
  let gambar = current.gambar;
  if (file instanceof File && file.size > 0)
    gambar = await simpanBerkasMedia(
      villageId,
      {
        nama: file.name,
        mime: file.type,
        ukuran: file.size,
        isi: new Uint8Array(await file.arrayBuffer()),
      },
      "berita",
      "gambar",
    );
  const status = text(fd, "statusBerita") === "published" ? "published" : "draft";
  const tanggal = text(fd, "terbitPada");
  const terbitPada = tanggal ? new Date(tanggal) : status === "published" ? new Date() : null;
  await ubahBerita(villageId, id, {
    judul,
    slug,
    isi: sanitasiHtml(isi),
    ringkasan: text(fd, "ringkasanBerita") || null,
    kategoriId,
    gambar,
    status,
    terbitPada,
    headline: fd.get("headline") === "on",
    slider: fd.get("tampilSlider") === "on",
  });
  if (file instanceof File && file.size > 0 && current.gambar) await hapusMedia(current.gambar);
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?saved=1#berita");
}

export async function ubahAgendaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id"),
    judul = text(fd, "judulAgenda");
  const mulai = text(fd, "mulaiAgenda"),
    selesai = text(fd, "selesaiAgenda");
  if (!id || !judul || judul.length > 200 || !/^\d{4}-\d{2}-\d{2}$/.test(mulai))
    throw new Error("Data agenda tidak valid.");
  if (selesai && (!/^\d{4}-\d{2}-\d{2}$/.test(selesai) || selesai < mulai))
    throw new Error("Tanggal selesai tidak valid.");
  const existing = await cariAgendaById(villageId, id);
  if (!existing) throw new Error("Agenda tidak ditemukan.");
  await ubahAgenda(villageId, id, {
    judul,
    mulai,
    selesai: selesai || null,
    jamMulai: text(fd, "jamMulai") || null,
    jamSelesai: text(fd, "jamSelesai") || null,
    kategori: text(fd, "kategoriAgenda") || "umum",
    lokasi: text(fd, "lokasiAgenda") || null,
    deskripsi: text(fd, "deskripsiAgenda") || null,
  });
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?saved=1#agenda");
}

export async function ubahAlbumWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id"),
    nama = text(fd, "namaAlbum");
  const slug = slugify(text(fd, "slugAlbum") || nama);
  if (!id || !nama || nama.length > 150 || !slug) throw new Error("Data album tidak valid.");
  const current = await cariAlbumById(villageId, id);
  if (!current) throw new Error("Album tidak ditemukan.");
  const duplicate = await cariAlbumBySlug(villageId, slug);
  if (duplicate && duplicate.id !== id) throw new Error("Slug album sudah digunakan.");
  const file = fd.get("sampulAlbum");
  let sampul = current.sampul;
  if (file instanceof File && file.size > 0)
    sampul = await simpanBerkasMedia(
      villageId,
      {
        nama: file.name,
        mime: file.type,
        ukuran: file.size,
        isi: new Uint8Array(await file.arrayBuffer()),
      },
      "galeri",
      "sampul",
    );
  await ubahAlbum(villageId, id, {
    nama,
    slug,
    keterangan: text(fd, "keteranganAlbum") || null,
    sampul,
    aktif: text(fd, "aktifAlbum") !== "false",
    urut: Math.max(0, Number(text(fd, "urutAlbum")) || 0),
  });
  if (file instanceof File && file.size > 0 && current.sampul) await hapusMedia(current.sampul);
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?saved=1#galeri");
}

export async function ubahFotoGaleriWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id"),
    albumId = num(fd, "albumId");
  if (!id || !albumId) throw new Error("Data foto tidak valid.");
  const photo = await ambilGambarFoto(villageId, id);
  const album = await cariAlbumById(villageId, albumId);
  if (!photo || !album) throw new Error("Foto atau album tidak ditemukan pada desa ini.");
  const file = fd.get("gambar");
  let gambar = photo.gambar;
  if (file instanceof File && file.size > 0)
    gambar = await simpanBerkasMedia(
      villageId,
      {
        nama: file.name,
        mime: file.type,
        ukuran: file.size,
        isi: new Uint8Array(await file.arrayBuffer()),
      },
      "galeri",
      "gambar",
    );
  await ubahFoto(villageId, id, {
    albumId,
    gambar,
    judul: text(fd, "judulFoto") || null,
    keterangan: text(fd, "keteranganFoto") || null,
    aktif: text(fd, "aktifFoto") !== "false",
    slider: text(fd, "sliderFoto") === "true",
    urut: Math.max(0, Number(text(fd, "urutFoto")) || 0),
  });
  if (file instanceof File && file.size > 0) await hapusMedia(photo.gambar);
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?saved=1#galeri");
}

export async function ubahSliderWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Slider tidak valid.");
  const current = await ambilGambarSlider(villageId, id);
  if (!current) throw new Error("Slider tidak ditemukan.");
  const file = fd.get("gambarSlider");
  let gambar = current.gambar;
  if (file instanceof File && file.size > 0)
    gambar = await simpanBerkasMedia(
      villageId,
      {
        nama: file.name,
        mime: file.type,
        ukuran: file.size,
        isi: new Uint8Array(await file.arrayBuffer()),
      },
      "slider",
      "gambar",
    );
  const tautan = text(fd, "tautanSlider");
  if (tautan) {
    let url: URL;
    try {
      url = new URL(tautan);
    } catch {
      throw new Error("Tautan slider tidak valid.");
    }
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("Tautan slider harus HTTP atau HTTPS.");
  }
  await ubahSlider(villageId, id, {
    gambar,
    judul: text(fd, "judulSlider") || null,
    keterangan: text(fd, "keteranganSlider") || null,
    tautan: tautan || null,
    urut: Math.max(0, Number(text(fd, "urutSlider")) || 0),
  });
  if (file instanceof File && file.size > 0) await hapusMedia(current.gambar);
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?saved=1#slider");
}

export async function ubahKategoriBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id"),
    nama = text(fd, "namaKategori");
  const slug = slugify(text(fd, "slugKategori") || nama).slice(0, 100);
  if (!id || !nama || nama.length > 100 || !slug) throw new Error("Data kategori tidak valid.");
  const current = await cariKategoriById(villageId, id);
  if (!current) throw new Error("Kategori tidak ditemukan.");
  const duplicate = await cariKategoriBySlug(villageId, slug);
  if (duplicate && duplicate.id !== id) throw new Error("Slug kategori sudah digunakan.");
  await ubahKategoriBerita(villageId, id, nama, slug);
  revalidatePath("/website/konten");
  revalidatePath("/website");
  redirect("/website/konten?saved=1#berita");
}

export async function hapusKategoriBeritaWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-konten", "delete");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id");
  if (!id) throw new Error("Kategori tidak valid.");
  const current = await cariKategoriById(villageId, id);
  if (!current) throw new Error("Kategori tidak ditemukan.");
  const used = await cariBeritaDenganKategori(villageId, id);
  if (used)
    throw new Error(
      "Kategori masih digunakan berita. Pindahkan berita ke kategori lain terlebih dahulu.",
    );
  await hapusKategoriBerita(villageId, id);
  revalidatePath("/website/konten");
  redirect("/website/konten?deleted=1#berita");
}

export async function ubahWidgetWebsiteAction(fd: FormData): Promise<void> {
  const user = await requirePermission("website-halaman", "update");
  const villageId = await resolveVillageId(user);
  const id = num(fd, "id"),
    jenis = Number(text(fd, "jenisWidget"));
  if (!id || !Number.isInteger(jenis) || jenis < 1 || jenis > 6)
    throw new Error("Data widget tidak valid.");
  const current = await cariWidgetById(villageId, id);
  if (!current) throw new Error("Widget tidak ditemukan.");
  await updateWidget(villageId, id, {
    judul: text(fd, "judulWidget") || null,
    isi: text(fd, "isiWidget") || null,
    jenis,
    urut: Math.max(0, Number(text(fd, "urutWidget")) || 0),
  });
  revalidatePath("/website/halaman");
  revalidatePath("/website");
  redirect("/website/halaman?saved=1#widget");
}
