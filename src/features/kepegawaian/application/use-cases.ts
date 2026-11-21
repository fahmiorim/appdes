import "server-only";

import { resolveVillageId } from "@/features/desa/application/resolve-village";
import {
  countCutiAktif,
  countKehadiranHarian,
  deleteDokumenPegawai,
  deleteRiwayatPegawai,
  denganKunciAbsensiHarian,
  getAbsensiHarian,
  getBuktiAbsensi,
  getCuti,
  getCutiBertabrakan,
  getDokumenPegawai,
  getKuotaCuti,
  getLampiranCuti,
  getPegawai,
  getPegawaiAktif,
  getPegawaiByEmail,
  getPegawaiByNip,
  getPegawaiByNik,
  getPegawaiByPerangkat,
  getPegawaiByPerangkatId,
  getPegawaiByUserEmail,
  getPengaturanKehadiran as ambilPengaturanKehadiran,
  getRiwayatPegawai,
  insertAbsensi,
  insertCuti,
  insertDokumenPegawai,
  insertPegawai,
  insertRiwayatPegawai,
  listAbsensiDashboard,
  listAbsensiTanggal,
  listCatatanAbsensiRentang,
  listCutiTahun,
  listDokumenPegawai,
  listKehadiranBulanan,
  listPegawai,
  listPegawaiAktif,
  listPegawaiAktifRingkas,
  listPerangkatAktifDenganJabatan,
  listPerangkatTerhubung,
  listPerangkatUntukSinkron,
  listRiwayatPegawai,
  listTrenKehadiran,
  sumCutiTahunanDisetujui,
  updateAbsensi,
  updatePegawai,
  updateRiwayatPegawai,
  updateStatusCuti,
  upsertKuotaCuti,
  upsertPengaturanKehadiran,
} from "@/features/kepegawaian/infrastructure/kepegawaian-repository";
import { bacaMedia, hapusMedia } from "@/features/publik/infrastructure/media-storage";
import { hasPermission } from "@/features/rbac/application/authorization";
import { requirePermission, requireUser } from "@/lib/dal";

