import "server-only";

import { and, count, desc, eq, like, or } from "drizzle-orm";

import { db } from "@/db";
import {
  layananPublik,
  pengajuanLayanan,
  pengajuanLayananBerkas,
  riwayatPengajuanLayanan,
} from "@/db/schema";
import { conflict, notFound } from "@/lib/errors";

import { bolehTransisiPengajuan, type StatusPengajuanLayanan } from "../domain/pengajuan";

export async function listLayananAktif(villageId: number) {
  return db
    .select({
      id: layananPublik.id,
      nama: layananPublik.nama,
      kategori: layananPublik.kategori,
      deskripsi: layananPublik.deskripsi,
      persyaratan: layananPublik.persyaratan,
      estimasiHari: layananPublik.estimasiHari,
      biaya: layananPublik.biaya,
    })
    .from(layananPublik)
    .where(and(eq(layananPublik.villageId, villageId), eq(layananPublik.aktif, true)))
    .orderBy(layananPublik.nama);
}

export async function listPengajuanLayanan(
  villageId: number,
  status?: string,
  cari = "",
  page = 1,
  pageSize = 10,
) {
  const where = [eq(pengajuanLayanan.villageId, villageId)];
  if (status) where.push(eq(pengajuanLayanan.status, status));
  if (cari.trim()) {
    const term = `%${cari.trim().slice(0, 100)}%`;
    const match = or(
      like(pengajuanLayanan.nomorTiket, term),
      like(pengajuanLayanan.namaPemohon, term),
      like(pengajuanLayanan.nik, term),
    );
    if (match) where.push(match);
  }
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: pengajuanLayanan.id,
        nomorTiket: pengajuanLayanan.nomorTiket,
        namaPemohon: pengajuanLayanan.namaPemohon,
        nik: pengajuanLayanan.nik,
        telepon: pengajuanLayanan.telepon,
        keperluan: pengajuanLayanan.keperluan,
        status: pengajuanLayanan.status,
        createdAt: pengajuanLayanan.createdAt,
        namaLayanan: layananPublik.nama,
      })
      .from(pengajuanLayanan)
      .leftJoin(
        layananPublik,
        and(
          eq(pengajuanLayanan.layananId, layananPublik.id),
          eq(layananPublik.villageId, villageId),
        ),
      )
      .where(and(...where))
      .orderBy(desc(pengajuanLayanan.createdAt), desc(pengajuanLayanan.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(pengajuanLayanan)
      .where(and(...where)),
  ]);
  return {
    rows,
    total: Number(totals[0]?.total ?? 0),
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(Number(totals[0]?.total ?? 0) / pageSize)),
  };
}

export async function getPengajuanLayanan(villageId: number, id: number) {
  const [row] = await db
    .select({
      request: pengajuanLayanan,
      namaLayanan: layananPublik.nama,
      estimasiHari: layananPublik.estimasiHari,
      biaya: layananPublik.biaya,
    })
    .from(pengajuanLayanan)
    .leftJoin(
      layananPublik,
      and(eq(pengajuanLayanan.layananId, layananPublik.id), eq(layananPublik.villageId, villageId)),
    )
    .where(and(eq(pengajuanLayanan.villageId, villageId), eq(pengajuanLayanan.id, id)))
    .limit(1);
  return row ?? null;
}

export async function listRiwayatPengajuan(villageId: number, pengajuanId: number) {
  return db
    .select({
      id: riwayatPengajuanLayanan.id,
      statusSebelumnya: riwayatPengajuanLayanan.statusSebelumnya,
      statusBaru: riwayatPengajuanLayanan.statusBaru,
      catatan: riwayatPengajuanLayanan.catatan,
      createdAt: riwayatPengajuanLayanan.createdAt,
    })
    .from(riwayatPengajuanLayanan)
    .where(
      and(
        eq(riwayatPengajuanLayanan.villageId, villageId),
        eq(riwayatPengajuanLayanan.pengajuanId, pengajuanId),
      ),
    )
    .orderBy(desc(riwayatPengajuanLayanan.createdAt), desc(riwayatPengajuanLayanan.id));
}

export async function buatPengajuanLayanan(input: {
  villageId: number;
  layananId: number;
  residentId: number;
  nomorTiket: string;
  namaPemohon: string;
  nik: string | null;
  telepon: string;
  email: string | null;
  alamat: string | null;
  keperluan: string;
  lampiran: string | null;
  berkas: Array<{ namaPersyaratan: string; jalur: string; namaAsli: string; ukuran: number }>;
}) {
  return db.transaction(async (tx) => {
    const [service] = await tx
      .select({ id: layananPublik.id })
      .from(layananPublik)
      .where(
        and(
          eq(layananPublik.villageId, input.villageId),
          eq(layananPublik.id, input.layananId),
          eq(layananPublik.aktif, true),
        ),
      )
      .limit(1);
    if (!service) throw notFound("Layanan tidak ditemukan atau sedang tidak aktif.");
    const { berkas, ...pengajuanValues } = input;
    const [created] = await tx
      .insert(pengajuanLayanan)
      .values({
        ...pengajuanValues,
        status: "diajukan",
      })
      .$returningId();
    if (!created) throw new Error("Pengajuan layanan gagal disimpan.");
    if (berkas.length)
      await tx.insert(pengajuanLayananBerkas).values(
        berkas.map((file) => ({
          villageId: input.villageId,
          pengajuanId: created.id,
          ...file,
          mime: "application/pdf",
        })),
      );
    await tx.insert(riwayatPengajuanLayanan).values({
      villageId: input.villageId,
      pengajuanId: created.id,
      statusSebelumnya: null,
      statusBaru: "diajukan",
      catatan: "Pengajuan dikirim oleh warga.",
      actorId: null,
    });
    return created.id;
  });
}

