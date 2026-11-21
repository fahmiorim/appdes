import "server-only";

import { and, asc, count, desc, eq, gte, lte, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { denganKunciMysql } from "@/db/kunci-mysql";
import {
  cutiKuota,
  cutiPegawai,
  kehadiranPengaturan,
  kehadiranPerangkat,
  kepegawaianPegawai,
  kepegawaianRiwayat,
  kepegawaianDokumen,
  perangkatDesa,
  jabatanPerangkat,
} from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { hasPermission } from "@/features/rbac/application/authorization";
import { requirePermission, requireUser } from "@/lib/dal";
import { hapusMedia } from "@/features/publik/infrastructure/media-storage";

function tanggalLokal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
function tahunLokal(): number { return Number(tanggalLokal().slice(0, 4)); }
function tanggalValid(value:string):boolean {
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const parsed=new Date(value+"T00:00:00Z");
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
function hitungHariKerja(mulai: string, selesai: string, hariLibur: number[] = [0, 6]): number {
  const [sy, sm, sd] = mulai.split("-").map(Number);
  const [ey, em, ed] = selesai.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error("Rentang tanggal tidak valid.");
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
  const perangkat = await db.select({
    id: perangkatDesa.id, nama: perangkatDesa.nama, nip: perangkatDesa.nip,
    nik: perangkatDesa.nik, jenisKelamin: perangkatDesa.jenisKelamin,
    tempatLahir: perangkatDesa.tempatLahir, tanggalLahir: perangkatDesa.tanggalLahir,
    foto: perangkatDesa.foto, jabatan: jabatanPerangkat.nama, status: perangkatDesa.status,
  }).from(perangkatDesa)
    .leftJoin(jabatanPerangkat, and(eq(perangkatDesa.jabatanId, jabatanPerangkat.id), eq(jabatanPerangkat.villageId, villageId)))
    .where(eq(perangkatDesa.villageId, villageId));
  for (const item of perangkat) {
    const [existing] = await db.select({ id: kepegawaianPegawai.id }).from(kepegawaianPegawai)
      .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.perangkatId, item.id))).limit(1);
    if (!existing) {
      if (item.status === "aktif") {
        await db.insert(kepegawaianPegawai).values({
          villageId, perangkatId: item.id, nama: item.nama, nip: item.nip, nik: item.nik,
          jenisKelamin: item.jenisKelamin, tempatLahir: item.tempatLahir,
          tanggalLahir: item.tanggalLahir, foto: item.foto, jabatan: item.jabatan,
          statusPegawai: "tetap", status: "aktif",
        });
      }
      continue;
    }
    await db.update(kepegawaianPegawai).set({
      nama: item.nama, nip: item.nip, nik: item.nik, jenisKelamin: item.jenisKelamin,
      tempatLahir: item.tempatLahir, tanggalLahir: item.tanggalLahir,
      foto: item.foto, jabatan: item.jabatan,
      ...(item.status === "aktif" ? {} : { status: "nonaktif" }),
    }).where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.id, existing.id)));
  }
}

export async function daftarPegawai() {
  const { villageId } = await village("kepegawaian");
  await sinkronkanPegawaiPerangkat(villageId);
  return db.select().from(kepegawaianPegawai)
    .where(eq(kepegawaianPegawai.villageId, villageId))
    .orderBy(asc(kepegawaianPegawai.status), asc(kepegawaianPegawai.nama));
}

