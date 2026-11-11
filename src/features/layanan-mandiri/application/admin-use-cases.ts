import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { getIdentitasDesa } from "@/features/desa/infrastructure/desa-repository";
import { notifyPermohonanStatusChange } from "@/features/layanan-mandiri/application/notification";
import {
  parseBerkasSyarat,
  type BerkasSyarat,
} from "@/features/layanan-mandiri/domain/layanan-mandiri";
import {
  buildPermohonanCsv,
  namaBerkasPermohonan,
  ringkasPermohonanPerJenis,
  saringPermohonan,
  type FilterPermohonan,
} from "@/features/layanan-mandiri/domain/permohonan-berkas";
import {
  getPermohonan,
  kembalikanPermohonan,
  listPermohonan,
  prosesPermohonan,
  tautkanSuratPermohonan,
} from "@/features/layanan-mandiri/infrastructure/layanan-mandiri-repository";
import { bacaMedia } from "@/features/publik/infrastructure/media-storage";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import {
  ajukanVerifikasiSuratData,
  createSuratDraftData,
} from "@/features/surat/application/surat-use-cases";
import { parseNilaiIsian } from "@/features/surat/domain/isian";
import { requirePermission } from "@/lib/dal";
import { conflict, notFound, validationError } from "@/lib/errors";

/**
 * Daftar permohonan untuk operator (sudah tersaring desa sesi).
 *
 * `canManage` dipakai UI untuk menyembunyikan tombol proses bagi peran yang
 * hanya punya akses `read` (mis. sekdes/kades). Otorisasi sebenarnya tetap
 * ditegakkan di use case mutasi (`requirePermission(..., "update")`).
 */
export async function getPermohonanAdminData(filter: FilterPermohonan = {}) {
  const user = await requirePermission(RESOURCES.permohonanSurat, "read");
  const villageId = await resolveVillageId(user);
  const semua = await listPermohonan(villageId);
  const permohonan = saringPermohonan(semua, filter);

  const jenis = new Map<number, string>();
  for (const row of semua) {
    jenis.set(row.idSurat, row.namaSurat?.trim() || `Jenis #${row.idSurat}`);
  }

  return {
    permohonan,
    rekapJenis: ringkasPermohonanPerJenis(permohonan),
    jenis: [...jenis.entries()]
      .map(([id, nama]) => ({ id, nama }))
      .sort((a, b) => a.nama.localeCompare(b.nama)),
    canManage: hasPermission(user.permissions, RESOURCES.permohonanSurat, "update"),
  };
}

/** Data ekspor CSV rekap permohonan (mengikuti filter yang aktif). */
export async function eksporPermohonanData(filter: FilterPermohonan = {}) {
  const user = await requirePermission(RESOURCES.permohonanSurat, "read");
  const villageId = await resolveVillageId(user);

  const [semua, desa] = await Promise.all([listPermohonan(villageId), getIdentitasDesa(villageId)]);
  const rows = saringPermohonan(semua, filter);

  const labelFilter = [
    filter.dari || filter.sampai
      ? `Tanggal ${filter.dari ?? "awal"} s.d. ${filter.sampai ?? "akhir"}`
      : null,
    filter.typeId !== undefined
      ? `Jenis ${semua.find((row) => row.idSurat === filter.typeId)?.namaSurat ?? filter.typeId}`
      : null,
    filter.status !== undefined ? `Status ${filter.status}` : null,
  ]
    .filter((item): item is string => item !== null)
    .join(" · ");

  return {
    csv: buildPermohonanCsv({ namaDesa: desa?.namaDesa ?? null, rows, filter: labelFilter }),
    filename: namaBerkasPermohonan(desa?.namaDesa ?? null),
  };
}

/** Isi berkas syarat milik permohonan, untuk route unduhan operator. */
export async function bacaBerkasSyaratAdmin(
  permohonanId: number,
  syaratId: number,
): Promise<{ isi: Buffer; mime: string; namaAsli: string }> {
  const berkas = await getBerkasSyaratAdminData(permohonanId, syaratId);
  const isi = await bacaMedia(berkas.berkas);
  return { isi, mime: berkas.mime, namaAsli: berkas.namaAsli };
}

