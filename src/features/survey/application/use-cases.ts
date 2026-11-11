import "server-only";

import {
  hitungSkorResponden,
  KLASIFIKASI_SKOR,
  klasifikasiSkor,
  rekapPerIndikator,
  rekapPerKategori,
  type RekapIndikatorSkor,
  type RekapKategoriSkor,
  type SkorResponden,
} from "@/features/analisis/domain/skor";
import {
  listAnalisisIndikator,
  listAnalisisKategori,
} from "@/features/analisis/infrastructure/analisis-repository";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import {
  parsePilihanForm,
  parseSkorPilihanForm,
  rekapSoal,
  serializePilihan,
  serializeSkorPilihan,
  validasiJawaban,
  type RekapSoal,
  type RespondenInput,
  type SoalInput,
  type SurveyInput,
} from "@/features/survey/domain/survey";
import {
  buildSurveyCsv,
  parseSurveyCsv,
  surveyCsvFilename,
  type KesalahanImporSurvei,
} from "@/features/survey/domain/survey-csv";
import {
  deleteResponden,
  deleteSoal,
  deleteSurvey,
  getResponden,
  getSoal,
  getSurvey,
  insertResponden,
  insertSoal,
  insertSurvey,
  listJawaban,
  listJawabanResponden,
  listResponden,
  listSoal,
  listSurvey,
  nextUrutanSoal,
  updateSoal,
  updateSurvey,
} from "@/features/survey/infrastructure/survey-repository";
import { requirePermission } from "@/lib/dal";
import { notFound, validationError } from "@/lib/errors";

/**
 * Use case analisis & survei.
 *
 * Izin diperiksa di sini. Tabel soal/responden tidak menyimpan `village_id`,
 * jadi setiap operasi anak diawali pemeriksaan bahwa survei induknya milik
 * desa sesi.
 */

/** Pastikan survei ada di desa ini; lempar 404 bila bukan. */
async function pastikanSurvei(villageId: number, surveyId: number) {
  const survei = await getSurvey(villageId, surveyId);
  if (!survei) throw notFound("Survei tidak ditemukan.");
  return survei;
}

/** Daftar seluruh survei desa (aktif maupun nonaktif). */
export async function listSurveyData() {
  const user = await requirePermission(RESOURCES.analisisSurvei, "read");
  const villageId = await resolveVillageId(user);
  return listSurvey(villageId);
}

/**
 * Detail survei: soal, responden, dan rekap per soal.
 *
 * Mengembalikan `null` bila survei bukan milik desa sesi, agar halaman dapat
 * memanggil `notFound()`.
 */
export async function getSurveyDetailData(surveyId: number) {
  const user = await requirePermission(RESOURCES.analisisSurvei, "read");
  const villageId = await resolveVillageId(user);

  const survei = await getSurvey(villageId, surveyId);
  if (!survei) return null;

  const [soal, responden, jawaban, indikator] = await Promise.all([
    listSoal(surveyId),
    listResponden(surveyId),
    listJawaban(surveyId),
    listAnalisisIndikator(villageId),
  ]);

  const jawabanPerSoal = new Map<number, string[]>();
  for (const item of jawaban) {
    const list = jawabanPerSoal.get(item.soalId) ?? [];
    list.push(item.jawaban);
    jawabanPerSoal.set(item.soalId, list);
  }

  const rekap: RekapSoal[] = soal.map((item) => rekapSoal(item, jawabanPerSoal.get(item.id) ?? []));

  return {
    survei,
    soal,
    responden,
    rekap,
    indikator: indikator.map((item) => ({ id: item.id, nama: item.nama, kode: item.kode })),
    urutanBerikutnya: await nextUrutanSoal(surveyId),
  };
}

/** Tambah/ubah survei. */
export async function simpanSurveyData(
  id: number | null,
  input: SurveyInput,
): Promise<{ id: number }> {
  const user = await requirePermission(RESOURCES.analisisSurvei, "update");
  const villageId = await resolveVillageId(user);

  const values = {
    judul: input.judul,
    deskripsi: input.deskripsi?.trim() ? input.deskripsi.trim() : null,
    sasaran: input.sasaran?.trim() ? input.sasaran.trim() : null,
    mulai: input.mulai?.trim() ? input.mulai.trim() : null,
    selesai: input.selesai?.trim() ? input.selesai.trim() : null,
    aktif: input.aktif,
  };

  if (id === null) {
    const baru = await insertSurvey(villageId, values);
    return { id: baru };
  }

  await pastikanSurvei(villageId, id);
  await updateSurvey(villageId, id, values);
  return { id };
}

