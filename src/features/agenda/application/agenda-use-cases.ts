import "server-only";

import {
  AGENDA_RESOURCE,
  type AgendaFormInput,
  type AgendaPublikRow,
  type AgendaRow,
} from "@/features/agenda/domain/agenda";
import {
  createAgenda,
  deleteAgenda,
  listAgendaAdmin,
  listAgendaPublik,
  updateAgenda,
} from "@/features/agenda/infrastructure/agenda-repository";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";
import { notFound } from "@/lib/errors";

/** Daftar agenda admin (termasuk yang belum tayang). */
export async function daftarAgendaAdmin(): Promise<AgendaRow[]> {
  const user = await requirePermission(AGENDA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  return listAgendaAdmin(villageId);
}

/** Simpan agenda baru atau ubah agenda milik desa pengguna. */
export async function simpanAgenda(input: AgendaFormInput, id?: number): Promise<void> {
  const user = await requirePermission(AGENDA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  const rows = await listAgendaAdmin(villageId);

  if (id !== undefined && !rows.some((row) => row.id === id)) {
    throw notFound("Agenda yang akan diubah tidak ditemukan.");
  }

  const data = {
    judul: input.judul,
    mulai: input.mulai,
    selesai: input.selesai,
    lokasi: input.lokasi || null,
    deskripsi: input.deskripsi || null,
    tayang: input.tayang,
  };

  if (id === undefined) {
    await createAgenda(villageId, data);
    return;
  }

  await updateAgenda(villageId, id, data);
}

export async function hapusAgenda(id: number): Promise<void> {
  const user = await requirePermission(AGENDA_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  const rows = await listAgendaAdmin(villageId);

  if (!rows.some((row) => row.id === id)) {
    throw notFound("Agenda yang akan dihapus tidak ditemukan.");
  }

  await deleteAgenda(villageId, id);
}

/** Agenda mendatang untuk situs publik; hanya baris yang ditayangkan. */
export async function agendaMendatang(villageId: number, limit = 20): Promise<AgendaPublikRow[]> {
  const rows = await listAgendaPublik(villageId, limit);
  return rows.map(({ id, judul, mulai, selesai, lokasi, deskripsi }) => ({
    id,
    judul,
    mulai,
    selesai,
    lokasi,
    deskripsi,
  }));
}
