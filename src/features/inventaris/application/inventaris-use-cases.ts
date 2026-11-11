import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  hitungPerubahanAset,
  MUTASI_STEP_LABELS,
  MUTASI_STEPS,
  mutasiLogBeforeStep,
  nextMutasiStep,
  roleCanApproveMutasiStep,
  type InventarisInput,
  type InventarisKategoriInput,
  type InventarisMutasiInput,
  type InventarisOption,
  type MutasiStep,
} from "@/features/inventaris/domain/inventaris";
import {
  buildInventarisCsv,
  neracaAset,
  rekapPerKategori,
  type LaporanInventarisItem,
} from "@/features/inventaris/domain/laporan-inventaris";
import {
  countInventarisByKategori,
  createInventaris,
  createInventarisKategori,
  createMutasi,
  deleteInventarisKategori,
  getInventaris,
  getInventarisKategori,
  getMutasi,
  inventarisKategoriKodeExists,
  listInventaris,
  listInventarisKategori,
  listMutasi,
  setujuiMutasiTahap,
  softDeleteInventaris,
  tolakMutasi,
  updateInventaris,
  updateInventarisKategori,
} from "@/features/inventaris/infrastructure/inventaris-repository";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { findRoleById } from "@/features/rbac/infrastructure/rbac-repository";
import { requirePermission } from "@/lib/dal";
import { conflict, forbidden, notFound } from "@/lib/errors";

const INVENTARIS_RESOURCE = RESOURCES.inventaris;
const MUTASI_RESOURCE = RESOURCES.mutasiInventaris;

function namaPengguna(user: { name: string; username: string | null; email: string }) {
  return user.name || user.username || user.email;
}

