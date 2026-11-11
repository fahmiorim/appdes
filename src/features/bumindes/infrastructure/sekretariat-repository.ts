import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { incomingLetters, outgoingLetters } from "@/db/schema";
import {
  bumindesAgenda,
  bumindesAparat,
  bumindesPeraturan,
} from "@/db/schema/bumindes-sekretariat";

export interface PeraturanValues {
  jenis: string;
  nomor: string;
  tahun: number | null;
  tentang: string;
  tanggalDitetapkan: string | null;
  tanggalDiundangkan: string | null;
  keterangan: string | null;
}

export interface AparatValues {
  nama: string;
  nip: string | null;
  jabatan: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  pendidikan: string | null;
  nomorSkPengangkatan: string | null;
  tanggalPengangkatan: string | null;
  nomorSkPemberhentian: string | null;
  tanggalPemberhentian: string | null;
  keterangan: string | null;
}

export interface AgendaValues {
  jenis: string;
  tanggal: string;
  nomorSurat: string | null;
  asalTujuan: string | null;
  perihal: string;
  keterangan: string | null;
}

export async function listBumindesPeraturan(villageId: number, jenis?: string) {
  const kondisi = [eq(bumindesPeraturan.villageId, villageId)];
  if (jenis) kondisi.push(eq(bumindesPeraturan.jenis, jenis));
  return db
    .select()
    .from(bumindesPeraturan)
    .where(and(...kondisi))
    .orderBy(desc(bumindesPeraturan.tahun), desc(bumindesPeraturan.id));
}