function tanggalLokal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
function tahunLokal(): number {
  return Number(tanggalLokal().slice(0, 4));
}
function tanggalValid(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function hitungHariKerja(mulai: string, selesai: string, hariLibur: number[] = [0, 6]): number {
  const [sy = 0, sm = 0, sd = 0] = mulai.split("-").map(Number);
  const [ey = 0, em = 0, ed = 0] = selesai.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    throw new Error("Rentang tanggal tidak valid.");
  let total = 0;
  for (let day = start; day <= end; day += 86400000) {
    const weekday = new Date(day).getUTCDay();
    if (!hariLibur.includes(weekday)) total += 1;
  }
  return total;
}

async function village(resource: string, action: "read" | "update" = "read") {
  const user = await requirePermission(resource, action);
  return { user, villageId: await resolveVillageId(user) };
}

/** Sinkronkan aparatur aktif yang sudah ada ke master pegawai tanpa membuat duplikat. */
export async function sinkronkanPegawaiPerangkat(villageId: number) {
  const perangkat = await listPerangkatUntukSinkron(villageId);
  for (const item of perangkat) {
    const existing = await getPegawaiByPerangkatId(villageId, item.id);
    if (!existing) {
      if (item.status === "aktif") {
        await insertPegawai(villageId, {
          perangkatId: item.id,
          nama: item.nama,
          nip: item.nip,
          nik: item.nik,
          jenisKelamin: item.jenisKelamin,
          tempatLahir: item.tempatLahir,
          tanggalLahir: item.tanggalLahir,
          foto: item.foto,
          jabatan: item.jabatan,
          statusPegawai: "tetap",
          status: "aktif",
        });
      }
      continue;
    }
    await updatePegawai(villageId, existing.id, {
      nama: item.nama,
      nip: item.nip,
      nik: item.nik,
      jenisKelamin: item.jenisKelamin,
      tempatLahir: item.tempatLahir,
      tanggalLahir: item.tanggalLahir,
      foto: item.foto,
      jabatan: item.jabatan,
      ...(item.status === "aktif" ? {} : { status: "nonaktif" }),
    });
  }
}

export async function daftarPegawai() {
  const { villageId } = await village("kepegawaian");
  await sinkronkanPegawaiPerangkat(villageId);
  return listPegawai(villageId);
}

export async function simpanPegawai(input: {
  id?: number;
  perangkatId?: number | null;
  nama: string;
  nip?: string | null;
  nik?: string | null;
  jabatan?: string | null;
  jenisKelamin?: string | null;
  tempatLahir?: string | null;
  tanggalLahir?: string | null;
  alamat?: string | null;
  telepon?: string | null;
  email?: string | null;
  pendidikan?: string | null;
  statusPegawai: string;
  status: string;
  tanggalMasuk?: string | null;
  tanggalKeluar?: string | null;
}) {
  const { villageId } = await village("kepegawaian", "update");
  if (!input.nama.trim()) throw new Error("Nama pegawai wajib diisi.");
  if (!["tetap", "kontrak", "purna_tugas"].includes(input.statusPegawai))
    throw new Error("Status kepegawaian tidak valid.");
  if (!["aktif", "nonaktif"].includes(input.status)) throw new Error("Status pegawai tidak valid.");
  if (input.nik && !/^\d{16}$/.test(input.nik)) throw new Error("NIK harus 16 digit.");
  if (input.nip && (await getPegawaiByNip(villageId, input.nip, input.id)))
    throw new Error("NIP sudah digunakan pegawai lain.");
  const email = input.email?.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Format email pegawai tidak valid.");
  if (email && (await getPegawaiByEmail(villageId, email, input.id)))
    throw new Error(
      "Email sudah terhubung ke pegawai lain. Satu akun hanya boleh terhubung ke satu pegawai.",
    );
  if (input.nik && (await getPegawaiByNik(villageId, input.nik, input.id)))
    throw new Error("NIK sudah digunakan pegawai lain.");
  if (input.tanggalMasuk && input.tanggalKeluar && input.tanggalKeluar < input.tanggalMasuk)
    throw new Error("Tanggal keluar tidak boleh sebelum tanggal masuk.");
  if (input.perangkatId) {
    if (!(await getPegawai(villageId, input.perangkatId)))
      throw new Error("Perangkat desa tidak ditemukan pada tenant ini.");
    if (await getPegawaiByPerangkat(villageId, input.perangkatId, input.id))
      throw new Error("Perangkat desa tersebut sudah terhubung ke data pegawai lain.");
  }
  const values = {
    perangkatId: input.perangkatId ?? null,
    nama: input.nama.trim(),
    nip: input.nip || null,
    nik: input.nik || null,
    jabatan: input.jabatan || null,
    jenisKelamin: input.jenisKelamin || null,
    tempatLahir: input.tempatLahir || null,
    tanggalLahir: input.tanggalLahir || null,
    alamat: input.alamat || null,
    telepon: input.telepon || null,
    email: input.email || null,
    pendidikan: input.pendidikan || null,
    statusPegawai: input.statusPegawai,
    status: input.status,
    tanggalMasuk: input.tanggalMasuk || null,
    tanggalKeluar: input.tanggalKeluar || null,
  };
  if (input.id) {
    if (!(await getPegawai(villageId, input.id))) throw new Error("Pegawai tidak ditemukan.");
    await updatePegawai(villageId, input.id, values);
    return input.id;
  }
  return insertPegawai(villageId, values);
}

export async function getDashboardAbsensiData() {
  const { villageId } = await village("absensi-dashboard");
  await sinkronkanPegawaiPerangkat(villageId);
  const today = tanggalLokal();
  const from = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(Date.now() - 29 * 86400000),
  );
  const [employees, attendance, leaves, todayRows, trendRows] = await Promise.all([
    listPegawaiAktif(villageId),
    countKehadiranHarian(villageId, today),
    countCutiAktif(villageId, today),
    listAbsensiDashboard(villageId, today, 8),
    listTrenKehadiran(villageId, from, today),
  ]);
  const hadir = Number(attendance.find((x) => x.status === "hadir")?.total ?? 0);
  const izin = Number(attendance.find((x) => x.status === "izin")?.total ?? 0);
  const cuti = Number(attendance.find((x) => x.status === "cuti")?.total ?? 0);
  const tidakHadir = Math.max(0, employees.length - hadir - izin - cuti);
  return {
    villageId,
    totalPegawai: employees.length,
    hadir,
    izin,
    cuti,
    tidakHadir,
    tingkatKehadiran: employees.length ? Math.round((hadir / employees.length) * 1000) / 10 : 0,
    komposisi: {
      tetap: employees.filter((x) => x.statusPegawai === "tetap").length,
      kontrak: employees.filter((x) => x.statusPegawai === "kontrak").length,
      purnaTugas: employees.filter((x) => x.statusPegawai === "purna_tugas").length,
    },
    jenisKelamin: {
      lakiLaki: employees.filter((x) => x.jenisKelamin === "male").length,
      perempuan: employees.filter((x) => x.jenisKelamin === "female").length,
    },
    rataMasaKerjaBulan: employees.length
      ? Math.round(
          employees.reduce((sum, x) => {
            if (!x.tanggalMasuk) return sum;
            const start = new Date(x.tanggalMasuk + "T00:00:00Z");
            const end = x.tanggalKeluar ? new Date(x.tanggalKeluar + "T00:00:00Z") : new Date();
            return (
              sum +
              Math.max(
                0,
                (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
                  end.getUTCMonth() -
                  start.getUTCMonth(),
              )
            );
          }, 0) / Math.max(1, employees.filter((x) => x.tanggalMasuk).length),
        )
      : 0,
    todayRows: todayRows.map((x) => ({ ...x, status: x.status ?? "tidak_hadir" })),
    trendRows,
    leaves,
  };
}

export async function daftarAbsensi(tanggal = tanggalLokal()) {
  const { villageId } = await village("kehadiran");
  if (!tanggalValid(tanggal)) throw new Error("Tanggal absensi tidak valid.");
  await sinkronkanPegawaiPerangkat(villageId);
  return listAbsensiTanggal(villageId, tanggal);
}

export async function daftarAbsensiRentang(mulai: string, selesai: string) {
  const { villageId } = await village("kehadiran");
  if (!tanggalValid(mulai) || !tanggalValid(selesai) || selesai < mulai)
    throw new Error("Rentang laporan absensi tidak valid.");
  const start = Date.parse(mulai + "T00:00:00Z");
  const end = Date.parse(selesai + "T00:00:00Z");
  if ((end - start) / 86400000 > 366) throw new Error("Rentang laporan maksimal 367 hari.");
  await sinkronkanPegawaiPerangkat(villageId);
  const [pegawai, catatan, setting] = await Promise.all([
    listPegawaiAktifRingkas(villageId),
    listCatatanAbsensiRentang(villageId, mulai, selesai),
    ambilPengaturanKehadiran(villageId),
  ]);
  let hariLibur: number[] = [0, 6];
  try {
    const parsed = JSON.parse(setting?.hariLibur ?? "[0,6]");
    if (Array.isArray(parsed) && parsed.every((day) => Number.isInteger(day) && day >= 0 && day <= 6))
      hariLibur = [...new Set(parsed)];
  } catch {
    /* gunakan akhir pekan sebagai fallback */
  }
  const byDate = new Map(catatan.map((row) => [row.tanggal + ":" + row.pegawaiId, row]));
  const hasil = [];
  for (let day = start; day <= end; day += 86400000) {
    const tanggal = new Date(day).toISOString().slice(0, 10);
    if (hariLibur.includes(new Date(day).getUTCDay())) continue;
    for (const person of pegawai) {
      const row = byDate.get(tanggal + ":" + person.id);
      const status = row?.status ?? "tidak_hadir";
      const jamMasuk = row?.jamMasuk ?? null;
      hasil.push({
        tanggal,
        nama: person.nama,
        jabatan: person.jabatan,
        jamMasuk,
        jamKeluar: row?.jamKeluar ?? null,
        status,
        catatan: row?.catatan ?? null,
        terlambat:
          status === "hadir" &&
          Boolean(
            jamMasuk &&
              setting?.jamMasuk &&
              Number(jamMasuk.slice(0, 2)) * 60 + Number(jamMasuk.slice(3, 5)) >
                Number(setting.jamMasuk.slice(0, 2)) * 60 +
                  Number(setting.jamMasuk.slice(3, 5)) +
                  (setting.toleransiTerlambatMenit ?? 0),
          ),
      });
    }
  }
  return hasil;
}

export async function catatAbsensiManual(input: {
  pegawaiId: number;
  tanggal: string;
  jamMasuk?: string;
  jamKeluar?: string;
  status: string;
  catatan?: string;
}) {
  const { villageId } = await village("kehadiran", "update");
  if (!(await getPegawaiAktif(villageId, input.pegawaiId)))
    throw new Error("Pegawai aktif tidak ditemukan.");
  if (!tanggalValid(input.tanggal)) throw new Error("Tanggal absensi tidak valid.");
  if (!["hadir", "izin", "cuti", "tidak_hadir"].includes(input.status))
    throw new Error("Status absensi tidak valid.");
  if (input.jamMasuk && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.jamMasuk))
    throw new Error("Jam masuk tidak valid.");
  if (input.jamKeluar && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.jamKeluar))
    throw new Error("Jam pulang tidak valid.");
  if (input.jamMasuk && input.jamKeluar && input.jamKeluar < input.jamMasuk)
    throw new Error("Jam pulang tidak boleh sebelum jam masuk.");
  const existing = await getAbsensiHarian(villageId, input.pegawaiId, input.tanggal);
  const values = {
    perangkatId: null,
    jamMasuk: input.jamMasuk || null,
    jamKeluar: input.jamKeluar || null,
    status: input.status,
    catatan: input.catatan || null,
  };
  if (existing) await updateAbsensi(villageId, existing.id, values);
  else
    await insertAbsensi(villageId, {
      ...values,
      pegawaiId: input.pegawaiId,
      tanggal: input.tanggal,
    });
}

