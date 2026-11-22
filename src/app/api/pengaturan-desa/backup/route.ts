import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { layananPublik, pengaturanDesa, profilDesa, theme, villages } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";
import { appErrorStatus, isAppError } from "@/lib/errors";
import { bacaPengaturan, simpanPengaturanTenant } from "@/features/pengaturan/application/pengaturan-use-cases";

export const runtime = "nodejs";
const response = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
async function readSetting(villageId: number, key: string) {
  const [row] = await db.select({ nilai: pengaturanDesa.nilai }).from(pengaturanDesa)
    .where(and(eq(pengaturanDesa.villageId, villageId), eq(pengaturanDesa.kunci, key))).limit(1);
  try { return row?.nilai ? JSON.parse(row.nilai) : null; } catch { return null; }
}
function handle(error: unknown) {
  if (isAppError(error)) return response({ error: error.message }, appErrorStatus(error.code));
  console.error("Backup konfigurasi desa gagal:", error);
  return response({ error: "Backup konfigurasi gagal diproses." }, 500);
}
export async function GET() {
  try {
    const user = await requirePermission("pengaturan-desa", "read");
    const villageId = await resolveVillageId(user);
    const [[desa], [profil], settings, layanan, [temaAktif], umum] = await Promise.all([
      db.select({ nama: villages.name, kode: villages.code, kecamatan: villages.district, kabupaten: villages.regency,
        provinsi: villages.province, kodePos: villages.postalCode, alamat: villages.officeAddress, email: villages.email,
        telepon: villages.phone, website: villages.website, logo: villages.logo, kepalaDesa: villages.headName,
        nip: villages.headNip }).from(villages).where(eq(villages.id, villageId)).limit(1),
      db.select().from(profilDesa).where(eq(profilDesa.villageId, villageId)).limit(1),
      Promise.all(["pengaturan.kontak", "pengaturan.integrasi", "pengaturan.favicon", "pengaturan.template"].map(key => readSetting(villageId, key))),
      db.select({ nama: layananPublik.nama, kategori: layananPublik.kategori, deskripsi: layananPublik.deskripsi,
        persyaratan: layananPublik.persyaratan, estimasiHari: layananPublik.estimasiHari, biaya: layananPublik.biaya,
        metode: layananPublik.metode, aktif: layananPublik.aktif }).from(layananPublik).where(eq(layananPublik.villageId, villageId)),
      db.select({ slug: theme.slug, nama: theme.nama, versi: theme.versi, opsi: theme.opsi })
        .from(theme).where(and(eq(theme.villageId, villageId), eq(theme.aktif, true))).limit(1),
      bacaPengaturan(villageId),
    ]);
    const backup = {
      format: "flexidesa-village-settings", version: 1, createdAt: new Date().toISOString(),
      scope: "Konfigurasi desa, profil publik, katalog layanan, tema, dan preferensi. Bukan backup seluruh transaksi.",
      desa, profil: profil ?? null, kontak: settings[0], integrasi: settings[1], favicon: settings[2],
      template: settings[3], layanan, tema: temaAktif ?? null, umum,
    };
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="flexidesa-konfigurasi-desa-${villageId}-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) { return handle(error); }
}
const restoreSchema = z.object({
  format: z.literal("flexidesa-village-settings"),
  version: z.literal(1),
  desa: z.object({
    nama: z.string().nullable(), kode: z.string().nullable(), kecamatan: z.string().nullable(),
    kabupaten: z.string().nullable(), provinsi: z.string().nullable(), kodePos: z.string().nullable(),
    alamat: z.string().nullable(), email: z.string().nullable(), telepon: z.string().nullable(),
    website: z.string().nullable(), logo: z.string().nullable(), kepalaDesa: z.string().nullable(), nip: z.string().nullable(),
  }),
  profil: z.object({
    visi: z.string().nullable(), misi: z.string().nullable(), sejarah: z.string().nullable(), sambutan: z.string().nullable(),
    koordinat: z.string().nullable(), luasWilayah: z.string().nullable(), batasUtara: z.string().nullable(),
    batasSelatan: z.string().nullable(), batasTimur: z.string().nullable(), batasBarat: z.string().nullable(),
    ketinggian: z.string().nullable(), suhuRataRata: z.string().nullable(), curahHujan: z.string().nullable(),
    topografi: z.string().nullable(),
  }).nullable(),
  tema: z.object({slug:z.string().max(50),nama:z.string().max(100),versi:z.string().max(20),opsi:z.string().nullable()}).nullable(),
  layanan: z.array(z.object({
    nama: z.string().min(2).max(180), kategori: z.string().max(60), deskripsi: z.string().nullable(),
    persyaratan: z.string().nullable(), estimasiHari: z.number().int().min(0), biaya: z.number().int().min(0),
    metode: z.string().max(80), aktif: z.boolean(),
  })).max(500),
  kontak: z.record(z.string(),z.unknown()).nullable(), integrasi: z.record(z.string(),z.unknown()).nullable(), favicon: z.string().nullable(), template: z.string().nullable(),
  umum: z.object({
    komentarAktif: z.boolean(), beritaBeranda: z.number().int().min(1).max(12),
    pendaftaranWargaAktif: z.boolean(), penomoranSurat: z.number().int().min(1).max(4),
  }),
});
export async function POST(request: Request) {
  try {
    const user = await requirePermission("pengaturan-desa", "update");
    const villageId = await resolveVillageId(user);
    const raw = await request.text();
    if (raw.length > 2_000_000) return response({ error: "Berkas backup maksimal 2 MB." }, 413);
    let input: unknown;
    try { input = JSON.parse(raw); } catch { return response({ error: "Berkas JSON tidak valid." }, 400); }
    const parsed = restoreSchema.safeParse(input);
    if (!parsed.success) return response({ error: parsed.error.issues[0]?.message ?? "Format backup tidak sesuai." }, 422);
    const backup = parsed.data;
    if (backup.desa.logo && !backup.desa.logo.startsWith(`${villageId}/umum/`))
      return response({ error: "Logo backup bukan milik tenant ini. Unggah ulang logo setelah pemulihan." }, 422);
    if (typeof backup.favicon === "string" && backup.favicon && !backup.favicon.startsWith(`${villageId}/umum/`))
      return response({ error: "Favicon backup bukan milik tenant ini. Unggah ulang favicon setelah pemulihan." }, 422);
    await db.transaction(async tx => {
      await tx.update(villages).set({
        name: backup.desa.nama, code: backup.desa.kode, district: backup.desa.kecamatan,
        regency: backup.desa.kabupaten, province: backup.desa.provinsi, postalCode: backup.desa.kodePos,
        officeAddress: backup.desa.alamat, email: backup.desa.email, phone: backup.desa.telepon,
        website: backup.desa.website, logo: backup.desa.logo, headName: backup.desa.kepalaDesa, headNip: backup.desa.nip,
      }).where(eq(villages.id, villageId));
      const profile = backup.profil ?? {
        visi: null, misi: null, sejarah: null, sambutan: null, koordinat: null, luasWilayah: null,
        batasUtara: null, batasSelatan: null, batasTimur: null, batasBarat: null, ketinggian: null,
        suhuRataRata: null, curahHujan: null, topografi: null,
      };
      await tx.insert(profilDesa).values({ villageId, ...profile })
        .onDuplicateKeyUpdate({ set: { ...profile } });
      await tx.update(theme).set({aktif:false}).where(eq(theme.villageId,villageId));
      if (backup.tema) {
        const [sameTheme] = await tx.select({id:theme.id}).from(theme).where(and(eq(theme.villageId,villageId),eq(theme.slug,backup.tema.slug))).limit(1);
        if (sameTheme) await tx.update(theme).set({...backup.tema,aktif:true}).where(and(eq(theme.id,sameTheme.id),eq(theme.villageId,villageId)));
        else await tx.insert(theme).values({villageId,...backup.tema,aktif:true});
      }
      const existingServices = await tx.select({ id: layananPublik.id, nama: layananPublik.nama, kategori: layananPublik.kategori })
        .from(layananPublik).where(eq(layananPublik.villageId, villageId));
      const restoredIds = new Set<number>();
      for (const item of backup.layanan) {
        const existing = existingServices.find(row => !restoredIds.has(row.id) && row.nama === item.nama && row.kategori === item.kategori);
        if (existing) {
          restoredIds.add(existing.id);
          await tx.update(layananPublik).set({ ...item }).where(and(eq(layananPublik.id, existing.id), eq(layananPublik.villageId, villageId)));
        } else {
          const [created] = await tx.insert(layananPublik).values({ villageId, ...item }).$returningId();
          if (created) restoredIds.add(created.id);
        }
      }
      for (const row of existingServices) {
        if (!restoredIds.has(row.id)) await tx.update(layananPublik).set({ aktif: false })
          .where(and(eq(layananPublik.id, row.id), eq(layananPublik.villageId, villageId)));
      }
      for (const [key, value] of [
        ["pengaturan.kontak", backup.kontak], ["pengaturan.integrasi", backup.integrasi],
        ["pengaturan.favicon", backup.favicon], ["pengaturan.template", backup.template],
      ] as const) {
        if (value !== undefined) {
          await tx.insert(pengaturanDesa).values({ villageId, kunci: key, nilai: JSON.stringify(value) })
            .onDuplicateKeyUpdate({ set: { nilai: JSON.stringify(value) } });
        }
      }
    });
    await simpanPengaturanTenant(villageId, backup.umum, user.id);
    return response({ message: "Konfigurasi berhasil dipulihkan. Data transaksi, akun, dan isi berkas media tidak diubah." });
  } catch (error) { return handle(error); }
}
