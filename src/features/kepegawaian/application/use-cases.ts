import "server-only";

import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  cutiKuota,
  cutiPegawai,
  kehadiranPerangkat,
  kepegawaianPegawai,
  kepegawaianRiwayat,
  perangkatDesa,
  jabatanPerangkat,
} from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";

function tanggalLokal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
function tahunLokal(): number { return Number(tanggalLokal().slice(0, 4)); }
function hitungHariKerja(mulai: string, selesai: string): number {
  const start = new Date(`${mulai}T00:00:00+07:00`);
  const end = new Date(`${selesai}T00:00:00+07:00`);
  if (end < start) throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  let total = 0;
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) total += 1;
  }
  return Math.max(1, total);
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
    foto: perangkatDesa.foto, jabatan: jabatanPerangkat.nama,
  }).from(perangkatDesa)
    .leftJoin(jabatanPerangkat, and(eq(perangkatDesa.jabatanId, jabatanPerangkat.id), eq(jabatanPerangkat.villageId, villageId)))
    .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.status, "aktif")));
  for (const item of perangkat) {
    const [existing] = await db.select({ id: kepegawaianPegawai.id }).from(kepegawaianPegawai)
      .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.perangkatId, item.id))).limit(1);
    if (!existing) {
      await db.insert(kepegawaianPegawai).values({
        villageId, perangkatId: item.id, nama: item.nama, nip: item.nip, nik: item.nik,
        jenisKelamin: item.jenisKelamin, tempatLahir: item.tempatLahir,
        tanggalLahir: item.tanggalLahir, foto: item.foto, jabatan: item.jabatan,
        statusPegawai: "tetap", status: "aktif",
      });
    } else {
      await db.update(kepegawaianPegawai).set({
        nama: item.nama, nip: item.nip, nik: item.nik, jenisKelamin: item.jenisKelamin,
        tempatLahir: item.tempatLahir, tanggalLahir: item.tanggalLahir,
        foto: item.foto, jabatan: item.jabatan,
      }).where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.id, existing.id)));
    }
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
  if (input.nik && !/^\d{16}$/.test(input.nik)) throw new Error("NIK harus 16 digit.");
  if (input.tanggalMasuk && input.tanggalKeluar && input.tanggalKeluar < input.tanggalMasuk) throw new Error("Tanggal keluar tidak boleh sebelum tanggal masuk.");
  if (input.perangkatId) {
    const [official] = await db.select({ id: perangkatDesa.id }).from(perangkatDesa)
      .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.id, input.perangkatId))).limit(1);
    if (!official) throw new Error("Perangkat desa tidak ditemukan pada tenant ini.");
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
    db.select({ pegawai: kepegawaianPegawai.nama, jabatan: kepegawaianPegawai.jabatan, jamMasuk: kehadiranPerangkat.jamMasuk, jamKeluar: kehadiranPerangkat.jamKeluar, status: kehadiranPerangkat.status })
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
    totalPegawai: employees.length, hadir, izin, cuti, tidakHadir,
    tingkatKehadiran: employees.length ? Math.round((hadir / employees.length) * 1000) / 10 : 0,
    komposisi: { tetap: employees.filter((x) => x.statusPegawai === "tetap").length, kontrak: employees.filter((x) => x.statusPegawai === "kontrak").length, purnaTugas: employees.filter((x) => x.statusPegawai === "purna_tugas").length },
    todayRows: todayRows.map((x) => ({ ...x, status: x.status ?? "tidak_hadir" })),
    trendRows, leaves,
  };
}

export async function daftarAbsensi(tanggal = tanggalLokal()) {
  const { villageId } = await village("kehadiran");
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

export async function catatAbsensiManual(input: { pegawaiId: number; tanggal: string; jamMasuk?: string; jamKeluar?: string; status: string; catatan?: string }) {
  const { villageId } = await village("kehadiran", "update");
  const [pegawai] = await db.select({ id: kepegawaianPegawai.id }).from(kepegawaianPegawai)
    .where(and(eq(kepegawaianPegawai.villageId, villageId), eq(kepegawaianPegawai.id, input.pegawaiId), eq(kepegawaianPegawai.status, "aktif"))).limit(1);
  if (!pegawai) throw new Error("Pegawai aktif tidak ditemukan.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tanggal)) throw new Error("Tanggal absensi tidak valid.");
  if (!["hadir", "izin", "cuti", "tidak_hadir"].includes(input.status)) throw new Error("Status absensi tidak valid.");
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
    status: cutiPegawai.status, catatan: cutiPegawai.catatan,
  }).from(cutiPegawai).innerJoin(kepegawaianPegawai, and(eq(cutiPegawai.villageId, kepegawaianPegawai.villageId), eq(cutiPegawai.pegawaiId, kepegawaianPegawai.id)))
    .where(and(eq(cutiPegawai.villageId, villageId), gte(cutiPegawai.mulai, `${tahun}-01-01`), lte(cutiPegawai.mulai, `${tahun}-12-31`)))
    .orderBy(desc(cutiPegawai.createdAt));
}

export async function ajukanCuti(input: { pegawaiId: number; jenis: string; mulai: string; selesai: string; alasan: string }) {
  const { villageId } = await village("cuti-izin", "update");
  if (!input.alasan.trim()) throw new Error("Alasan cuti/izin wajib diisi.");
  if (input.mulai < tanggalLokal()) throw new Error("Tanggal mulai tidak boleh di masa lalu.");
  const durasi = hitungHariKerja(input.mulai, input.selesai);
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
  await db.insert(cutiPegawai).values({ villageId, pegawaiId: input.pegawaiId, jenis: input.jenis, mulai: input.mulai, selesai: input.selesai, durasi, alasan: input.alasan.trim() });
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
