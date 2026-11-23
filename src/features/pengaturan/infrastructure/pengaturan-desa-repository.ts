import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  layananPublik,
  pengaturanDesa,
  profilDesa,
  theme,
  villages,
  websiteTemplates,
} from "@/db/schema";

import type {
  BackupDesa,
  IntegrasiDesa,
  KontakDesa,
  LayananDesa,
  ProfilDesa,
} from "../domain/pengaturan-desa";

const KUNCI = {
  kontak: "pengaturan.kontak",
  integrasi: "pengaturan.integrasi",
  favicon: "pengaturan.favicon",
  template: "pengaturan.template",
} as const;

/** Nilai JSON satu kunci pengaturan desa; `null` bila tidak ada/rusak. */
export async function bacaNilaiPengaturan(villageId: number, kunci: string): Promise<unknown> {
  const [row] = await db
    .select({ nilai: pengaturanDesa.nilai })
    .from(pengaturanDesa)
    .where(and(eq(pengaturanDesa.villageId, villageId), eq(pengaturanDesa.kunci, kunci)))
    .limit(1);
  if (!row?.nilai) return null;
  try {
    return JSON.parse(row.nilai) as unknown;
  } catch {
    return null;
  }
}

export async function simpanNilaiPengaturan(
  villageId: number,
  kunci: string,
  nilai: unknown,
): Promise<void> {
  const nilaiJson = JSON.stringify(nilai);
  await db
    .insert(pengaturanDesa)
    .values({ villageId, kunci, nilai: nilaiJson })
    .onDuplicateKeyUpdate({ set: { nilai: nilaiJson } });
}

export async function hapusNilaiPengaturan(villageId: number, kunci: string): Promise<void> {
  await db
    .delete(pengaturanDesa)
    .where(and(eq(pengaturanDesa.villageId, villageId), eq(pengaturanDesa.kunci, kunci)));
}

export async function bacaIdentitasDesa(villageId: number) {
  const [row] = await db
    .select({
      id: villages.id,
      namaDesa: villages.name,
      kodeDesa: villages.code,
      namaKecamatan: villages.district,
      namaKabupaten: villages.regency,
      namaPropinsi: villages.province,
      kodePos: villages.postalCode,
      alamat: villages.officeAddress,
      email: villages.email,
      telepon: villages.phone,
      website: villages.website,
      logo: villages.logo,
      namaKepalaDesa: villages.headName,
      nipKepalaDesa: villages.headNip,
      updatedAt: villages.updatedAt,
    })
    .from(villages)
    .where(eq(villages.id, villageId))
    .limit(1);
  return row ?? null;
}

export async function bacaProfilDesa(villageId: number) {
  const [row] = await db
    .select()
    .from(profilDesa)
    .where(eq(profilDesa.villageId, villageId))
    .limit(1);
  return row ?? null;
}

export async function listLayananAdminDesa(villageId: number) {
  return db
    .select({
      id: layananPublik.id,
      nama: layananPublik.nama,
      kategori: layananPublik.kategori,
      deskripsi: layananPublik.deskripsi,
      persyaratan: layananPublik.persyaratan,
      estimasiHari: layananPublik.estimasiHari,
      biaya: layananPublik.biaya,
      metode: layananPublik.metode,
      aktif: layananPublik.aktif,
    })
    .from(layananPublik)
    .where(eq(layananPublik.villageId, villageId))
    .orderBy(asc(layananPublik.nama));
}

export async function listLayananDesa(villageId: number) {
  return db
    .select()
    .from(layananPublik)
    .where(eq(layananPublik.villageId, villageId))
    .orderBy(asc(layananPublik.nama));
}

export async function bacaKuotaMedia(villageId: number): Promise<number | null> {
  const [row] = await db
    .select({ kuotaMediaMb: villages.kuotaMediaMb })
    .from(villages)
    .where(eq(villages.id, villageId))
    .limit(1);
  return row?.kuotaMediaMb ?? null;
}

