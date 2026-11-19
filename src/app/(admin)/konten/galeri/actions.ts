"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { galeriAlbum, galeriVideo } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { GALERI_RESOURCE } from "@/features/konten/domain/galeri";
import { requirePermission } from "@/lib/dal";

function field(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function videoProvider(value: string): { url: string; provider: "youtube" | "vimeo" } | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
      const id = url.searchParams.get("v") || url.pathname.match(/^\/embed\/([\w-]+)/)?.[1] || url.pathname.match(/^\/shorts\/([\w-]+)/)?.[1];
      if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
      return { url: "https://www.youtube-nocookie.com/embed/" + id, provider: "youtube" };
    }
    if (url.hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
      return { url: "https://www.youtube-nocookie.com/embed/" + id, provider: "youtube" };
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)) {
      const id = url.pathname.split("/").filter(Boolean).find((part) => /^\d{5,12}$/.test(part));
      if (!id) return null;
      return { url: "https://player.vimeo.com/video/" + id, provider: "vimeo" };
    }
    return null;
  } catch {
    return null;
  }
}

export async function simpanMetadataAlbum(form: FormData) {
  const user = await requirePermission(GALERI_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const id = Number(field(form, "albumId"));
  const kategori = field(form, "kategori").slice(0, 80) || null;
  const rawDate = field(form, "publishedAt");
  const publishedAt = rawDate ? new Date(rawDate + "T00:00:00") : null;
  if (!Number.isSafeInteger(id) || id < 1 || (publishedAt && Number.isNaN(publishedAt.getTime()))) {
    throw new Error("Data album atau tanggal publikasi tidak valid.");
  }
  await db.update(galeriAlbum).set({ kategori, publishedAt }).where(and(eq(galeriAlbum.id, id), eq(galeriAlbum.villageId, villageId)));
  revalidatePath("/konten/galeri");
  revalidatePath("/galeri");
}

export async function tambahVideoGaleri(form: FormData) {
  const user = await requirePermission(GALERI_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const judul = field(form, "judul").slice(0, 150);
  const keterangan = field(form, "keterangan").slice(0, 2000) || null;
  const parsed = videoProvider(field(form, "url"));
  const rawDate = field(form, "publishedAt");
  const publishedAt = rawDate ? new Date(rawDate + "T00:00:00") : new Date();
  if (!judul || !parsed || Number.isNaN(publishedAt.getTime())) {
    throw new Error("Judul, URL YouTube/Vimeo yang valid, dan tanggal publikasi wajib benar.");
  }
  await db.insert(galeriVideo).values({ villageId, judul, keterangan, url: parsed.url, provider: parsed.provider, aktif: true, publishedAt });
  revalidatePath("/konten/galeri");
  revalidatePath("/galeri");
}

export async function hapusVideoGaleri(form: FormData) {
  const user = await requirePermission(GALERI_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  const id = Number(field(form, "videoId"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("ID video tidak valid.");
  await db.delete(galeriVideo).where(and(eq(galeriVideo.id, id), eq(galeriVideo.villageId, villageId)));
  revalidatePath("/konten/galeri");
  revalidatePath("/galeri");
}
