import "server-only";

import {
  BANTUAN_PESERTA_RESOURCE,
  BANTUAN_RESOURCE,
  buildProgramSlug,
  pesertaFormSchema,
  SASARAN_KELOMPOK,
  SASARAN_KELUARGA,
  SASARAN_PENDUDUK,
  SASARAN_RUMAH_TANGGA,
  type BantuanDetail,
  type BantuanDTO,
  type BantuanFormInput,
  type PesertaBantuanRow,
  type PesertaFormInput,
  type PesertaReferenceData,
  type SasaranOption,
} from "@/features/bantuan/domain/bantuan";
import {
  normalisasiKode,
  rencanaImporPeserta,
  type BarisImporPeserta,
} from "@/features/bantuan/domain/impor-peserta";
import {
  bantuanSlugExists,
  countPesertaByProgram,
  deleteAllPesertaByProgram,
  deleteBantuan as deleteBantuanRow,
  deletePeserta as deletePesertaRow,
  findAlamatSasaran,
  findBantuanById,
  findKelompokSasaran,
  findPendudukSasaran,
  insertBantuan,
  insertPeserta,
  listBantuanDiterimaWarga,
  listBantuan as listBantuanRows,
  listKelompokSasaran,
  listKeluargaSasaran,
  listPendudukSasaran,
  listPesertaProgram,
  listPesertaSasaranIds,
  listRumahTanggaSasaran,
  listSasaranImpor,
  listSebaranWilayah,
  updateBantuan as updateBantuanRow,
  updatePeserta as updatePesertaRow,
  type BantuanListResult,
} from "@/features/bantuan/infrastructure/bantuan-repository";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { hasPermission } from "@/features/rbac/application/authorization";
import { formatWilayahLabel } from "@/features/wilayah/domain/wilayah";
import { requirePermission, requireUser, requireWargaAktif } from "@/lib/dal";
import { conflict, notFound, validationError } from "@/lib/errors";

/**
 * Lapisan aplikasi (use case) untuk bantuan sosial.
 *
 * Setiap use case menegakkan izinnya sendiri lewat `requirePermission`, sehingga
 * pemanggil mana pun (Server Action, Route Handler, skrip) ikut terlindungi.
 * Aturan yang bersifat lintas-data — slug unik, larangan menghapus program yang
 * masih berpeserta, dan kesesuaian sasaran dengan kandidat — ditegakkan di sini.
 */

export interface ListBantuanParams {
  search: string;
  page: number;
  pageSize: number;
}

