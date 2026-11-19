import "server-only";

import { and, count, desc, eq, gte, sum } from "drizzle-orm";

import { db } from "@/db";
import { agendaKegiatan, berita, beritaKategori, dokumenPublik, galeriAlbum, galeriFoto, halamanStatis, pengunjungLog, slider, theme } from "@/db/schema";
import { getIdentitasDesa } from "@/features/desa/infrastructure/desa-repository";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { listMenuPublik, listWidget } from "@/features/publik/infrastructure/content-repository";
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
  const [identitas, pages, articles, agenda, albums, photoCounts, documents, menus, visits, visitsThisMonth, visitRows, activeTheme] = await Promise.all([
    getIdentitasDesa(villageId),
    db.select({ id: halamanStatis.id, judul: halamanStatis.judul, slug: halamanStatis.slug, aktif: halamanStatis.aktif }).from(halamanStatis).where(eq(halamanStatis.villageId, villageId)),
    db.select({ id: berita.id, judul: berita.judul, slug: berita.slug, gambar: berita.gambar, status: berita.status, terbitPada: berita.terbitPada, kategori: beritaKategori.nama, hit: berita.hit }).from(berita).leftJoin(beritaKategori, and(eq(berita.kategoriId, beritaKategori.id), eq(beritaKategori.villageId, villageId))).where(eq(berita.villageId, villageId)).orderBy(desc(berita.updatedAt)).limit(100),
    db.select({ id: agendaKegiatan.id, judul: agendaKegiatan.judul, mulai: agendaKegiatan.mulai, selesai: agendaKegiatan.selesai, jamMulai: agendaKegiatan.jamMulai, jamSelesai: agendaKegiatan.jamSelesai, kategori: agendaKegiatan.kategori, status: agendaKegiatan.status, lokasi: agendaKegiatan.lokasi, deskripsi: agendaKegiatan.deskripsi, tayang: agendaKegiatan.tayang }).from(agendaKegiatan).where(eq(agendaKegiatan.villageId, villageId)).orderBy(desc(agendaKegiatan.mulai)).limit(100),
    db.select({ id: beritaKategori.id, nama: beritaKategori.nama }).from(beritaKategori).where(eq(beritaKategori.villageId, villageId)).orderBy(beritaKategori.nama),
    db.select({ id: beritaKategori.id, nama: beritaKategori.nama }).from(beritaKategori).where(eq(beritaKategori.villageId, villageId)).orderBy(beritaKategori.nama),
    db.select({ id: galeriAlbum.id, nama: galeriAlbum.nama, slug: galeriAlbum.slug, keterangan: galeriAlbum.keterangan, sampul: galeriAlbum.sampul }).from(galeriAlbum).where(eq(galeriAlbum.villageId, villageId)),
    db.select({ albumId: galeriFoto.albumId, jumlah: count() }).from(galeriFoto).where(eq(galeriFoto.villageId, villageId)).groupBy(galeriFoto.albumId),
    db.select({ id: galeriFoto.id, albumId: galeriFoto.albumId, gambar: galeriFoto.gambar, judul: galeriFoto.judul, keterangan: galeriFoto.keterangan, aktif: galeriFoto.aktif }).from(galeriFoto).where(eq(galeriFoto.villageId, villageId)).orderBy(desc(galeriFoto.updatedAt)),
    db.select({ id: dokumenPublik.id, nama: dokumenPublik.nama, slug: dokumenPublik.slug, kategori: dokumenPublik.kategori, jenis: dokumenPublik.jenis, nomor: dokumenPublik.nomor, tahun: dokumenPublik.tahun, berkas: dokumenPublik.berkas, tautan: dokumenPublik.tautan, keterangan: dokumenPublik.keterangan, aktif: dokumenPublik.aktif }).from(dokumenPublik).where(eq(dokumenPublik.villageId, villageId)).orderBy(desc(dokumenPublik.updatedAt)),
    listMenuPublik(villageId, true),
    db.select({ total: sum(pengunjungLog.jumlah) }).from(pengunjungLog).where(eq(pengunjungLog.villageId, villageId)),
    db.select({ total: sum(pengunjungLog.jumlah) }).from(pengunjungLog).where(and(eq(pengunjungLog.villageId, villageId), gte(pengunjungLog.tanggal, monthKey))),
    db.select({ tanggal: pengunjungLog.tanggal, jumlah: pengunjungLog.jumlah }).from(pengunjungLog).where(and(eq(pengunjungLog.villageId, villageId), gte(pengunjungLog.tanggal, sixMonthsKey))),
    db.select({ slug: theme.slug, nama: theme.nama, versi: theme.versi, aktif: theme.aktif }).from(theme).where(and(eq(theme.villageId, villageId), eq(theme.aktif, true))).limit(1),
  ]);
  const trend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(sixMonthsStart.getFullYear(), sixMonthsStart.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(date), total: visitRows.filter((row) => row.tanggal.slice(0, 7) === key).reduce((total, row) => total + row.jumlah, 0) };
  });
  const albumWithCount = albums.map((album) => ({ ...album, jumlahFoto: photoCounts.find((row) => row.albumId === album.id)?.jumlah ?? 0 }));
  return {
    identitas, pages, berita: articles, agenda, album: albumWithCount, dokumen: documents, menu: menus,
    totalKunjungan: Number(visits[0]?.total ?? 0),
    kunjunganBulan: Number(visitsThisMonth[0]?.total ?? 0),
    trenKunjungan: trend,
    temaAktif: activeTheme[0] ?? null,
  };
}