export async function daftarCuti(tahun = tahunLokal()) {
  const { villageId } = await village("cuti-izin");
  await sinkronkanPegawaiPerangkat(villageId);
  return listCutiTahun(villageId, tahun);
}

export async function ajukanCuti(input: {
  pegawaiId: number;
  jenis: string;
  mulai: string;
  selesai: string;
  alasan: string;
  lampiran?: string | null;
}) {
  const user = await requireUser();
  const villageId = await resolveVillageId(user);
  const canManage = hasPermission(user.permissions, "cuti-izin", "update");
  if (!canManage) {
    const pegawaiAkun = await getPegawaiByUserEmail(villageId, user.email);
    if (!pegawaiAkun || pegawaiAkun.id !== input.pegawaiId)
      throw new Error(
        "Anda hanya dapat mengajukan cuti/izin untuk akun pegawai yang terhubung.",
      );
  }
  if (!input.alasan.trim()) throw new Error("Alasan cuti/izin wajib diisi.");
  if (!tanggalValid(input.mulai) || !tanggalValid(input.selesai))
    throw new Error("Tanggal cuti/izin tidak valid.");
  if (input.mulai < tanggalLokal()) throw new Error("Tanggal mulai tidak boleh di masa lalu.");
  if (input.jenis === "cuti_tahunan" && input.mulai.slice(0, 4) !== input.selesai.slice(0, 4))
    throw new Error("Cuti tahunan harus berada dalam satu tahun kalender.");
  const pengaturan = await ambilPengaturanKehadiran(villageId);
  let hariLibur: number[] = [0, 6];
  try {
    const parsed = JSON.parse(pengaturan?.hariLibur ?? "[0,6]");
    if (Array.isArray(parsed) && parsed.every((day) => Number.isInteger(day) && day >= 0 && day <= 6))
      hariLibur = [...new Set(parsed)];
  } catch {
    /* gunakan akhir pekan sebagai fallback */
  }
  const durasi = hitungHariKerja(input.mulai, input.selesai, hariLibur);
  if (durasi < 1)
    throw new Error("Rentang pengajuan tidak mencakup hari kerja sesuai pengaturan desa.");
  if (await getCutiBertabrakan(villageId, input.pegawaiId, input.mulai, input.selesai))
    throw new Error(
      "Pegawai sudah memiliki pengajuan cuti/izin yang bertabrakan pada tanggal tersebut.",
    );
  if (!["cuti_tahunan", "cuti_sakit", "izin", "cuti_penting"].includes(input.jenis))
    throw new Error("Jenis cuti/izin tidak valid.");
  if (!(await getPegawaiAktif(villageId, input.pegawaiId)))
    throw new Error("Pegawai aktif tidak ditemukan.");
  if (input.jenis === "cuti_tahunan") {
    const tahun = Number(input.mulai.slice(0, 4));
    const quota = await getKuotaCuti(villageId, input.pegawaiId, tahun);
    const total = quota?.total ?? 12;
    const used = await sumCutiTahunanDisetujui(villageId, input.pegawaiId, tahun);
    if (used + durasi > total) throw new Error("Pengajuan melebihi sisa kuota cuti tahunan.");
  }
  await insertCuti(villageId, {
    pegawaiId: input.pegawaiId,
    jenis: input.jenis,
    mulai: input.mulai,
    selesai: input.selesai,
    durasi,
    alasan: input.alasan.trim(),
    lampiran: input.lampiran ?? null,
  });
}

