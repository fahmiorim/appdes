import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { dokumenWarga, type NewDokumenWarga } from "@/db/schema/dokumen-warga";

import {
  jenisDokumenTersimpan,
  sumberDokumen,
  type DokumenWargaDTO,
  type JenisDokumenWarga,
  type SumberDokumen,
} from "../domain/dokumen-warga";

export interface DokumenWargaRow {
  id: number;
  jenis: JenisDokumenWarga;
  nama: string;
  berkas: string;
  mime: string;
  namaAsli: string;
  sumber: SumberDokumen;
  createdAt: Date | null;
  updatedAt: Date | null;
}

const KOLOM = {
  id: dokumenWarga.id,
  jenis: dokumenWarga.jenis,
  nama: dokumenWarga.nama,
  berkas: dokumenWarga.berkas,
  mime: dokumenWarga.mime,
  namaAsli: dokumenWarga.namaAsli,
  sumber: dokumenWarga.sumber,
  createdAt: dokumenWarga.createdAt,
  updatedAt: dokumenWarga.updatedAt,
};

function keBaris(row: {
  id: number;
  jenis: string;
  nama: string;
  berkas: string;
  mime: string;
  namaAsli: string;
  sumber: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}): DokumenWargaRow {
  return {
    id: row.id,
    jenis: jenisDokumenTersimpan(row.jenis),
    nama: row.nama,
    berkas: row.berkas,
    mime: row.mime,
    namaAsli: row.namaAsli,
    sumber: sumberDokumen(row.sumber),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Semua dokumen milik satu warga di desanya, urut jenis lalu terbaru. */
export async function listDokumenWarga(
  villageId: number,
  residentId: number,
): Promise<DokumenWargaRow[]> {
  const rows = await db
    .select(KOLOM)
    .from(dokumenWarga)
    .where(and(eq(dokumenWarga.villageId, villageId), eq(dokumenWarga.residentId, residentId)))
    .orderBy(asc(dokumenWarga.jenis), asc(dokumenWarga.id));

  return rows.map(keBaris);
}

/** Satu dokumen milik warga; `null` bila bukan pemilik/desa lain. */
export async function findDokumenWarga(
  villageId: number,
  residentId: number,
  id: number,
): Promise<DokumenWargaRow | null> {
  const [row] = await db
    .select(KOLOM)
    .from(dokumenWarga)
    .where(
      and(
        eq(dokumenWarga.villageId, villageId),
        eq(dokumenWarga.residentId, residentId),
        eq(dokumenWarga.id, id),
      ),
    )
    .limit(1);

  return row ? keBaris(row) : null;
}

export async function createDokumenWarga(data: NewDokumenWarga): Promise<number> {
  const [row] = await db.insert(dokumenWarga).values(data).$returningId();
  if (!row) throw new Error("Gagal menyimpan dokumen warga.");
  return row.id;
}

/** Ubah metadata dokumen; hanya baris unggahan warga sendiri. */
export async function updateDokumenWarga(
  villageId: number,
  residentId: number,
  id: number,
  data: { jenis: JenisDokumenWarga; nama: string },
): Promise<void> {
  await db
    .update(dokumenWarga)
    .set(data)
    .where(
      and(
        eq(dokumenWarga.villageId, villageId),
        eq(dokumenWarga.residentId, residentId),
        eq(dokumenWarga.id, id),
        eq(dokumenWarga.sumber, "warga"),
      ),
    );
}

export async function deleteDokumenWarga(
  villageId: number,
  residentId: number,
  id: number,
): Promise<void> {
  await db
    .delete(dokumenWarga)
    .where(
      and(
        eq(dokumenWarga.villageId, villageId),
        eq(dokumenWarga.residentId, residentId),
        eq(dokumenWarga.id, id),
        eq(dokumenWarga.sumber, "warga"),
      ),
    );
}

/** DTO tanpa jalur penyimpanan, aman dikirim ke komponen klien. */
export function keDTO(row: DokumenWargaRow): DokumenWargaDTO {
  return {
    id: row.id,
    jenis: row.jenis,
    nama: row.nama,
    mime: row.mime,
    namaAsli: row.namaAsli,
    sumber: row.sumber,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
