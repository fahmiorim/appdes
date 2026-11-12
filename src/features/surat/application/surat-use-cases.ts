import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  getIdentitasDesa,
  type IdentitasDesa,
} from "@/features/desa/infrastructure/desa-repository";
import { notifyPermohonanStatusChange } from "@/features/layanan-mandiri/application/notification";
import {
  findPermohonanByLetterId,
  sinkronStatusSuratPermohonan,
} from "@/features/layanan-mandiri/infrastructure/layanan-mandiri-repository";
import { calculateAge, GENDER_LABELS } from "@/features/penduduk/domain/penduduk";
import {
  getPendudukSuratData,
  listAnggotaKeluargaSurat,
  listPendudukOptions,
  listPendudukSuratByIds,
  type AnggotaKeluargaSuratRow,
  type PendudukSuratData,
} from "@/features/penduduk/infrastructure/penduduk-repository";
import { bacaMedia } from "@/features/publik/infrastructure/media-storage";
import { findRoleById } from "@/features/rbac/infrastructure/rbac-repository";
import {
  getKonfigurasiTteEfektif,
  simpanBerkasTte,
  tandatanganiPdfTte,
} from "@/features/surat/application/tte-use-cases";
import {
  ARSIP_MAKS_EKSPOR,
  buildArsipNomorCsv,
  namaBerkasArsipNomor,
} from "@/features/surat/domain/arsip-nomor";
import {
  buildIsianValues,
  isianErrorsToFieldErrors,
  parseIsianFields,
  parseNilaiIsian,
  parseSyaratIds,
  serializeNilaiIsian,
  validateIsianValues,
  type IsianField,
} from "@/features/surat/domain/isian";
import {
  buildPengikutPlaceholders,
  KUNCI_ISIAN_LUAR,
  KUNCI_ISIAN_PENGIKUT,
  parsePendudukLuar,
  parsePengikutIds,
  serializePendudukLuar,
  serializePengikutIds,
  type PendudukLuarSurat,
} from "@/features/surat/domain/pengikut";
import { normalizePenomoranMode, type PenomoranSuratMode } from "@/features/surat/domain/penomoran";
import {
  addMonthsIso,
  buildKlgPlaceholders,
  buildSuratNumber,
  butuhKonfirmasiSyarat,
  canVerifyStep,
  DEFAULT_NUMBER_FORMAT,
  formatTanggalIndonesia,
  generateVerificationToken,
  nextVerificationStep,
  renderSuratTemplate,
  roleCanVerifyStep,
  SURAT_MAKS_PER_HALAMAN,
  SURAT_PER_HALAMAN,
  SURAT_RESOURCE,
  VERIFICATION_STEP_LABELS,
  type AnggotaKeluargaSurat,
  type JenisSuratDTO,
  type LetterStatus,
  type SuratDetail,
  type SuratInput,
  type VerificationStep,
} from "@/features/surat/domain/surat";
import { isiTerbilangDanHitung, terbilangIsi } from "@/features/surat/domain/terbilang";
import { buildVerificationUrl, validateVerification } from "@/features/surat/domain/verifikasi";
import {
  getJenisSurat,
  listJenisSurat,
  listKlasifikasi,
  listSyaratSurat,
} from "@/features/surat/infrastructure/master-repository";
import { buildSuratPdf } from "@/features/surat/infrastructure/surat-pdf";
import {
  createSuratDraft,
  deleteSurat,
  getSurat,
  issueSuratRecord,
  listLetterNumberArchive,
  listSurat,
  nextSuratSequence,
  nextSuratSequenceByKlasifikasi,
  nextSuratSequenceCombined,
  nextSuratSequenceGlobal,
  recapSuratByStatus,
  rejectSurat,
  setSuratTte,
  suratNumberExists,
  suratNumberExistsWithAgenda,
  updateSuratDraft,
  updateSuratVerification,
} from "@/features/surat/infrastructure/surat-repository";
import { requirePermission, requireWargaAktif } from "@/lib/dal";
import { conflict, forbidden, notFound, validationError } from "@/lib/errors";
import { getRequestOrigin } from "@/lib/request-origin";

