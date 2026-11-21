import "server-only";

import { and, asc, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { areas, lembagaAnggota, lembagaDesa, perangkatDesa, jabatanPerangkat, regions } from "@/db/schema";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { requirePermission } from "@/lib/dal";

async function tenant(resource: string, action: "read" | "create" | "update" | "delete" = "read") {
  const user = await requirePermission(resource, action);
  return resolveVillageId(user);
}

export async function getPemerintahanDashboard() {
  const villageId = await tenant("pemerintahan-dashboard");
  const [[perangkat], [lembaga], [bpd], [dusun], [rt], [rw], [area]] = await Promise.all([
    db.select({ total: count() }).from(perangkatDesa).where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.status, "aktif"))),
    db.select({ total: count() }).from(lembagaDesa).where(and(eq(lembagaDesa.villageId, villageId), eq(lembagaDesa.status, "aktif"))),
    db.select({ total: count() }).from(lembagaAnggota).innerJoin(lembagaDesa, and(eq(lembagaAnggota.lembagaId, lembagaDesa.id), eq(lembagaAnggota.villageId, villageId))).where(and(eq(lembagaAnggota.villageId, villageId), eq(lembagaAnggota.aktif, true), eq(lembagaDesa.jenis, "bpd"))),
    db.select({ total: count() }).from(regions).where(and(eq(regions.villageId, villageId), eq(regions.rw, ""), eq(regions.rt, ""))),
    db.select({ total: count() }).from(regions).where(and(eq(regions.villageId, villageId), eq(regions.rt, ""))),
    db.select({ total: count() }).from(regions).where(and(eq(regions.villageId, villageId), eq(regions.rw, ""))),
    db.select({ total: count() }).from(areas).where(and(eq(areas.villageId, villageId), eq(areas.enabled, 1))),
  ]);
  const [officials, institutions, wilayah] = await Promise.all([
    db.select({ id: perangkatDesa.id, nama: perangkatDesa.nama, jabatan: jabatanPerangkat.nama, atasanId: perangkatDesa.atasanId, urut: perangkatDesa.urut })
      .from(perangkatDesa).leftJoin(jabatanPerangkat, and(eq(perangkatDesa.jabatanId, jabatanPerangkat.id), eq(jabatanPerangkat.villageId, villageId)))
      .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.status, "aktif"))).orderBy(asc(perangkatDesa.urut)),
    db.select({ id: lembagaDesa.id, nama: lembagaDesa.nama, jenis: lembagaDesa.jenis, status: lembagaDesa.status })
      .from(lembagaDesa).where(eq(lembagaDesa.villageId, villageId)).orderBy(asc(lembagaDesa.urut)),
    db.select({ dusun: regions.dusun, rt: regions.rt, rw: regions.rw }).from(regions).where(eq(regions.villageId, villageId)),
  ]);
  const dusunNames = new Set(wilayah.map((x) => x.dusun).filter(Boolean));
  const rtNames = new Set(wilayah.map((x) => x.rt).filter(Boolean));
  const rwNames = new Set(wilayah.map((x) => x.rw).filter(Boolean));
  return {
    totalPerangkat: perangkat?.total ?? 0,
    totalLembaga: lembaga?.total ?? 0,
    totalBpd: bpd?.total ?? 0,
    totalDusun: dusun?.total ? dusun.total : dusunNames.size,
    totalRt: rt?.total ? rt.total : rtNames.size,
    totalRw: rw?.total ? rw.total : rwNames.size,
    totalArea: area?.total ?? 0,
    perangkat: officials,
    lembaga: institutions,
    wilayah: { dusun: dusunNames.size, rt: rtNames.size, rw: rwNames.size },
  };
}

