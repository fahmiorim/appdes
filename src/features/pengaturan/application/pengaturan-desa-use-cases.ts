import "server-only";

import { getIdentitasFromRequest } from "@/features/desa/application/resolve-village";
import { tokenTemplateSchema } from "@/features/multi-desa/domain/template-website";
import { hapusMedia, hitungUkuranMedia } from "@/features/publik/infrastructure/media-storage";
import { notFound, validationError } from "@/lib/errors";

import {
  backupDesaSchema,
  integrasiDesaSchema,
  kontakDesaSchema,
  layananDesaSchema,
  mediaBackupValid,
  profilDesaSchema,
  tampilanDesaSchema,
  type LayananDesa,
} from "../domain/pengaturan-desa";
import {
  bacaDataBackupDesa,
  bacaFaviconDesa,
  bacaIdentitasDesa,
  bacaKuotaMedia,
  bacaLogoDesa,
  bacaNilaiPengaturan,
  bacaProfilDesa,
  bacaTemaAktif,
  bacaTemplateTerbit,
  createLayananDesa,
  listLayananAdminDesa,
  listLayananDesa,
  listTemplateTerbit,
  nonaktifkanLayananDesa as nonaktifkanLayananDesaRepo,
  pulihkanDataBackupDesa,
  simpanFaviconDesa,
  simpanIntegrasiDesa as simpanIntegrasiDesaRepo,
  simpanKontakDesa as simpanKontakDesaRepo,
  simpanLogoDesa,
  simpanProfilDesa as simpanProfilDesaRepo,
  terapkanTemaDesa,
  updateLayananDesa,
} from "../infrastructure/pengaturan-desa-repository";
import { bacaPengaturan, simpanPengaturanTenant } from "./pengaturan-use-cases";

/** Data lengkap halaman Pengaturan Desa (satu kali baca paralel). */
export async function getDataPengaturanDesa(villageId: number) {
  const [desa, profil, layanan, templates, temaAktif, umum, mediaUsage, mediaQuotaMb] =
    await Promise.all([
      bacaIdentitasDesa(villageId),
      bacaProfilDesa(villageId),
      listLayananAdminDesa(villageId),
      listTemplateTerbit(),
      bacaTemaAktif(villageId),
      bacaPengaturan(villageId),
      hitungUkuranMedia(villageId),
      bacaKuotaMedia(villageId),
    ]);
  const [kontak, integrasi, favicon] = await Promise.all([
    bacaNilaiPengaturan(villageId, "pengaturan.kontak"),
    bacaNilaiPengaturan(villageId, "pengaturan.integrasi"),
    bacaNilaiPengaturan(villageId, "pengaturan.favicon"),
  ]);

  return {
    desa,
    profil,
    layanan,
    kontak:
      typeof kontak === "object" && kontak !== null && !Array.isArray(kontak)
        ? (kontak as Record<string, unknown>)
        : {},
    integrasi:
      typeof integrasi === "object" && integrasi !== null && !Array.isArray(integrasi)
        ? (integrasi as Record<string, unknown>)
        : {},
    favicon,
    templates: templates.map((template) => ({
      ...template,
      tokens: (() => {
        try {
          const parsed = tokenTemplateSchema.safeParse(JSON.parse(template.tokens));
          return parsed.success ? parsed.data : {};
        } catch {
          return {};
        }
      })(),
      tags: (() => {
        try {
          return JSON.parse(template.tags) as unknown;
        } catch {
          return [];
        }
      })(),
    })),
    temaAktif,
    umum,
    media: { usedBytes: mediaUsage, quotaMb: mediaQuotaMb },
  };
}

export async function simpanProfilDesa(villageId: number, input: unknown): Promise<void> {
  const parsed = profilDesaSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Profil tidak valid.");
  }
  await simpanProfilDesaRepo(villageId, parsed.data);
}

export async function simpanKontakDesa(villageId: number, input: unknown): Promise<void> {
  const parsed = kontakDesaSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Kontak tidak valid.");
  }
  const d = parsed.data;
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
    throw validationError("Format email desa tidak valid.");
  for (const url of [d.website, d.tautanPeta]) {
    if (!url) continue;
    try {
      const u = new URL(url);
      if (!["https:", "http:"].includes(u.protocol)) throw new Error();
    } catch {
      throw validationError(
        url === d.website
          ? "Website desa harus berupa URL HTTP/HTTPS."
          : "Tautan peta harus berupa URL HTTP/HTTPS.",
      );
    }
  }
  for (const number of [d.telepon, d.whatsapp]) {
    if (number && !/^[0-9+()\s-]{6,30}$/.test(number))
      throw validationError("Nomor telepon/WhatsApp tidak valid.");
  }
  if (d.koordinat) {
    const parts = d.koordinat.split(",").map((value) => Number(value.trim()));
    const [lintang, bujur] = parts;
    if (
      lintang === undefined ||
      bujur === undefined ||
      parts.length !== 2 ||
      !parts.every(Number.isFinite) ||
      lintang < -90 ||
      lintang > 90 ||
      bujur < -180 ||
      bujur > 180
    )
      throw validationError(
        "Koordinat harus berupa latitude (-90 s.d. 90), longitude (-180 s.d. 180).",
      );
  }
  await simpanKontakDesaRepo(villageId, d);
}