export async function simpanPegawai(input: {
  id?: number; perangkatId?: number | null; nama: string; nip?: string | null; nik?: string | null;
  jabatan?: string | null; jenisKelamin?: string | null; tempatLahir?: string | null;
  tanggalLahir?: string | null; alamat?: string | null; telepon?: string | null; email?: string | null;
  pendidikan?: string | null; statusPegawai: string; status: string; tanggalMasuk?: string | null;
  tanggalKeluar?: string | null;
}) {
  const { villageId } = await village("kepegawaian", "update");
  if (!input.nama.trim()) throw new Error("Nama pegawai wajib diisi.");
  if (!["tetap", "kontrak", "purna_tugas"].includes(input.statusPegawai)) throw new Error("Status kepegawaian tidak valid.");
  if (!["aktif", "nonaktif"].includes(input.status)) throw new Error("Status pegawai tidak valid.");
  if (input.nik && !/^\d{16}$/.test(input.nik)) throw new Error("NIK harus 16 digit.");
  if (input.nip) {
    const [duplicate] = await db.select({id:kepegawaianPegawai.id}).from(kepegawaianPegawai)
      .where(and(eq(kepegawaianPegawai.villageId,villageId),eq(kepegawaianPegawai.nip,input.nip),...(input.id?[ne(kepegawaianPegawai.id,input.id)]:[]))).limit(1);
    if(duplicate) throw new Error("NIP sudah digunakan pegawai lain.");
  }
  const email=input.email?.trim().toLowerCase()||null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Format email pegawai tidak valid.");
  if (email) {
    const [duplicateEmail] = await db.select({id:kepegawaianPegawai.id}).from(kepegawaianPegawai)
      .where(and(eq(kepegawaianPegawai.villageId,villageId),eq(kepegawaianPegawai.email,email),...(input.id?[ne(kepegawaianPegawai.id,input.id)]:[]))).limit(1);
    if(duplicateEmail) throw new Error("Email sudah terhubung ke pegawai lain. Satu akun hanya boleh terhubung ke satu pegawai.");
  }
  if (input.nik) {
    const [duplicate] = await db.select({id:kepegawaianPegawai.id}).from(kepegawaianPegawai)
      .where(and(eq(kepegawaianPegawai.villageId,villageId),eq(kepegawaianPegawai.nik,input.nik),...(input.id?[ne(kepegawaianPegawai.id,input.id)]:[]))).limit(1);
    if(duplicate) throw new Error("NIK sudah digunakan pegawai lain.");
  }
  if (input.tanggalMasuk && input.tanggalKeluar && input.tanggalKeluar < input.tanggalMasuk) throw new Error("Tanggal keluar tidak boleh sebelum tanggal masuk.");
  if (input.perangkatId) {
    const [official] = await db.select({ id: perangkatDesa.id }).from(perangkatDesa)
      .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.id, input.perangkatId))).limit(1);
    if (!official) throw new Error("Perangkat desa tidak ditemukan pada tenant ini.");
    const [linked] = await db.select({ id: kepegawaianPegawai.id }).from(kepegawaianPegawai)
      .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.perangkatId, input.perangkatId), ...(input.id ? [ne(kepegawaianPegawai.id, input.id)] : []))).limit(1);
    if (linked) throw new Error("Perangkat desa tersebut sudah terhubung ke data pegawai lain.");
  }
  const values = {
    perangkatId: input.perangkatId ?? null, nama: input.nama.trim(), nip: input.nip || null,
    nik: input.nik || null, jabatan: input.jabatan || null, jenisKelamin: input.jenisKelamin || null,
    tempatLahir: input.tempatLahir || null, tanggalLahir: input.tanggalLahir || null,
    alamat: input.alamat || null, telepon: input.telepon || null, email: input.email || null,
    pendidikan: input.pendidikan || null, statusPegawai: input.statusPegawai,
    status: input.status, tanggalMasuk: input.tanggalMasuk || null, tanggalKeluar: input.tanggalKeluar || null,
  };
  if (input.id) {
    const [existing] = await db.select({ id: kepegawaianPegawai.id }).from(kepegawaianPegawai)
      .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.id, input.id))).limit(1);
    if (!existing) throw new Error("Pegawai tidak ditemukan.");
    await db.update(kepegawaianPegawai).set(values)
      .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.id, input.id)));
    return input.id;
  }
  const result = await db.insert(kepegawaianPegawai).values({ ...values, villageId });
  return Number(result[0].insertId);
}

export async function getDashboardAbsensiData() {
  const { villageId } = await village("absensi-dashboard");
  await sinkronkanPegawaiPerangkat(villageId);
  const today = tanggalLokal();
  const start = new Date(Date.now() - 29 * 86400000);
  const from = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(start);
  const [employees, attendance, leaves, todayRows, trendRows] = await Promise.all([
    db.select().from(kepegawaianPegawai).where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.status, "aktif"))),
    db.select({ status: kehadiranPerangkat.status, total: count() }).from(kehadiranPerangkat)
      .where(and(eq(kehadiranPerangkat.villageId, villageId), eq(kehadiranPerangkat.tanggal, today)))
      .groupBy(kehadiranPerangkat.status),
    db.select({ status: cutiPegawai.status, total: count() }).from(cutiPegawai)
      .where(and(eq(cutiPegawai.villageId, villageId), lte(cutiPegawai.mulai, today), gte(cutiPegawai.selesai, today)))
      .groupBy(cutiPegawai.status),
    db.select({ pegawai: kepegawaianPegawai.nama, foto: kepegawaianPegawai.foto, jabatan: kepegawaianPegawai.jabatan, jamMasuk: kehadiranPerangkat.jamMasuk, jamKeluar: kehadiranPerangkat.jamKeluar, status: kehadiranPerangkat.status })
      .from(kepegawaianPegawai).leftJoin(kehadiranPerangkat, and(eq(kehadiranPerangkat.villageId, villageId), eq(kehadiranPerangkat.pegawaiId, kepegawaianPegawai.id), eq(kehadiranPerangkat.tanggal, today)))
      .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.status, "aktif"))).orderBy(asc(kepegawaianPegawai.nama)).limit(8),
    db.select({ tanggal: kehadiranPerangkat.tanggal, total: count() }).from(kehadiranPerangkat)
      .where(and(eq(kehadiranPerangkat.villageId, villageId), gte(kehadiranPerangkat.tanggal, from), lte(kehadiranPerangkat.tanggal, today), eq(kehadiranPerangkat.status, "hadir")))
      .groupBy(kehadiranPerangkat.tanggal).orderBy(asc(kehadiranPerangkat.tanggal)),
  ]);
  const hadir = Number(attendance.find((x) => x.status === "hadir")?.total ?? 0);
  const izin = Number(attendance.find((x) => x.status === "izin")?.total ?? 0);
  const cuti = Number(attendance.find((x) => x.status === "cuti")?.total ?? 0);
  const tidakHadir = Math.max(0, employees.length - hadir - izin - cuti);
  return {
    villageId, totalPegawai: employees.length, hadir, izin, cuti, tidakHadir,
    tingkatKehadiran: employees.length ? Math.round((hadir / employees.length) * 1000) / 10 : 0,
    komposisi: { tetap: employees.filter((x) => x.statusPegawai === "tetap").length, kontrak: employees.filter((x) => x.statusPegawai === "kontrak").length, purnaTugas: employees.filter((x) => x.statusPegawai === "purna_tugas").length },
    jenisKelamin: { lakiLaki: employees.filter((x) => x.jenisKelamin === "male").length, perempuan: employees.filter((x) => x.jenisKelamin === "female").length },
    rataMasaKerjaBulan: employees.length ? Math.round(employees.reduce((sum, x) => {
      if (!x.tanggalMasuk) return sum;
      const start = new Date(x.tanggalMasuk + "T00:00:00Z");
      const end = x.tanggalKeluar ? new Date(x.tanggalKeluar + "T00:00:00Z") : new Date();
      return sum + Math.max(0, (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth());
    }, 0) / Math.max(1, employees.filter((x) => x.tanggalMasuk).length)) : 0,
    todayRows: todayRows.map((x) => ({ ...x, status: x.status ?? "tidak_hadir" })),
    trendRows, leaves,
  };
}