export async function listTemplateTerbit() {
  return db
    .select({
      id: websiteTemplates.id,
      slug: websiteTemplates.slug,
      nama: websiteTemplates.name,
      kategori: websiteTemplates.category,
      deskripsi: websiteTemplates.description,
      versi: websiteTemplates.version,
      tokens: websiteTemplates.tokens,
      tags: websiteTemplates.tags,
    })
    .from(websiteTemplates)
    .where(eq(websiteTemplates.status, "published"))
    .orderBy(asc(websiteTemplates.name));
}

export async function bacaTemplateTerbit(slug: string) {
  const [row] = await db
    .select()
    .from(websiteTemplates)
    .where(and(eq(websiteTemplates.slug, slug), eq(websiteTemplates.status, "published")))
    .limit(1);
  return row ?? null;
}

export async function bacaTemaAktif(villageId: number) {
  const [row] = await db
    .select({
      id: theme.id,
      slug: theme.slug,
      nama: theme.nama,
      versi: theme.versi,
      opsi: theme.opsi,
    })
    .from(theme)
    .where(and(eq(theme.villageId, villageId), eq(theme.aktif, true)))
    .limit(1);
  return row ?? null;
}

function bacaObjek(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Aktifkan template terbit sebagai tema desa, pertahankan opsi tema sebelumnya. */
export async function terapkanTemaDesa(
  villageId: number,
  template: { slug: string; nama: string; versi: string; tokens: Record<string, unknown> },
): Promise<void> {
  const options = { templateSlug: template.slug, templateTokens: template.tokens };
  await db.transaction(async (tx) => {
    const [currentActive] = await tx
      .select({ opsi: theme.opsi })
      .from(theme)
      .where(and(eq(theme.villageId, villageId), eq(theme.aktif, true)))
      .limit(1);
    await tx.update(theme).set({ aktif: false }).where(eq(theme.villageId, villageId));
    const [same] = await tx
      .select({ id: theme.id, opsi: theme.opsi })
      .from(theme)
      .where(and(eq(theme.villageId, villageId), eq(theme.slug, template.slug)))
      .limit(1);
    if (same) {
      const previous = bacaObjek(currentActive?.opsi ?? same.opsi);
      await tx
        .update(theme)
        .set({
          nama: template.nama,
          versi: template.versi,
          aktif: true,
          opsi: JSON.stringify({ ...previous, ...options }),
        })
        .where(and(eq(theme.villageId, villageId), eq(theme.id, same.id)));
    } else {
      const previous = bacaObjek(currentActive?.opsi ?? null);
      await tx.insert(theme).values({
        villageId,
        slug: template.slug,
        nama: template.nama,
        versi: template.versi,
        aktif: true,
        opsi: JSON.stringify({ ...previous, ...options }),
      });
    }
  });
  await simpanNilaiPengaturan(villageId, KUNCI.template, template.slug);
}

export async function simpanProfilDesa(villageId: number, d: ProfilDesa): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(villages)
      .set({
        name: d.namaDesa,
        code: d.kodeDesa || null,
        district: d.namaKecamatan || null,
        regency: d.namaKabupaten || null,
        province: d.namaPropinsi || null,
        postalCode: d.kodePos || null,
        headName: d.namaKepalaDesa || null,
        headNip: d.nipKepalaDesa || null,
      })
      .where(eq(villages.id, villageId));
    const profil = {
      visi: d.visi || null,
      misi: d.misi || null,
      sejarah: d.sejarah || null,
      sambutan: d.sambutan || null,
      luasWilayah: d.luasWilayah || null,
      batasUtara: d.batasUtara || null,
      batasSelatan: d.batasSelatan || null,
      batasTimur: d.batasTimur || null,
      batasBarat: d.batasBarat || null,
    };
    await tx
      .insert(profilDesa)
      .values({ villageId, ...profil })
      .onDuplicateKeyUpdate({ set: profil });
  });
}

export async function simpanKontakDesa(villageId: number, d: KontakDesa): Promise<void> {
  await db
    .update(villages)
    .set({
      phone: d.telepon || d.whatsapp || null,
      email: d.email || null,
      officeAddress: d.alamat || null,
      website: d.website || null,
    })
    .where(eq(villages.id, villageId));
  await db
    .insert(profilDesa)
    .values({ villageId, koordinat: d.koordinat || null })
    .onDuplicateKeyUpdate({ set: { koordinat: d.koordinat || null } });
  await simpanNilaiPengaturan(villageId, KUNCI.kontak, d);
}