export async function simpanIntegrasiDesa(villageId: number, input: unknown): Promise<void> {
  const parsed = integrasiDesaSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Pengaturan integrasi tidak valid.");
  }
  const d = parsed.data;
  for (const field of ["webhookUrl", "endpointEksternal"] as const) {
    const value = d[field];
    if (!value) continue;
    try {
      const u = new URL(value);
      if (!["https:", "http:"].includes(u.protocol)) throw new Error();
    } catch {
      throw validationError("URL integrasi harus menggunakan HTTP/HTTPS.");
    }
  }
  await simpanIntegrasiDesaRepo(villageId, d);
}

/** Terapkan template tampilan terbit; pesan hasil dipakai route untuk respons. */
export async function terapkanTemplateDesa(villageId: number, input: unknown): Promise<string> {
  const parsed = tampilanDesaSchema.safeParse(input);
  if (!parsed.success) throw validationError("Template tidak valid.");
  const template = await bacaTemplateTerbit(parsed.data.templateSlug);
  if (!template) throw notFound("Template tidak tersedia atau belum diterbitkan.");
  let rawTokens: unknown;
  try {
    rawTokens = JSON.parse(template.tokens);
  } catch {
    throw validationError("Token template tidak valid.");
  }
  const tokens = tokenTemplateSchema.safeParse(rawTokens);
  if (!tokens.success) throw validationError("Token template tidak sesuai skema tampilan.");
  await terapkanTemaDesa(villageId, {
    slug: template.slug,
    nama: template.name,
    versi: template.version,
    tokens: tokens.data,
  });
  return "Preferensi template website berhasil diterapkan. Tampilan menggunakan komponen website publik FlexiDes dengan token tema yang dipilih.";
}

export async function listLayananDesaAdmin(villageId: number) {
  return listLayananDesa(villageId);
}

function parseLayanan(input: unknown): LayananDesa {
  const parsed = layananDesaSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Data layanan tidak valid.");
  }
  return parsed.data;
}

export async function tambahLayananDesa(
  villageId: number,
  input: unknown,
): Promise<number | undefined> {
  return createLayananDesa(villageId, parseLayanan(input));
}

export async function ubahLayananDesa(
  villageId: number,
  id: number,
  input: unknown,
): Promise<boolean> {
  return updateLayananDesa(villageId, id, parseLayanan(input));
}

export async function nonaktifkanLayananDesa(villageId: number, id: number): Promise<boolean> {
  return nonaktifkanLayananDesaRepo(villageId, id);
}

/** Simpan path media identitas baru dan kembalikan path lama untuk dihapus. */
export async function simpanMediaIdentitas(
  villageId: number,
  field: "logo" | "favicon",
  path: string,
): Promise<void> {
  const lama = field === "logo" ? await bacaLogoDesa(villageId) : await bacaFaviconDesa(villageId);
  if (field === "logo") await simpanLogoDesa(villageId, path);
  else await simpanFaviconDesa(villageId, path);
  if (lama && lama !== path) await hapusMedia(lama);
}

/** Hapus referensi media identitas dan kembalikan path lama. */
export async function hapusMediaIdentitas(
  villageId: number,
  field: "logo" | "favicon",
): Promise<void> {
  const lama = field === "logo" ? await bacaLogoDesa(villageId) : await bacaFaviconDesa(villageId);
  if (field === "logo") await simpanLogoDesa(villageId, null);
  else await simpanFaviconDesa(villageId, null);
  if (lama) await hapusMedia(lama);
}

/** Path favicon tenant bila valid dan masih di folder tenant tersebut. */
export async function getPathFaviconDesa(villageId: number): Promise<string | null> {
  const path = await bacaFaviconDesa(villageId);
  if (!path || !path.startsWith(`${villageId}/umum/`) || path.includes("..")) return null;
  return path;
}

/** Tenant publik dan path favicon-nya, keduanya ditentukan server-side. */
export async function getFaviconPublik() {
  const desa = await getIdentitasFromRequest();
  return { villageId: desa.id, path: await getPathFaviconDesa(desa.id) };
}

export async function getDataBackupDesa(villageId: number) {
  const [data, umum] = await Promise.all([
    bacaDataBackupDesa(villageId),
    bacaPengaturan(villageId),
  ]);
  return { ...data, umum };
}

export type HasilPulihkanBackup =
  { status: "ok" } | { status: "media-logo-tidak-valid" } | { status: "media-favicon-tidak-valid" };

/** Validasi berkas backup, pulihkan konfigurasi, lalu simpan preferensi umum. */
export async function pulihkanBackupDesa(
  villageId: number,
  input: unknown,
  actorId?: string,
): Promise<HasilPulihkanBackup> {
  const parsed = backupDesaSchema.safeParse(input);
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message ?? "Format backup tidak sesuai.");
  }
  const backup = parsed.data;
  if (!mediaBackupValid(backup.desa.logo, villageId, ["jpg", "png", "svg"]))
    return { status: "media-logo-tidak-valid" };
  if (!mediaBackupValid(backup.favicon, villageId, ["png"]))
    return { status: "media-favicon-tidak-valid" };
  await pulihkanDataBackupDesa(villageId, backup);
  await simpanPengaturanTenant(villageId, backup.umum, actorId);
  return { status: "ok" };
}
