import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { lembagaAnggota, lembagaDesa } from "@/db/schema";

/** Hanya lembaga dan anggota yang secara eksplisit diizinkan tampil ke publik. */
export async function daftarLembagaPublik(villageId: number) {
  const lembaga = await db.select({
    id: lembagaDesa.id, nama: lembagaDesa.nama, jenis: lembagaDesa.jenis,
    deskripsi: lembagaDesa.deskripsi, tugasFungsi: lembagaDesa.tugasFungsi,
    dasarHukum: lembagaDesa.dasarHukum, masaBaktiMulai: lembagaDesa.masaBaktiMulai,
    masaBaktiSelesai: lembagaDesa.masaBaktiSelesai,
  }).from(lembagaDesa)
    .where(and(eq(lembagaDesa.villageId, villageId), eq(lembagaDesa.status, "aktif"), eq(lembagaDesa.tampilPublik, true)))
    .orderBy(asc(lembagaDesa.urut), asc(lembagaDesa.id));
  if (!lembaga.length) return [];
  const members = await db.select({
    id: lembagaAnggota.id, lembagaId: lembagaAnggota.lembagaId, nama: lembagaAnggota.nama,
    jabatan: lembagaAnggota.jabatan, foto: lembagaAnggota.foto,
    periodeMulai: lembagaAnggota.periodeMulai, periodeSelesai: lembagaAnggota.periodeSelesai,
  }).from(lembagaAnggota)
    .where(and(eq(lembagaAnggota.villageId, villageId), eq(lembagaAnggota.aktif, true), eq(lembagaAnggota.tampilPublik, true)))
    .orderBy(asc(lembagaAnggota.urut), asc(lembagaAnggota.id));
  return lembaga.map((item) => ({ ...item, anggota: members.filter((member) => member.lembagaId === item.id) }));
}