/** Berkas syarat milik permohonan, untuk route unduhan operator. */
export async function getBerkasSyaratAdminData(
  permohonanId: number,
  syaratId: number,
): Promise<BerkasSyarat> {
  const user = await requirePermission(RESOURCES.permohonanSurat, "read");
  const villageId = await resolveVillageId(user);
  const permohonan = await getPermohonan(villageId, permohonanId);

  if (!permohonan) throw notFound("Permohonan tidak ditemukan.");
  const item = parseBerkasSyarat(permohonan.syarat).find((row) => row.id === syaratId);
  if (!item) throw notFound("Berkas syarat tidak ditemukan.");
  return item;
}

/**
 * Buat konsep surat dari permohonan, hubungkan, lalu ajukan verifikasi.
 *
 * Surat tetap melewati alur verifikasi operator → sekdes → kades yang sudah
 * ada. Permohonan berstatus 2 selama surat menunggu verifikasi, lalu berubah
 * menjadi 3 saat Kades menerbitkan (lihat sinkronisasi di use case persuratan).
 */
export async function buatKonsepSuratPermohonanData(permohonanId: number): Promise<{ id: number }> {
  const user = await requirePermission(RESOURCES.permohonanSurat, "update");
  const villageId = await resolveVillageId(user);
  const permohonan = await getPermohonan(villageId, permohonanId);

  if (!permohonan) throw notFound("Permohonan tidak ditemukan.");
  if (permohonan.status !== 1) {
    throw conflict("Konsep surat hanya dapat dibuat saat permohonan sedang diperiksa.");
  }
  if (permohonan.letterId !== null) {
    throw conflict("Permohonan ini sudah memiliki surat.");
  }

  const isiSurat = parseNilaiIsian(permohonan.isianForm);
  const purpose =
    permohonan.keterangan?.trim() ||
    `Permohonan surat ${permohonan.noAntrian ?? `#${permohonan.id}`}`;

  const surat = await createSuratDraftData({
    typeId: permohonan.letterTypeId,
    residentId: permohonan.residentId,
    letterDate: new Date().toISOString().slice(0, 10),
    purpose: purpose.slice(0, 255),
    isiSurat,
  });

  await tautkanSuratPermohonan(villageId, permohonan.id, surat.id);
  // Jalur permohonan tidak butuh konfirmasi syarat ulang: warga sudah wajib
  // mengunggah semua berkas syarat sebelum permohonan bisa diperiksa.
  await ajukanVerifikasiSuratData(surat.id, true);

  return surat;
}

/** Ubah status permohonan dengan validasi transisi di domain/repository. */
export async function ubahStatusPermohonanData(
  id: number,
  status: number,
  alasan = "",
): Promise<void> {
  const user = await requirePermission(RESOURCES.permohonanSurat, "update");
  const villageId = await resolveVillageId(user);

  if ((status === 0 || status === 5) && alasan.trim() === "") {
    throw validationError("Alasan wajib diisi saat mengembalikan atau membatalkan permohonan.");
  }

  const sebelum = await getPermohonan(villageId, id);
  if (!sebelum) throw notFound("Permohonan tidak ditemukan.");

  await prosesPermohonan(villageId, id, status, alasan.trim() || undefined);

  if (sebelum.status !== status) {
    await notifyPermohonanStatusChange({
      villageId,
      residentId: sebelum.residentId,
      noAntrian: sebelum.noAntrian,
      statusLama: sebelum.status,
      statusBaru: status,
      alasan: alasan.trim() || null,
      noHpAktif: sebelum.noHpAktif,
    });
  }
}

/** Kembalikan permohonan ke status 0 dengan alasan. */
export async function kembalikanPermohonanAdminData(id: number, alasan: string): Promise<void> {
  const user = await requirePermission(RESOURCES.permohonanSurat, "update");
  const villageId = await resolveVillageId(user);

  if (alasan.trim() === "") {
    throw validationError("Alasan wajib diisi.");
  }

  const sebelum = await getPermohonan(villageId, id);
  if (!sebelum) throw notFound("Permohonan tidak ditemukan.");

  await kembalikanPermohonan(villageId, id, alasan.trim());
  await notifyPermohonanStatusChange({
    villageId,
    residentId: sebelum.residentId,
    noAntrian: sebelum.noAntrian,
    statusLama: sebelum.status,
    statusBaru: 0,
    alasan: alasan.trim(),
    noHpAktif: sebelum.noHpAktif,
  });
}
