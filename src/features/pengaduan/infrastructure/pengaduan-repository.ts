import "server-only";

import { and, count, desc, eq, like, or } from "drizzle-orm";

import { db } from "@/db";
import { pengaduan, users } from "@/db/schema";
import {
  normalizeKategori,
  normalizeStatus,
  type PengaduanPublikRow,
  type PengaduanRow,
  type StatusPengaduan,
} from "@/features/pengaduan/domain/pengaduan";

/**
 * Repository pengaduan.
 *
 * Seluruh query dibatasi `village_id`; penggabungan `users` hanya untuk
 * menampilkan nama petugas yang menanggapi (bukan untuk otorisasi).
 */

const kolomPengaduan = {
  id: pengaduan.id,
  nomorTiket: pengaduan.nomorTiket,
  kategori: pengaduan.kategori,
  judul: pengaduan.judul,
  isi: pengaduan.isi,
  namaPelapor: pengaduan.namaPelapor,
  nik: pengaduan.nik,
  telepon: pengaduan.telepon,
  email: pengaduan.email,
  alamat: pengaduan.alamat,
  lampiran: pengaduan.lampiran,
  status: pengaduan.status,
  tanggapan: pengaduan.tanggapan,
  petugasNama: users.name,
  ditanggapiPada: pengaduan.ditanggapiPada,
  publik: pengaduan.publik,
  createdAt: pengaduan.createdAt,
} as const;

type BarisPengaduan = {
  id: number;
  nomorTiket: string;
  kategori: string;
  judul: string;
  isi: string;
  namaPelapor: string;
  nik: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  lampiran: string | null;
  status: string;
  tanggapan: string | null;
  petugasNama: string | null;
  ditanggapiPada: Date | null;
  publik: boolean;
  createdAt: Date | null;
};

function mapRow(row: BarisPengaduan): PengaduanRow {
  return { ...row, kategori: normalizeKategori(row.kategori), status: normalizeStatus(row.status) };
}

export interface FilterPengaduan {
  status?: StatusPengaduan;
  kategori?: string;
  cari?: string;
}

/** Daftar pengaduan desa, terbaru lebih dulu. */
export async function listPengaduan(
  villageId: number,
  filter: FilterPengaduan = {},
): Promise<PengaduanRow[]> {
  const syarat = [eq(pengaduan.villageId, villageId)];

  if (filter.status) syarat.push(eq(pengaduan.status, filter.status));
  if (filter.kategori) syarat.push(eq(pengaduan.kategori, filter.kategori));

  const cari = filter.cari?.trim();
  if (cari) {
    const pola = `%${cari}%`;
    const pencarian = or(
      like(pengaduan.judul, pola),
      like(pengaduan.namaPelapor, pola),
      like(pengaduan.nomorTiket, pola),
    );
    if (pencarian) syarat.push(pencarian);
  }

  const rows = await db
    .select(kolomPengaduan)
    .from(pengaduan)
    .leftJoin(users, eq(pengaduan.petugasId, users.id))
    .where(and(...syarat))
    .orderBy(desc(pengaduan.createdAt), desc(pengaduan.id));

  return rows.map(mapRow);
}

/** Satu pengaduan milik desa ini, atau `null`. */
export async function getPengaduan(villageId: number, id: number): Promise<PengaduanRow | null> {
  const [row] = await db
    .select(kolomPengaduan)
    .from(pengaduan)
    .leftJoin(users, eq(pengaduan.petugasId, users.id))
    .where(and(eq(pengaduan.villageId, villageId), eq(pengaduan.id, id)))
    .limit(1);

  return row ? mapRow(row) : null;
}

/**
 * Cari pengaduan berdasarkan nomor tiket, ter-scope desa.
 *
 * Pemanggil wajib memverifikasi identitas pelapor sebelum menampilkan isinya
 * (lihat `lacakPengaduanData`). Nomor tiket saja mudah ditebak (urut harian).
 */