export async function putuskanCuti(
  id: number,
  status: "disetujui" | "ditolak",
  catatan: string,
) {
  const { user, villageId } = await village("cuti-izin", "update");
  const request = await getCuti(villageId, id);
  if (!request) throw new Error("Pengajuan tidak ditemukan.");
  if (request.status !== "menunggu") throw new Error("Pengajuan ini sudah diputuskan.");
  if (status === "disetujui" && request.jenis === "cuti_tahunan") {
    const year = Number(request.mulai.slice(0, 4));
    const quota = await getKuotaCuti(villageId, request.pegawaiId, year);
    const used = await sumCutiTahunanDisetujui(villageId, request.pegawaiId, year);
    if (used + request.durasi > (quota?.total ?? 12))
      throw new Error("Kuota cuti tidak mencukupi untuk persetujuan ini.");
  }
  await updateStatusCuti(villageId, id, {
    status,
    catatan: catatan || null,
    diputuskanOleh: user.id,
    diputuskanAt: new Date(),
  });
}

export async function ringkasanKuotaCuti(tahun = tahunLokal()) {
  const { villageId } = await village("cuti-izin");
  await sinkronkanPegawaiPerangkat(villageId);
  const pegawai = await listPegawaiAktifRingkas(villageId);
  const hasil = [];
  for (const person of pegawai) {
    const quota = await getKuotaCuti(villageId, person.id, tahun);
    const terpakai = await sumCutiTahunanDisetujui(villageId, person.id, tahun);
    hasil.push({ ...person, total: quota?.total ?? 12, terpakai });
  }
  return hasil;
}

