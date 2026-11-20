import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pengajuanLayanan, layananPublik, riwayatPengajuanLayanan } from "@/db/schema";
import { bolehTransisiPengajuan, type StatusPengajuanLayanan } from "../domain/pengajuan";
import { conflict, notFound } from "@/lib/errors";

export async function listLayananAktif(villageId: number) {
  return db.select({ id: layananPublik.id, nama: layananPublik.nama, kategori: layananPublik.kategori, deskripsi: layananPublik.deskripsi, persyaratan: layananPublik.persyaratan, estimasiHari: layananPublik.estimasiHari, biaya: layananPublik.biaya }).from(layananPublik).where(and(eq(layananPublik.villageId, villageId), eq(layananPublik.aktif, true))).orderBy(layananPublik.nama);
}

export async function listPengajuanLayanan(villageId: number, status?: string) {
  const where = [eq(pengajuanLayanan.villageId, villageId)];
  if (status) where.push(eq(pengajuanLayanan.status, status));
  const [rows, totals] = await Promise.all([
    db.select({ id: pengajuanLayanan.id, nomorTiket: pengajuanLayanan.nomorTiket, namaPemohon: pengajuanLayanan.namaPemohon, nik: pengajuanLayanan.nik, telepon: pengajuanLayanan.telepon, keperluan: pengajuanLayanan.keperluan, status: pengajuanLayanan.status, createdAt: pengajuanLayanan.createdAt, namaLayanan: layananPublik.nama })
      .from(pengajuanLayanan)
      .leftJoin(layananPublik, and(eq(pengajuanLayanan.layananId, layananPublik.id), eq(layananPublik.villageId, villageId)))
      .where(and(...where)).orderBy(desc(pengajuanLayanan.createdAt), desc(pengajuanLayanan.id)).limit(100),
    db.select({ total: count() }).from(pengajuanLayanan).where(and(...where)),
  ]);
  return { rows, total: Number(totals[0]?.total ?? 0) };
}

export async function getPengajuanLayanan(villageId: number, id: number) {
  const [row] = await db.select({ request: pengajuanLayanan, namaLayanan: layananPublik.nama, estimasiHari: layananPublik.estimasiHari, biaya: layananPublik.biaya })
    .from(pengajuanLayanan)
    .leftJoin(layananPublik, and(eq(pengajuanLayanan.layananId, layananPublik.id), eq(layananPublik.villageId, villageId)))
    .where(and(eq(pengajuanLayanan.villageId, villageId), eq(pengajuanLayanan.id, id))).limit(1);
  return row ?? null;
}

export async function listRiwayatPengajuan(villageId: number, pengajuanId: number) {
  return db.select({ id: riwayatPengajuanLayanan.id, statusSebelumnya: riwayatPengajuanLayanan.statusSebelumnya, statusBaru: riwayatPengajuanLayanan.statusBaru, catatan: riwayatPengajuanLayanan.catatan, createdAt: riwayatPengajuanLayanan.createdAt })
    .from(riwayatPengajuanLayanan)
    .where(and(eq(riwayatPengajuanLayanan.villageId, villageId), eq(riwayatPengajuanLayanan.pengajuanId, pengajuanId)))
    .orderBy(desc(riwayatPengajuanLayanan.createdAt), desc(riwayatPengajuanLayanan.id));
}

export async function buatPengajuanLayanan(input: {
  villageId: number; layananId: number; residentId: number; nomorTiket: string;
  namaPemohon: string; nik: string | null; telepon: string; email: string | null;
  alamat: string | null; keperluan: string; lampiran: string | null;
}) {
  return db.transaction(async (tx) => {
    const [service] = await tx.select({ id: layananPublik.id }).from(layananPublik)
      .where(and(eq(layananPublik.villageId, input.villageId), eq(layananPublik.id, input.layananId), eq(layananPublik.aktif, true))).limit(1);
    if (!service) throw notFound("Layanan tidak ditemukan atau sedang tidak aktif.");
    const [created] = await tx.insert(pengajuanLayanan).values({
      ...input, status: "diajukan",
    }).$returningId();
    if (!created) throw new Error("Pengajuan layanan gagal disimpan.");
    await tx.insert(riwayatPengajuanLayanan).values({
      villageId: input.villageId, pengajuanId: created.id, statusSebelumnya: null,
      statusBaru: "diajukan", catatan: "Pengajuan dikirim oleh warga.", actorId: null,
    });
    return created.id;
  });
}

export async function updateStatusPengajuan(
  villageId: number, id: number, petugasId: string,
  input: { status: StatusPengajuanLayanan; catatanPetugas: string; alasanPenolakan: string },
) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ status: pengajuanLayanan.status }).from(pengajuanLayanan)
      .where(and(eq(pengajuanLayanan.villageId, villageId), eq(pengajuanLayanan.id, id))).limit(1);
    if (!current) throw notFound("Pengajuan tidak ditemukan.");
    if (!["diajukan", "diverifikasi", "diproses", "selesai", "ditolak"].includes(current.status)) {
      throw conflict("Status pengajuan saat ini tidak valid.");
    }
    const dari = current.status as StatusPengajuanLayanan;
    const { bolehTransisiPengajuan } = await import("../domain/pengajuan");
    if (!bolehTransisiPengajuan(dari, input.status)) {
      throw conflict("Perubahan status tidak sesuai tahapan pelayanan atau pengajuan sudah ditutup.");
    }
    const now = new Date();
    const [result] = await tx.update(pengajuanLayanan).set({
      status: input.status, catatanPetugas: input.catatanPetugas || null,
      alasanPenolakan: input.status === "ditolak" ? input.alasanPenolakan : null,
      petugasId,
      diprosesPada: ["diverifikasi", "diproses"].includes(input.status) ? now : undefined,
      selesaiPada: ["selesai", "ditolak"].includes(input.status) ? now : null,
    }).where(and(eq(pengajuanLayanan.villageId, villageId), eq(pengajuanLayanan.id, id), eq(pengajuanLayanan.status, dari)));
    if (result.affectedRows === 0) throw conflict("Pengajuan sedang diperbarui petugas lain. Muat ulang halaman.");
    await tx.insert(riwayatPengajuanLayanan).values({
      villageId, pengajuanId: id, statusSebelumnya: dari, statusBaru: input.status,
      catatan: input.status === "ditolak" ? input.alasanPenolakan : input.catatanPetugas || null,
      actorId: petugasId,
    });
    return { statusLama: dari, statusBaru: input.status };
  });
}

export async function listPengajuanLayananWarga(villageId: number, residentId: number) {
  return db.select({
    id: pengajuanLayanan.id,
    nomorTiket: pengajuanLayanan.nomorTiket,
    status: pengajuanLayanan.status,
    createdAt: pengajuanLayanan.createdAt,
    namaLayanan: layananPublik.nama,
  }).from(pengajuanLayanan)
    .leftJoin(layananPublik, and(eq(pengajuanLayanan.layananId, layananPublik.id), eq(layananPublik.villageId, villageId)))
    .where(and(eq(pengajuanLayanan.villageId, villageId), eq(pengajuanLayanan.residentId, residentId)))
    .orderBy(desc(pengajuanLayanan.createdAt), desc(pengajuanLayanan.id))
    .limit(50);
}