export async function getWebsiteSettingsData() {
  const villageId = await tenantWebsite("website-pengaturan");
  const [identitas, selectedTheme] = await Promise.all([
    getIdentitasDesa(villageId),
    db.select({ slug: theme.slug, nama: theme.nama, versi: theme.versi, opsi: theme.opsi }).from(theme).where(and(eq(theme.villageId, villageId), eq(theme.aktif, true))).limit(1),
  ]);
  return { identitas, tema: selectedTheme[0] ?? null };
}

export async function getWebsitePagesData() {
  const villageId = await tenantWebsite("website-halaman");
  const [menu, widget, pages] = await Promise.all([
    listMenuPublik(villageId, true),
    listWidget(villageId, true),
    db.select({ id: halamanStatis.id, judul: halamanStatis.judul, slug: halamanStatis.slug, isi: halamanStatis.isi, aktif: halamanStatis.aktif, updatedAt: halamanStatis.updatedAt }).from(halamanStatis).where(eq(halamanStatis.villageId, villageId)).orderBy(desc(halamanStatis.updatedAt)),
  ]);
  return { menu, widget, pages };
}

export async function getWebsiteContentData() {
  const villageId = await tenantWebsite("website-konten");
  const [articles, albums, photoCounts, photos, slides, agenda, categories] = await Promise.all([
    db.select({ id: berita.id, judul: berita.judul, slug: berita.slug, ringkasan: berita.ringkasan, gambar: berita.gambar, status: berita.status, terbitPada: berita.terbitPada, kategoriId: berita.kategoriId, kategori: beritaKategori.nama, hit: berita.hit }).from(berita).leftJoin(beritaKategori, and(eq(berita.kategoriId, beritaKategori.id), eq(beritaKategori.villageId, villageId))).where(eq(berita.villageId, villageId)).orderBy(desc(berita.updatedAt)).limit(100),
    db.select({ id: galeriAlbum.id, nama: galeriAlbum.nama, slug: galeriAlbum.slug, keterangan: galeriAlbum.keterangan, sampul: galeriAlbum.sampul }).from(galeriAlbum).where(eq(galeriAlbum.villageId, villageId)).orderBy(desc(galeriAlbum.updatedAt)),
    db.select({ albumId: galeriFoto.albumId, jumlah: count() }).from(galeriFoto).where(eq(galeriFoto.villageId, villageId)).groupBy(galeriFoto.albumId),
    db.select({ id: slider.id, judul: slider.judul, gambar: slider.gambar, aktif: slider.aktif, urut: slider.urut }).from(slider).where(eq(slider.villageId, villageId)).orderBy(slider.urut),
    db.select({ id: agendaKegiatan.id, judul: agendaKegiatan.judul, mulai: agendaKegiatan.mulai, selesai: agendaKegiatan.selesai, jamMulai: agendaKegiatan.jamMulai, jamSelesai: agendaKegiatan.jamSelesai, kategori: agendaKegiatan.kategori, status: agendaKegiatan.status, lokasi: agendaKegiatan.lokasi, deskripsi: agendaKegiatan.deskripsi, tayang: agendaKegiatan.tayang }).from(agendaKegiatan).where(eq(agendaKegiatan.villageId, villageId)).orderBy(desc(agendaKegiatan.mulai)).limit(100),
  ]);
  const albumWithCount = albums.map((album) => ({ ...album, jumlahFoto: photoCounts.find((row) => row.albumId === album.id)?.jumlah ?? 0 }));
  return { berita: articles, album: albumWithCount, photos, slider: slides, agenda, categories };
}

export async function getWebsiteDocumentsData() {
  const villageId = await tenantWebsite("website-dokumen");
  return db.select({ id: dokumenPublik.id, nama: dokumenPublik.nama, slug: dokumenPublik.slug, kategori: dokumenPublik.kategori, jenis: dokumenPublik.jenis, nomor: dokumenPublik.nomor, tahun: dokumenPublik.tahun, berkas: dokumenPublik.berkas, tautan: dokumenPublik.tautan, keterangan: dokumenPublik.keterangan, aktif: dokumenPublik.aktif }).from(dokumenPublik).where(eq(dokumenPublik.villageId, villageId)).orderBy(desc(dokumenPublik.updatedAt));
}