export async function listBantuan(params: ListBantuanParams): Promise<BantuanListResult> {
  const user = await requirePermission(BANTUAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  return listBantuanRows({ villageId, ...params });
}

/** Penerimaan yang tercatat untuk warga aktif; identitas selalu dari sesi. */
export async function getBantuanDiterimaWargaData(): Promise<BantuanDTO[]> {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  return listBantuanDiterimaWarga(villageId, user.residentId);
}

/**
 * Slug program yang bebas.
 *
 * Slug dibentuk dari nama, lalu diberi akhiran angka bila sudah dipakai program
 * lain di desa yang sama. Indeks unik `(village_id, slug)` tetap menjadi
 * pengaman terakhir.
 */
async function slugBebas(
  villageId: number,
  nama: string,
  excludeId: number | null,
): Promise<string> {
  const dasar = buildProgramSlug(nama);

  for (let langkah = 0; langkah < 200; langkah += 1) {
    const kandidat = langkah === 0 ? dasar : `${dasar}-${langkah + 1}`;
    if (!(await bantuanSlugExists(villageId, kandidat, excludeId))) {
      return kandidat;
    }
  }

  throw conflict("Tidak dapat membentuk slug program yang unik.");
}

/** Program yang berada di desa pengguna, atau gagal bila tidak ada. */
async function getScopedProgram(villageId: number, id: number): Promise<BantuanDTO> {
  const program = await findBantuanById(villageId, id);
  if (!program) throw notFound("Program bantuan tidak ditemukan.");
  return program;
}

export async function createBantuan(input: BantuanFormInput): Promise<{ id: number }> {
  const user = await requirePermission(BANTUAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const slug = await slugBebas(villageId, input.nama, null);
  const id = await insertBantuan(villageId, slug, input);
  return { id };
}

export async function updateBantuan(id: number, input: BantuanFormInput): Promise<void> {
  const user = await requirePermission(BANTUAN_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  await getScopedProgram(villageId, id);

  const slug = await slugBebas(villageId, input.nama, id);
  await updateBantuanRow(villageId, id, slug, input);
}

/**
 * Hapus program.
 *
 * Program yang masih punya peserta **tidak boleh** dihapus agar riwayat
 * penerimaan tidak hilang tanpa jejak; kosongkan pesertanya terlebih dahulu.
 */
export async function deleteBantuan(id: number): Promise<void> {
  const user = await requirePermission(BANTUAN_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  await getScopedProgram(villageId, id);

  const peserta = await countPesertaByProgram(villageId, id);
  if (peserta > 0) {
    throw conflict(
      `Program tidak dapat dihapus karena masih memiliki ${peserta} peserta. Kosongkan peserta terlebih dahulu.`,
    );
  }

  await deleteBantuanRow(villageId, id);
}

/**
 * Data pendukung halaman rincian program.
 *
 * Kandidat sasaran hanya dimuat bila pengguna berhak mengubah data — sekaligus
 * menghemat dua query untuk pengguna baca-saja.
 */
export async function getBantuanDetail(programId: number): Promise<BantuanDetail> {
  const user = await requirePermission(BANTUAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const program = await getScopedProgram(villageId, programId);
  const canManage = await punyaIzinUbah();

  const [peserta, sebaran, reference] = await Promise.all([
    listPesertaProgram(villageId, program),
    listSebaranWilayah(villageId, program),
    canManage ? getReferenceKandidat(villageId, program) : Promise.resolve(emptyReference()),
  ]);

  return { program, peserta, reference, sebaranWilayah: sebaran, canManage };
}

/** Apakah pengguna berhak mengubah data peserta. */
async function punyaIzinUbah(): Promise<boolean> {
  const user = await requireUser();
  return (
    hasPermission(user.permissions, BANTUAN_PESERTA_RESOURCE, "update") &&
    hasPermission(user.permissions, BANTUAN_RESOURCE, "update")
  );
}

function emptyReference(): PesertaReferenceData {
  return { penduduk: [], keluarga: [], rumahTangga: [], kelompok: [] };
}

/** Kandidat sasaran yang belum menjadi peserta program. */
async function getReferenceKandidat(
  villageId: number,
  program: BantuanDTO,
): Promise<PesertaReferenceData> {
  const reference = emptyReference();

  if (program.sasaran === SASARAN_KELUARGA) {
    reference.keluarga = await listKeluargaSasaran(villageId, program.id);
  } else if (program.sasaran === SASARAN_RUMAH_TANGGA) {
    reference.rumahTangga = await listRumahTanggaSasaran(villageId, program.id);
  } else if (program.sasaran === SASARAN_KELOMPOK) {
    reference.kelompok = await listKelompokSasaran(villageId, program.id);
  } else if (program.sasaran === SASARAN_PENDUDUK) {
    reference.penduduk = await listPendudukSasaran(villageId, program.id);
  }

  return reference;
}

/** Peserta sebuah program (dimuat ulang oleh UI setelah perubahan). */
export async function listPesertaBantuan(programId: number): Promise<PesertaBantuanRow[]> {
  const user = await requirePermission(BANTUAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const program = await getScopedProgram(villageId, programId);
  return listPesertaProgram(villageId, program);
}

/** Kandidat sasaran terbaru untuk program (dipakai setelah peserta ditambah). */
export async function getPesertaReference(programId: number): Promise<PesertaReferenceData> {
  const user = await requirePermission(BANTUAN_PESERTA_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const program = await getScopedProgram(villageId, programId);
  return getReferenceKandidat(villageId, program);
}

/**
 * Tambahkan seorang peserta ke program.
 *
 * Sasaran yang dipilih divalidasi terhadap **kandidat yang tersedia** untuk
 * program tersebut, sehingga tidak mungkin menautkan sasaran desa lain atau
 * sasaran yang sudah menjadi peserta. Data kartu yang dibiarkan kosong diisi
 * dari data master sebagai nilai awal.
 */
export async function addPeserta(
  programId: number,
  input: PesertaFormInput,
): Promise<{ id: number }> {
  const user = await requirePermission(BANTUAN_PESERTA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const program = await getScopedProgram(villageId, programId);

  if (input.programId !== null && input.programId !== programId) {
    throw validationError("Program peserta tidak sesuai.");
  }

  const sasaranId = input.sasaranId;
  if (sasaranId === null) {
    throw validationError("Pilih sasaran peserta terlebih dahulu.", {
      sasaranId: ["Pilih sasaran peserta terlebih dahulu."],
    });
  }

  const reference = await getReferenceKandidat(villageId, program);
  const kandidat = pilihKandidat(reference, program.sasaran);
  if (!kandidat.some((option) => option.id === sasaranId)) {
    throw validationError("Sasaran yang dipilih tidak tersedia untuk program ini.", {
      sasaranId: ["Sasaran yang dipilih tidak tersedia untuk program ini."],
    });
  }

  const lengkap = await lengkapiKartu(villageId, program.sasaran, sasaranId, input);
  await insertPeserta(villageId, programId, program.sasaran, sasaranId, lengkap);

  return { id: sasaranId };
}

function pilihKandidat(reference: PesertaReferenceData, sasaran: number): SasaranOption[] {
  if (sasaran === SASARAN_KELUARGA) return reference.keluarga;
  if (sasaran === SASARAN_RUMAH_TANGGA) return reference.rumahTangga;
  if (sasaran === SASARAN_KELOMPOK) return reference.kelompok;
  return reference.penduduk;
}

/**
 * Isi snapshot kartu dari data master bila pengguna mengosongkannya.
 *
 * Untuk sasaran penduduk, NIK/nama/tempat/tanggal lahir/alamat diambil dari
 * baris penduduk. Untuk keluarga & rumah tangga hanya alamat yang tersedia di
 * master, sisanya dibiarkan kosong agar tidak salah mengisi identitas orang.
 */
async function lengkapiKartu(
  villageId: number,
  sasaran: number,
  sasaranId: number,
  input: PesertaFormInput,
): Promise<PesertaFormInput> {
  const lengkap: PesertaFormInput = { ...input };

  if (sasaran === SASARAN_PENDUDUK) {
    const penduduk = await findPendudukSasaran(villageId, sasaranId);
    if (penduduk) {
      lengkap.kartuNik ??= penduduk.nationalId;
      lengkap.kartuNama ||= penduduk.name;
      lengkap.kartuTempatLahir ||= penduduk.birthPlace ?? "";
      lengkap.kartuTanggalLahir ??= penduduk.birthDate;
      if (!lengkap.kartuAlamat) {
        lengkap.kartuAlamat = penduduk.address || wilayahLabel(penduduk);
      }
    }
  } else if (sasaran === SASARAN_KELOMPOK) {
    const target = await findKelompokSasaran(villageId, sasaranId);
    if (target) {
      lengkap.kartuNama ||= target.name;
      lengkap.nomorKartu ||= target.decreeNumber ?? target.code ?? "";
    }
  } else if (sasaran === SASARAN_KELUARGA || sasaran === SASARAN_RUMAH_TANGGA) {
    if (!lengkap.kartuAlamat) {
      const alamat = await findAlamatSasaran(
        villageId,
        sasaran === SASARAN_KELUARGA ? "keluarga" : "rumah-tangga",
        sasaranId,
      );
      if (alamat) lengkap.kartuAlamat = alamat;
    }
  }

  return lengkap;
}

/** Label wilayah penduduk, atau string kosong bila wilayahnya belum diisi. */
function wilayahLabel(wilayah: {
  dusun: string | null;
  rw: string | null;
  rt: string | null;
}): string {
  if (!wilayah.dusun && !wilayah.rw && !wilayah.rt) return "";
  return formatWilayahLabel({
    dusun: wilayah.dusun ?? "",
    rw: wilayah.rw ?? "",
    rt: wilayah.rt ?? "",
  });
}

/** Keluarkan seorang peserta dari program. */
export async function removePeserta(programId: number, pesertaId: number): Promise<void> {
  const user = await requirePermission(BANTUAN_PESERTA_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  await getScopedProgram(villageId, programId);
  await deletePesertaRow(villageId, programId, pesertaId);
}

/**
 * Perbarui snapshot kartu seorang peserta.
 *
 * Hanya kolom `card_*` yang boleh diubah; kolom sasaran (penduduk/keluarga/
 * rumah tangga/kelompok) tidak berubah — ganti peserta berarti keluarkan dulu.
 */
export async function updatePeserta(
  programId: number,
  pesertaId: number,
  input: Partial<PesertaFormInput>,
): Promise<void> {
  const user = await requirePermission(BANTUAN_PESERTA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  await getScopedProgram(villageId, programId);
  const updated = await updatePesertaRow(villageId, programId, pesertaId, input);
  if (!updated) throw notFound("Peserta tidak ditemukan.");
}

/** Hapus semua peserta sebuah program (pembersihan massal). */
export async function deleteAllPeserta(programId: number): Promise<number> {
  const user = await requirePermission(BANTUAN_PESERTA_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  await getScopedProgram(villageId, programId);
  return deleteAllPesertaByProgram(villageId, programId);
}

/** Jenis sasaran sebuah program (dipakai untuk memilih kolom template impor). */
export async function getSasaranProgram(programId: number): Promise<number> {
  const user = await requirePermission(BANTUAN_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  return (await getScopedProgram(villageId, programId)).sasaran;
}

/** Ringkasan hasil impor peserta untuk umpan balik ke pengguna. */
export interface ImporPesertaResult {
  diimpor: number;
  sudahTerdaftar: number;
  ganda: number;
  ditolak: number;
  tidakDitemukan: string[];
}

/**
 * Impor peserta ke sebuah program dari baris berkas.
 *
 * Setiap baris dicocokkan dengan sasaran desa menurut kode identitasnya
 * (NIK / No. KK / No. RTM / kode kelompok). Baris yang tidak dikenal atau sudah
 * terdaftar dilaporkan tanpa menggagalkan baris lain, dan snapshot kartu diisi
 * dari data master seperti penambahan peserta manual.
 */
export async function imporPesertaBantuan(
  programId: number,
  rows: readonly BarisImporPeserta[],
): Promise<ImporPesertaResult> {
  const user = await requirePermission(BANTUAN_PESERTA_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const program = await getScopedProgram(villageId, programId);
  const [sasaran, terdaftar] = await Promise.all([
    listSasaranImpor(villageId, program.sasaran),
    listPesertaSasaranIds(villageId, programId, program.sasaran),
  ]);

  const rencana = rencanaImporPeserta(rows, sasaran, new Set(terdaftar));

  let diimpor = 0;
  for (const item of rencana.siap) {
    // Dilewatkan skema yang sama dengan formulir agar nilai kosong dinormalisasi
    // (mis. tanggal kosong → null) sebelum snapshot kartu dilengkapi.
    const input = pesertaFormSchema.parse({
      programId: String(programId),
      sasaranId: String(item.id),
      nomorKartu: item.nomorKartu,
      kartuNik: "",
      kartuNama: item.namaKartu,
      kartuTempatLahir: "",
      kartuTanggalLahir: "",
      kartuAlamat: "",
    });

    const lengkap = await lengkapiKartu(villageId, program.sasaran, item.id, input);
    await insertPeserta(villageId, programId, program.sasaran, item.id, lengkap);
    diimpor += 1;
  }

  return {
    diimpor,
    sudahTerdaftar: rencana.sudahTerdaftar.length,
    ganda: rencana.ditolak.length,
    ditolak: rencana.ditolak.length,
    tidakDitemukan: rencana.tidakDitemukan,
  };
}

/** Kode sasaran pada berkas yang sudah dinormalisasi (dipakai test/UI). */
export { normalisasiKode };
