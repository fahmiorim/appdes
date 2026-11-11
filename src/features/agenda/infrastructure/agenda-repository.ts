import "server-only";

import { and, asc, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import { agendaKegiatan } from "@/db/schema";
import type { AgendaRow } from "@/features/agenda/domain/agenda";

/**
 * Query agenda kegiatan desa.
 *
 * Fungsi publik **wajib** menerima `villageId` dari host dan hanya membaca
 * baris `tayang = true`, sehingga agenda yang belum disetujui tidak mungkin
 * tampil di situs.
 */

const KOLOM = {
  id: agendaKegiatan.id,
  judul: agendaKegiatan.judul,
  mulai: agendaKegiatan.mulai,
  selesai: agendaKegiatan.selesai,
  lokasi: agendaKegiatan.lokasi,
  deskripsi: agendaKegiatan.deskripsi,
};

/** Agenda mendatang yang sudah ditayangkan, urut tanggal terdekat. */
export async function listAgendaPublik(
  villageId: number,
  limit = 20,
  hariIni = new Date().toISOString().slice(0, 10),
): Promise<AgendaRow[]> {
  const rows = await db
    .select({ ...KOLOM, tayang: agendaKegiatan.tayang })
    .from(agendaKegiatan)
    .where(
      and(
        eq(agendaKegiatan.villageId, villageId),
        eq(agendaKegiatan.tayang, true),
        gte(agendaKegiatan.mulai, hariIni),
      ),
    )
    .orderBy(asc(agendaKegiatan.mulai), asc(agendaKegiatan.id))
    .limit(limit);

  return rows;
}

/** Seluruh agenda desa untuk halaman admin, termasuk yang belum tayang. */
export async function listAgendaAdmin(villageId: number): Promise<AgendaRow[]> {
  return db
    .select({ ...KOLOM, tayang: agendaKegiatan.tayang })
    .from(agendaKegiatan)
    .where(eq(agendaKegiatan.villageId, villageId))
    .orderBy(asc(agendaKegiatan.mulai), asc(agendaKegiatan.id));
}

export interface AgendaInput {
  judul: string;
  mulai: string;
  selesai: string | null;
  lokasi: string | null;
  deskripsi: string | null;
  tayang: boolean;
}

export async function createAgenda(villageId: number, data: AgendaInput): Promise<void> {
  await db.insert(agendaKegiatan).values({ villageId, ...data });
}

export async function updateAgenda(
  villageId: number,
  id: number,
  data: AgendaInput,
): Promise<void> {
  await db
    .update(agendaKegiatan)
    .set(data)
    .where(and(eq(agendaKegiatan.villageId, villageId), eq(agendaKegiatan.id, id)));
}

export async function deleteAgenda(villageId: number, id: number): Promise<void> {
  await db
    .delete(agendaKegiatan)
    .where(and(eq(agendaKegiatan.villageId, villageId), eq(agendaKegiatan.id, id)));
}