/** Hapus survei beserta soal, responden, dan jawabannya (cascade). */
export async function hapusSurveyData(id: number): Promise<void> {
  const user = await requirePermission(RESOURCES.analisisSurvei, "delete");
  const villageId = await resolveVillageId(user);

  await pastikanSurvei(villageId, id);
  await deleteSurvey(villageId, id);
}

/** Tambah/ubah soal pada survei. */
export async function simpanSoalData(
  id: number | null,
  input: SoalInput,
): Promise<{ id: number; surveyId: number }> {
  const user = await requirePermission(RESOURCES.analisisSurvei, "update");
  const villageId = await resolveVillageId(user);

  await pastikanSurvei(villageId, input.surveyId);

  if (id !== null) {
    const soal = await getSoal(input.surveyId, id);
    if (!soal) throw notFound("Pertanyaan tidak ditemukan.");
  }

  const pilihan = input.tipe === "choice" ? parsePilihanForm(input.pilihan ?? "") : [];

  if (input.indikatorId !== null) {
    const indikator = await listAnalisisIndikator(villageId);
    if (!indikator.some((item) => item.id === input.indikatorId)) {
      throw validationError("Indikator analisis tidak ditemukan.", {
        indikatorId: ["Pilih indikator yang terdaftar di desa ini."],
      });
    }
  }

  // Tanpa peta skor eksplisit, pilihan pertama bernilai tertinggi (5) dan
  // menurun satu poin per pilihan berikutnya.
  const skorPilihan = parseSkorPilihanForm(input.skorPilihan ?? "", pilihan);
  if (pilihan.length > 0 && Object.keys(skorPilihan).length === 0) {
    pilihan.forEach((label, index) => {
      skorPilihan[label] = Math.max(0, 5 - index);
    });
  }

  const values = {
    pertanyaan: input.pertanyaan,
    tipe: input.tipe,
    pilihan: serializePilihan(pilihan),
    bobot: input.bobot,
    skorPilihan: serializeSkorPilihan(skorPilihan),
    indikatorId: input.indikatorId,
    urutan: input.urutan,
  };

  if (id === null) {
    const baru = await insertSoal(input.surveyId, values);
    return { id: baru, surveyId: input.surveyId };
  }

  await updateSoal(input.surveyId, id, values);
  return { id, surveyId: input.surveyId };
}

/** Hapus soal (jawaban terkait ikut terhapus). */
export async function hapusSoalData(
  surveyId: number,
  soalId: number,
): Promise<{ surveyId: number }> {
  const user = await requirePermission(RESOURCES.analisisSurvei, "delete");
  const villageId = await resolveVillageId(user);

  await pastikanSurvei(villageId, surveyId);
  await deleteSoal(surveyId, soalId);
  return { surveyId };
}

/**
 * Simpan responden beserta jawabannya.
 *
 * Semua soal wajib dijawab. Jawaban pilihan harus salah satu opsi yang
 * tersimpan pada soal (bukan nilai kiriman klien), dan jawaban angka harus
 * berupa angka.
 */
export async function simpanRespondenData(
  input: RespondenInput,
  jawaban: Readonly<Record<string, string>>,
): Promise<{ id: number; surveyId: number }> {
  const user = await requirePermission(RESOURCES.analisisSurvei, "update");
  const villageId = await resolveVillageId(user);

  await pastikanSurvei(villageId, input.surveyId);

  const soal = await listSoal(input.surveyId);
  if (soal.length === 0) {
    throw validationError("Tambahkan pertanyaan sebelum mengisi responden.");
  }

  const errors = validasiJawaban(soal, jawaban);
  if (Object.keys(errors).length > 0) {
    throw validationError(
      "Lengkapi jawaban responden.",
      Object.fromEntries(
        Object.entries(errors).map(([soalId, pesan]) => [`jawaban.${soalId}`, [pesan]]),
      ),
    );
  }

  const id = await insertResponden(
    input.surveyId,
    { nama: input.nama, nik: input.nik },
    soal.map((item) => ({
      soalId: item.id,
      jawaban: (jawaban[String(item.id)] ?? "").trim(),
    })),
  );

  return { id, surveyId: input.surveyId };
}

/** Hapus responden beserta jawabannya. */
export async function hapusRespondenData(
  surveyId: number,
  respondenId: number,
): Promise<{ surveyId: number }> {
  const user = await requirePermission(RESOURCES.analisisSurvei, "delete");
  const villageId = await resolveVillageId(user);

  await pastikanSurvei(villageId, surveyId);
  await deleteResponden(surveyId, respondenId);
  return { surveyId };
}