export async function updateStatusPengajuan(
  villageId: number,
  id: number,
  petugasId: string,
  input: { status: StatusPengajuanLayanan; catatanPetugas: string; alasanPenolakan: string },
) {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: pengajuanLayanan.status })
      .from(pengajuanLayanan)
      .where(and(eq(pengajuanLayanan.villageId, villageId), eq(pengajuanLayanan.id, id)))
      .limit(1);
    if (!current) throw notFound("Pengajuan tidak ditemukan.");
    if (!["diajukan", "diverifikasi", "diproses", "selesai", "ditolak"].includes(current.status)) {
      throw conflict("Status pengajuan saat ini tidak valid.");
    }
    const dari = current.status as StatusPengajuanLayanan;
    if (!bolehTransisiPengajuan(dari, input.status)) {
      throw conflict(
        "Perubahan status tidak sesuai tahapan pelayanan atau pengajuan sudah ditutup.",
      );
    }
    const now = new Date();
    const [result] = await tx
      .update(pengajuanLayanan)
      .set({
        status: input.status,
        catatanPetugas: input.catatanPetugas || null,
        alasanPenolakan: input.status === "ditolak" ? input.alasanPenolakan : null,
        petugasId,
        diprosesPada: ["diverifikasi", "diproses"].includes(input.status) ? now : undefined,
        selesaiPada: ["selesai", "ditolak"].includes(input.status) ? now : null,
      })
      .where(
        and(
          eq(pengajuanLayanan.villageId, villageId),
          eq(pengajuanLayanan.id, id),
          eq(pengajuanLayanan.status, dari),
        ),
      );
    if (result.affectedRows === 0)
      throw conflict("Pengajuan sedang diperbarui petugas lain. Muat ulang halaman.");
    await tx.insert(riwayatPengajuanLayanan).values({
      villageId,
      pengajuanId: id,
      statusSebelumnya: dari,
      statusBaru: input.status,
      catatan: input.status === "ditolak" ? input.alasanPenolakan : input.catatanPetugas || null,
      actorId: petugasId,
    });
    return { statusLama: dari, statusBaru: input.status };
  });
}

export async function listPengajuanLayananWarga(villageId: number, residentId: number) {
  return db
    .select({
      id: pengajuanLayanan.id,
      nomorTiket: pengajuanLayanan.nomorTiket,
      status: pengajuanLayanan.status,
      createdAt: pengajuanLayanan.createdAt,
      namaLayanan: layananPublik.nama,
    })
    .from(pengajuanLayanan)
    .leftJoin(
      layananPublik,
      and(eq(pengajuanLayanan.layananId, layananPublik.id), eq(layananPublik.villageId, villageId)),
    )
    .where(
      and(eq(pengajuanLayanan.villageId, villageId), eq(pengajuanLayanan.residentId, residentId)),
    )
    .orderBy(desc(pengajuanLayanan.createdAt), desc(pengajuanLayanan.id))
    .limit(50);
}

export async function listBerkasPengajuan(
  villageId: number,
  pengajuanId: number,
  jenis?: "persyaratan" | "hasil",
) {
  const where = [
    eq(pengajuanLayananBerkas.villageId, villageId),
    eq(pengajuanLayananBerkas.pengajuanId, pengajuanId),
  ];
  if (jenis) where.push(eq(pengajuanLayananBerkas.jenis, jenis));
  return db
    .select()
    .from(pengajuanLayananBerkas)
    .where(and(...where))
    .orderBy(pengajuanLayananBerkas.id);
}

export async function buatBerkasHasilPengajuan(
  villageId: number,
  pengajuanId: number,
  files: Array<{ namaPersyaratan: string; jalur: string; namaAsli: string; ukuran: number }>,
) {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select({ status: pengajuanLayanan.status })
      .from(pengajuanLayanan)
      .where(and(eq(pengajuanLayanan.villageId, villageId), eq(pengajuanLayanan.id, pengajuanId)))
      .limit(1);
    if (!request) throw notFound("Pengajuan tidak ditemukan.");
    if (!["diproses", "selesai"].includes(request.status))
      throw conflict("Dokumen hasil hanya dapat ditambahkan saat pengajuan diproses atau selesai.");
    if (files.length)
      await tx.insert(pengajuanLayananBerkas).values(
        files.map((file) => ({
          villageId,
          pengajuanId,
          ...file,
          jenis: "hasil",
          mime: "application/pdf",
        })),
      );
  });
}
export async function getBerkasPengajuan(villageId: number, pengajuanId: number, berkasId: number) {
  const [row] = await db
    .select()
    .from(pengajuanLayananBerkas)
    .where(
      and(
        eq(pengajuanLayananBerkas.villageId, villageId),
        eq(pengajuanLayananBerkas.pengajuanId, pengajuanId),
        eq(pengajuanLayananBerkas.id, berkasId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getRingkasanStatusPengajuan(villageId: number) {
  const rows = await db
    .select({ status: pengajuanLayanan.status, total: count() })
    .from(pengajuanLayanan)
    .where(eq(pengajuanLayanan.villageId, villageId))
    .groupBy(pengajuanLayanan.status);
  return rows.map((row) => ({ status: row.status, total: Number(row.total) }));
}