export async function simpanKuotaCuti(pegawaiId: number, tahun: number, total: number) {
  const { villageId } = await village("cuti-izin", "update");
  if (!Number.isInteger(total) || total < 0 || total > 365)
    throw new Error("Kuota cuti tidak valid.");
  const used = await sumCutiTahunanDisetujui(villageId, pegawaiId, tahun);
  if (total < used)
    throw new Error("Kuota baru tidak boleh lebih kecil dari cuti yang sudah terpakai.");
  if (!(await getPegawai(villageId, pegawaiId))) throw new Error("Pegawai tidak ditemukan.");
  await upsertKuotaCuti(villageId, pegawaiId, tahun, total);
}

export async function daftarRiwayatPegawai(pegawaiId: number) {
  const { villageId } = await village("kepegawaian");
  return listRiwayatPegawai(villageId, pegawaiId);
}

export async function opsiPerangkatBelumTerhubung() {
  const { villageId } = await village("kepegawaian");
  const [officials, linked] = await Promise.all([
    listPerangkatAktifDenganJabatan(villageId),
    listPerangkatTerhubung(villageId),
  ]);
  const linkedIds = new Set(linked.map((x) => x.perangkatId).filter((x): x is number => x !== null));
  return officials.filter((x) => !linkedIds.has(x.id));
}

export async function tambahRiwayatPegawai(input: {
  pegawaiId: number;
  jabatan: string;
  unitKerja?: string | null;
  nomorSk?: string | null;
  mulai: string;
  selesai?: string | null;
  keterangan?: string | null;
}) {
  const { villageId } = await village("kepegawaian", "update");
  if (!input.jabatan.trim() || !input.mulai)
    throw new Error("Jabatan dan tanggal mulai wajib diisi.");
  if (input.selesai && input.selesai < input.mulai)
    throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  if (!(await getPegawai(villageId, input.pegawaiId))) throw new Error("Pegawai tidak ditemukan.");
  await insertRiwayatPegawai(villageId, {
    pegawaiId: input.pegawaiId,
    jabatan: input.jabatan.trim(),
    unitKerja: input.unitKerja || null,
    nomorSk: input.nomorSk || null,
    mulai: input.mulai,
    selesai: input.selesai || null,
    keterangan: input.keterangan || null,
  });
}

