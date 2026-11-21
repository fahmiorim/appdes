import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  hitungPerubahanAset,
  hitungPenyusutanAset,
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
  listInventarisPage,
  listInventarisLocations,
  listInventarisKategori,
  listMutasi,
  inventarisNomorExists,
  listPemeliharaan,
  listRiwayatPemeliharaan,
  createPemeliharaan,
  updateStatusPemeliharaan,
  deletePemeliharaan,
  listDokumenInventaris,
  listRiwayatPenanggungJawab,
  getDokumenInventaris,
  createDokumenInventaris,
  deleteDokumenInventaris,
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
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import { hapusMedia } from "@/features/publik/infrastructure/media-storage";
import { conflict, forbidden, notFound, validationError } from "@/lib/errors";

const INVENTARIS_RESOURCE = RESOURCES.inventaris;
const MUTASI_RESOURCE = RESOURCES.mutasiInventaris;

function namaPengguna(user: { name: string; username: string | null; email: string }) {
  return user.name || user.username || user.email;
}


function denganPenyusutan<T extends {
  hargaSatuan:string|null;jumlah:string;akumulasiPenyusutan?:string|null;
  umurManfaatBulan?:number|null;nilaiResidu?:string|null;tanggalMulaiPenyusutan?:string|null;
}>(rows:T[]) {
  return rows.map(row=>{const p=hitungPenyusutanAset(row);return {...row,akumulasiPenyusutan:p.akumulasiPenyusutan.toFixed(2),nilaiBuku:p.nilaiBuku.toFixed(2),penyusutanBulanan:p.penyusutanBulanan.toFixed(2)};});
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
    rows: denganPenyusutan(data.rows),
    total: data.total,
    canWrite: hasPermission(user.permissions, INVENTARIS_RESOURCE, "update"),
    canManage: hasPermission(user.permissions, INVENTARIS_RESOURCE, "delete"),
  };
}