export async function daftarAbsensi(tanggal = tanggalLokal()) {
  const { villageId } = await village("kehadiran");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)||new Date(tanggal+"T00:00:00Z").toISOString().slice(0,10)!==tanggal) throw new Error("Tanggal absensi tidak valid.");
  await sinkronkanPegawaiPerangkat(villageId);
  return db.select({
    id: kehadiranPerangkat.id, pegawaiId: kepegawaianPegawai.id, nama: kepegawaianPegawai.nama,
    jabatan: kepegawaianPegawai.jabatan, jamMasuk: kehadiranPerangkat.jamMasuk,
    jamKeluar: kehadiranPerangkat.jamKeluar, status: kehadiranPerangkat.status,
    fotoMasuk: kehadiranPerangkat.fotoMasuk, catatan: kehadiranPerangkat.catatan,
  }).from(kepegawaianPegawai)
    .leftJoin(kehadiranPerangkat, and(eq(kehadiranPerangkat.villageId, villageId), eq(kehadiranPerangkat.pegawaiId, kepegawaianPegawai.id), eq(kehadiranPerangkat.tanggal, tanggal)))
    .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.status, "aktif")))
    .orderBy(asc(kepegawaianPegawai.nama));
}


export async function daftarAbsensiRentang(mulai: string, selesai: string) {
  const { villageId } = await village("kehadiran");
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
  if (!validDate(mulai) || !validDate(selesai) || selesai < mulai) throw new Error("Rentang laporan absensi tidak valid.");
  const start = Date.parse(mulai + "T00:00:00Z");
  const end = Date.parse(selesai + "T00:00:00Z");
  if ((end - start) / 86400000 > 366) throw new Error("Rentang laporan maksimal 367 hari.");
  await sinkronkanPegawaiPerangkat(villageId);
  const [pegawai, catatan, setting] = await Promise.all([
    db.select({ id: kepegawaianPegawai.id, nama: kepegawaianPegawai.nama, jabatan: kepegawaianPegawai.jabatan })
      .from(kepegawaianPegawai)
      .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.status, "aktif")))
      .orderBy(asc(kepegawaianPegawai.nama)),
    db.select({
      pegawaiId: kehadiranPerangkat.pegawaiId, tanggal: kehadiranPerangkat.tanggal,
      jamMasuk: kehadiranPerangkat.jamMasuk, jamKeluar: kehadiranPerangkat.jamKeluar,
      status: kehadiranPerangkat.status, catatan: kehadiranPerangkat.catatan,
    }).from(kehadiranPerangkat)
      .where(and(eq(kehadiranPerangkat.villageId, villageId), gte(kehadiranPerangkat.tanggal, mulai), lte(kehadiranPerangkat.tanggal, selesai))),
    db.select({ jamMasuk: kehadiranPengaturan.jamMasuk, hariLibur: kehadiranPengaturan.hariLibur, toleransiTerlambatMenit: kehadiranPengaturan.toleransiTerlambatMenit })
      .from(kehadiranPengaturan).where(eq(kehadiranPengaturan.villageId, villageId)).limit(1),
  ]);
  let hariLibur: number[] = [0, 6];
  try {
    const parsed = JSON.parse(setting[0]?.hariLibur ?? "[0,6]");
    if (Array.isArray(parsed) && parsed.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) hariLibur = [...new Set(parsed)];
  } catch { /* gunakan akhir pekan sebagai fallback */ }
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
        tanggal, nama: person.nama, jabatan: person.jabatan, jamMasuk,
        jamKeluar: row?.jamKeluar ?? null, status, catatan: row?.catatan ?? null,
        terlambat: status === "hadir" && Boolean(jamMasuk && setting[0]?.jamMasuk && (Number(jamMasuk.slice(0,2))*60+Number(jamMasuk.slice(3,5))) > (Number(setting[0].jamMasuk.slice(0,2))*60+Number(setting[0].jamMasuk.slice(3,5))+(setting[0].toleransiTerlambatMenit??0))),
      });
    }
  }
  return hasil;
}