export async function simpanDokumenPegawai(input: {
  pegawaiId: number;
  judul: string;
  kategori: string;
  nomor?: string | null;
  tanggal?: string | null;
  berkas: string;
}) {
  const { villageId } = await village("kepegawaian", "update");
  if (!input.judul.trim() || !input.berkas)
    throw new Error("Judul dan berkas dokumen wajib diisi.");
  if (!(await getPegawai(villageId, input.pegawaiId))) throw new Error("Pegawai tidak ditemukan.");
  await insertDokumenPegawai(villageId, {
    pegawaiId: input.pegawaiId,
    judul: input.judul.trim(),
    kategori: input.kategori,
    nomor: input.nomor || null,
    tanggal: input.tanggal || null,
    berkas: input.berkas,
  });
}

export async function daftarDokumenPegawai(pegawaiId: number) {
  const { villageId } = await village("kepegawaian");
  return listDokumenPegawai(villageId, pegawaiId);
}

export async function getPengaturanKehadiran() {
  const { villageId } = await village("kehadiran");
  const setting = await ambilPengaturanKehadiran(villageId);
  return (
    setting ?? {
      jamMasuk: "08:00",
      jamKeluar: "16:00",
      hariLibur: "[0,6]",
      latitudeKantor: null,
      longitudeKantor: null,
      radiusMeter: 100,
      toleransiTerlambatMenit: 0,
      wajibGps: true,
      wajibFoto: true,
    }
  );
}

export async function simpanPengaturanKehadiran(input: {
  jamMasuk: string;
  jamKeluar: string;
  hariLibur: number[];
  latitudeKantor?: string | null;
  longitudeKantor?: string | null;
  radiusMeter?: number;
  toleransiTerlambatMenit?: number;
  wajibGps?: boolean;
  wajibFoto?: boolean;
}) {
  const { user, villageId } = await village("kehadiran", "update");
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.jamMasuk) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.jamKeluar)
  )
    throw new Error("Format jam kerja harus HH:MM.");
  if (input.jamKeluar <= input.jamMasuk) throw new Error("Jam pulang harus setelah jam masuk.");
  if (
    !Array.isArray(input.hariLibur) ||
    input.hariLibur.some((x) => !Number.isInteger(x) || x < 0 || x > 6)
  )
    throw new Error("Hari libur tidak valid.");
  const lat = input.latitudeKantor?.trim() || null;
  const lng = input.longitudeKantor?.trim() || null;
  if ((lat === null) !== (lng === null)) throw new Error("Koordinat kantor harus diisi berpasangan.");
  if (
    lat !== null &&
    (!Number.isFinite(Number(lat)) ||
      Number(lat) < -90 ||
      Number(lat) > 90 ||
      !Number.isFinite(Number(lng)) ||
      Number(lng) < -180 ||
      Number(lng) > 180)
  )
    throw new Error("Koordinat kantor tidak valid.");
  const radiusMeter = input.radiusMeter ?? 100;
  const toleransiTerlambatMenit = input.toleransiTerlambatMenit ?? 0;
  if (!Number.isInteger(radiusMeter) || radiusMeter < 20 || radiusMeter > 5000)
    throw new Error("Radius lokasi harus 20–5000 meter.");
  if (!Number.isInteger(toleransiTerlambatMenit) || toleransiTerlambatMenit < 0 || toleransiTerlambatMenit > 180)
    throw new Error("Toleransi keterlambatan harus 0–180 menit.");
  if (input.wajibGps !== false && (lat === null || lng === null))
    throw new Error("Isi koordinat kantor sebelum mengaktifkan validasi GPS.");
  await upsertPengaturanKehadiran(villageId, {
    jamMasuk: input.jamMasuk,
    jamKeluar: input.jamKeluar,
    hariLibur: JSON.stringify([...new Set(input.hariLibur)]),
    latitudeKantor: lat,
    longitudeKantor: lng,
    radiusMeter,
    toleransiTerlambatMenit,
    wajibGps: input.wajibGps !== false,
    wajibFoto: input.wajibFoto !== false,
    diperbaruiOleh: user.id,
  });
}