export async function getPengaduanByTiket(
  villageId: number,
  nomorTiket: string,
): Promise<PengaduanRow | null> {
  const [row] = await db
    .select(kolomPengaduan)
    .from(pengaduan)
    .leftJoin(users, eq(pengaduan.petugasId, users.id))
    .where(and(eq(pengaduan.villageId, villageId), eq(pengaduan.nomorTiket, nomorTiket)))
    .limit(1);

  return row ? mapRow(row) : null;
}

export interface NilaiPengaduanBaru {
  nomorTiket: string;
  kategori: string;
  judul: string;
  isi: string;
  namaPelapor: string;
  nik: string | null;
  telepon: string | null;
  email: string | null;
  alamat: string | null;
  lampiran: string | null;
}

/** Simpan pengaduan baru; mengembalikan id baris. */
export async function insertPengaduan(
  villageId: number,
  values: NilaiPengaduanBaru,
): Promise<number> {
  const [row] = await db
    .insert(pengaduan)
    .values({ villageId, ...values })
    .$returningId();

  if (!row) throw new Error("Gagal menyimpan pengaduan.");
  return row.id;
}

export interface NilaiTanggapan {
  status: StatusPengaduan;
  tanggapan: string | null;
  publik: boolean;
  petugasId: string | null;
  ditanggapiPada: Date | null;
}

/** Perbarui status/tanggapan pengaduan. */
export async function updateTanggapanPengaduan(
  villageId: number,
  id: number,
  values: NilaiTanggapan,
): Promise<boolean> {
  const [result] = await db
    .update(pengaduan)
    .set(values)
    .where(and(eq(pengaduan.villageId, villageId), eq(pengaduan.id, id)));

  return result.affectedRows > 0;
}

/** Tandai pengaduan tampil/tidak tampil di halaman publik. */
export async function setPublikPengaduan(
  villageId: number,
  id: number,
  publik: boolean,
): Promise<boolean> {
  const [result] = await db
    .update(pengaduan)
    .set({ publik })
    .where(and(eq(pengaduan.villageId, villageId), eq(pengaduan.id, id)));

  return result.affectedRows > 0;
}

export async function deletePengaduan(villageId: number, id: number): Promise<boolean> {
  const [result] = await db
    .delete(pengaduan)
    .where(and(eq(pengaduan.villageId, villageId), eq(pengaduan.id, id)));

  return result.affectedRows > 0;
}

/**
 * Jumlah tiket yang sudah terbit pada satu tanggal.
 *
 * Dipakai menyusun nomor urut tiket berikutnya; polanya dibatasi prefiks
 * `PGD-YYYYMMDD-` sehingga tidak menghitung tiket hari lain.
 */
export async function countTiketPadaTanggal(villageId: number, prefiks: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(pengaduan)
    .where(and(eq(pengaduan.villageId, villageId), like(pengaduan.nomorTiket, `${prefiks}%`)));

  return Number(row?.value ?? 0);
}

/** Pengaduan yang boleh tampil di situs publik. */
export async function listPengaduanPublik(
  villageId: number,
  limit = 50,
): Promise<PengaduanPublikRow[]> {
  const rows = await db
    .select({
      id: pengaduan.id,
      nomorTiket: pengaduan.nomorTiket,
      kategori: pengaduan.kategori,
      judul: pengaduan.judul,
      isi: pengaduan.isi,
      namaPelapor: pengaduan.namaPelapor,
      status: pengaduan.status,
      tanggapan: pengaduan.tanggapan,
      ditanggapiPada: pengaduan.ditanggapiPada,
      createdAt: pengaduan.createdAt,
    })
    .from(pengaduan)
    .where(and(eq(pengaduan.villageId, villageId), eq(pengaduan.publik, true)))
    .orderBy(desc(pengaduan.createdAt), desc(pengaduan.id))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    kategori: normalizeKategori(row.kategori),
    status: normalizeStatus(row.status),
  }));
}