export async function catatAbsensiManual(input: { pegawaiId: number; tanggal: string; jamMasuk?: string; jamKeluar?: string; status: string; catatan?: string }) {
  const { villageId } = await village("kehadiran", "update");
  const [pegawai] = await db.select({ id: kepegawaianPegawai.id }).from(kepegawaianPegawai)
    .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.id, input.pegawaiId), eq(kepegawaianPegawai.status, "aktif"))).limit(1);
  if (!pegawai) throw new Error("Pegawai aktif tidak ditemukan.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tanggal)) throw new Error("Tanggal absensi tidak valid.");
  if (!["hadir", "izin", "cuti", "tidak_hadir"].includes(input.status)) throw new Error("Status absensi tidak valid.");
  if (new Date(input.tanggal + "T00:00:00Z").toISOString().slice(0,10) !== input.tanggal) throw new Error("Tanggal absensi tidak valid.");
  if (input.jamMasuk && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.jamMasuk)) throw new Error("Jam masuk tidak valid.");
  if (input.jamKeluar && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.jamKeluar)) throw new Error("Jam pulang tidak valid.");
  if (input.jamMasuk && input.jamKeluar && input.jamKeluar < input.jamMasuk) throw new Error("Jam pulang tidak boleh sebelum jam masuk.");
  const [existing] = await db.select({ id: kehadiranPerangkat.id }).from(kehadiranPerangkat)
    .where(and(eq(kehadiranPerangkat.villageId, villageId), eq(kehadiranPerangkat.pegawaiId, input.pegawaiId), eq(kehadiranPerangkat.tanggal, input.tanggal))).limit(1);
  const values = { perangkatId: null, jamMasuk: input.jamMasuk || null, jamKeluar: input.jamKeluar || null, status: input.status, catatan: input.catatan || null };
  if (existing) await db.update(kehadiranPerangkat).set(values).where(and(eq(kehadiranPerangkat.villageId, villageId), eq(kehadiranPerangkat.id, existing.id)));
  else await db.insert(kehadiranPerangkat).values({ ...values, villageId, pegawaiId: input.pegawaiId, tanggal: input.tanggal });
}

export async function daftarCuti(tahun = tahunLokal()) {
  const { villageId } = await village("cuti-izin");
  await sinkronkanPegawaiPerangkat(villageId);
  return db.select({
    id: cutiPegawai.id, pegawaiId: kepegawaianPegawai.id, nama: kepegawaianPegawai.nama,
    jabatan: kepegawaianPegawai.jabatan, jenis: cutiPegawai.jenis, mulai: cutiPegawai.mulai,
    selesai: cutiPegawai.selesai, durasi: cutiPegawai.durasi, alasan: cutiPegawai.alasan,
    lampiran: cutiPegawai.lampiran, status: cutiPegawai.status, catatan: cutiPegawai.catatan,
  }).from(cutiPegawai).innerJoin(kepegawaianPegawai, and(eq(cutiPegawai.villageId, kepegawaianPegawai.villageId), eq(cutiPegawai.pegawaiId, kepegawaianPegawai.id)))
    .where(and(eq(cutiPegawai.villageId, villageId), gte(cutiPegawai.mulai, `${tahun}-01-01`), lte(cutiPegawai.mulai, `${tahun}-12-31`)))
    .orderBy(desc(cutiPegawai.createdAt));
}

export async function ajukanCuti(input: { pegawaiId: number; jenis: string; mulai: string; selesai: string; alasan: string; lampiran?: string | null }) {
  const user=await requireUser();
  const villageId=await resolveVillageId(user);
  const canManage=hasPermission(user.permissions,"cuti-izin","update");
  if(!canManage) {
    const [pegawaiAkun]=await db.select({id:kepegawaianPegawai.id}).from(kepegawaianPegawai)
      .where(and(eq(kepegawaianPegawai.villageId,villageId),eq(kepegawaianPegawai.email,user.email),eq(kepegawaianPegawai.status,"aktif"))).limit(1);
    if(!pegawaiAkun||pegawaiAkun.id!==input.pegawaiId) throw new Error("Anda hanya dapat mengajukan cuti/izin untuk akun pegawai yang terhubung.");
  }
  if (!input.alasan.trim()) throw new Error("Alasan cuti/izin wajib diisi.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.mulai) || !/^\d{4}-\d{2}-\d{2}$/.test(input.selesai)) throw new Error("Tanggal cuti/izin tidak valid.");
  if (new Date(input.mulai + "T00:00:00Z").toISOString().slice(0,10) !== input.mulai || new Date(input.selesai + "T00:00:00Z").toISOString().slice(0,10) !== input.selesai) throw new Error("Tanggal cuti/izin tidak valid.");
  if (input.mulai < tanggalLokal()) throw new Error("Tanggal mulai tidak boleh di masa lalu.");
  if (input.jenis === "cuti_tahunan" && input.mulai.slice(0,4) !== input.selesai.slice(0,4)) throw new Error("Cuti tahunan harus berada dalam satu tahun kalender.");
  const [pengaturan] = await db.select({ hariLibur: kehadiranPengaturan.hariLibur }).from(kehadiranPengaturan)
    .where(eq(kehadiranPengaturan.villageId, villageId)).limit(1);
  let hariLibur: number[] = [0, 6];
  try {
    const parsed = JSON.parse(pengaturan?.hariLibur ?? "[0,6]");
    if (Array.isArray(parsed) && parsed.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)) hariLibur = [...new Set(parsed)];
  } catch { /* gunakan akhir pekan sebagai fallback */ }
  const durasi = hitungHariKerja(input.mulai, input.selesai, hariLibur);
  if (durasi < 1) throw new Error("Rentang pengajuan tidak mencakup hari kerja sesuai pengaturan desa.");
  const [overlap] = await db.select({ id: cutiPegawai.id }).from(cutiPegawai)
    .where(and(eq(cutiPegawai.villageId, villageId), eq(cutiPegawai.pegawaiId, input.pegawaiId),
      lte(cutiPegawai.mulai, input.selesai), gte(cutiPegawai.selesai, input.mulai), ne(cutiPegawai.status, "ditolak"))).limit(1);
  if (overlap) throw new Error("Pegawai sudah memiliki pengajuan cuti/izin yang bertabrakan pada tanggal tersebut.");
  if (!["cuti_tahunan", "cuti_sakit", "izin", "cuti_penting"].includes(input.jenis)) throw new Error("Jenis cuti/izin tidak valid.");
  const [pegawai] = await db.select({ id: kepegawaianPegawai.id }).from(kepegawaianPegawai)
    .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.id, input.pegawaiId), eq(kepegawaianPegawai.status, "aktif"))).limit(1);
  if (!pegawai) throw new Error("Pegawai aktif tidak ditemukan.");
  if (input.jenis === "cuti_tahunan") {
    const [quota] = await db.select({ total: cutiKuota.total }).from(cutiKuota)
      .where(and(eq(cutiKuota.villageId, villageId), eq(cutiKuota.pegawaiId, input.pegawaiId), eq(cutiKuota.tahun, Number(input.mulai.slice(0,4))))).limit(1);
    const total = quota?.total ?? 12;
    const [used] = await db.select({ total: sql<number>`coalesce(sum(${cutiPegawai.durasi}),0)` }).from(cutiPegawai)
      .where(and(eq(cutiPegawai.villageId, villageId), eq(cutiPegawai.pegawaiId, input.pegawaiId), eq(cutiPegawai.jenis, "cuti_tahunan"), eq(cutiPegawai.status, "disetujui"), gte(cutiPegawai.mulai, `${input.mulai.slice(0,4)}-01-01`), lte(cutiPegawai.selesai, `${input.mulai.slice(0,4)}-12-31`)));
    if (Number(used?.total ?? 0) + durasi > total) throw new Error("Pengajuan melebihi sisa kuota cuti tahunan.");
  }
  await db.insert(cutiPegawai).values({ villageId, pegawaiId: input.pegawaiId, jenis: input.jenis, mulai: input.mulai, selesai: input.selesai, durasi, alasan: input.alasan.trim(), lampiran: input.lampiran ?? null });
}