export async function getInventarisPageData(search: string) {
  const user = await requirePermission(INVENTARIS_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [kategori, data] = await Promise.all([
    listInventarisKategori(villageId),
    listInventaris(villageId, search),
  ]);
  return {
    kategori,
    rows: data.rows,
    total: data.total,
    canWrite: hasPermission(user.permissions, INVENTARIS_RESOURCE, "update"),
    canManage: hasPermission(user.permissions, INVENTARIS_RESOURCE, "delete"),
  };
}

export async function getInventarisKategoriPageData() {
  const user = await requirePermission(INVENTARIS_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const kategori = await listInventarisKategori(villageId);
  return {
    kategori,
    canWrite: hasPermission(user.permissions, INVENTARIS_RESOURCE, "update"),
    canManage: hasPermission(user.permissions, INVENTARIS_RESOURCE, "delete"),
  };
}

/**
 * Laporan inventaris: rekap jumlah unit dan nilai per kategori. Bila
 * `kategoriId` diberikan, hanya aset kategori itu yang direkap. Tenant
 * dibatasi `villageId` dari sesi.
 */
export async function getLaporanInventaris(kategoriId?: number) {
  const user = await requirePermission(INVENTARIS_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [kategori, data] = await Promise.all([
    listInventarisKategori(villageId),
    listInventaris(villageId),
  ]);
  const items: LaporanInventarisItem[] =
    kategoriId != null ? data.rows.filter((row) => row.kategoriId === kategoriId) : data.rows;
  return {
    kategori,
    kategoriId: kategoriId ?? null,
    rekap: rekapPerKategori(items),
  };
}

/**
 * Neraca kekayaan desa: total nilai aset per kategori dipecah menurut kondisi.
 * Tenant dibatasi `villageId` dari sesi.
 */
export async function getNeracaAset() {
  const user = await requirePermission(INVENTARIS_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const { rows } = await listInventaris(villageId);
  return { neraca: neracaAset(rows) };
}

/**
 * Data CSV laporan inventaris untuk route ekspor. Mengembalikan teks CSV dan
 * nama kategori terpilih (untuk nama berkas). Tenant dibatasi sesi.
 */
export async function getLaporanInventarisCsv(kategoriId?: number) {
  const user = await requirePermission(INVENTARIS_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [kategoriList, data] = await Promise.all([
    listInventarisKategori(villageId),
    listInventaris(villageId),
  ]);
  const kategoriNama =
    kategoriId != null ? (kategoriList.find((item) => item.id === kategoriId)?.nama ?? null) : null;
  return {
    csv: buildInventarisCsv(data.rows, kategoriId ?? null),
    kategoriNama,
  };
}

export async function saveInventarisKategori(input: InventarisKategoriInput, id?: number) {
  const user = await requirePermission(INVENTARIS_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  if (await inventarisKategoriKodeExists(villageId, input.kode, id)) {
    throw conflict(`Kode kategori "${input.kode}" sudah dipakai.`);
  }

  if (id) {
    const existing = await getInventarisKategori(villageId, id);
    if (!existing) throw notFound("Kategori inventaris tidak ditemukan.");
    await updateInventarisKategori(villageId, id, input);
    return;
  }
  await createInventarisKategori(villageId, input);
}

export async function hapusInventarisKategori(id: number) {
  const user = await requirePermission(INVENTARIS_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  const kategori = await getInventarisKategori(villageId, id);
  if (!kategori) throw notFound("Kategori inventaris tidak ditemukan.");

  const dipakai = await countInventarisByKategori(villageId, id);
  if (dipakai > 0) {
    throw conflict(
      `Kategori masih dipakai oleh ${dipakai} barang. Pindahkan barang ke kategori lain sebelum menghapus.`,
    );
  }

  await deleteInventarisKategori(villageId, id);
}

export async function saveInventaris(input: InventarisInput, id?: number) {
  const user = await requirePermission(INVENTARIS_RESOURCE, "update");
  const villageId = await resolveVillageId(user);
  if (id) {
    const existing = await getInventaris(villageId, id);
    if (!existing) throw notFound("Data inventaris tidak ditemukan.");
    await updateInventaris(villageId, id, input);
    await recordAuditEvent({
      villageId,
      actorId: user.id,
      event: AUDIT_EVENTS.inventarisSave,
      resource: INVENTARIS_RESOURCE,
      resourceId: String(id),
      details: { aksi: "ubah" },
    });
    return;
  }
  const newId = await createInventaris(villageId, input);
  if (!newId) throw conflict("Gagal menyimpan inventaris");

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.inventarisSave,
    resource: INVENTARIS_RESOURCE,
    resourceId: String(newId),
    details: { aksi: "tambah" },
  });

  return { id: newId };
}

export async function hapusInventaris(id: number) {
  const user = await requirePermission(INVENTARIS_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);
  const item = await getInventaris(villageId, id);
  if (!item) throw notFound("Data inventaris tidak ditemukan");
  await softDeleteInventaris(villageId, id);

  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.inventarisDelete,
    resource: INVENTARIS_RESOURCE,
    resourceId: String(id),
  });
}

export async function ajukanMutasi(input: InventarisMutasiInput) {
  const user = await requirePermission(MUTASI_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const item = await getInventaris(villageId, input.inventarisId);
  if (!item) throw notFound("Data inventaris tidak ditemukan");

  // Validasi aturan mutasi sebelum disimpan. Pemeriksaan yang sama diulang di
  // dalam transaksi tahap akhir untuk menjaga data tetap konsisten.
  hitungPerubahanAset(
    {
      jumlah: item.jumlah,
      hargaSatuan: item.hargaSatuan,
      nilaiAkhir: item.nilaiAkhir,
      kondisi: item.kondisi,
      lokasi: item.lokasi,
      isDeleted: item.isDeleted,
    },
    {
      jenis: input.jenis,
      lokasiBaru: input.lokasiBaru || null,
      kondisiBaru: input.kondisiBaru ?? null,
      jumlahMutasi: input.jumlahMutasi.toFixed(2),
    },
  );

  await createMutasi(villageId, input, { id: user.id, name: namaPengguna(user) });
}

export async function setujuiMutasiData(id: number) {
  const user = await requirePermission(MUTASI_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const mutasi = await getMutasi(villageId, id);
  if (!mutasi) throw notFound("Pengajuan mutasi tidak ditemukan.");
  if (mutasi.status !== "diajukan") throw conflict("Pengajuan mutasi sudah diproses.");

  const step = nextMutasiStep(mutasi);
  if (!step) throw conflict("Mutasi sudah selesai diverifikasi.");

  const role = user.roleId === null ? null : await findRoleById(user.roleId);
  if (!roleCanApproveMutasiStep(step, role?.slug ?? null, user.permissions.isSuperadmin)) {
    throw forbidden(`Tahap ${MUTASI_STEP_LABELS[step]} bukan wewenang role Anda.`);
  }
  if (mutasi.diajukanOlehId === user.id && !user.permissions.isSuperadmin) {
    throw forbidden("Pengaju mutasi tidak boleh menyetujui pengajuannya sendiri.");
  }

  await setujuiMutasiTahap(villageId, id, step, namaPengguna(user));
  return { step, selesai: step === "kades" };
}

export async function tolakMutasiData(id: number, catatanPenolakan: string) {
  const user = await requirePermission(MUTASI_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const mutasi = await getMutasi(villageId, id);
  if (!mutasi) throw notFound("Pengajuan mutasi tidak ditemukan.");
  if (mutasi.status !== "diajukan") throw conflict("Pengajuan mutasi sudah diproses.");
  if (!catatanPenolakan.trim()) throw conflict("Catatan penolakan wajib diisi.");

  const step = nextMutasiStep(mutasi);
  if (!step) throw conflict("Mutasi sudah selesai diverifikasi.");

  const role = user.roleId === null ? null : await findRoleById(user.roleId);
  if (!roleCanApproveMutasiStep(step, role?.slug ?? null, user.permissions.isSuperadmin)) {
    throw forbidden(`Tahap ${MUTASI_STEP_LABELS[step]} bukan wewenang role Anda.`);
  }

  await tolakMutasi(villageId, id, catatanPenolakan.trim(), mutasiLogBeforeStep(step));
}

export async function getMutasiPageData(inventarisId?: number) {
  const user = await requirePermission(MUTASI_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [data, inventarisData] = await Promise.all([
    listMutasi(villageId, inventarisId),
    listInventaris(villageId, ""),
  ]);

  const inventaris: InventarisOption[] = inventarisData.rows.map((item) => ({
    id: item.id,
    namaBarang: item.namaBarang,
    nomorInventaris: item.nomorInventaris,
    jumlah: item.jumlah,
    satuan: item.satuan,
  }));

  const role = user.roleId === null ? null : await findRoleById(user.roleId);
  const approverSteps = MUTASI_STEPS.filter((step) =>
    roleCanApproveMutasiStep(step, role?.slug ?? null, user.permissions.isSuperadmin),
  );

  return {
    rows: data,
    inventaris,
    canWrite: hasPermission(user.permissions, MUTASI_RESOURCE, "update"),
    approverSteps: approverSteps as MutasiStep[],
  };
}