export async function getStatusAbsensiMandiri() {
  const user = await requireUser();
  const villageId = await resolveVillageId(user);
  const pegawai = await getPegawaiByUserEmail(villageId, user.email);
  if (!pegawai) return null;
  const record = await getAbsensiHarian(villageId, pegawai.id, tanggalLokal());
  return {
    nama: pegawai.nama,
    jamMasuk: record?.jamMasuk ?? null,
    jamKeluar: record?.jamKeluar ?? null,
  };
}

function jarakMeter(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1),
    dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Catat check-in/check-out mandiri untuk akun yang emailnya terhubung ke master pegawai. */
export async function catatAbsensiMandiri(input: {
  latitude: number | null;
  longitude: number | null;
  fotoMasuk?: string | null;
}) {
  const user = await requireUser();
  const villageId = await resolveVillageId(user);
  if ((input.latitude === null) !== (input.longitude === null))
    throw new Error("Koordinat GPS harus diisi berpasangan.");
  if (
    input.latitude !== null &&
    input.longitude !== null &&
    (!Number.isFinite(input.latitude) ||
      input.latitude < -90 ||
      input.latitude > 90 ||
      !Number.isFinite(input.longitude) ||
      input.longitude < -180 ||
      input.longitude > 180)
  )
    throw new Error("Koordinat GPS tidak valid.");
  const pegawai = await getPegawaiByUserEmail(villageId, user.email);
  if (!pegawai)
    throw new Error(
      "Akun belum ditautkan ke data pegawai. Hubungi administrator desa untuk mengisi email akun pada profil pegawai.",
    );
  const setting = await ambilPengaturanKehadiran(villageId);
  const wajibGps = setting?.wajibGps ?? true;
  const wajibFoto = setting?.wajibFoto ?? true;
  if (wajibGps && (input.latitude === null || input.longitude === null))
    throw new Error("Ambil lokasi GPS sebelum mengirim absensi.");
  if (wajibGps && (!setting?.latitudeKantor || !setting?.longitudeKantor))
    throw new Error("Lokasi kantor belum dikonfigurasi administrator.");
  if (
    wajibGps &&
    input.latitude !== null &&
    input.longitude !== null &&
    setting?.latitudeKantor &&
    setting.longitudeKantor
  ) {
    const distance = jarakMeter(
      input.latitude,
      input.longitude,
      Number(setting.latitudeKantor),
      Number(setting.longitudeKantor),
    );
    if (distance > (setting.radiusMeter ?? 100))
      throw new Error(
        `Anda berada di luar area absensi kantor (jarak sekitar ${Math.round(distance)} meter).`,
      );
  }
  return denganKunciAbsensiHarian(villageId, pegawai.id, tanggalLokal(), () =>
    denganKunciAbsensi(villageId, pegawai, {
      wajibFoto,
      fotoMasuk: input.fotoMasuk ?? null,
      latitude: input.latitude,
      longitude: input.longitude,
    }),
  );
}

async function denganKunciAbsensi(
  villageId: number,
  pegawai: { id: number; nama: string },
  input: {
    wajibFoto: boolean;
    fotoMasuk: string | null;
    latitude: number | null;
    longitude: number | null;
  },
) {
  const tanggal = tanggalLokal();
  const now = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const catatan = await getAbsensiHarian(villageId, pegawai.id, tanggal);
  if (catatan?.jamKeluar)
    throw new Error("Absensi hari ini sudah lengkap. Check-in dan check-out sudah tercatat.");
  if (!catatan && input.wajibFoto && !input.fotoMasuk)
    throw new Error("Foto selfie wajib dilampirkan saat check-in.");
  if (catatan) {
    if (!catatan.jamMasuk) throw new Error("Data absensi hari ini perlu diperiksa administrator.");
    const masukMenit = Number(catatan.jamMasuk.slice(0, 2)) * 60 + Number(catatan.jamMasuk.slice(3, 5));
    const sekarangMenit = Number(now.slice(0, 2)) * 60 + Number(now.slice(3, 5));
    if (sekarangMenit - masukMenit < 2)
      throw new Error("Check-in baru saja tercatat. Tunggu sebelum melakukan check-out.");
    await updateAbsensi(villageId, catatan.id, { jamKeluar: now });
    return { aksi: "check_out" as const, nama: pegawai.nama, jam: now };
  }
  await insertAbsensi(villageId, {
    pegawaiId: pegawai.id,
    perangkatId: null,
    tanggal,
    jamMasuk: now,
    status: "hadir",
    latitudeMasuk: input.latitude === null ? null : String(input.latitude),
    longitudeMasuk: input.longitude === null ? null : String(input.longitude),
    fotoMasuk: input.fotoMasuk,
  });
  return { aksi: "check_in" as const, nama: pegawai.nama, jam: now };
}