export async function putuskanCuti(id: number, status: "disetujui" | "ditolak", catatan: string) {
  const { user, villageId } = await village("cuti-izin", "update");
  const [request] = await db.select().from(cutiPegawai)
    .where(and(eq(cutiPegawai.villageId, villageId), eq(cutiPegawai.id, id))).limit(1);
  if (!request) throw new Error("Pengajuan tidak ditemukan.");
  if (request.status !== "menunggu") throw new Error("Pengajuan ini sudah diputuskan.");
  if (status === "disetujui" && request.jenis === "cuti_tahunan") {
    const year = Number(request.mulai.slice(0,4));
    const [quota] = await db.select({ total: cutiKuota.total }).from(cutiKuota)
      .where(and(eq(cutiKuota.villageId, villageId), eq(cutiKuota.pegawaiId, request.pegawaiId), eq(cutiKuota.tahun, year))).limit(1);
    const [used] = await db.select({ total: sql<number>`coalesce(sum(${cutiPegawai.durasi}),0)` }).from(cutiPegawai)
      .where(and(eq(cutiPegawai.villageId, villageId), eq(cutiPegawai.pegawaiId, request.pegawaiId), eq(cutiPegawai.jenis, "cuti_tahunan"), eq(cutiPegawai.status, "disetujui"), gte(cutiPegawai.mulai, `${year}-01-01`), lte(cutiPegawai.selesai, `${year}-12-31`)));
    if (Number(used?.total ?? 0) + request.durasi > (quota?.total ?? 12)) throw new Error("Kuota cuti tidak mencukupi untuk persetujuan ini.");
  }
  await db.update(cutiPegawai).set({ status, catatan: catatan || null, diputuskanOleh: user.id, diputuskanAt: new Date() })
    .where(and(eq(cutiPegawai.villageId, villageId), eq(cutiPegawai.id, id)));
}

export async function ringkasanKuotaCuti(tahun = tahunLokal()) {
  const { villageId } = await village("cuti-izin");
  await sinkronkanPegawaiPerangkat(villageId);
  const pegawai = await db.select({ id: kepegawaianPegawai.id, nama: kepegawaianPegawai.nama }).from(kepegawaianPegawai)
    .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.status, "aktif")));
  const hasil = [];
  for (const person of pegawai) {
    const [quota] = await db.select({ total: cutiKuota.total }).from(cutiKuota)
      .where(and(eq(cutiKuota.villageId, villageId), eq(cutiKuota.pegawaiId, person.id), eq(cutiKuota.tahun, tahun))).limit(1);
    const [used] = await db.select({ total: sql<number>`coalesce(sum(${cutiPegawai.durasi}),0)` }).from(cutiPegawai)
      .where(and(eq(cutiPegawai.villageId, villageId), eq(cutiPegawai.pegawaiId, person.id), eq(cutiPegawai.jenis, "cuti_tahunan"), eq(cutiPegawai.status, "disetujui"), gte(cutiPegawai.mulai, `${tahun}-01-01`), lte(cutiPegawai.selesai, `${tahun}-12-31`)));
    hasil.push({ ...person, total: quota?.total ?? 12, terpakai: Number(used?.total ?? 0) });
  }
  return hasil;
}

