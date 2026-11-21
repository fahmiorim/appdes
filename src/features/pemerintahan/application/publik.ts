import "server-only";

import {
  listAnggotaPublik,
  listDokumenPublikByLembaga,
  listDokumenPublikByPerangkat,
  listLembagaPublik,
  listRiwayatPublikByPerangkat,
} from "@/features/pemerintahan/infrastructure/pemerintahan-repository";

/** Hanya lembaga dan anggota yang secara eksplisit diizinkan tampil ke publik. */
export async function daftarLembagaPublik(villageId: number) {
  const lembaga = await listLembagaPublik(villageId);
  if (!lembaga.length) return [];
  const [members, docs] = await Promise.all([
    listAnggotaPublik(villageId),
    listDokumenPublikByLembaga(villageId),
  ]);
  return lembaga.map((item) => ({
    ...item,
    anggota: members.filter((member) => member.lembagaId === item.id),
    dokumen: docs.filter((doc) => doc.lembagaId === item.id),
  }));
}

export async function detailPerangkatPemerintahanPublik(villageId: number, perangkatId: number) {
  const [riwayat, dokumen] = await Promise.all([
    listRiwayatPublikByPerangkat(villageId, perangkatId),
    listDokumenPublikByPerangkat(villageId, perangkatId),
  ]);
  return { riwayat, dokumen };
}
