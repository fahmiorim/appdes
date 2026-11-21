import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { lembagaAnggota, lembagaDesa, pemerintahanDokumen, perangkatRiwayatJabatan } from "@/db/schema";

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
  const docs = await db.select({ id: pemerintahanDokumen.id, lembagaId: pemerintahanDokumen.lembagaId, judul: pemerintahanDokumen.judul, nomor: pemerintahanDokumen.nomor, tanggal: pemerintahanDokumen.tanggal }).from(pemerintahanDokumen).where(and(eq(pemerintahanDokumen.villageId, villageId), eq(pemerintahanDokumen.tampilPublik, true)));
  return lembaga.map((item) => ({ ...item, anggota: members.filter((member) => member.lembagaId === item.id), dokumen: docs.filter((doc) => doc.lembagaId === item.id) }));
}

export async function detailPerangkatPemerintahanPublik(villageId: number, perangkatId: number) {
  const [riwayat, dokumen] = await Promise.all([
    db.select({ id: perangkatRiwayatJabatan.id, jabatan: perangkatRiwayatJabatan.jabatan, nomorSk: perangkatRiwayatJabatan.nomorSk, mulai: perangkatRiwayatJabatan.mulai, selesai: perangkatRiwayatJabatan.selesai, keterangan: perangkatRiwayatJabatan.keterangan })
      .from(perangkatRiwayatJabatan).where(and(eq(perangkatRiwayatJabatan.villageId, villageId), eq(perangkatRiwayatJabatan.perangkatId, perangkatId), eq(perangkatRiwayatJabatan.tampilPublik, true))),
    db.select({ id: pemerintahanDokumen.id, judul: pemerintahanDokumen.judul, nomor: pemerintahanDokumen.nomor, tanggal: pemerintahanDokumen.tanggal })
      .from(pemerintahanDokumen).where(and(eq(pemerintahanDokumen.villageId, villageId), eq(pemerintahanDokumen.perangkatId, perangkatId), eq(pemerintahanDokumen.tampilPublik, true))),
  ]);
  return { riwayat, dokumen };
}
