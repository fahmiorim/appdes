import "server-only";

import { and, count, desc, eq, gte, sum } from "drizzle-orm";

import { db } from "@/db";
import {
  agendaKegiatan,
  berita,
  beritaKategori,
  dokumenPublik,
  galeriAlbum,
  galeriFoto,
  halamanStatis,
  menuPublik,
  pengunjungLog,
  slider,
  theme,
  widget,
} from "@/db/schema";

/**
 * Akses data modul Website Desa untuk admin.
 *
 * Semua fungsi menerima `villageId` dari use case (bukan dari input klien) dan
 * menyertakannya pada setiap filter, sehingga tidak ada baris tenant lain yang
 * dapat dibaca maupun diubah lewat id yang ditebak.
 */

/* ------------------------------------------------------------------ baca */

export async function listHalamanStatisAdmin(villageId: number) {
  return db
    .select({
      id: halamanStatis.id,
      judul: halamanStatis.judul,
      slug: halamanStatis.slug,
      aktif: halamanStatis.aktif,
    })
    .from(halamanStatis)
    .where(eq(halamanStatis.villageId, villageId));
}

export async function listHalamanStatisLengkap(villageId: number) {
  return db
    .select({
      id: halamanStatis.id,
      judul: halamanStatis.judul,
      slug: halamanStatis.slug,
      isi: halamanStatis.isi,
      aktif: halamanStatis.aktif,
      updatedAt: halamanStatis.updatedAt,
    })
    .from(halamanStatis)
    .where(eq(halamanStatis.villageId, villageId))
    .orderBy(desc(halamanStatis.updatedAt));
}

export async function listBeritaAdmin(villageId: number, limit = 100) {
  return db
    .select({
      id: berita.id,
      judul: berita.judul,
      slug: berita.slug,
      gambar: berita.gambar,
      status: berita.status,
      terbitPada: berita.terbitPada,
      kategori: beritaKategori.nama,
      hit: berita.hit,
    })
    .from(berita)
    .leftJoin(
      beritaKategori,
      and(eq(berita.kategoriId, beritaKategori.id), eq(beritaKategori.villageId, villageId)),
    )
    .where(eq(berita.villageId, villageId))
    .orderBy(desc(berita.updatedAt))
    .limit(limit);
}

export async function listBeritaKontenAdmin(villageId: number, limit = 100) {
  return db
    .select({
      id: berita.id,
      judul: berita.judul,
      slug: berita.slug,
      ringkasan: berita.ringkasan,
      isi: berita.isi,
      gambar: berita.gambar,
      status: berita.status,
      terbitPada: berita.terbitPada,
      kategoriId: berita.kategoriId,
      kategori: beritaKategori.nama,
      hit: berita.hit,
      headline: berita.headline,
      slider: berita.slider,
    })
    .from(berita)
    .leftJoin(
      beritaKategori,
      and(eq(berita.kategoriId, beritaKategori.id), eq(beritaKategori.villageId, villageId)),
    )
    .where(eq(berita.villageId, villageId))
    .orderBy(desc(berita.updatedAt))
    .limit(limit);
}

export async function listAgendaAdmin(villageId: number, limit = 100) {
  return db
    .select({
      id: agendaKegiatan.id,
      judul: agendaKegiatan.judul,
      mulai: agendaKegiatan.mulai,
      selesai: agendaKegiatan.selesai,
      jamMulai: agendaKegiatan.jamMulai,
      jamSelesai: agendaKegiatan.jamSelesai,
      kategori: agendaKegiatan.kategori,
      status: agendaKegiatan.status,
      lokasi: agendaKegiatan.lokasi,
      deskripsi: agendaKegiatan.deskripsi,
      tayang: agendaKegiatan.tayang,
    })
    .from(agendaKegiatan)
    .where(eq(agendaKegiatan.villageId, villageId))
    .orderBy(desc(agendaKegiatan.mulai))
    .limit(limit);
}

export async function listAlbumAdmin(villageId: number) {
  return db
    .select({
      id: galeriAlbum.id,
      nama: galeriAlbum.nama,
      slug: galeriAlbum.slug,
      keterangan: galeriAlbum.keterangan,
      sampul: galeriAlbum.sampul,
      aktif: galeriAlbum.aktif,
      urut: galeriAlbum.urut,
    })
    .from(galeriAlbum)
    .where(eq(galeriAlbum.villageId, villageId));
}

