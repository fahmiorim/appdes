import "server-only";

import { and, eq, gte, sum } from "drizzle-orm";

import { db } from "@/db";
import { pengunjungLog } from "@/db/schema";
import { getIdentitasDesa } from "@/features/desa/infrastructure/desa-repository";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  listAlbumGaleri,
  listBerita,
  listDokumenPublik,
  listMenuPublik,
  listSlider,
  listWidget,
} from "@/features/publik/infrastructure/content-repository";
import { requirePermission } from "@/lib/dal";

async function tenantWebsite(resource: string) {
  const user = await requirePermission(resource, "read");
  return resolveVillageId(user);
}

export async function getWebsiteDashboardData() {
  const villageId = await tenantWebsite("website-dashboard");
  const awalBulan = new Date();
  awalBulan.setDate(1);
  const tanggalAwal = `${awalBulan.getFullYear()}-${String(awalBulan.getMonth() + 1).padStart(2, "0")}-01`;
  const [identitas, berita, album, dokumen, menu, widget, slider, kunjungan, kunjunganBulan] = await Promise.all([
    getIdentitasDesa(villageId),
    listBerita(villageId, { limit: 100 }),
    listAlbumGaleri(villageId),
    listDokumenPublik(villageId, undefined, true),
    listMenuPublik(villageId, true),
    listWidget(villageId, true),
    listSlider(villageId, true),
    db.select({ total: sum(pengunjungLog.jumlah) }).from(pengunjungLog).where(eq(pengunjungLog.villageId, villageId)),
    db.select({ total: sum(pengunjungLog.jumlah) }).from(pengunjungLog).where(and(eq(pengunjungLog.villageId, villageId), gte(pengunjungLog.tanggal, tanggalAwal))),
  ]);
  return {
    identitas, berita, album, dokumen, menu, widget, slider,
    totalKunjungan: Number(kunjungan[0]?.total ?? 0),
    kunjunganBulan: Number(kunjunganBulan[0]?.total ?? 0),
  };
}

export async function getWebsiteSettingsData() {
  const villageId = await tenantWebsite("website-pengaturan");
  return getIdentitasDesa(villageId);
}

export async function getWebsitePagesData() {
  const villageId = await tenantWebsite("website-halaman");
  const [menu, widget] = await Promise.all([listMenuPublik(villageId, true), listWidget(villageId, true)]);
  return { menu, widget };
}

export async function getWebsiteContentData() {
  const villageId = await tenantWebsite("website-konten");
  const [berita, album, slider] = await Promise.all([
    listBerita(villageId, { limit: 100 }),
    listAlbumGaleri(villageId),
    listSlider(villageId, true),
  ]);
  return { berita, album, slider };
}

export async function getWebsiteDocumentsData() {
  const villageId = await tenantWebsite("website-dokumen");
  return listDokumenPublik(villageId, undefined, true);
}