export async function daftarKehadiranBulanan(tahun: number, bulan: number) {
  const { villageId } = await village("kehadiran");
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2200 || !Number.isInteger(bulan) || bulan < 1 || bulan > 12)
    throw new Error("Periode kalender tidak valid.");
  const mulai = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  const akhir = new Date(Date.UTC(tahun, bulan, 0)).toISOString().slice(0, 10);
  return listKehadiranBulanan(villageId, mulai, akhir);
}

export async function hapusRiwayatPegawai(id: number) {
  const { villageId } = await village("kepegawaian", "update");
  await deleteRiwayatPegawai(villageId, id);
}

export async function hapusDokumenPegawai(id: number) {
  const { villageId } = await village("kepegawaian", "update");
  const doc = await getDokumenPegawai(villageId, id);
  if (!doc) throw new Error("Dokumen pegawai tidak ditemukan.");
  await deleteDokumenPegawai(villageId, id);
  await hapusMedia(doc.berkas);
}

export async function ubahRiwayatPegawai(input: {
  id: number;
  pegawaiId: number;
  jabatan: string;
  unitKerja?: string | null;
  nomorSk?: string | null;
  mulai: string;
  selesai?: string | null;
  keterangan?: string | null;
}) {
  const { villageId } = await village("kepegawaian", "update");
  if (!input.jabatan.trim() || !input.mulai)
    throw new Error("Jabatan dan tanggal mulai wajib diisi.");
  if (input.selesai && input.selesai < input.mulai)
    throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  if (!(await getRiwayatPegawai(villageId, input.id, input.pegawaiId)))
    throw new Error("Riwayat jabatan tidak ditemukan.");
  await updateRiwayatPegawai(villageId, input.id, {
    jabatan: input.jabatan.trim(),
    unitKerja: input.unitKerja || null,
    nomorSk: input.nomorSk || null,
    mulai: input.mulai,
    selesai: input.selesai || null,
    keterangan: input.keterangan || null,
  });
}

/** Isi bukti absensi untuk route unduhan; `null` bila tidak ada atau tidak berhak. */
export async function bacaBuktiAbsensiData(id: number) {
  const user = await requireUser();
  const villageId = await resolveVillageId(user);
  const row = await getBuktiAbsensi(villageId, id);
  if (!row?.foto) return null;
  const canRead = hasPermission(user.permissions, "kehadiran", "read");
  if (!canRead && row.email?.toLowerCase() !== user.email.toLowerCase()) return null;
  const isi = await bacaMedia(row.foto);
  return { id, isi, ekstensi: row.foto.split(".").pop()?.toLowerCase() ?? "" };
}

/** Isi dokumen pegawai untuk route unduhan setelah permission `kepegawaian:read`. */
export async function bacaDokumenPegawaiData(id: number) {
  const { villageId } = await village("kepegawaian");
  const document = await getDokumenPegawai(villageId, id);
  if (!document) return null;
  const isi = await bacaMedia(document.berkas);
  return { id: document.id, isi, ekstensi: document.berkas.split(".").pop()?.toLowerCase() ?? "" };
}

/** Isi lampiran cuti untuk route unduhan setelah permission `cuti-izin:read`. */
export async function bacaLampiranCutiData(id: number) {
  const { villageId } = await village("cuti-izin");
  const request = await getLampiranCuti(villageId, id);
  if (!request?.lampiran) return null;
  const isi = await bacaMedia(request.lampiran);
  return { id, isi, ekstensi: request.lampiran.split(".").pop()?.toLowerCase() ?? "" };
}

/** Hapus berkas absensi/cuti yang batal tersimpan atau sudah tidak dipakai. */
export async function hapusBerkasKepegawaian(relatif: string) {
  await hapusMedia(relatif);
}