export async function simpanKuotaCuti(pegawaiId: number, tahun: number, total: number) {
  const { villageId } = await village("cuti-izin", "update");
  if (!Number.isInteger(total) || total < 0 || total > 365) throw new Error("Kuota cuti tidak valid.");
  const [used] = await db.select({ total: sql<number>`coalesce(sum(${cutiPegawai.durasi}),0)` }).from(cutiPegawai)
    .where(and(eq(cutiPegawai.villageId,villageId),eq(cutiPegawai.pegawaiId,pegawaiId),eq(cutiPegawai.jenis,"cuti_tahunan"),eq(cutiPegawai.status,"disetujui"),gte(cutiPegawai.mulai,`${tahun}-01-01`),lte(cutiPegawai.selesai,`${tahun}-12-31`)));
  if(total < Number(used?.total ?? 0)) throw new Error("Kuota baru tidak boleh lebih kecil dari cuti yang sudah terpakai.");
  const [pegawai] = await db.select({ id: kepegawaianPegawai.id }).from(kepegawaianPegawai)
    .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.id, pegawaiId))).limit(1);
  if (!pegawai) throw new Error("Pegawai tidak ditemukan.");
  const [existing] = await db.select({ id: cutiKuota.id }).from(cutiKuota)
    .where(and(eq(cutiKuota.villageId, villageId), eq(cutiKuota.pegawaiId, pegawaiId), eq(cutiKuota.tahun, tahun))).limit(1);
  if (existing) await db.update(cutiKuota).set({ total }).where(eq(cutiKuota.id, existing.id));
  else await db.insert(cutiKuota).values({ villageId, pegawaiId, tahun, total });
}

export async function daftarRiwayatPegawai(pegawaiId: number) {
  const { villageId } = await village("kepegawaian");
  return db.select().from(kepegawaianRiwayat)
    .where(and(eq(kepegawaianRiwayat.villageId, villageId), eq(kepegawaianRiwayat.pegawaiId, pegawaiId)))
    .orderBy(desc(kepegawaianRiwayat.mulai));
}


export async function opsiPerangkatBelumTerhubung() {
  const { villageId } = await village("kepegawaian");
  const [officials, linked] = await Promise.all([
    db.select({ id: perangkatDesa.id, nama: perangkatDesa.nama, jabatan: jabatanPerangkat.nama })
      .from(perangkatDesa)
      .leftJoin(jabatanPerangkat, and(eq(perangkatDesa.jabatanId, jabatanPerangkat.id), eq(jabatanPerangkat.villageId, villageId)))
      .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.status, "aktif"))),
    db.select({ perangkatId: kepegawaianPegawai.perangkatId }).from(kepegawaianPegawai)
      .where(eq(kepegawaianPegawai.villageId, villageId)),
  ]);
  const linkedIds = new Set(linked.map((x) => x.perangkatId).filter((x): x is number => x !== null));
  return officials.filter((x) => !linkedIds.has(x.id));
}

export async function tambahRiwayatPegawai(input: { pegawaiId:number; jabatan:string; unitKerja?:string|null; nomorSk?:string|null; mulai:string; selesai?:string|null; keterangan?:string|null }) {
  const { villageId } = await village("kepegawaian", "update");
  if (!input.jabatan.trim() || !input.mulai) throw new Error("Jabatan dan tanggal mulai wajib diisi.");
  if (input.selesai && input.selesai < input.mulai) throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  const [pegawai] = await db.select({id:kepegawaianPegawai.id}).from(kepegawaianPegawai)
    .where(and(eq(kepegawaianPegawai.villageId,villageId),eq(kepegawaianPegawai.id,input.pegawaiId))).limit(1);
  if(!pegawai) throw new Error("Pegawai tidak ditemukan.");
  await db.insert(kepegawaianRiwayat).values({villageId,pegawaiId:input.pegawaiId,jabatan:input.jabatan.trim(),unitKerja:input.unitKerja||null,nomorSk:input.nomorSk||null,mulai:input.mulai,selesai:input.selesai||null,keterangan:input.keterangan||null});
}

export async function simpanDokumenPegawai(input: {pegawaiId:number;judul:string;kategori:string;nomor?:string|null;tanggal?:string|null;berkas:string}) {
  const { villageId } = await village("kepegawaian", "update");
  if(!input.judul.trim()||!input.berkas) throw new Error("Judul dan berkas dokumen wajib diisi.");
  const [pegawai]=await db.select({id:kepegawaianPegawai.id}).from(kepegawaianPegawai)
    .where(and(eq(kepegawaianPegawai.villageId,villageId),eq(kepegawaianPegawai.id,input.pegawaiId))).limit(1);
  if(!pegawai) throw new Error("Pegawai tidak ditemukan.");
  await db.insert(kepegawaianDokumen).values({villageId,pegawaiId:input.pegawaiId,judul:input.judul.trim(),kategori:input.kategori,nomor:input.nomor||null,tanggal:input.tanggal||null,berkas:input.berkas});
}

export async function daftarDokumenPegawai(pegawaiId:number) {
  const { villageId } = await village("kepegawaian");
  return db.select().from(kepegawaianDokumen)
    .where(and(eq(kepegawaianDokumen.villageId,villageId),eq(kepegawaianDokumen.pegawaiId,pegawaiId)))
    .orderBy(desc(kepegawaianDokumen.createdAt));
}