export async function listFotoAdmin(villageId: number) {
  return db
    .select({
      id: galeriFoto.id,
      albumId: galeriFoto.albumId,
      gambar: galeriFoto.gambar,
      judul: galeriFoto.judul,
      keterangan: galeriFoto.keterangan,
      aktif: galeriFoto.aktif,
      slider: galeriFoto.slider,
      urut: galeriFoto.urut,
    })
    .from(galeriFoto)
    .where(eq(galeriFoto.villageId, villageId))
    .orderBy(desc(galeriFoto.updatedAt));
}

/** Jumlah foto per album; dipetakan ke album oleh application layer. */
export async function hitungFotoPerAlbum(villageId: number) {
  return db
    .select({ albumId: galeriFoto.albumId, jumlah: count() })
    .from(galeriFoto)
    .where(eq(galeriFoto.villageId, villageId))
    .groupBy(galeriFoto.albumId);
}

export async function listDokumenAdmin(villageId: number) {
  return db
    .select({
      id: dokumenPublik.id,
      nama: dokumenPublik.nama,
      slug: dokumenPublik.slug,
      kategori: dokumenPublik.kategori,
      jenis: dokumenPublik.jenis,
      nomor: dokumenPublik.nomor,
      tahun: dokumenPublik.tahun,
      berkas: dokumenPublik.berkas,
      tautan: dokumenPublik.tautan,
      keterangan: dokumenPublik.keterangan,
      aktif: dokumenPublik.aktif,
    })
    .from(dokumenPublik)
    .where(eq(dokumenPublik.villageId, villageId))
    .orderBy(desc(dokumenPublik.updatedAt));
}

export async function listKategoriBeritaAdmin(villageId: number) {
  return db
    .select({ id: beritaKategori.id, nama: beritaKategori.nama, slug: beritaKategori.slug })
    .from(beritaKategori)
    .where(eq(beritaKategori.villageId, villageId))
    .orderBy(beritaKategori.nama);
}

export async function listSliderAdmin(villageId: number) {
  return db
    .select({
      id: slider.id,
      judul: slider.judul,
      keterangan: slider.keterangan,
      gambar: slider.gambar,
      tautan: slider.tautan,
      aktif: slider.aktif,
      urut: slider.urut,
    })
    .from(slider)
    .where(eq(slider.villageId, villageId))
    .orderBy(slider.urut);
}

export async function totalKunjungan(villageId: number) {
  const [row] = await db
    .select({ total: sum(pengunjungLog.jumlah) })
    .from(pengunjungLog)
    .where(eq(pengunjungLog.villageId, villageId));
  return Number(row?.total ?? 0);
}

export async function totalKunjunganSejak(villageId: number, sejak: string) {
  const [row] = await db
    .select({ total: sum(pengunjungLog.jumlah) })
    .from(pengunjungLog)
    .where(and(eq(pengunjungLog.villageId, villageId), gte(pengunjungLog.tanggal, sejak)));
  return Number(row?.total ?? 0);
}

export async function barisKunjunganSejak(villageId: number, sejak: string) {
  return db
    .select({ tanggal: pengunjungLog.tanggal, jumlah: pengunjungLog.jumlah })
    .from(pengunjungLog)
    .where(and(eq(pengunjungLog.villageId, villageId), gte(pengunjungLog.tanggal, sejak)));
}

/** Tema aktif tenant; `undefined` bila belum ada tema yang diaktifkan. */
export async function ambilTemaAktif(villageId: number) {
  const [row] = await db
    .select({ slug: theme.slug, nama: theme.nama, versi: theme.versi, aktif: theme.aktif })
    .from(theme)
    .where(and(eq(theme.villageId, villageId), eq(theme.aktif, true)))
    .limit(1);
  return row;
}

export async function ambilTemaAktifDenganOpsi(villageId: number) {
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
  return row;
}

export async function ubahOpsiTema(villageId: number, id: number, opsi: string) {
  await db
    .update(theme)
    .set({ opsi })
    .where(and(eq(theme.villageId, villageId), eq(theme.id, id)));
}

/* ------------------------------------------------------- halaman statis */

export async function cariHalamanStatisBySlug(villageId: number, slug: string) {
  const [row] = await db
    .select({ id: halamanStatis.id })
    .from(halamanStatis)
    .where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.slug, slug)))
    .limit(1);
  return row;
}

