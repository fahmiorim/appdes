import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { getIdentitasDesa } from "@/features/desa/infrastructure/desa-repository";
import {
  getHalamanBySlug,
  listMenuPublik,
  listWidget,
  type HalamanRingkas,
  type MenuPublikRingkas,
} from "@/features/publik/infrastructure/content-repository";
import {
  ambilTemaAktif,
  ambilTemaAktifDenganOpsi,
  barisKunjunganSejak,
  hitungFotoPerAlbum,
  listAgendaAdmin,
  listAlbumAdmin,
  listBeritaAdmin,
  listBeritaKontenAdmin,
  listDokumenAdmin,
  listFotoAdmin,
  listHalamanStatisAdmin,
  listHalamanStatisLengkap,
  listKategoriBeritaAdmin,
  listSliderAdmin,
  totalKunjungan,
  totalKunjunganSejak,
} from "@/features/publik/infrastructure/website-admin-repository";
import { requirePermission } from "@/lib/dal";

async function tenantWebsite(resource: string) {
  const user = await requirePermission(resource, "read");
  return resolveVillageId(user);
}

export async function getWebsiteDashboardData() {
  const villageId = await tenantWebsite("website-dashboard");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixMonthsKey = `${sixMonthsStart.getFullYear()}-${String(sixMonthsStart.getMonth() + 1).padStart(2, "0")}-01`;
  const monthKey = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`;
  const [
    identitas,
    pages,
    articles,
    agenda,
    albums,
    photoCounts,
    documents,
    menus,
    visits,
    visitsThisMonth,
    visitRows,
    activeTheme,
  ] = await Promise.all([
    getIdentitasDesa(villageId),
    listHalamanStatisAdmin(villageId),
    listBeritaAdmin(villageId),
    listAgendaAdmin(villageId),
    listAlbumAdmin(villageId),
    hitungFotoPerAlbum(villageId),
    listDokumenAdmin(villageId),
    listMenuPublik(villageId, true),
    totalKunjungan(villageId),
    totalKunjunganSejak(villageId, monthKey),
    barisKunjunganSejak(villageId, sixMonthsKey),
    ambilTemaAktif(villageId),
  ]);
  const trend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(sixMonthsStart.getFullYear(), sixMonthsStart.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date),
      total: visitRows
        .filter((row) => row.tanggal.slice(0, 7) === key)
        .reduce((total, row) => total + row.jumlah, 0),
    };
  });
  const albumWithCount = albums.map((album) => ({
    ...album,
    jumlahFoto: photoCounts.find((row) => row.albumId === album.id)?.jumlah ?? 0,
  }));
  return {
    identitas,
    pages,
    berita: articles,
    agenda,
    album: albumWithCount,
    dokumen: documents,
    menu: menus,
    totalKunjungan: visits,
    kunjunganBulan: visitsThisMonth,
    trenKunjungan: trend,
    temaAktif: activeTheme ?? null,
  };
}

export async function getWebsiteSettingsData() {
  const villageId = await tenantWebsite("website-pengaturan");
  const [identitas, selectedTheme] = await Promise.all([
    getIdentitasDesa(villageId),
    ambilTemaAktifDenganOpsi(villageId),
  ]);
  return { identitas, tema: selectedTheme ?? null };
}

export async function getWebsitePagesData() {
  const villageId = await tenantWebsite("website-halaman");
  const [menu, widget, pages] = await Promise.all([
    listMenuPublik(villageId, true),
    listWidget(villageId, true),
    listHalamanStatisLengkap(villageId),
  ]);
  return { menu, widget, pages };
}

export async function getWebsiteContentData() {
  const villageId = await tenantWebsite("website-konten");
  const [articles, albums, photoCounts, photos, slides, agenda, categories] = await Promise.all([
    listBeritaKontenAdmin(villageId),
    listAlbumAdmin(villageId),
    hitungFotoPerAlbum(villageId),
    listFotoAdmin(villageId),
    listSliderAdmin(villageId),
    listAgendaAdmin(villageId),
    listKategoriBeritaAdmin(villageId),
  ]);
  const albumWithCount = albums.map((album) => ({
    ...album,
    jumlahFoto: photoCounts.find((row) => row.albumId === album.id)?.jumlah ?? 0,
  }));
  return { berita: articles, album: albumWithCount, photos, slider: slides, agenda, categories };
}

export async function getWebsiteDocumentsData() {
  const villageId = await tenantWebsite("website-dokumen");
  return listDokumenAdmin(villageId);
}

/* ------------------------------------------------------------ situs publik */

/**
 * Halaman statis tenant untuk route publik.
 *
 * Route tidak boleh menyentuh repository langsung; use case ini yang memilih
 * tenant dari host dan hanya mengembalikan halaman aktif milik desa tersebut.
 */
export async function muatHalamanPublik(
  villageId: number,
  slug: string,
): Promise<HalamanRingkas | null> {
  return getHalamanBySlug(villageId, slug);
}

/** Menu publik aktif tenant; dipakai header situs. */
export async function muatMenuPublik(villageId: number): Promise<MenuPublikRingkas[]> {
  return listMenuPublik(villageId);
}