export async function getPengaturanKehadiran() {
  const { villageId } = await village("kehadiran");
  const [setting] = await db.select().from(kehadiranPengaturan)
    .where(eq(kehadiranPengaturan.villageId, villageId)).limit(1);
  return setting ?? { jamMasuk:"08:00", jamKeluar:"16:00", hariLibur:"[0,6]", latitudeKantor:null, longitudeKantor:null, radiusMeter:100, toleransiTerlambatMenit:0, wajibGps:true, wajibFoto:true };
}

export async function simpanPengaturanKehadiran(input:{jamMasuk:string;jamKeluar:string;hariLibur:number[];latitudeKantor?:string|null;longitudeKantor?:string|null;radiusMeter?:number;toleransiTerlambatMenit?:number;wajibGps?:boolean;wajibFoto?:boolean}) {
  const { user, villageId } = await village("kehadiran","update");
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.jamMasuk)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.jamKeluar)) throw new Error("Format jam kerja harus HH:MM.");
  if(input.jamKeluar<=input.jamMasuk) throw new Error("Jam pulang harus setelah jam masuk.");
  if(!Array.isArray(input.hariLibur)||input.hariLibur.some(x=>!Number.isInteger(x)||x<0||x>6)) throw new Error("Hari libur tidak valid.");
  const lat = input.latitudeKantor?.trim() || null;
  const lng = input.longitudeKantor?.trim() || null;
  if ((lat === null) !== (lng === null)) throw new Error("Koordinat kantor harus diisi berpasangan.");
  if (lat !== null && (!Number.isFinite(Number(lat)) || Number(lat) < -90 || Number(lat) > 90 || !Number.isFinite(Number(lng)) || Number(lng) < -180 || Number(lng) > 180)) throw new Error("Koordinat kantor tidak valid.");
  const radiusMeter = input.radiusMeter ?? 100;
  const toleransiTerlambatMenit = input.toleransiTerlambatMenit ?? 0;
  if (!Number.isInteger(radiusMeter) || radiusMeter < 20 || radiusMeter > 5000) throw new Error("Radius lokasi harus 20–5000 meter.");
  if (!Number.isInteger(toleransiTerlambatMenit) || toleransiTerlambatMenit < 0 || toleransiTerlambatMenit > 180) throw new Error("Toleransi keterlambatan harus 0–180 menit.");
  if (input.wajibGps !== false && (lat === null || lng === null)) throw new Error("Isi koordinat kantor sebelum mengaktifkan validasi GPS.");
  const [existing]=await db.select({id:kehadiranPengaturan.id}).from(kehadiranPengaturan)
    .where(eq(kehadiranPengaturan.villageId,villageId)).limit(1);
  const values={jamMasuk:input.jamMasuk,jamKeluar:input.jamKeluar,hariLibur:JSON.stringify([...new Set(input.hariLibur)]),latitudeKantor:lat,longitudeKantor:lng,radiusMeter,toleransiTerlambatMenit,wajibGps:input.wajibGps!==false,wajibFoto:input.wajibFoto!==false,diperbaruiOleh:user.id};
  if(existing) await db.update(kehadiranPengaturan).set(values).where(eq(kehadiranPengaturan.id,existing.id));
  else await db.insert(kehadiranPengaturan).values({...values,villageId});
}



function jarakMeter(lat1:number, lon1:number, lat2:number, lon2:number):number {
  const rad=(value:number)=>value*Math.PI/180;
  const dLat=rad(lat2-lat1), dLon=rad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
  return 6371000*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

/** Catat check-in/check-out mandiri untuk akun yang emailnya terhubung ke master pegawai. */
export async function catatAbsensiMandiri(input:{latitude:number|null;longitude:number|null;fotoMasuk?:string|null}) {
  const user=await requireUser();
  const villageId=await resolveVillageId(user);
  if((input.latitude===null)!==(input.longitude===null)) throw new Error("Koordinat GPS harus diisi berpasangan.");
  if(input.latitude!==null&&input.longitude!==null&&(!Number.isFinite(input.latitude)||input.latitude < -90||input.latitude > 90||!Number.isFinite(input.longitude)||input.longitude < -180||input.longitude > 180)) throw new Error("Koordinat GPS tidak valid.");
  const [pegawai]=await db.select({id:kepegawaianPegawai.id,nama:kepegawaianPegawai.nama}).from(kepegawaianPegawai)
    .where(and(eq(kepegawaianPegawai.villageId,villageId),eq(kepegawaianPegawai.status,"aktif"),eq(kepegawaianPegawai.email,user.email))).limit(1);
  if(!pegawai) throw new Error("Akun belum ditautkan ke data pegawai. Hubungi administrator desa untuk mengisi email akun pada profil pegawai.");
  const [setting]=await db.select().from(kehadiranPengaturan).where(eq(kehadiranPengaturan.villageId,villageId)).limit(1);
  const wajibGps=setting?.wajibGps??true;
  const wajibFoto=setting?.wajibFoto??true;
  if(wajibGps && (input.latitude===null||input.longitude===null)) throw new Error("Ambil lokasi GPS sebelum mengirim absensi.");
  if(wajibGps && (!setting?.latitudeKantor||!setting?.longitudeKantor)) throw new Error("Lokasi kantor belum dikonfigurasi administrator.");
  if(wajibGps && input.latitude!==null && input.longitude!==null && setting?.latitudeKantor && setting.longitudeKantor) {
    const distance=jarakMeter(input.latitude,input.longitude,Number(setting.latitudeKantor),Number(setting.longitudeKantor));
    if(distance>(setting.radiusMeter??100)) throw new Error(`Anda berada di luar area absensi kantor (jarak sekitar ${Math.round(distance)} meter).`);
  }
  return denganKunciMysql(`absensi:${villageId}:${pegawai.id}:${tanggalLokal()}`, async () => {
    const tanggal=tanggalLokal();
    const now=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());
    const [existing]=await db.select().from(kehadiranPerangkat)
      .where(and(eq(kehadiranPerangkat.villageId,villageId),eq(kehadiranPerangkat.pegawaiId,pegawai.id),eq(kehadiranPerangkat.tanggal,tanggal))).limit(1);
    if(existing?.jamKeluar) throw new Error("Absensi hari ini sudah lengkap. Check-in dan check-out sudah tercatat.");
    if(!existing && wajibFoto && !input.fotoMasuk) throw new Error("Foto selfie wajib dilampirkan saat check-in.");
    if(existing) {
      if(!existing.jamMasuk) throw new Error("Data absensi hari ini perlu diperiksa administrator.");
      const masukMenit=Number(existing.jamMasuk.slice(0,2))*60+Number(existing.jamMasuk.slice(3,5));
      const sekarangMenit=Number(now.slice(0,2))*60+Number(now.slice(3,5));
      if(sekarangMenit-masukMenit<2) throw new Error("Check-in baru saja tercatat. Tunggu sebelum melakukan check-out.");
      await db.update(kehadiranPerangkat).set({jamKeluar:now})
        .where(and(eq(kehadiranPerangkat.villageId,villageId),eq(kehadiranPerangkat.id,existing.id)));
      return {aksi:"check_out" as const,nama:pegawai.nama,jam:now};
    }
    await db.insert(kehadiranPerangkat).values({
      villageId,pegawaiId:pegawai.id,perangkatId:null,tanggal,jamMasuk:now,status:"hadir",
      latitudeMasuk:input.latitude===null?null:String(input.latitude),longitudeMasuk:input.longitude===null?null:String(input.longitude),fotoMasuk:input.fotoMasuk??null,
    });
    return {aksi:"check_in" as const,nama:pegawai.nama,jam:now};
  });
}