export async function cariHalamanStatisAktifBySlug(villageId: number, slug: string) {
  const [row] = await db
    .select({ id: halamanStatis.id })
    .from(halamanStatis)
    .where(
      and(
        eq(halamanStatis.villageId, villageId),
        eq(halamanStatis.slug, slug),
        eq(halamanStatis.aktif, true),
      ),
    )
    .limit(1);
  return row;
}

export async function cariHalamanStatisById(villageId: number, id: number) {
  const [row] = await db
    .select({ id: halamanStatis.id })
    .from(halamanStatis)
    .where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.id, id)))
    .limit(1);
  return row;
}

export async function buatHalamanStatis(
  villageId: number,
  data: { judul: string; slug: string; isi: string; aktif: boolean },
) {
  await db.insert(halamanStatis).values({ villageId, ...data });
}

export async function ubahHalamanStatis(
  villageId: number,
  id: number,
  data: { judul: string; slug: string; isi: string },
) {
  await db
    .update(halamanStatis)
    .set(data)
    .where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.id, id)));
}

export async function ubahStatusHalamanStatis(villageId: number, id: number, aktif: boolean) {
  await db
    .update(halamanStatis)
    .set({ aktif })
    .where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.id, id)));
}

export async function hapusHalamanStatis(villageId: number, id: number) {
  await db
    .delete(halamanStatis)
    .where(and(eq(halamanStatis.villageId, villageId), eq(halamanStatis.id, id)));
}

/* --------------------------------------------------------------- berita */

export async function cariBeritaBySlug(villageId: number, slug: string) {
  const [row] = await db
    .select({ id: berita.id })
    .from(berita)
    .where(and(eq(berita.villageId, villageId), eq(berita.slug, slug)))
    .limit(1);
  return row;
}

export async function ambilGambarBerita(villageId: number, id: number) {
  const [row] = await db
    .select({ gambar: berita.gambar })
    .from(berita)
    .where(and(eq(berita.villageId, villageId), eq(berita.id, id)))
    .limit(1);
  return row;
}

export async function buatBerita(
  villageId: number,
  data: {
    judul: string;
    slug: string;
    ringkasan: string | null;
    isi: string;
    kategoriId: number | null;
    gambar: string | null;
    status: string;
    terbitPada: Date | null;
    headline: boolean;
    slider: boolean;
  },
) {
  await db.insert(berita).values({ villageId, ...data });
}

export async function ubahStatusBerita(villageId: number, id: number, status: string) {
  await db
    .update(berita)
    .set({ status, terbitPada: status === "published" ? new Date() : null })
    .where(and(eq(berita.villageId, villageId), eq(berita.id, id)));
}

export async function hapusBerita(villageId: number, id: number) {
  await db.delete(berita).where(and(eq(berita.villageId, villageId), eq(berita.id, id)));
}

export async function cariBeritaById(villageId: number, id: number) {
  const [row] = await db
    .select({ id: berita.id, gambar: berita.gambar })
    .from(berita)
    .where(and(eq(berita.villageId, villageId), eq(berita.id, id)))
    .limit(1);
  return row;
}

export async function ubahBerita(
  villageId: number,
  id: number,
  data: {
    judul: string;
    slug: string;
    ringkasan: string | null;
    isi: string;
    kategoriId: number | null;
    gambar: string | null;
    status: string;
    terbitPada: Date | null;
    headline: boolean;
    slider: boolean;
  },
) {
  await db
    .update(berita)
    .set(data)
    .where(and(eq(berita.villageId, villageId), eq(berita.id, id)));
}

/* ----------------------------------------------------------------- menu */

export async function cariMenuById(villageId: number, id: number) {
  const [row] = await db
    .select({ id: menuPublik.id })
    .from(menuPublik)
    .where(and(eq(menuPublik.villageId, villageId), eq(menuPublik.id, id)))
    .limit(1);
  return row;
}

/** Menu induk kandidat; `parentId` dipakai untuk menolak submenu sebagai induk. */
export async function cariMenuInduk(villageId: number, id: number) {
  const [row] = await db
    .select({ id: menuPublik.id, parentId: menuPublik.parentId })
    .from(menuPublik)
    .where(and(eq(menuPublik.villageId, villageId), eq(menuPublik.id, id)))
    .limit(1);
  return row;
}