export interface SuratPrintData {
  surat: SuratDetail;
  jenis: JenisSuratDTO;
  desa: IdentitasDesa;
  penduduk: PendudukSuratData | null;
  content: string;
  /** Varian cetak efektif (dari URL atau pengaturan jenis surat). */
  varian: string;
  /** JSON konfigurasi layout (opsional). */
  layoutConfig?: string | null;
}

function text(value: string | null | undefined): string {
  return value && value.trim() !== "" ? value : "-";
}

function toAnggotaKeluarga(rows: readonly AnggotaKeluargaSuratRow[]): AnggotaKeluargaSurat[] {
  return rows.map((row) => ({
    nik: row.nationalId,
    nama: row.name,
    jenisKelamin: GENDER_LABELS[row.gender],
    tempatLahir: row.birthPlace,
    tanggalLahir: formatTanggalIndonesia(row.birthDate),
    usia: String(calculateAge(row.birthDate) ?? "-"),
    agama: row.religionName,
    pendidikan: row.educationName,
    pendidikanSedang: row.educationSedangName,
    pekerjaan: row.occupationName,
    statusKawin: row.maritalStatusName,
    hubunganKk: row.familyRelationName,
    kewarganegaraan: row.citizenshipName,
    golonganDarah: row.bloodTypeName,
    alamat: row.address,
    namaAyah: row.fatherName,
    namaIbu: row.motherName,
    nikAyah: row.fatherNationalId,
    nikIbu: row.motherNationalId,
  }));
}

async function loadAnggotaKeluarga(
  villageId: number,
  penduduk: PendudukSuratData | null,
): Promise<AnggotaKeluargaSurat[]> {
  if (!penduduk?.familyId) return [];
  const rows = await listAnggotaKeluargaSurat(villageId, penduduk.familyId);
  return toAnggotaKeluarga(rows);
}

function buildValues(
  surat: SuratDetail,
  jenis: JenisSuratDTO,
  desa: IdentitasDesa,
  penduduk: PendudukSuratData | null,
  anggotaKeluarga: readonly AnggotaKeluargaSurat[],
  pengikutSurat: { pengikut: readonly AnggotaKeluargaSurat[]; luar: readonly PendudukLuarSurat[] },
  number: string,
): Record<string, string> {
  const effectiveLetterDate = surat.letterDate ?? "-";
  const berlakuSampai = addMonthsIso(effectiveLetterDate, jenis.validityMonths);

  return {
    // Nilai isian dinamis ditempatkan lebih dulu; placeholder bawaan menang bila kodenya sama.
    ...parseNilaiIsian(surat.nilaiIsian),
    nama_desa: text(desa.namaDesa),
    kode_desa: text(desa.kodeDesa),
    nama_kecamatan: text(desa.namaKecamatan),
    nama_kabupaten: text(desa.namaKabupaten),
    nama_propinsi: text(desa.namaPropinsi),
    alamat_kantor: text(desa.alamatKantor),
    telepon_desa: text(desa.telepon),
    email_desa: text(desa.emailDesa),
    nama: text(penduduk?.name),
    nik: text(penduduk?.nationalId),
    tempat_lahir: text(penduduk?.birthPlace),
    tanggal_lahir: formatTanggalIndonesia(penduduk?.birthDate),
    jenis_kelamin: penduduk ? GENDER_LABELS[penduduk.gender] : "-",
    agama: text(penduduk?.religionName),
    pekerjaan: text(penduduk?.occupationName),
    alamat: text(penduduk?.address),
    no_kk: text(penduduk?.familyNumber),
    nomor_surat: number,
    format_nomor_surat: number,
    tanggal_surat: formatTanggalIndonesia(effectiveLetterDate),
    keperluan: text(surat.purpose ?? "-"),
    berlaku_sampai: formatTanggalIndonesia(berlakuSampai),
    ...buildKlgPlaceholders(anggotaKeluarga),
    // Tambahkan data pengikut surat dan penduduk luar.
    ...buildPengikutPlaceholders(pengikutSurat.pengikut, pengikutSurat.luar),
    // Tambahkan padanan kata untuk isian angka.
    ...terbilangIsi(parseNilaiIsian(surat.nilaiIsian)),
  };
}

async function loadJenis(villageId: number, typeId: number): Promise<JenisSuratDTO> {
  const jenis = await getJenisSurat(villageId, typeId);
  if (!jenis) throw conflict("Jenis surat tidak ditemukan.");
  if (!jenis.isActive) throw conflict("Jenis surat sedang tidak aktif.");
  return jenis;
}