export async function daftarKehadiranBulanan(tahun:number, bulan:number) {
  const { villageId } = await village("kehadiran");
  if(!Number.isInteger(tahun)||tahun<2000||tahun>2200||!Number.isInteger(bulan)||bulan<1||bulan>12) throw new Error("Periode kalender tidak valid.");
  const mulai=`${tahun}-${String(bulan).padStart(2,"0")}-01`;
  const akhir=new Date(Date.UTC(tahun,bulan,0)).toISOString().slice(0,10);
  return db.select({tanggal:kehadiranPerangkat.tanggal,status:kehadiranPerangkat.status,total:sql<number>`count(*)`})
    .from(kehadiranPerangkat)
    .where(and(eq(kehadiranPerangkat.villageId,villageId),gte(kehadiranPerangkat.tanggal,mulai),lte(kehadiranPerangkat.tanggal,akhir)))
    .groupBy(kehadiranPerangkat.tanggal,kehadiranPerangkat.status)
    .orderBy(asc(kehadiranPerangkat.tanggal));
}


export async function hapusRiwayatPegawai(id:number) {
  const { villageId } = await village("kepegawaian","update");
  await db.delete(kepegawaianRiwayat).where(and(eq(kepegawaianRiwayat.villageId,villageId),eq(kepegawaianRiwayat.id,id)));
}

export async function hapusDokumenPegawai(id:number) {
  const { villageId } = await village("kepegawaian","update");
  const [doc]=await db.select({berkas:kepegawaianDokumen.berkas}).from(kepegawaianDokumen)
    .where(and(eq(kepegawaianDokumen.villageId,villageId),eq(kepegawaianDokumen.id,id))).limit(1);
  if(!doc) throw new Error("Dokumen pegawai tidak ditemukan.");
  await db.delete(kepegawaianDokumen).where(and(eq(kepegawaianDokumen.villageId,villageId),eq(kepegawaianDokumen.id,id)));
  await hapusMedia(doc.berkas);
}


export async function ubahRiwayatPegawai(input:{id:number;pegawaiId:number;jabatan:string;unitKerja?:string|null;nomorSk?:string|null;mulai:string;selesai?:string|null;keterangan?:string|null}) {
  const { villageId } = await village("kepegawaian","update");
  if(!input.jabatan.trim()||!input.mulai) throw new Error("Jabatan dan tanggal mulai wajib diisi.");
  if(input.selesai&&input.selesai<input.mulai) throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  const [existing]=await db.select({id:kepegawaianRiwayat.id}).from(kepegawaianRiwayat)
    .where(and(eq(kepegawaianRiwayat.villageId,villageId),eq(kepegawaianRiwayat.id,input.id),eq(kepegawaianRiwayat.pegawaiId,input.pegawaiId))).limit(1);
  if(!existing) throw new Error("Riwayat jabatan tidak ditemukan.");
  await db.update(kepegawaianRiwayat).set({jabatan:input.jabatan.trim(),unitKerja:input.unitKerja||null,nomorSk:input.nomorSk||null,mulai:input.mulai,selesai:input.selesai||null,keterangan:input.keterangan||null})
    .where(and(eq(kepegawaianRiwayat.villageId,villageId),eq(kepegawaianRiwayat.id,input.id)));
}