export async function simpanIntegrasiDesa(villageId: number, d: IntegrasiDesa): Promise<void> {
  await simpanNilaiPengaturan(villageId, KUNCI.integrasi, d);
}

export async function bacaLogoDesa(villageId: number): Promise<string | null> {
  const [row] = await db
    .select({ logo: villages.logo })
    .from(villages)
    .where(eq(villages.id, villageId))
    .limit(1);
  return row?.logo ?? null;
}

export async function simpanLogoDesa(villageId: number, logo: string | null): Promise<void> {
  await db.update(villages).set({ logo }).where(eq(villages.id, villageId));
}

export async function bacaFaviconDesa(villageId: number): Promise<string | null> {
  const nilai = await bacaNilaiPengaturan(villageId, KUNCI.favicon);
  return typeof nilai === "string" ? nilai : null;
}

export async function simpanFaviconDesa(villageId: number, path: string | null): Promise<void> {
  if (path === null) {
    await hapusNilaiPengaturan(villageId, KUNCI.favicon);
    return;
  }
  await simpanNilaiPengaturan(villageId, KUNCI.favicon, path);
}

function nilaiLayanan(d: LayananDesa) {
  return {
    nama: d.nama,
    kategori: d.kategori,
    deskripsi: d.deskripsi || null,
    persyaratan: d.persyaratan || null,
    estimasiHari: d.estimasiHari,
    biaya: d.biaya,
    metode: d.metode,
    aktif: d.aktif,
  };
}

export async function createLayananDesa(
  villageId: number,
  d: LayananDesa,
): Promise<number | undefined> {
  const [created] = await db
    .insert(layananPublik)
    .values({ villageId, ...nilaiLayanan(d) })
    .$returningId();
  return created?.id;
}

export async function updateLayananDesa(
  villageId: number,
  id: number,
  d: LayananDesa,
): Promise<boolean> {
  const [result] = await db
    .update(layananPublik)
    .set(nilaiLayanan(d))
    .where(and(eq(layananPublik.id, id), eq(layananPublik.villageId, villageId)));
  return Boolean(result.affectedRows);
}

export async function nonaktifkanLayananDesa(villageId: number, id: number): Promise<boolean> {
  const [result] = await db
    .update(layananPublik)
    .set({ aktif: false })
    .where(and(eq(layananPublik.id, id), eq(layananPublik.villageId, villageId)));
  return Boolean(result.affectedRows);
}

export async function bacaDataBackupDesa(villageId: number) {
  const [desa, profil, layanan, temaAktif] = await Promise.all([
    db
      .select({
        nama: villages.name,
        kode: villages.code,
        kecamatan: villages.district,
        kabupaten: villages.regency,
        provinsi: villages.province,
        kodePos: villages.postalCode,
        alamat: villages.officeAddress,
        email: villages.email,
        telepon: villages.phone,
        website: villages.website,
        logo: villages.logo,
        kepalaDesa: villages.headName,
        nip: villages.headNip,
      })
      .from(villages)
      .where(eq(villages.id, villageId))
      .limit(1),
    bacaProfilDesa(villageId),
    db
      .select({
        nama: layananPublik.nama,
        kategori: layananPublik.kategori,
        deskripsi: layananPublik.deskripsi,
        persyaratan: layananPublik.persyaratan,
        estimasiHari: layananPublik.estimasiHari,
        biaya: layananPublik.biaya,
        metode: layananPublik.metode,
        aktif: layananPublik.aktif,
      })
      .from(layananPublik)
      .where(eq(layananPublik.villageId, villageId)),
    db
      .select({ slug: theme.slug, nama: theme.nama, versi: theme.versi, opsi: theme.opsi })
      .from(theme)
      .where(and(eq(theme.villageId, villageId), eq(theme.aktif, true)))
      .limit(1),
  ]);
  const [kontak, integrasi, favicon, template] = await Promise.all([
    bacaNilaiPengaturan(villageId, KUNCI.kontak),
    bacaNilaiPengaturan(villageId, KUNCI.integrasi),
    bacaNilaiPengaturan(villageId, KUNCI.favicon),
    bacaNilaiPengaturan(villageId, KUNCI.template),
  ]);
  return {
    desa: desa[0] ?? null,
    profil,
    kontak,
    integrasi,
    favicon,
    template,
    layanan,
    tema: temaAktif[0] ?? null,
  };
}