async function ensureResident(
  villageId: number,
  jenis: JenisSuratDTO,
  residentId: number | null,
): Promise<void> {
  if (residentId === null) {
    if (jenis.requiresResident) throw conflict("Penduduk wajib dipilih untuk jenis surat ini.");
    return;
  }

  const penduduk = await getPendudukSuratData(villageId, residentId);
  if (!penduduk) throw conflict("Penduduk yang dipilih tidak ditemukan pada desa ini.");
}

export async function listSuratWithMeta(params: {
  search: string;
  status: LetterStatus | null;
  page?: number;
  pageSize?: number;
}) {
  const user = await requirePermission(SURAT_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const page = params.page && params.page > 0 ? Math.trunc(params.page) : 1;
  const pageSize = Math.min(
    SURAT_MAKS_PER_HALAMAN,
    Math.max(1, Math.trunc(params.pageSize ?? SURAT_PER_HALAMAN)),
  );

  const [result, jenis, penduduk, recap, syarat] = await Promise.all([
    listSurat({ villageId, search: params.search, status: params.status, page, pageSize }),
    listJenisSurat(villageId),
    listPendudukOptions(villageId),
    recapSuratByStatus(villageId),
    listSyaratSurat(villageId),
  ]);

  return { ...result, jenis: jenis.filter((item) => item.isActive), penduduk, recap, syarat };
}

export interface ArsipNomorFilter {
  search: string;
  year?: number;
  typeId?: number;
  classificationId?: number;
  page?: number;
}

function bersihkanFilterArsip(params: ArsipNomorFilter): {
  q: string;
  year?: number;
  typeId?: number;
  classificationId?: number;
  page: number;
} {
  const idPositif = (value: number | undefined) =>
    value !== undefined && Number.isInteger(value) && value > 0 ? value : undefined;

  return {
    q: params.search.trim().slice(0, 100),
    year:
      params.year !== undefined &&
      Number.isInteger(params.year) &&
      params.year >= 1900 &&
      params.year <= 9999
        ? params.year
        : undefined,
    typeId: idPositif(params.typeId),
    classificationId: idPositif(params.classificationId),
    page:
      params.page !== undefined && Number.isInteger(params.page) && params.page > 0
        ? params.page
        : 1,
  };
}

export async function listArsipNomorSuratData(params: ArsipNomorFilter) {
  const user = await requirePermission(SURAT_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const filter = bersihkanFilterArsip(params);

  const [result, jenis, klasifikasi] = await Promise.all([
    listLetterNumberArchive(villageId, filter),
    listJenisSurat(villageId),
    listKlasifikasi(villageId),
  ]);

  return { ...result, jenis, klasifikasi };
}

/** Data ekspor CSV arsip nomor (mengikuti filter yang aktif). */
export async function eksporArsipNomorSuratData(params: ArsipNomorFilter) {
  const user = await requirePermission(SURAT_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  const filter = bersihkanFilterArsip(params);

  const [result, desa, jenis, klasifikasi] = await Promise.all([
    listLetterNumberArchive(villageId, { ...filter, page: 1, pageSize: ARSIP_MAKS_EKSPOR }),
    getIdentitasDesa(villageId),
    listJenisSurat(villageId),
    listKlasifikasi(villageId),
  ]);

  const labelFilter = [
    filter.year !== undefined ? `Tahun ${filter.year}` : null,
    filter.typeId !== undefined
      ? `Jenis ${jenis.find((item) => item.id === filter.typeId)?.name ?? filter.typeId}`
      : null,
    filter.classificationId !== undefined
      ? `Klasifikasi ${
          klasifikasi.find((item) => item.id === filter.classificationId)?.code ??
          filter.classificationId
        }`
      : null,
  ]
    .filter((item): item is string => item !== null)
    .join(" · ");

  return {
    csv: buildArsipNomorCsv({
      namaDesa: desa?.namaDesa ?? null,
      rows: result.rows,
      filter: labelFilter,
    }),
    filename: namaBerkasArsipNomor(desa?.namaDesa ?? null),
  };
}

export async function getSuratFormOptions() {
  const user = await requirePermission(SURAT_RESOURCE, "read");
  const villageId = await resolveVillageId(user);

  const [jenis, penduduk] = await Promise.all([
    listJenisSurat(villageId),
    listPendudukOptions(villageId),
  ]);

  return { jenis: jenis.filter((item) => item.isActive), penduduk };
}

/**
 * Hitung nilai isian dari formulir dan periksa isian wajib.
 *
 * Nilai disimpan sebagai JSON map `kode isian → nilai`; isian yang tidak
 * diisi tidak ikut disimpan agar surat tetap ringkas.
 */
function resolveIsianValues(
  jenis: JenisSuratDTO,
  raw: Readonly<Record<string, string>>,
): { fields: IsianField[]; values: Record<string, string> } {
  const fields = parseIsianFields(jenis.formIsian);
  const values = buildIsianValues(fields, raw);
  const errors = validateIsianValues(fields, values);

  if (Object.keys(errors).length > 0) {
    throw validationError(
      "Lengkapi isian surat yang wajib diisi.",
      isianErrorsToFieldErrors(errors),
    );
  }

  return { fields, values };
}

/**
 * Gabungkan nilai tersembunyi pengikut & penduduk luar ke peta isian.
 *
 * Disimpan sebagai kunci `__pengikut`/`__luar` (lihat domain/pengikut.ts);
 * hanya diisi bila datanya tidak kosong agar JSON tetap ringkas.
 */
function denganPengikut(
  values: Record<string, string>,
  pengikut: readonly number[],
  luar: readonly PendudukLuarSurat[],
): Record<string, string> {
  const hasil = { ...values };
  const csv = serializePengikutIds(pengikut);
  if (csv !== "") hasil[KUNCI_ISIAN_PENGIKUT] = csv;
  if (luar.length > 0) hasil[KUNCI_ISIAN_LUAR] = serializePendudukLuar(luar);
  return hasil;
}

/**
 * Baca data pengikut surat & penduduk luar dari nilai isian tersimpan.
 *
 * Pengikut berupa id penduduk yang dimuat ulang dari database warga terkait;
 * penduduk luar langsung dibaca dari baris JSON.
 */
async function loadPengikutSurat(
  villageId: number,
  nilaiIsian: string | null,
): Promise<{ pengikut: AnggotaKeluargaSurat[]; luar: PendudukLuarSurat[] }> {
  const isian = parseNilaiIsian(nilaiIsian);
  const ids = parsePengikutIds(isian[KUNCI_ISIAN_PENGIKUT]);
  const luar = parsePendudukLuar(isian[KUNCI_ISIAN_LUAR]);
  if (ids.length === 0) return { pengikut: [], luar };

  const rows = await listPendudukSuratByIds(villageId, ids);
  return { pengikut: toAnggotaKeluarga(rows), luar };
}

export async function createSuratDraftData(input: SuratInput): Promise<{ id: number }> {
  const user = await requirePermission(SURAT_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const jenis = await loadJenis(villageId, input.typeId);
  await ensureResident(villageId, jenis, input.residentId);

  const { values } = resolveIsianValues(jenis, input.isiSurat);

  const letterDate = input.letterDate ?? "-";
  const year = Number(letterDate.slice(0, 4));
  const id = await createSuratDraft({
    villageId,
    typeId: jenis.id,
    residentId: input.residentId,
    letterDate: input.letterDate,
    year,
    purpose: input.purpose,
    typeName: jenis.name,
    nilaiIsian: serializeNilaiIsian(denganPengikut(values, input.pengikut ?? [], input.luar ?? [])),
    createdBy: user.id,
  });

  return { id };
}

export async function updateSuratDraftData(id: number, input: SuratInput): Promise<void> {
  const user = await requirePermission(SURAT_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const surat = await getSurat(villageId, id);
  if (!surat) throw notFound("Surat tidak ditemukan.");
  if (surat.status !== "draft") throw conflict("Hanya konsep surat yang dapat diubah.");

  const jenis = await loadJenis(villageId, input.typeId);
  await ensureResident(villageId, jenis, input.residentId);

  const { values } = resolveIsianValues(jenis, input.isiSurat);

  const letterDate = input.letterDate ?? "-";
  await updateSuratDraft(villageId, id, {
    typeId: jenis.id,
    residentId: input.residentId,
    letterDate: input.letterDate,
    year: Number(letterDate.slice(0, 4)),
    purpose: input.purpose,
    typeName: jenis.name,
    nilaiIsian: serializeNilaiIsian(denganPengikut(values, input.pengikut ?? [], input.luar ?? [])),
  });
}

export async function deleteSuratData(id: number): Promise<void> {
  const user = await requirePermission(SURAT_RESOURCE, "delete");
  const villageId = await resolveVillageId(user);

  const surat = await getSurat(villageId, id);
  if (!surat) throw notFound("Surat tidak ditemukan.");
  if (surat.status !== "draft") throw conflict("Hanya konsep surat yang dapat dihapus.");

  await deleteSurat(villageId, id);
}

/** Ajukan konsep ke antrean verifikasi (operator → sekdes → kades). */
export async function ajukanVerifikasiSuratData(
  id: number,
  konfirmasiSyarat = false,
): Promise<void> {
  const user = await requirePermission(SURAT_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const surat = await getSurat(villageId, id);
  if (!surat) throw notFound("Surat tidak ditemukan.");
  if (surat.status !== "draft") throw conflict("Hanya konsep surat yang dapat diajukan.");

  // Penegakan syarat jalur operator: bila jenis surat ini menuntut syarat,
  // pengajuan harus diikuti konfirmasi kelengkapan dari pencetus (lihat
  // `butuhKonfirmasiSyarat`). Tanpa ini surat bisa terbit walau dokumen
  // persyaratannya belum lengkap.
  const jenis = await getJenisSurat(villageId, surat.typeId);
  const jumlahSyarat = jenis === null ? 0 : parseSyaratIds(jenis.syaratSurat).length;
  if (butuhKonfirmasiSyarat(jumlahSyarat) && !konfirmasiSyarat) {
    throw validationError("Tandai kelengkapan syarat surat sebelum mengajukan verifikasi.");
  }

  await updateSuratVerification(villageId, id, {
    status: "verifikasi",
    verifikasiOperator: null,
    verifikasiSekdes: null,
    verifikasiKades: null,
    logVerifikasi: "diajukan",
    catatanVerifikasi: null,
  });
}

async function nomorUrutBerikutnya(
  mode: PenomoranSuratMode,
  villageId: number,
  jenis: JenisSuratDTO,
  year: number,
): Promise<number> {
  switch (mode) {
    case 1:
      return nextSuratSequenceGlobal(villageId, year);
    case 3:
      return nextSuratSequenceCombined(villageId, year);
    case 4:
      if (jenis.classificationId === null) {
        throw conflict(
          "Mode penomoran 4 memerlukan klasifikasi surat. Atur klasifikasi jenis surat terlebih dahulu.",
        );
      }
      return nextSuratSequenceByKlasifikasi(villageId, jenis.classificationId, year);
    default:
      return nextSuratSequence(villageId, jenis.id, year);
  }
}

async function nomorSudahDipakai(
  mode: PenomoranSuratMode,
  villageId: number,
  candidate: string,
): Promise<boolean> {
  return mode === 3
    ? suratNumberExistsWithAgenda(villageId, candidate)
    : suratNumberExists(villageId, candidate);
}

/**
 * Jalur TTE pasca-penerbitan.
 *
 * Konfigurasi efektif = pengaturan desa (`tte_config`) + kredensial
 * environment. Selama mode bukan `bsre` atau kredensial belum lengkap,
 * fungsi ini keluar tanpa I/O — penerbitan surat tidak pernah menunggu TTE.
 *
 * Kegagalan provider sengaja tidak melempar: surat tetap terbit tanpa TTE dan
 * operator hanya menerima peringatan pada log.
 */
async function prosesTteSurat(
  villageId: number,
  suratId: number,
  nomor: string,
  cetak: {
    desa: IdentitasDesa;
    jenisNama: string;
    tanggal: string;
    content: string;
    verificationUrl: string | null;
  },
): Promise<void> {
  try {
    const config = await getKonfigurasiTteEfektif(villageId);
    if (config.mode !== "bsre") return;

    const pdf = await buildSuratPdf({
      desa: cetak.desa,
      jenisNama: cetak.jenisNama,
      nomor,
      tanggal: cetak.tanggal,
      content: cetak.content,
      verificationUrl: cetak.verificationUrl,
    });

    const hasil = await tandatanganiPdfTte({ villageId, suratId, nomor, pdf, config });

    if (!hasil.ok) {
      console.warn(`TTE tidak diterapkan pada surat ${nomor}: ${hasil.alasan}`);
      return;
    }

    const berkas = await simpanBerkasTte(villageId, nomor, hasil.pdf);
    await setSuratTte(villageId, suratId, true, berkas);
    await recordAuditEvent({
      villageId,
      event: AUDIT_EVENTS.tteSigned,
      resource: SURAT_RESOURCE,
      resourceId: String(suratId),
      details: { nomor, mode: "bsre" },
    });
  } catch (error) {
    // Jangan pernah menggagalkan penerbitan karena TTE.
    console.warn(
      `TTE tidak diterapkan pada surat ${nomor}: ${
        error instanceof Error ? error.message : "kesalahan tidak diketahui"
      }`,
    );
  }
}

/**
 * Terbitkan surat setelah tahap Kades disetujui.
 *
 * Nomor baru diberikan pada tahap akhir agar surat yang ditolak tidak
 * menghabiskan nomor urut.
 */
async function terbitkanSurat(
  villageId: number,
  surat: SuratDetail,
  desa: IdentitasDesa,
): Promise<{ number: string; verificationToken: string }> {
  const jenis = await loadJenis(villageId, surat.typeId);
  const penduduk = surat.residentId
    ? await getPendudukSuratData(villageId, surat.residentId)
    : null;
  if (jenis.requiresResident && !penduduk) {
    throw conflict("Surat ini membutuhkan data penduduk yang valid.");
  }

  const anggotaKeluarga = await loadAnggotaKeluarga(villageId, penduduk);
  const pengikutSurat = await loadPengikutSurat(villageId, surat.nilaiIsian);
  const letterDate = surat.letterDate ?? "-";
  const year = Number(letterDate.slice(0, 4));
  const month = Number(letterDate.slice(5, 7));
  const mode = normalizePenomoranMode(desa.penomoranSurat);
  const format = jenis.numberFormat || DEFAULT_NUMBER_FORMAT;

  let sequence = await nomorUrutBerikutnya(mode, villageId, jenis, year);
  let number = "";

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = buildSuratNumber(format, {
      sequence,
      kodeSurat: jenis.code,
      kodeDesa: desa.kodeDesa ?? "",
      year,
      month,
    });

    if (!(await nomorSudahDipakai(mode, villageId, candidate))) {
      number = candidate;
      break;
    }
    sequence += 1;
  }

  if (number === "") throw conflict("Gagal menentukan nomor surat. Coba lagi.");

  const values = buildValues(surat, jenis, desa, penduduk, anggotaKeluarga, pengikutSurat, number);
  const content = isiTerbilangDanHitung(renderSuratTemplate(jenis.templateBody, values), values);

  // Token verifikasi publik: token mentah dipakai untuk tautan/QR dan
  // disimpan agar bisa dicetak ulang; hash dipakai sebagai kunci pencarian.
  // Surat lama yang sudah terbit tanpa token tetap valid — token hanya
  // dihasilkan saat penerbitan baru.
  const { token, hash } = await generateVerificationToken();

  await issueSuratRecord(villageId, surat.id, {
    number,
    sequence,
    year,
    typeId: surat.typeId,
    classificationId: jenis.classificationId,
    typeName: jenis.name,
    content,
    issuedAt: new Date(),
    logVerifikasi: "kades",
    verificationToken: token,
    verificationTokenHash: hash,
  });

  // TTE pasca-terbit: mode nonaktif (default) → keluar segera tanpa I/O.
  const origin = await getRequestOrigin();
  await prosesTteSurat(villageId, surat.id, number, {
    desa,
    jenisNama: jenis.name,
    tanggal: surat.letterDate ?? "-",
    content,
    verificationUrl: buildVerificationUrl(origin, token),
  });

  return { number, verificationToken: token };
}

/**
 * Verifikasi berjenjang pra-terbit: operator → sekdes → kades.
 *
 * Tahap Kades sekaligus menerbitkan surat dan memberi nomor. Role yang tidak
 * sesuai tahap ditolak, begitu pula upaya melompati urutan.
 */
export async function verifySuratData(
  id: number,
  step: VerificationStep,
): Promise<{ number: string | null; verificationToken: string | null }> {
  const user = await requirePermission(SURAT_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const surat = await getSurat(villageId, id);
  if (!surat) throw notFound("Surat tidak ditemukan.");

  const role = user.roleId === null ? null : await findRoleById(user.roleId, user.villageId);
  const validasi = validateVerification(
    role?.slug ?? null,
    user.id,
    {
      id: surat.id,
      status: surat.status,
      verifikasiOperator: surat.verifikasiOperator,
      verifikasiSekdes: surat.verifikasiSekdes,
      verifikasiKades: surat.verifikasiKades,
      createdBy: surat.createdBy,
    },
    step,
    user.permissions.isSuperadmin,
  );

  if (!validasi.ok) {
    const pesan = validasi.error ?? "Verifikasi tidak dapat dilakukan.";
    // Pelanggaran peran dan kepemilikan ditolak sebagai 403; tahap/urutan yang
    // sudah tidak berlaku tetap 409 agar UI membedakan konflik status.
    if (validasi.errorCode === "wrong-role" || validasi.errorCode === "own-submission") {
      throw forbidden(pesan);
    }
    throw conflict(pesan);
  }

  if (step === "operator") {
    await updateSuratVerification(villageId, id, {
      verifikasiOperator: true,
      logVerifikasi: "operator",
      status: "verifikasi",
    });
    return { number: null, verificationToken: null };
  }

  if (step === "sekdes") {
    await updateSuratVerification(villageId, id, {
      verifikasiSekdes: true,
      logVerifikasi: "sekdes",
      status: "verifikasi",
    });
    return { number: null, verificationToken: null };
  }

  const desa = await getIdentitasDesa(villageId);
  if (!desa) throw notFound("Identitas desa belum dikonfigurasi.");
  const { number, verificationToken } = await terbitkanSurat(villageId, surat, desa);

  // Permohonan warga yang terhubung menjadi "Siap Diambil" begitu surat terbit.
  const permohonan = await findPermohonanByLetterId(villageId, id);
  await sinkronStatusSuratPermohonan(villageId, id, 3);
  if (permohonan && permohonan.status !== 3) {
    await notifyPermohonanStatusChange({
      villageId,
      residentId: permohonan.residentId,
      noAntrian: permohonan.noAntrian,
      statusLama: permohonan.status,
      statusBaru: 3,
    });
  }

  return { number, verificationToken };
}

export async function rejectSuratData(id: number, reason: string): Promise<void> {
  const user = await requirePermission(SURAT_RESOURCE, "update");
  const villageId = await resolveVillageId(user);

  const surat = await getSurat(villageId, id);
  if (!surat) throw notFound("Surat tidak ditemukan.");
  if (surat.status !== "verifikasi") {
    throw conflict("Hanya surat yang sedang menunggu verifikasi yang bisa ditolak.");
  }
  if (!reason?.trim()) throw conflict("Alasan penolakan wajib diisi.");

  const role = user.roleId === null ? null : await findRoleById(user.roleId, user.villageId);
  const nextStep = nextVerificationStep(surat);
  if (nextStep === null) {
    throw conflict("Surat ini sudah selesai diverifikasi.");
  }
  if (!roleCanVerifyStep(nextStep, role?.slug ?? null, user.permissions.isSuperadmin)) {
    throw forbidden(`Tahap ${VERIFICATION_STEP_LABELS[nextStep]} bukan wewenang role Anda.`);
  }
  if (!canVerifyStep(surat, nextStep)) {
    throw conflict(
      `Verifikasi harus berurutan. Tahap berikutnya: ${VERIFICATION_STEP_LABELS[nextStep]}.`,
    );
  }

  await rejectSurat(villageId, id, reason.trim());

  // Surat yang ditolak membuat permohonan terkait ikut dibatalkan dengan alasan.
  await sinkronStatusSuratPermohonan(villageId, id, 5, reason.trim());
}

/** Susun data cetak/PDF untuk desa & surat tertentu (tanpa cek izin). */
async function loadSuratPrintData(
  villageId: number,
  id: number,
  varian?: string | null,
): Promise<SuratPrintData> {
  const surat = await getSurat(villageId, id);
  if (!surat) throw notFound("Surat tidak ditemukan.");

  const jenis = await getJenisSurat(villageId, surat.typeId);
  if (!jenis) throw notFound("Jenis surat tidak ditemukan.");

  const desa = await getIdentitasDesa(villageId);
  if (!desa) throw notFound("Identitas desa belum dikonfigurasi.");

  const penduduk = surat.residentId
    ? await getPendudukSuratData(villageId, surat.residentId)
    : null;
  const anggotaKeluarga = await loadAnggotaKeluarga(villageId, penduduk);
  const pengikutSurat = await loadPengikutSurat(villageId, surat.nilaiIsian);

  // Varian dari URL mengalahkan pengaturan jenis surat, sama seperti pratinjau cetak.
  const varianAktif = varian ?? jenis.templateVariant ?? "default";
  const templateBody =
    varianAktif !== "default" && jenis.templateBodyAlt ? jenis.templateBodyAlt : jenis.templateBody;

  const values = buildValues(
    surat,
    jenis,
    desa,
    penduduk,
    anggotaKeluarga,
    pengikutSurat,
    surat.number ?? "KONSEP",
  );
  const content =
    surat.content ?? isiTerbilangDanHitung(renderSuratTemplate(templateBody, values), values);

  return {
    surat,
    jenis,
    desa,
    penduduk,
    content,
    varian: varianAktif,
    layoutConfig: jenis.layoutConfig,
  };
}

/** Data lengkap untuk halaman cetak & PDF (konsep memakai render sementara). */
export async function getSuratPrintData(
  id: number,
  varian?: string | null,
): Promise<SuratPrintData> {
  const user = await requirePermission(SURAT_RESOURCE, "read");
  const villageId = await resolveVillageId(user);
  return loadSuratPrintData(villageId, id, varian);
}

/**
 * Data cetak untuk warga pemilik surat.
 *
 * Hanya surat yang `residentId`-nya sama dengan sesi yang boleh dibaca. Surat
 * yang belum terbit (draft/verifikasi) tidak ditampilkan sebagai dokumen warga.
 */
export async function getSuratPrintDataWarga(id: number): Promise<SuratPrintData> {
  const user = await requireWargaAktif();
  const villageId = await resolveVillageId(user);
  const data = await loadSuratPrintData(villageId, id);

  if (data.surat.residentId !== user.residentId) {
    throw notFound("Surat tidak ditemukan.");
  }

  if (data.surat.status !== "issued") {
    throw notFound("Surat belum terbit.");
  }

  return data;
}

function berkasPdfSah(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

/**
 * PDF surat: pakai berkas hasil TTE bila ada, jika tidak render ulang.
 *
 * Berkas TTE disimpan pada kategori privat `surat-tte`; bila berkas hilang
 * (mis. volume storage dipulihkan), surat tetap dapat diunduh dalam bentuk
 * PDF tanpa TTE daripada gagal total.
 */
async function bangunPdfSurat(data: SuratPrintData): Promise<Uint8Array> {
  if (data.surat.tteFile) {
    try {
      const bytes = await bacaMedia(data.surat.tteFile);
      if (berkasPdfSah(bytes)) return new Uint8Array(bytes);
    } catch {
      // Lanjut merender PDF baru di bawah.
    }
  }

  const origin = await getRequestOrigin();
  return buildSuratPdf({
    desa: data.desa,
    jenisNama: data.jenis.name,
    nomor: data.surat.number,
    tanggal: data.surat.letterDate,
    content: data.content,
    verificationUrl: data.surat.verificationToken
      ? buildVerificationUrl(origin, data.surat.verificationToken)
      : null,
    layoutConfig: data.layoutConfig,
    templateVariant: data.varian,
    templateBodyAlt: data.jenis.templateBodyAlt,
  });
}

/** PDF surat untuk admin (memeriksa izin baca surat). */
export async function getSuratPdfBytes(
  id: number,
  varian?: string | null,
): Promise<{ surat: SuratDetail; pdf: Uint8Array }> {
  const data = await getSuratPrintData(id, varian);
  return { surat: data.surat, pdf: await bangunPdfSurat(data) };
}

/** PDF surat untuk warga pemilik (hanya surat terbit miliknya). */
export async function getSuratPdfBytesWarga(
  id: number,
): Promise<{ surat: SuratDetail; pdf: Uint8Array }> {
  const data = await getSuratPrintDataWarga(id);
  return { surat: data.surat, pdf: await bangunPdfSurat(data) };
}