export async function ubahMenuDetail(
  villageId: number,
  id: number,
  data: { nama: string; link: string; linkTipe: string; parentId: number | null },
) {
  await db
    .update(menuPublik)
    .set(data)
    .where(and(eq(menuPublik.villageId, villageId), eq(menuPublik.id, id)));
}

/* ------------------------------------------------------- kategori berita */

export async function cariKategoriById(villageId: number, id: number) {
  const [row] = await db
    .select({ id: beritaKategori.id })
    .from(beritaKategori)
    .where(and(eq(beritaKategori.villageId, villageId), eq(beritaKategori.id, id)))
    .limit(1);
  return row;
}

export async function cariKategoriBySlug(villageId: number, slug: string) {
  const [row] = await db
    .select({ id: beritaKategori.id })
    .from(beritaKategori)
    .where(and(eq(beritaKategori.villageId, villageId), eq(beritaKategori.slug, slug)))
    .limit(1);
  return row;
}

export async function buatKategoriBerita(villageId: number, nama: string, slug: string) {
  await db.insert(beritaKategori).values({ villageId, nama, slug, aktif: true, urut: 0 });
}

export async function ubahKategoriBerita(
  villageId: number,
  id: number,
  nama: string,
  slug: string,
) {
  await db
    .update(beritaKategori)
    .set({ nama, slug })
    .where(and(eq(beritaKategori.villageId, villageId), eq(beritaKategori.id, id)));
}

/** Berita pada desa ini yang masih memakai kategori tersebut. */
export async function cariBeritaDenganKategori(villageId: number, kategoriId: number) {
  const [row] = await db
    .select({ id: berita.id })
    .from(berita)
    .where(and(eq(berita.villageId, villageId), eq(berita.kategoriId, kategoriId)))
    .limit(1);
  return row;
}

export async function hapusKategoriBerita(villageId: number, id: number) {
  await db
    .delete(beritaKategori)
    .where(and(eq(beritaKategori.villageId, villageId), eq(beritaKategori.id, id)));
}

/* --------------------------------------------------------------- agenda */

export async function buatAgenda(
  villageId: number,
  data: {
    judul: string;
    mulai: string;
    selesai: string | null;
    jamMulai: string | null;
    jamSelesai: string | null;
    kategori: string;
    lokasi: string | null;
    deskripsi: string | null;
    tayang: boolean;
  },
) {
  await db.insert(agendaKegiatan).values({ villageId, status: "rencana", ...data });
}

export async function ubahStatusAgenda(villageId: number, id: number, tayang: boolean) {
  await db
    .update(agendaKegiatan)
    .set({ tayang })
    .where(and(eq(agendaKegiatan.villageId, villageId), eq(agendaKegiatan.id, id)));
}

export async function ambilGambarSlider(villageId: number, id: number) {
  const [row] = await db
    .select({ gambar: slider.gambar })
    .from(slider)
    .where(and(eq(slider.villageId, villageId), eq(slider.id, id)))
    .limit(1);
  return row;
}

export async function hapusAgenda(villageId: number, id: number) {
  await db
    .delete(agendaKegiatan)
    .where(and(eq(agendaKegiatan.villageId, villageId), eq(agendaKegiatan.id, id)));
}

export async function cariAgendaById(villageId: number, id: number) {
  const [row] = await db
    .select({ id: agendaKegiatan.id })
    .from(agendaKegiatan)
    .where(and(eq(agendaKegiatan.villageId, villageId), eq(agendaKegiatan.id, id)))
    .limit(1);
  return row;
}

export async function ubahAgenda(
  villageId: number,
  id: number,
  data: {
    judul: string;
    mulai: string;
    selesai: string | null;
    jamMulai: string | null;
    jamSelesai: string | null;
    kategori: string;
    lokasi: string | null;
    deskripsi: string | null;
  },
) {
  await db
    .update(agendaKegiatan)
    .set(data)
    .where(and(eq(agendaKegiatan.villageId, villageId), eq(agendaKegiatan.id, id)));
}

/* ---------------------------------------------------------------- album */

export async function cariAlbumBySlug(villageId: number, slug: string) {
  const [row] = await db
    .select({ id: galeriAlbum.id })
    .from(galeriAlbum)
    .where(and(eq(galeriAlbum.villageId, villageId), eq(galeriAlbum.slug, slug)))
    .limit(1);
  return row;
}