export async function getInventarisTablePageData(input:{
  search:string;kategoriId?:number;lokasi?:string;kondisi?:string;page:number;pageSize:number;
}) {
  const user=await requirePermission(INVENTARIS_RESOURCE,"read");
  const villageId=await resolveVillageId(user);
  const [kategori,locations,firstPage,summary]=await Promise.all([
    listInventarisKategori(villageId),
    listInventarisLocations(villageId),
    listInventarisPage(villageId,input),
    listInventaris(villageId),
  ]);
  const lastPage=Math.max(1,Math.ceil(firstPage.total/input.pageSize));
  const safePage=Math.min(input.page,lastPage);
  const data=safePage===input.page?firstPage:await listInventarisPage(villageId,{...input,page:safePage});
  return {
    kategori,locations,rows:denganPenyusutan(data.rows),total:data.total,currentPage:safePage,
    summaryRows:denganPenyusutan(summary.rows),
    canWrite:hasPermission(user.permissions,INVENTARIS_RESOURCE,"update"),
    canManage:hasPermission(user.permissions,INVENTARIS_RESOURCE,"delete"),
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
  const rows= denganPenyusutan(data.rows);
  const items: LaporanInventarisItem[] =
    kategoriId != null ? rows.filter((row) => row.kategoriId === kategoriId) : rows;
  return {
    kategori,
    kategoriId: kategoriId ?? null,
    items,
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
  return { neraca: neracaAset(denganPenyusutan(rows)) };
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
    csv: buildInventarisCsv(denganPenyusutan(data.rows), kategoriId ?? null),
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

  // `kategoriId` berasal dari formulir. Composite FK juga menegakkan tenant
  // pada database; validasi di sini menjaga pesan domain konsisten. Pesan untuk
  // kategori yang tidak ada dan milik desa lain sama agar keberadaan baris
  // tenant lain tidak dapat disimpulkan.
  if (input.nomorInventaris && await inventarisNomorExists(villageId,input.nomorInventaris,id)) {
    throw conflict(`Nomor inventaris "${input.nomorInventaris}" sudah digunakan.`);
  }
  const kategoriId = typeof input.kategoriId === "number" ? input.kategoriId : null;
  if (kategoriId !== null && !(await getInventarisKategori(villageId, kategoriId))) {
    throw validationError("Kategori inventaris tidak ditemukan.");
  }

  if (id) {
    const existing = await getInventaris(villageId, id);
    if (!existing) throw notFound("Data inventaris tidak ditemukan.");
    await updateInventaris(villageId, id, input, namaPengguna(user));
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
  const newId = await createInventaris(villageId, input, namaPengguna(user));
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

  const role = user.roleId === null ? null : await findRoleById(user.roleId, user.villageId);
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
  if (mutasi.diajukanOlehId === user.id && !user.permissions.isSuperadmin) {
    throw forbidden("Pengaju mutasi tidak boleh menolak pengajuannya sendiri.");
  }
  if (!catatanPenolakan.trim()) throw conflict("Catatan penolakan wajib diisi.");

  const step = nextMutasiStep(mutasi);
  if (!step) throw conflict("Mutasi sudah selesai diverifikasi.");

  const role = user.roleId === null ? null : await findRoleById(user.roleId, user.villageId);
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

  const role = user.roleId === null ? null : await findRoleById(user.roleId, user.villageId);
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

/** Detail aset dan riwayat mutasi untuk halaman pengelolaan aset. */
export async function getInventarisDetailPageData(id: number) {
  const user = await requirePermission(INVENTARIS_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const [item, kategori, riwayat, dokumen, riwayatPenanggungJawab] = await Promise.all([
    getInventaris(villageId, id),
    listInventarisKategori(villageId),
    listMutasi(villageId, id),
    listDokumenInventaris(villageId, id),
    listRiwayatPenanggungJawab(villageId, id),
  ]);
  if (!item) throw notFound("Data inventaris tidak ditemukan.");
  return {
    item,
    penyusutan:hitungPenyusutanAset(item),
    kategori,
    riwayat,
    dokumen,
    riwayatPenanggungJawab,
    canWrite: hasPermission(user.permissions, INVENTARIS_RESOURCE, "update"),
    canDelete: hasPermission(user.permissions, INVENTARIS_RESOURCE, "delete"),
  };
}

export async function getPemeliharaanPageData() {
  const user=await requirePermission(INVENTARIS_RESOURCE,"read");
  const villageId=await resolveVillageId(user);
  const [inventarisData,pemeliharaan,riwayatPemeliharaan]=await Promise.all([
    listInventaris(villageId),
    listPemeliharaan(villageId),
    listRiwayatPemeliharaan(villageId),
  ]);
  const canReadMutation=hasPermission(user.permissions,MUTASI_RESOURCE,"read");
  const canMutate=hasPermission(user.permissions,MUTASI_RESOURCE,"update");
  const mutasi=canReadMutation?await listMutasi(villageId):[];
  const role = user.roleId === null ? null : await findRoleById(user.roleId, user.villageId);
  const approverSteps = canMutate?MUTASI_STEPS.filter((step) => roleCanApproveMutasiStep(step, role?.slug ?? null, user.permissions.isSuperadmin)):[];
  return {
    mutasi,
    inventaris:inventarisData.rows.map(x=>({id:x.id,namaBarang:x.namaBarang,nomorInventaris:x.nomorInventaris,jumlah:x.jumlah,satuan:x.satuan})),
    pemeliharaan,
    riwayatPemeliharaan,
    canWrite:hasPermission(user.permissions,INVENTARIS_RESOURCE,"update"),
    canMutate,
    canReadMutation,
    approverSteps:approverSteps as MutasiStep[],
  };
}

export async function buatJadwalPemeliharaan(input:{
  inventarisId:number;jenis:string;tanggalRencana:string;biaya:number;pelaksana?:string;deskripsi?:string;
}) {
  const user=await requirePermission(INVENTARIS_RESOURCE,"update");
  const villageId=await resolveVillageId(user);
  const item=await getInventaris(villageId,input.inventarisId);
  if(!item) throw notFound("Aset tidak ditemukan.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.tanggalRencana)||Number.isNaN(Date.parse(input.tanggalRencana))) throw validationError("Tanggal jadwal tidak valid.");
  if(!input.jenis.trim()||input.jenis.length>100||input.biaya<0||!Number.isFinite(input.biaya)) throw validationError("Data pemeliharaan tidak valid.");
  await createPemeliharaan(villageId,{
    inventarisId:input.inventarisId,jenis:input.jenis.trim(),tanggalRencana:input.tanggalRencana,
    biaya:input.biaya.toFixed(2),pelaksana:input.pelaksana?.trim()||null,deskripsi:input.deskripsi?.trim()||null,
  },namaPengguna(user));
}

export async function ubahStatusPemeliharaan(input:{
  id:number;status:"terjadwal"|"dalam_proses"|"selesai"|"dibatalkan";
  jenis?:string;tanggalRencana?:string;biaya?:number;pelaksana?:string;deskripsi?:string;
  tanggalSelesai?:string;hasil?:string;
}) {
  const user=await requirePermission(INVENTARIS_RESOURCE,"update");
  const villageId=await resolveVillageId(user);
  if(input.biaya!==undefined&&(!Number.isFinite(input.biaya)||input.biaya<0)) throw validationError("Biaya pemeliharaan tidak valid.");
  if(input.tanggalRencana){
    const rencana=new Date(input.tanggalRencana+"T00:00:00Z");
    if(Number.isNaN(rencana.getTime())||rencana.toISOString().slice(0,10)!==input.tanggalRencana) throw validationError("Tanggal rencana tidak valid.");
  }
  if(input.status==="selesai"){
    if(!input.tanggalSelesai) throw validationError("Tanggal selesai wajib diisi untuk pemeliharaan yang selesai.");
    const selesai=new Date(input.tanggalSelesai+"T00:00:00Z");
    const rencana=new Date((input.tanggalRencana??"")+"T00:00:00Z");
    if(Number.isNaN(selesai.getTime())||selesai.toISOString().slice(0,10)!==input.tanggalSelesai||selesai<rencana) throw validationError("Tanggal selesai tidak boleh lebih awal dari tanggal rencana.");
    if(!input.hasil?.trim()) throw validationError("Hasil pekerjaan wajib diisi ketika pemeliharaan selesai.");
  }
  await updateStatusPemeliharaan(villageId,input.id,{
    status:input.status,jenis:input.jenis?.trim(),tanggalRencana:input.tanggalRencana,
    biaya:input.biaya?.toFixed(2),pelaksana:input.pelaksana?.trim()||null,
    deskripsi:input.deskripsi?.trim()||null,tanggalSelesai:input.tanggalSelesai||null,hasil:input.hasil?.trim()||null,
  },namaPengguna(user));
}

export async function hapusJadwalPemeliharaan(id:number) {
  const user=await requirePermission(INVENTARIS_RESOURCE,"delete");
  const villageId=await resolveVillageId(user);
  await deletePemeliharaan(villageId,id,namaPengguna(user));
}

export async function unggahDokumenInventaris(input:{
  inventarisId:number;nama:string;namaFile:string;mime:string;ukuran:number;isi:Uint8Array;
}) {
  const user=await requirePermission(INVENTARIS_RESOURCE,"update");
  const villageId=await resolveVillageId(user);
  const asset=await getInventaris(villageId,input.inventarisId);
  if(!asset) throw notFound("Aset tidak ditemukan.");
  if(input.ukuran>8*1024*1024) throw validationError("Ukuran dokumen maksimal 8 MB.");
  if(!["application/pdf","image/jpeg","image/png","image/webp"].includes(input.mime)) throw validationError("Dokumen harus PDF, JPG, PNG, atau WEBP.");
  const jalurMedia=await simpanBerkasMedia(villageId,{nama:input.namaFile,mime:input.mime,ukuran:input.ukuran,isi:input.isi},"inventaris","berkas");
  try {
    await createDokumenInventaris(villageId,input.inventarisId,{
      nama:input.nama.trim(),namaFile:input.namaFile,mime:input.mime,ukuran:input.ukuran,jalurMedia,
    });
  } catch(error) {
    await hapusMedia(jalurMedia).catch(()=>undefined);
    throw error;
  }
}

export async function getDokumenInventarisDownload(id:number) {
  const user=await requirePermission(INVENTARIS_RESOURCE,"read");
  const villageId=await resolveVillageId(user);
  const doc=await getDokumenInventaris(villageId,id);
  if(!doc) throw notFound("Dokumen inventaris tidak ditemukan.");
  return doc;
}

export async function hapusDokumenInventarisUseCase(id:number) {
  const user=await requirePermission(INVENTARIS_RESOURCE,"delete");
  const villageId=await resolveVillageId(user);
  const path=await deleteDokumenInventaris(villageId,id);
  await hapusMedia(path);
}