export async function getPerangkatDesaData() {
  const villageId = await tenant("perangkat-desa");
  const [rows, jabatan] = await Promise.all([
    db.select({
      id: perangkatDesa.id, nama: perangkatDesa.nama, gelarDepan: perangkatDesa.gelarDepan,
      gelarBelakang: perangkatDesa.gelarBelakang, nip: perangkatDesa.nip, nik: perangkatDesa.nik,
      jabatanId: perangkatDesa.jabatanId, jabatan: jabatanPerangkat.nama, jenisKelamin: perangkatDesa.jenisKelamin,
      tempatLahir: perangkatDesa.tempatLahir, tanggalLahir: perangkatDesa.tanggalLahir, foto: perangkatDesa.foto,
      status: perangkatDesa.status, periode: perangkatDesa.periode, pendidikan: perangkatDesa.pendidikan,
      telepon: perangkatDesa.telepon, email: perangkatDesa.email, alamat: perangkatDesa.alamat,
      nomorSkPengangkatan: perangkatDesa.nomorSkPengangkatan, tanggalPengangkatan: perangkatDesa.tanggalPengangkatan,
      atasanId: perangkatDesa.atasanId, urut: perangkatDesa.urut,
    }).from(perangkatDesa).leftJoin(jabatanPerangkat, and(eq(perangkatDesa.jabatanId, jabatanPerangkat.id), eq(jabatanPerangkat.villageId, villageId)))
      .where(eq(perangkatDesa.villageId, villageId)).orderBy(asc(perangkatDesa.urut), asc(perangkatDesa.id)),
    db.select({ id: jabatanPerangkat.id, nama: jabatanPerangkat.nama }).from(jabatanPerangkat)
      .where(eq(jabatanPerangkat.villageId, villageId)).orderBy(asc(jabatanPerangkat.urut)),
  ]);
  return { rows, jabatan };
}

export async function simpanPerangkatDesa(id: number | null, input: {
  nama: string; gelarDepan: string | null; gelarBelakang: string | null; jabatanId: number | null;
  nip: string | null; nik: string | null; jenisKelamin: string | null; tempatLahir: string | null;
  tanggalLahir: string | null; foto: string | null; status: string; periode: string | null;
  pendidikan: string | null; telepon: string | null; email: string | null; alamat: string | null;
  nomorSkPengangkatan: string | null; tanggalPengangkatan: string | null; atasanId: number | null; urut: number;
}) {
  const villageId = await tenant("perangkat-desa", id ? "update" : "create");
  if (input.jabatanId) {
    const [jabatan] = await db.select({ id: jabatanPerangkat.id }).from(jabatanPerangkat)
      .where(and(eq(jabatanPerangkat.villageId, villageId), eq(jabatanPerangkat.id, input.jabatanId))).limit(1);
    if (!jabatan) throw new Error("Jabatan tidak ditemukan pada desa aktif.");
  }
  if (input.atasanId === id) throw new Error("Perangkat tidak dapat menjadi atasan dirinya sendiri.");
  if (input.atasanId) {
    const [parent] = await db.select({ id: perangkatDesa.id }).from(perangkatDesa)
      .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.id, input.atasanId))).limit(1);
    if (!parent) throw new Error("Atasan tidak ditemukan pada desa aktif.");
  }
  const data = { ...input, foto: input.foto || null };
  if (id) await db.update(perangkatDesa).set(data).where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.id, id)));
  else await db.insert(perangkatDesa).values({ ...data, villageId });
}

export async function hapusPerangkatDesa(id: number) {
  const villageId = await tenant("perangkat-desa", "delete");
  await db.update(perangkatDesa).set({ atasanId: null }).where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.atasanId, id)));
  await db.delete(perangkatDesa).where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.id, id)));
}

export async function getLembagaDesaData() {
  const villageId = await tenant("lembaga-desa");
  const [rows, anggota] = await Promise.all([
    db.select().from(lembagaDesa).where(eq(lembagaDesa.villageId, villageId)).orderBy(asc(lembagaDesa.urut), asc(lembagaDesa.id)),
    db.select().from(lembagaAnggota).where(eq(lembagaAnggota.villageId, villageId)).orderBy(asc(lembagaAnggota.urut), asc(lembagaAnggota.id)),
  ]);
  return { rows, anggota };
}

export async function simpanLembagaDesa(id: number | null, input: {
  nama: string; jenis: string; deskripsi: string | null; tugasFungsi: string | null;
  dasarHukum: string | null; masaBaktiMulai: string | null; masaBaktiSelesai: string | null;
  status: string; tampilPublik: boolean; urut: number;
}) {
  const villageId = await tenant("lembaga-desa", id ? "update" : "create");
  if (id) await db.update(lembagaDesa).set(input).where(and(eq(lembagaDesa.villageId, villageId), eq(lembagaDesa.id, id)));
  else await db.insert(lembagaDesa).values({ ...input, villageId });
}