export async function cariAlbumById(villageId: number, id: number) {
  const [row] = await db
    .select({ id: galeriAlbum.id, sampul: galeriAlbum.sampul })
    .from(galeriAlbum)
    .where(and(eq(galeriAlbum.villageId, villageId), eq(galeriAlbum.id, id)))
    .limit(1);
  return row;
}

export async function buatAlbum(
  villageId: number,
  data: { nama: string; slug: string; keterangan: string | null },
) {
  await db.insert(galeriAlbum).values({ villageId, ...data, aktif: true, urut: 0 });
}

export async function hapusAlbum(villageId: number, id: number) {
  await db
    .delete(galeriAlbum)
    .where(and(eq(galeriAlbum.villageId, villageId), eq(galeriAlbum.id, id)));
}

export async function ubahAlbum(
  villageId: number,
  id: number,
  data: {
    nama: string;
    slug: string;
    keterangan: string | null;
    sampul: string | null;
    aktif: boolean;
    urut: number;
  },
) {
  await db
    .update(galeriAlbum)
    .set(data)
    .where(and(eq(galeriAlbum.villageId, villageId), eq(galeriAlbum.id, id)));
}

/* ----------------------------------------------------------------- foto */

export async function listGambarFotoByAlbum(villageId: number, albumId: number) {
  return db
    .select({ gambar: galeriFoto.gambar })
    .from(galeriFoto)
    .where(and(eq(galeriFoto.villageId, villageId), eq(galeriFoto.albumId, albumId)));
}

export async function ambilGambarFoto(villageId: number, id: number) {
  const [row] = await db
    .select({ gambar: galeriFoto.gambar })
    .from(galeriFoto)
    .where(and(eq(galeriFoto.villageId, villageId), eq(galeriFoto.id, id)))
    .limit(1);
  return row;
}

export async function buatFoto(
  villageId: number,
  data: {
    albumId: number;
    gambar: string;
    judul: string | null;
    keterangan: string | null;
  },
) {
  await db.insert(galeriFoto).values({ villageId, ...data, aktif: true, slider: false, urut: 0 });
}

export async function hapusFoto(villageId: number, id: number) {
  await db
    .delete(galeriFoto)
    .where(and(eq(galeriFoto.villageId, villageId), eq(galeriFoto.id, id)));
}

export async function ubahFoto(
  villageId: number,
  id: number,
  data: {
    albumId: number;
    gambar: string;
    judul: string | null;
    keterangan: string | null;
    aktif: boolean;
    slider: boolean;
    urut: number;
  },
) {
  await db
    .update(galeriFoto)
    .set(data)
    .where(and(eq(galeriFoto.villageId, villageId), eq(galeriFoto.id, id)));
}

/* --------------------------------------------------------------- slider */

export async function ubahSlider(
  villageId: number,
  id: number,
  data: {
    gambar: string;
    judul: string | null;
    keterangan: string | null;
    tautan: string | null;
    urut: number;
  },
) {
  await db
    .update(slider)
    .set(data)
    .where(and(eq(slider.villageId, villageId), eq(slider.id, id)));
}

/* --------------------------------------------------------------- widget */

export async function cariWidgetById(villageId: number, id: number) {
  const [row] = await db
    .select({ id: widget.id })
    .from(widget)
    .where(and(eq(widget.villageId, villageId), eq(widget.id, id)))
    .limit(1);
  return row;
}

/* ------------------------------------------------------------- dokumen */

export async function cariDokumenById(villageId: number, id: number) {
  const [row] = await db
    .select({ berkas: dokumenPublik.berkas })
    .from(dokumenPublik)
    .where(and(eq(dokumenPublik.villageId, villageId), eq(dokumenPublik.id, id)))
    .limit(1);
  return row;
}

export async function cariDokumenBySlug(villageId: number, slug: string) {
  const [row] = await db
    .select({ id: dokumenPublik.id })
    .from(dokumenPublik)
    .where(and(eq(dokumenPublik.villageId, villageId), eq(dokumenPublik.slug, slug)))
    .limit(1);
  return row;
}

export async function ubahDokumen(
  villageId: number,
  id: number,
  data: {
    nama: string;
    slug: string;
    kategori: string;
    jenis: string | null;
    nomor: string | null;
    tahun: number | null;
    berkas: string | null;
    tautan: string | null;
    keterangan: string | null;
  },
) {
  await db
    .update(dokumenPublik)
    .set(data)
    .where(and(eq(dokumenPublik.villageId, villageId), eq(dokumenPublik.id, id)));
}