export async function getBumindesPeraturan(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(bumindesPeraturan)
    .where(and(eq(bumindesPeraturan.villageId, villageId), eq(bumindesPeraturan.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertBumindesPeraturan(villageId: number, values: PeraturanValues) {
  const [row] = await db
    .insert(bumindesPeraturan)
    .values({ villageId, ...values })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan peraturan/keputusan.");
  return row.id;
}

export async function updateBumindesPeraturan(
  villageId: number,
  id: number,
  values: PeraturanValues,
) {
  const [result] = await db
    .update(bumindesPeraturan)
    .set(values)
    .where(and(eq(bumindesPeraturan.villageId, villageId), eq(bumindesPeraturan.id, id)));
  return result.affectedRows > 0;
}

export async function deleteBumindesPeraturan(villageId: number, id: number) {
  const [result] = await db
    .delete(bumindesPeraturan)
    .where(and(eq(bumindesPeraturan.villageId, villageId), eq(bumindesPeraturan.id, id)));
  return result.affectedRows > 0;
}

export async function listBumindesAparat(villageId: number) {
  return db
    .select()
    .from(bumindesAparat)
    .where(eq(bumindesAparat.villageId, villageId))
    .orderBy(asc(bumindesAparat.jabatan), asc(bumindesAparat.id));
}

export async function getBumindesAparat(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(bumindesAparat)
    .where(and(eq(bumindesAparat.villageId, villageId), eq(bumindesAparat.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertBumindesAparat(villageId: number, values: AparatValues) {
  const [row] = await db
    .insert(bumindesAparat)
    .values({ villageId, ...values })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan aparat.");
  return row.id;
}

export async function updateBumindesAparat(villageId: number, id: number, values: AparatValues) {
  const [result] = await db
    .update(bumindesAparat)
    .set(values)
    .where(and(eq(bumindesAparat.villageId, villageId), eq(bumindesAparat.id, id)));
  return result.affectedRows > 0;
}

export async function deleteBumindesAparat(villageId: number, id: number) {
  const [result] = await db
    .delete(bumindesAparat)
    .where(and(eq(bumindesAparat.villageId, villageId), eq(bumindesAparat.id, id)));
  return result.affectedRows > 0;
}

export interface AgendaBukuRow {
  id: number;
  villageId: number;
  jenis: string;
  tanggal: string;
  nomorSurat: string | null;
  asalTujuan: string | null;
  perihal: string;
  keterangan: string | null;
}

/**
 * Buku Agenda (masuk) dan Ekspedisi (keluar) menggabungkan catatan manual
 * `bumindes_agenda` dengan surat yang sudah tercatat di modul persuratan.
 *
 * Surat masuk/keluar tidak disalin ke tabel manual agar tidak ada dua sumber
 * kebenaran yang bisa berbeda saat surat diubah atau dihapus. ID surat diberi
 * tanda negatif supaya tetap unik terhadap ID catatan manual.
 */
export async function listBumindesAgenda(
  villageId: number,
  jenis?: string,
): Promise<AgendaBukuRow[]> {
  const kondisi = [eq(bumindesAgenda.villageId, villageId)];
  if (jenis) kondisi.push(eq(bumindesAgenda.jenis, jenis));

  const ambilMasuk = !jenis || jenis === "masuk";
  const ambilKeluar = !jenis || jenis === "keluar";

  const [manual, masuk, keluar] = await Promise.all([
    db
      .select()
      .from(bumindesAgenda)
      .where(and(...kondisi))
      .orderBy(desc(bumindesAgenda.tanggal), desc(bumindesAgenda.id)),
    ambilMasuk
      ? db
          .select({
            id: incomingLetters.id,
            tanggal: incomingLetters.receivedDate,
            nomorSurat: incomingLetters.letterNumber,
            asalTujuan: incomingLetters.sender,
            perihal: incomingLetters.summary,
            keterangan: incomingLetters.archiveLocation,
          })
          .from(incomingLetters)
          .where(eq(incomingLetters.villageId, villageId))
      : Promise.resolve([]),
    ambilKeluar
      ? db
          .select({
            id: outgoingLetters.id,
            tanggal: outgoingLetters.letterDate,
            nomorSurat: outgoingLetters.letterNumber,
            asalTujuan: outgoingLetters.recipient,
            perihal: outgoingLetters.summary,
            keterangan: outgoingLetters.archiveLocation,
          })
          .from(outgoingLetters)
          .where(eq(outgoingLetters.villageId, villageId))
      : Promise.resolve([]),
  ]);

  const dariSurat: AgendaBukuRow[] = [
    ...masuk.map((row) => ({
      id: -row.id,
      villageId,
      jenis: "masuk",
      tanggal: row.tanggal,
      nomorSurat: row.nomorSurat,
      asalTujuan: row.asalTujuan,
      perihal: row.perihal?.trim() || "-",
      keterangan: row.keterangan,
    })),
    ...keluar.map((row) => ({
      id: -1_000_000_000 - row.id,
      villageId,
      jenis: "keluar",
      tanggal: row.tanggal,
      nomorSurat: row.nomorSurat,
      asalTujuan: row.asalTujuan,
      perihal: row.perihal?.trim() || "-",
      keterangan: row.keterangan,
    })),
  ];

  return [...manual, ...dariSurat].sort(
    (a, b) => b.tanggal.localeCompare(a.tanggal) || b.id - a.id,
  );
}

export async function getBumindesAgenda(villageId: number, id: number) {
  const [row] = await db
    .select()
    .from(bumindesAgenda)
    .where(and(eq(bumindesAgenda.villageId, villageId), eq(bumindesAgenda.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertBumindesAgenda(villageId: number, values: AgendaValues) {
  const [row] = await db
    .insert(bumindesAgenda)
    .values({ villageId, ...values })
    .$returningId();
  if (!row) throw new Error("Gagal menyimpan agenda.");
  return row.id;
}

export async function updateBumindesAgenda(villageId: number, id: number, values: AgendaValues) {
  const [result] = await db
    .update(bumindesAgenda)
    .set(values)
    .where(and(eq(bumindesAgenda.villageId, villageId), eq(bumindesAgenda.id, id)));
  return result.affectedRows > 0;
}

export async function deleteBumindesAgenda(villageId: number, id: number) {
  const [result] = await db
    .delete(bumindesAgenda)
    .where(and(eq(bumindesAgenda.villageId, villageId), eq(bumindesAgenda.id, id)));
  return result.affectedRows > 0;
}
