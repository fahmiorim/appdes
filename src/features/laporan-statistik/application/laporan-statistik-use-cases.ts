import "server-only";
import { and, asc, count, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bantuanPeserta, bantuanProgram, educations, incomingLetters, inventaris, keuangan, keuanganTemplate, layananPublik, occupations, outgoingLetters, pengajuanLayanan, pembangunanProyek, regions, residents } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";

export type JenisLaporan = "penduduk" | "keuangan" | "pembangunan" | "bantuan" | "aset" | "layanan" | "surat-masuk" | "surat-keluar";
export type KategoriStatistik = "gender" | "umur" | "pendidikan" | "pekerjaan" | "dusun";
export type Baris = (string | number)[];
const yearOf = (value?: number) => Number.isInteger(value) && value! >= 2000 && value! <= 2100 ? value! : new Date().getFullYear();
async function tenant() {
  const user = await requirePermission("laporan-statistik", "read");
  return resolveVillageId(user);
}

export async function getDashboardLaporan(tahun?: number) {
  const villageId = await tenant(), year = yearOf(tahun);
  const [pop, finance, project, programs, participants, latest] = await Promise.all([
    db.select({ total: count(), male: sql<number>`SUM(CASE WHEN ${residents.gender}='male' THEN 1 ELSE 0 END)`, female: sql<number>`SUM(CASE WHEN ${residents.gender}='female' THEN 1 ELSE 0 END)` }).from(residents).where(and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive"))),
    db.select({ budget: sql<string>`COALESCE(SUM(${keuangan.anggaran}),0)`, actual: sql<string>`COALESCE(SUM(${keuangan.realisasi}),0)` }).from(keuangan).where(and(eq(keuangan.villageId, villageId), eq(keuangan.tahun, year), eq(keuangan.templateUuid, "5"))),
    db.select({ total: count(), done: sql<number>`SUM(CASE WHEN ${pembangunanProyek.status}='selesai' THEN 1 ELSE 0 END)`, active: sql<number>`SUM(CASE WHEN ${pembangunanProyek.status}='berjalan' THEN 1 ELSE 0 END)`, avg: sql<number>`COALESCE(AVG(${pembangunanProyek.progres}),0)` }).from(pembangunanProyek).where(and(eq(pembangunanProyek.villageId, villageId), eq(pembangunanProyek.tahunAnggaran, year))),
    db.select({ total: count() }).from(bantuanProgram).where(and(
      eq(bantuanProgram.villageId, villageId),
      or(isNull(bantuanProgram.startDate), lte(bantuanProgram.startDate, `${year}-12-31`)),
      or(isNull(bantuanProgram.endDate), gte(bantuanProgram.endDate, `${year}-01-01`)),
    )),
    db.select({ total: count(bantuanPeserta.id) }).from(bantuanPeserta)
      .innerJoin(bantuanProgram, and(eq(bantuanPeserta.programId, bantuanProgram.id), eq(bantuanPeserta.villageId, bantuanProgram.villageId)))
      .where(and(
        eq(bantuanPeserta.villageId, villageId),
        or(isNull(bantuanProgram.startDate), lte(bantuanProgram.startDate, `${year}-12-31`)),
        or(isNull(bantuanProgram.endDate), gte(bantuanProgram.endDate, `${year}-01-01`)),
      )),
    db.select({ id: pembangunanProyek.id, title: pembangunanProyek.judul, status: pembangunanProyek.status, progress: pembangunanProyek.progres, budget: pembangunanProyek.anggaran }).from(pembangunanProyek).where(and(eq(pembangunanProyek.villageId, villageId), eq(pembangunanProyek.tahunAnggaran, year))).orderBy(desc(pembangunanProyek.updatedAt)).limit(5),
  ]);
  const p = pop[0] ?? { total: 0, male: 0, female: 0 }, f = finance[0] ?? { budget: "0", actual: "0" }, b = project[0] ?? { total: 0, done: 0, active: 0, avg: 0 };
  const budget = Number(f.budget), actual = Number(f.actual);
  return { year, population: { total: Number(p.total), male: Number(p.male), female: Number(p.female) }, finance: { budget, actual, percent: budget ? actual / budget * 100 : 0 }, project: { total: Number(b.total), done: Number(b.done), active: Number(b.active), avg: Number(b.avg) }, assistance: { programs: Number(programs[0]?.total ?? 0), participants: Number(participants[0]?.total ?? 0) }, latest };
}

export async function getLaporanDesa(jenis: JenisLaporan, tahun?: number) {
  const villageId = await tenant(), year = yearOf(tahun);
  if (jenis === "penduduk") {
    const rows = await db.select({ gender: residents.gender, education: educations.name, occupation: occupations.name, dusun: regions.dusun, total: count() }).from(residents)
      .leftJoin(educations, eq(residents.educationId, educations.id)).leftJoin(occupations, eq(residents.occupationId, occupations.id))
      .leftJoin(regions, and(eq(residents.regionId, regions.id), eq(regions.villageId, villageId)))
      .where(and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive")))
      .groupBy(residents.gender, educations.name, occupations.name, regions.dusun).orderBy(asc(regions.dusun));
    return { year, columns: ["Jenis Kelamin", "Pendidikan", "Pekerjaan", "Dusun", "Jumlah"], rows: rows.map(r => [r.gender === "male" ? "Laki-laki" : r.gender === "female" ? "Perempuan" : "Tidak diketahui", r.education ?? "Belum diisi", r.occupation ?? "Belum diisi", r.dusun ?? "Belum diisi", Number(r.total)]) };
  }
  if (jenis === "keuangan") {
    const rows = await db.select({ code: keuangan.templateUuid, name: keuanganTemplate.uraian, budget: keuangan.anggaran, actual: keuangan.realisasi }).from(keuangan)
      .innerJoin(keuanganTemplate, eq(keuangan.templateUuid, keuanganTemplate.uuid)).where(and(eq(keuangan.villageId, villageId), eq(keuangan.tahun, year))).orderBy(asc(keuangan.templateUuid));
    return { year, columns: ["Kode Rekening", "Uraian", "Anggaran", "Realisasi", "Sisa"], rows: rows.map(r => [r.code, r.name, Number(r.budget), Number(r.actual), Number(r.budget) - Number(r.actual)]) };
  }
  if (jenis === "aset") {
    const rows = await db.select({ code: inventaris.nomorInventaris, name: inventaris.namaBarang, category: inventaris.kategoriId, quantity: inventaris.jumlah, unit: inventaris.satuan, condition: inventaris.kondisi, location: inventaris.lokasi, value: inventaris.nilaiAkhir, year: inventaris.tahunPembelian }).from(inventaris)
      .where(and(eq(inventaris.villageId, villageId), eq(inventaris.isDeleted, false), or(isNull(inventaris.tahunPembelian), eq(inventaris.tahunPembelian, year))))
      .orderBy(asc(inventaris.namaBarang));
    return { year, columns: ["Nomor Inventaris", "Nama Aset", "ID Kategori", "Jumlah", "Satuan", "Kondisi", "Lokasi", "Nilai Aset", "Tahun Pembelian"], rows: rows.map(r => [r.code ?? "", r.name, r.category ?? "", Number(r.quantity), r.unit ?? "", r.condition, r.location ?? "", Number(r.value ?? 0), r.year ?? ""]) };
  }
  if (jenis === "layanan") {
    const start = `${year}-01-01 00:00:00`, end = `${year}-12-31 23:59:59`;
    const rows = await db.select({ ticket: pengajuanLayanan.nomorTiket, service: layananPublik.nama, applicant: pengajuanLayanan.namaPemohon, status: pengajuanLayanan.status, createdAt: pengajuanLayanan.createdAt, processedAt: pengajuanLayanan.selesaiPada }).from(pengajuanLayanan)
      .innerJoin(layananPublik, and(eq(pengajuanLayanan.layananId, layananPublik.id), eq(pengajuanLayanan.villageId, layananPublik.villageId)))
      .where(and(eq(pengajuanLayanan.villageId, villageId), gte(pengajuanLayanan.createdAt, new Date(start)), lte(pengajuanLayanan.createdAt, new Date(end))))
      .orderBy(desc(pengajuanLayanan.createdAt));
    return { year, columns: ["Nomor Tiket", "Jenis Layanan", "Nama Pemohon", "Status", "Tanggal Pengajuan", "Tanggal Selesai"], rows: rows.map(r => [r.ticket, r.service, r.applicant, r.status, r.createdAt.toISOString(), r.processedAt?.toISOString() ?? ""]) };
  }
  if (jenis === "surat-masuk") {
    const rows = await db.select({ agenda: incomingLetters.agendaNumber, date: incomingLetters.receivedDate, number: incomingLetters.letterNumber, sender: incomingLetters.sender, summary: incomingLetters.summary, disposition: incomingLetters.disposition, archive: incomingLetters.archiveLocation }).from(incomingLetters)
      .where(and(eq(incomingLetters.villageId, villageId), gte(incomingLetters.receivedDate, `${year}-01-01`), lte(incomingLetters.receivedDate, `${year}-12-31`)))
      .orderBy(desc(incomingLetters.receivedDate));
    return { year, columns: ["Nomor Agenda", "Tanggal Terima", "Nomor Surat", "Pengirim", "Ringkasan", "Disposisi", "Lokasi Arsip"], rows: rows.map(r => [r.agenda, r.date, r.number, r.sender ?? "", r.summary ?? "", r.disposition ?? "", r.archive ?? ""]) };
  }
  if (jenis === "surat-keluar") {
    const rows = await db.select({ agenda: outgoingLetters.agendaNumber, date: outgoingLetters.letterDate, number: outgoingLetters.letterNumber, recipient: outgoingLetters.recipient, summary: outgoingLetters.summary, sent: outgoingLetters.sentDate, archive: outgoingLetters.archiveLocation }).from(outgoingLetters)
      .where(and(eq(outgoingLetters.villageId, villageId), gte(outgoingLetters.letterDate, `${year}-01-01`), lte(outgoingLetters.letterDate, `${year}-12-31`)))
      .orderBy(desc(outgoingLetters.letterDate));
    return { year, columns: ["Nomor Agenda", "Tanggal Surat", "Nomor Surat", "Penerima", "Ringkasan", "Tanggal Kirim", "Lokasi Arsip"], rows: rows.map(r => [r.agenda, r.date, r.number, r.recipient ?? "", r.summary ?? "", r.sent ?? "", r.archive ?? ""]) };
  }
  if (jenis === "pembangunan") {
    const rows = await db.select({ title: pembangunanProyek.judul, location: pembangunanProyek.lokasi, source: pembangunanProyek.sumberDana, status: pembangunanProyek.status, progress: pembangunanProyek.progres, budget: pembangunanProyek.anggaran, start: pembangunanProyek.mulai, end: pembangunanProyek.selesai }).from(pembangunanProyek)
      .where(and(eq(pembangunanProyek.villageId, villageId), eq(pembangunanProyek.tahunAnggaran, year))).orderBy(asc(pembangunanProyek.judul));
    return { year, columns: ["Kegiatan", "Lokasi", "Sumber Dana", "Status", "Progres", "Anggaran", "Mulai", "Selesai"], rows: rows.map(r => [r.title, r.location ?? "", r.source ?? "", r.status, Number(r.progress), Number(r.budget ?? 0), r.start ?? "", r.end ?? ""]) };
  }
  const rows = await db.select({ name: bantuanProgram.name, target: bantuanProgram.sasaran, start: bantuanProgram.startDate, end: bantuanProgram.endDate, participants: count(bantuanPeserta.id) }).from(bantuanProgram)
    .leftJoin(bantuanPeserta, and(eq(bantuanPeserta.programId, bantuanProgram.id), eq(bantuanPeserta.villageId, villageId)))
    .where(and(
      eq(bantuanProgram.villageId, villageId),
      or(isNull(bantuanProgram.startDate), lte(bantuanProgram.startDate, `${year}-12-31`)),
      or(isNull(bantuanProgram.endDate), gte(bantuanProgram.endDate, `${year}-01-01`)),
    )).groupBy(bantuanProgram.id, bantuanProgram.name, bantuanProgram.sasaran, bantuanProgram.startDate, bantuanProgram.endDate).orderBy(asc(bantuanProgram.name));
  return { year, columns: ["Program", "Sasaran", "Mulai", "Selesai", "Peserta"], rows: rows.map(r => [r.name, r.target, r.start ?? "", r.end ?? "", Number(r.participants)]) };
}

export async function getStatistikDesa(kategori: KategoriStatistik) {
  const villageId = await tenant();
  if (kategori === "gender") {
    const rows = await db.select({ label: residents.gender, total: count() }).from(residents).where(and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive"))).groupBy(residents.gender).orderBy(desc(count()));
    return rows.map(r => ({ label: r.label === "male" ? "Laki-laki" : r.label === "female" ? "Perempuan" : "Tidak diketahui", total: Number(r.total) }));
  }
  if (kategori === "pendidikan") {
    const rows = await db.select({ label: educations.name, total: count() }).from(residents).leftJoin(educations, eq(residents.educationId, educations.id)).where(and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive"))).groupBy(educations.name).orderBy(desc(count()));
    return rows.map(r => ({ label: r.label ?? "Belum diisi", total: Number(r.total) }));
  }
  if (kategori === "pekerjaan") {
    const rows = await db.select({ label: occupations.name, total: count() }).from(residents).leftJoin(occupations, eq(residents.occupationId, occupations.id)).where(and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive"))).groupBy(occupations.name).orderBy(desc(count()));
    return rows.map(r => ({ label: r.label ?? "Belum diisi", total: Number(r.total) }));
  }
  if (kategori === "dusun") {
    const rows = await db.select({ label: regions.dusun, total: count() }).from(residents).leftJoin(regions, and(eq(residents.regionId, regions.id), eq(regions.villageId, villageId))).where(and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive"))).groupBy(regions.dusun).orderBy(desc(count()));
    return rows.map(r => ({ label: r.label ?? "Belum diisi", total: Number(r.total) }));
  }
  const ageCase = sql<string>`CASE WHEN ${residents.birthDate} IS NULL THEN 'Belum diisi' WHEN TIMESTAMPDIFF(YEAR,${residents.birthDate},CURDATE()) < 5 THEN '0–4 tahun' WHEN TIMESTAMPDIFF(YEAR,${residents.birthDate},CURDATE()) < 13 THEN '5–12 tahun' WHEN TIMESTAMPDIFF(YEAR,${residents.birthDate},CURDATE()) < 18 THEN '13–17 tahun' WHEN TIMESTAMPDIFF(YEAR,${residents.birthDate},CURDATE()) < 60 THEN '18–59 tahun' ELSE '60 tahun ke atas' END`;
  const rows = await db.select({ label: ageCase, total: count() }).from(residents).where(and(eq(residents.villageId, villageId), eq(residents.lifeStatus, "alive"))).groupBy(ageCase);
  return rows.map(r => ({ label: r.label, total: Number(r.total) }));
}

export async function getRekapAnalisis(tahun?: number) {
  const villageId = await tenant(), year = yearOf(tahun);
  const trend = await Promise.all([year - 2, year - 1, year].map(async y => {
    const [f, p] = await Promise.all([
      db.select({ budget: sql<string>`COALESCE(SUM(${keuangan.anggaran}),0)`, actual: sql<string>`COALESCE(SUM(${keuangan.realisasi}),0)` }).from(keuangan).where(and(eq(keuangan.villageId, villageId), eq(keuangan.tahun, y), eq(keuangan.templateUuid, "5"))),
      db.select({ total: count(), done: sql<number>`SUM(CASE WHEN ${pembangunanProyek.status}='selesai' THEN 1 ELSE 0 END)`, progress: sql<number>`COALESCE(AVG(${pembangunanProyek.progres}),0)` }).from(pembangunanProyek).where(and(eq(pembangunanProyek.villageId, villageId), eq(pembangunanProyek.tahunAnggaran, y))),
    ]);
    return { year: y, budget: Number(f[0]?.budget ?? 0), actual: Number(f[0]?.actual ?? 0), projects: Number(p[0]?.total ?? 0), done: Number(p[0]?.done ?? 0), progress: Number(p[0]?.progress ?? 0) };
  }));
  const current = trend[2]!;
  return { year, trend, realization: current.budget ? current.actual / current.budget * 100 : 0, completion: current.projects ? current.done / current.projects * 100 : 0 };
}