/** Pulihkan konfigurasi desa dari backup tervalidasi (satu transaksi). */
export async function pulihkanDataBackupDesa(villageId: number, backup: BackupDesa): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(villages)
      .set({
        name: backup.desa.nama,
        code: backup.desa.kode,
        district: backup.desa.kecamatan,
        regency: backup.desa.kabupaten,
        province: backup.desa.provinsi,
        postalCode: backup.desa.kodePos,
        officeAddress: backup.desa.alamat,
        email: backup.desa.email,
        phone: backup.desa.telepon,
        website: backup.desa.website,
        logo: backup.desa.logo,
        headName: backup.desa.kepalaDesa,
        headNip: backup.desa.nip,
      })
      .where(eq(villages.id, villageId));
    const profile = backup.profil ?? {
      visi: null,
      misi: null,
      sejarah: null,
      sambutan: null,
      koordinat: null,
      luasWilayah: null,
      batasUtara: null,
      batasSelatan: null,
      batasTimur: null,
      batasBarat: null,
      ketinggian: null,
      suhuRataRata: null,
      curahHujan: null,
      topografi: null,
    };
    await tx
      .insert(profilDesa)
      .values({ villageId, ...profile })
      .onDuplicateKeyUpdate({ set: { ...profile } });
    await tx.update(theme).set({ aktif: false }).where(eq(theme.villageId, villageId));
    if (backup.tema) {
      const [sameTheme] = await tx
        .select({ id: theme.id })
        .from(theme)
        .where(and(eq(theme.villageId, villageId), eq(theme.slug, backup.tema.slug)))
        .limit(1);
      if (sameTheme)
        await tx
          .update(theme)
          .set({ ...backup.tema, aktif: true })
          .where(and(eq(theme.id, sameTheme.id), eq(theme.villageId, villageId)));
      else await tx.insert(theme).values({ villageId, ...backup.tema, aktif: true });
    }
    const existingServices = await tx
      .select({
        id: layananPublik.id,
        nama: layananPublik.nama,
        kategori: layananPublik.kategori,
      })
      .from(layananPublik)
      .where(eq(layananPublik.villageId, villageId));
    const restoredIds = new Set<number>();
    for (const item of backup.layanan) {
      const existing = existingServices.find(
        (row) =>
          !restoredIds.has(row.id) && row.nama === item.nama && row.kategori === item.kategori,
      );
      if (existing) {
        restoredIds.add(existing.id);
        await tx
          .update(layananPublik)
          .set({ ...item })
          .where(and(eq(layananPublik.id, existing.id), eq(layananPublik.villageId, villageId)));
      } else {
        const [created] = await tx
          .insert(layananPublik)
          .values({ villageId, ...item })
          .$returningId();
        if (created) restoredIds.add(created.id);
      }
    }
    for (const row of existingServices) {
      if (!restoredIds.has(row.id))
        await tx
          .update(layananPublik)
          .set({ aktif: false })
          .where(and(eq(layananPublik.id, row.id), eq(layananPublik.villageId, villageId)));
    }
    for (const [key, value] of [
      [KUNCI.kontak, backup.kontak],
      [KUNCI.integrasi, backup.integrasi],
      [KUNCI.favicon, backup.favicon],
      [KUNCI.template, backup.template],
    ] as const) {
      if (value !== undefined) {
        await tx
          .insert(pengaturanDesa)
          .values({ villageId, kunci: key, nilai: JSON.stringify(value) })
          .onDuplicateKeyUpdate({ set: { nilai: JSON.stringify(value) } });
      }
    }
  });
}