export async function hapusLembagaDesa(id: number) {
  const villageId = await tenant("lembaga-desa", "delete");
  await db.delete(lembagaDesa).where(and(eq(lembagaDesa.villageId, villageId), eq(lembagaDesa.id, id)));
}

export async function simpanAnggotaLembaga(id: number | null, input: {
  lembagaId: number; nama: string; jabatan: string | null; foto: string | null;
  periodeMulai: string | null; periodeSelesai: string | null; aktif: boolean; tampilPublik: boolean; urut: number;
}) {
  const villageId = await tenant("lembaga-desa", id ? "update" : "create");
  const [parent] = await db.select({ id: lembagaDesa.id }).from(lembagaDesa)
    .where(and(eq(lembagaDesa.villageId, villageId), eq(lembagaDesa.id, input.lembagaId))).limit(1);
  if (!parent) throw new Error("Lembaga tidak ditemukan pada desa aktif.");
  if (id) await db.update(lembagaAnggota).set(input).where(and(eq(lembagaAnggota.villageId, villageId), eq(lembagaAnggota.id, id)));
  else await db.insert(lembagaAnggota).values({ ...input, villageId });
}

export async function hapusAnggotaLembaga(id: number) {
  const villageId = await tenant("lembaga-desa", "delete");
  await db.delete(lembagaAnggota).where(and(eq(lembagaAnggota.villageId, villageId), eq(lembagaAnggota.id, id)));
}

export async function getWilayahPemerintahanData() {
  const villageId = await tenant("wilayah");
  const [rows, shapes] = await Promise.all([
    db.select().from(regions).where(eq(regions.villageId, villageId)).orderBy(asc(regions.sortOrder), asc(regions.dusun), asc(regions.rw), asc(regions.rt)),
    db.select({ id: areas.id, nama: areas.nama, enabled: areas.enabled, path: areas.path, refPolygon: areas.refPolygon }).from(areas)
      .where(eq(areas.villageId, villageId)).orderBy(asc(areas.sortOrder)),
  ]);
  return { rows, shapes };
}


export async function simpanAreaPeta(id: number | null, input: { nama: string; path: string | null; enabled: number; sortOrder: number }) {
  const villageId = await tenant("wilayah", id ? "update" : "create");
  if (input.path) {
    const geo = JSON.parse(input.path) as { type?: string; coordinates?: unknown };
    if (!geo || geo.type !== "Polygon" || !Array.isArray(geo.coordinates)) throw new Error("Geometri harus berupa GeoJSON Polygon yang valid.");
  }
  if (id) await db.update(areas).set(input).where(and(eq(areas.villageId, villageId), eq(areas.id, id)));
  else await db.insert(areas).values({ ...input, villageId });
}

export async function hapusAreaPeta(id: number) {
  const villageId = await tenant("wilayah", "delete");
  await db.delete(areas).where(and(eq(areas.villageId, villageId), eq(areas.id, id)));
}

export async function simpanJabatanPerangkat(id: number | null, nama: string, urut: number) {
  const villageId = await tenant("perangkat-desa", id ? "update" : "create");
  const slug = nama.normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("Nama jabatan tidak valid.");
  const [duplicate] = await db.select({ id: jabatanPerangkat.id }).from(jabatanPerangkat)
    .where(and(eq(jabatanPerangkat.villageId, villageId), eq(jabatanPerangkat.slug, slug))).limit(1);
  if (duplicate && duplicate.id !== id) throw new Error("Jabatan dengan nama tersebut sudah terdaftar.");
  if (id) await db.update(jabatanPerangkat).set({ nama, slug, urut }).where(and(eq(jabatanPerangkat.villageId, villageId), eq(jabatanPerangkat.id, id)));
  else await db.insert(jabatanPerangkat).values({ villageId, nama, slug, urut });
}

export async function hapusJabatanPerangkat(id: number) {
  const villageId = await tenant("perangkat-desa", "delete");
  const [used] = await db.select({ id: perangkatDesa.id }).from(perangkatDesa)
    .where(and(eq(perangkatDesa.villageId, villageId), eq(perangkatDesa.jabatanId, id))).limit(1);
  if (used) throw new Error("Jabatan masih dipakai perangkat desa. Pindahkan jabatan perangkat terlebih dahulu.");
  await db.delete(jabatanPerangkat).where(and(eq(jabatanPerangkat.villageId, villageId), eq(jabatanPerangkat.id, id)));
}