/** Hasil impor CSV respons survei. */
export interface HasilImporSurvei {
  surveyId: number;
  diimpor: number;
  ditolak: number;
  /** Rincian baris yang gagal (maks. 50 ditampilkan di UI). */
  kesalahan: KesalahanImporSurvei[];
}

/**
 * Ekspor seluruh responden + jawaban satu survei sebagai CSV.
 *
 * Izin `read` cukup karena hanya membaca data yang sudah boleh dilihat di
 * halaman detail; berkas tidak memuat data penduduk di luar isian responden.
 */
export async function exportSurveyCsvData(
  surveyId: number,
): Promise<{ filename: string; csv: string }> {
  const user = await requirePermission(RESOURCES.analisisSurvei, "read");
  const villageId = await resolveVillageId(user);
  const survei = await pastikanSurvei(villageId, surveyId);

  const [soal, responden, jawaban] = await Promise.all([
    listSoal(surveyId),
    listResponden(surveyId),
    listJawaban(surveyId),
  ]);

  return {
    filename: surveyCsvFilename(survei.judul, survei.id),
    csv: buildSurveyCsv({ soal, responden, jawaban }),
  };
}

/**
 * Impor CSV respons survei (kolom mengikuti urutan soal saat ini).
 *
 * Baris valid disimpan satu per satu; baris tidak valid dilaporkan tanpa
 * membatalkan baris lain sehingga operator dapat memperbaiki lalu mengulang.
 * Tanggal pada berkas diabaikan — waktu dibuat server.
 */
export async function importSurveyCsvData(
  surveyId: number,
  csv: string,
): Promise<HasilImporSurvei> {
  const user = await requirePermission(RESOURCES.analisisSurvei, "update");
  const villageId = await resolveVillageId(user);

  await pastikanSurvei(villageId, surveyId);

  const soal = await listSoal(surveyId);
  if (soal.length === 0) {
    throw validationError("Tambahkan pertanyaan sebelum mengimpor respons.");
  }

  const hasil = parseSurveyCsv(csv, soal);
  if (hasil.baris.length === 0 && hasil.kesalahan.length === 0) {
    throw validationError("Berkas tidak memuat baris data.");
  }

  const kesalahan = [...hasil.kesalahan];
  let diimpor = 0;

  for (const baris of hasil.baris) {
    try {
      await insertResponden(
        surveyId,
        { nama: baris.nama, nik: baris.nik },
        soal.map((item) => ({
          soalId: item.id,
          jawaban: baris.jawaban[String(item.id)] ?? "",
        })),
      );
      diimpor += 1;
    } catch {
      kesalahan.push({ baris: baris.baris, pesan: "Gagal menyimpan baris ini." });
    }
  }

  return { surveyId, diimpor, ditolak: kesalahan.length, kesalahan };
}

/**
 * Simpan respons dari halaman publik.
 *
 * Tidak memakai izin sesi: desa ditentukan pemanggil dari host permintaan.
 * Hanya survei aktif dan berada dalam periode pengisian yang menerima respons.
 */
export async function simpanResponsPublikData(
  villageId: number,
  surveyId: number,
  input: { nama: string; nik: string | null },
  jawaban: Readonly<Record<string, string>>,
): Promise<{ id: number }> {
  const survei = await getSurvey(villageId, surveyId);
  if (!survei || !survei.aktif) throw notFound("Survei tidak ditemukan atau tidak aktif.");

  const hariIni = new Date().toISOString().slice(0, 10);
  if (survei.mulai && hariIni < survei.mulai) {
    throw validationError("Periode pengisian survei belum dibuka.");
  }
  if (survei.selesai && hariIni > survei.selesai) {
    throw validationError("Periode pengisian survei sudah berakhir.");
  }

  const soal = await listSoal(surveyId);
  if (soal.length === 0) throw validationError("Survei belum memiliki pertanyaan.");

  const errors = validasiJawaban(soal, jawaban);
  if (Object.keys(errors).length > 0) {
    throw validationError(
      "Lengkapi jawaban survei.",
      Object.fromEntries(
        Object.entries(errors).map(([soalId, pesan]) => [`jawaban.${soalId}`, [pesan]]),
      ),
    );
  }

  const id = await insertResponden(
    surveyId,
    input,
    soal.map((item) => ({
      soalId: item.id,
      jawaban: (jawaban[String(item.id)] ?? "").trim(),
    })),
  );

  return { id };
}

/** Hasil perhitungan skor satu survei untuk laporan formal. */
export interface LaporanSkorData {
  survei: Awaited<ReturnType<typeof pastikanSurvei>>;
  jumlahResponden: number;
  rataRata: number;
  klasifikasiDominan: string;
  perResponden: SkorResponden[];
  distribusi: { label: string; jumlah: number; persentase: number }[];
  perIndikator: (RekapIndikatorSkor & { nama: string; kategori: string | null })[];
  /** Ringkasan rata-rata per kategori indikator. */
  perKategori: RekapKategoriSkor[];
}

/**
 * Laporan skor survei: skor per responden, rata-rata, distribusi klasifikasi,
 * dan rata-rata per indikator analisis.
 */
export async function getLaporanSkorData(surveyId: number): Promise<LaporanSkorData> {
  const user = await requirePermission(RESOURCES.analisisSurvei, "read");
  const villageId = await resolveVillageId(user);
  const survei = await pastikanSurvei(villageId, surveyId);

  const [soal, responden, jawaban, indikator, kategori] = await Promise.all([
    listSoal(surveyId),
    listResponden(surveyId),
    listJawaban(surveyId),
    listAnalisisIndikator(villageId),
    listAnalisisKategori(villageId),
  ]);

  const jawabanPerResponden = new Map<number, Map<number, string>>(
    responden.map((item) => [item.id, new Map<number, string>()]),
  );
  for (const item of jawaban) {
    jawabanPerResponden.get(item.respondenId)?.set(item.soalId, item.jawaban);
  }

  const soalSkor = soal.map((item) => ({
    id: item.id,
    tipe: item.tipe,
    bobot: item.bobot,
    skorPilihan: item.skorPilihan,
    indikatorId: item.indikatorId,
  }));

  const perResponden = responden.map((item) =>
    hitungSkorResponden(soalSkor, {
      respondenId: item.id,
      nama: item.nama,
      jawaban: jawabanPerResponden.get(item.id) ?? new Map<number, string>(),
    }),
  );

  const rataRata =
    perResponden.length === 0
      ? 0
      : Math.round(
          (perResponden.reduce((sum, item) => sum + item.skor, 0) / perResponden.length) * 10,
        ) / 10;

  const distribusi = KLASIFIKASI_SKOR.map((item) => {
    const jumlah = perResponden.filter((row) => row.klasifikasi === item.label).length;
    return {
      label: item.label,
      jumlah,
      persentase:
        perResponden.length === 0 ? 0 : Math.round((jumlah / perResponden.length) * 1000) / 10,
    };
  });

  const kategoriNama = new Map(kategori.map((item) => [item.id, item.nama]));
  const indikatorNama = new Map(indikator.map((item) => [item.id, item]));

  const perIndikator = rekapPerIndikator(
    soalSkor,
    responden.map((item) => ({
      respondenId: item.id,
      jawaban: jawabanPerResponden.get(item.id) ?? new Map<number, string>(),
    })),
  ).map((item) => {
    const info = item.indikatorId === null ? null : indikatorNama.get(item.indikatorId);
    return {
      ...item,
      nama: info?.nama ?? "Tanpa indikator",
      kategori: info?.kategoriId == null ? null : (kategoriNama.get(info.kategoriId) ?? null),
    };
  });

  return {
    survei,
    jumlahResponden: responden.length,
    rataRata,
    klasifikasiDominan: klasifikasiSkor(rataRata),
    perResponden,
    distribusi,
    perIndikator,
    perKategori: rekapPerKategori(perIndikator),
  };
}

/** Rincian jawaban satu responden untuk dialog. */
export async function getRespondenDetailData(surveyId: number, respondenId: number) {
  const user = await requirePermission(RESOURCES.analisisSurvei, "read");
  const villageId = await resolveVillageId(user);

  await pastikanSurvei(villageId, surveyId);

  const responden = await getResponden(surveyId, respondenId);
  if (!responden) throw notFound("Responden tidak ditemukan.");

  const [soal, jawaban] = await Promise.all([
    listSoal(surveyId),
    listJawabanResponden(surveyId, respondenId),
  ]);

  return {
    responden,
    jawaban: soal.map((item) => ({
      soalId: item.id,
      pertanyaan: item.pertanyaan,
      tipe: item.tipe,
      jawaban: jawaban.get(item.id) ?? "",
    })),
  };
}
