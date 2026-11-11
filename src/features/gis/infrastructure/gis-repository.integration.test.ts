import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { areas, villages } from "@/db/schema";
import {
  deleteCdesaMutasi,
  deletePersil,
  findCdesaById,
  findPersilById,
  insertArea,
  insertCdesa,
  insertCdesaMutasi,
  insertGaris,
  insertPersil,
  insertPoint,
  insertPolygon,
  insertSimbol,
  listAreas,
  listCdesa,
  listCdesaMutasi,
  listGaris,
  listPersil,
  listPoints,
  listSimbol,
  updateCdesa,
  updateCdesaMutasi,
  updatePersil,
} from "@/features/gis/infrastructure/gis-repository";
import { jalankanMigrasiUji } from "@/testing/migrasi-uji";

/**
 * Uji isolasi tenant dan perilaku layer GIS pada database nyata.
 *
 * Dua desa dibuat agar setiap daftar/ubah/hapus terbukti ter-scope
 * `village_id`; layer nonaktif juga harus tersaring dari data publik.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

let dbReady = false;
let fixture: {
  desaA: number;
  desaB: number;
  areaA: number;
  garisA: number;
  pointA: number;
  persilA: number;
  cdesaA: number;
  mutasiA: number;
  simbolId: number;
} | null = null;

beforeAll(async () => {
  const dsn = process.env.DATABASE_URL ?? "";
  try {
    const dbName = new URL(dsn).pathname.replace(/^\//, "") || "desa_test";
    const server = await mysql.createConnection(dsn.replace(/\/[^/]*$/, ""));
    await server.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await server.end();
    // Query ringan untuk memastikan koneksi benar-benar siap.
    await db.execute(sql`SELECT 1`);
  } catch {
    return;
  }

  dbReady = true;
  await jalankanMigrasiUji(db, { dsn, migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa GIS A ${RUN}`, code: `GA${RUN}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa GIS B ${RUN}`, code: `GB${RUN}` })
    .$returningId();

  const desaA = desaARow?.id;
  const desaB = desaBRow?.id;
  if (desaA === undefined || desaB === undefined) {
    throw new Error("Seed uji gagal: desa tidak terbentuk");
  }

  const polygonA = await insertPolygon(desaA, {
    nama: `Permukiman A ${RUN}`,
    simbol: null,
    color: "#3b82f6",
    tipe: 0,
    parrent: null,
    enabled: true,
    sortOrder: 0,
  });
  await insertPolygon(desaB, {
    nama: `Permukiman B ${RUN}`,
    simbol: null,
    color: "#ef4444",
    tipe: 0,
    parrent: null,
    enabled: true,
    sortOrder: 0,
  });

  const areaA = await insertArea(desaA, {
    nama: `Area A ${RUN}`,
    refPolygon: polygonA,
    path: null,
    foto: null,
    desk: null,
    sortOrder: 0,
  });
  await insertArea(desaA, {
    nama: `Area Nonaktif A ${RUN}`,
    refPolygon: polygonA,
    path: null,
    foto: null,
    desk: null,
    sortOrder: 1,
  });
  await insertArea(desaB, {
    nama: "Area B",
    refPolygon: null,
    path: null,
    foto: null,
    desk: null,
    sortOrder: 0,
  });

  const garisA = await insertGaris(desaA, {
    nama: `Jalan A ${RUN}`,
    refLine: null,
    path: null,
    foto: null,
    desk: null,
    sortOrder: 0,
  });
  await insertGaris(desaB, {
    nama: "Jalan B",
    refLine: null,
    path: null,
    foto: null,
    desk: null,
    sortOrder: 0,
  });

  const pointA = await insertPoint(desaA, {
    nama: `Kantor A ${RUN}`,
    simbol: null,
    tipe: 0,
    parrent: polygonA,
    path: null,
  });
  await insertPoint(desaB, {
    nama: "Kantor B",
    simbol: null,
    tipe: 0,
    parrent: null,
    path: null,
  });

  const persilA = await insertPersil(desaA, {
    nomor: `P-A-${RUN}`,
    nomorCdesa: null,
    luas: 125,
    status: "milik",
    path: null,
    keterangan: null,
  });
  await insertPersil(desaB, {
    nomor: `P-B-${RUN}`,
    nomorCdesa: null,
    luas: 200,
    status: "milik",
    path: null,
    keterangan: null,
  });

  const cdesaA = await insertCdesa(desaA, {
    id: 0,
    villageId: desaA,
    nomor: `C-A-${RUN}`,
    nomorPersil: `P-A-${RUN}`,
    nomorSertifikat: null,
    tanggal: "2026-01-01",
    namaPemegang: "Budi",
    luas: 125,
    keterangan: null,
    sortOrder: 0,
  });
  await insertCdesa(desaB, {
    id: 0,
    villageId: desaB,
    nomor: `C-B-${RUN}`,
    nomorPersil: `P-B-${RUN}`,
    nomorSertifikat: null,
    tanggal: "2026-01-01",
    namaPemegang: "Ani",
    luas: 200,
    keterangan: null,
    sortOrder: 0,
  });

  const mutasiA = await insertCdesaMutasi({
    villageId: desaA,
    cdesaId: cdesaA,
    nomor: `M-A-${RUN}`,
    tanggal: "2026-02-01",
    tipe: "jual",
    keterangan: null,
    sortOrder: 0,
  });

  const simbolId = await insertSimbol({
    simbol: `SIM-${RUN}`,
    desk: null,
    sortOrder: 0,
  });

  // Nonaktifkan satu area untuk menguji penyaringan data publik.
  const nonaktif = await db
    .select({ id: areas.id })
    .from(areas)
    .where(eq(areas.nama, `Area Nonaktif A ${RUN}`))
    .limit(1);
  if (nonaktif[0]) {
    await db.update(areas).set({ enabled: 0 }).where(eq(areas.id, nonaktif[0].id));
  }

  fixture = { desaA, desaB, areaA, garisA, pointA, persilA, cdesaA, mutasiA, simbolId };
});

afterAll(async () => {
  if (!fixture) return;
  await db.delete(villages).where(inArray(villages.id, [fixture.desaA, fixture.desaB]));
});

describe("repository GIS: isolasi tenant", () => {
  it("hanya menampilkan area desa sendiri dan menyaring yang nonaktif dari publik", async (ctx) => {
    if (!dbReady || !fixture) return ctx.skip();

    const semua = await listAreas(fixture.desaA);
    expect(semua).toHaveLength(2);
    expect(semua.every((area) => area.villageId === fixture!.desaA)).toBe(true);

    const publik = await listAreas(fixture.desaA, true);
    expect(publik).toHaveLength(1);
    expect(publik[0]?.nama).toContain(`Area A ${RUN}`);
  });

  it("hanya menampilkan garis dan titik desa sendiri", async (ctx) => {
    if (!dbReady || !fixture) return ctx.skip();

    expect((await listGaris(fixture.desaA)).map((item) => item.nama)).toEqual([`Jalan A ${RUN}`]);
    expect((await listPoints(fixture.desaA)).map((item) => item.nama)).toEqual([`Kantor A ${RUN}`]);
  });

  it("menolak ubah/hapus persil milik desa lain", async (ctx) => {
    if (!dbReady || !fixture) return ctx.skip();

    await updatePersil(fixture.desaB, fixture.persilA, {
      nomor: "DIAMBIL-ALIH",
      nomorCdesa: null,
      luas: 1,
      status: "sengketa",
      path: null,
      keterangan: null,
    });
    await deletePersil(fixture.desaB, fixture.persilA);

    const persil = await findPersilById(fixture.desaA, fixture.persilA);
    expect(persil?.nomor).toBe(`P-A-${RUN}`);
    expect(persil?.status).toBe("milik");
    expect(await listPersil(fixture.desaB)).toHaveLength(1);
  });

  it("hanya menampilkan Cdesa desa sendiri dan menolak update lintas desa", async (ctx) => {
    if (!dbReady || !fixture) return ctx.skip();

    expect((await listCdesa(fixture.desaA)).map((item) => item.nomor)).toEqual([`C-A-${RUN}`]);
    expect(await findCdesaById(fixture.desaB, fixture.cdesaA)).toBeNull();

    const berhasil = await updateCdesa(fixture.desaB, fixture.cdesaA, {
      nomor: "HACK",
      nomorPersil: null,
      nomorSertifikat: null,
      tanggal: null,
      namaPemegang: null,
      luas: 1,
      keterangan: null,
      sortOrder: 0,
    });

    expect(berhasil).toBe(false);
    expect((await findCdesaById(fixture.desaA, fixture.cdesaA))?.nomor).toBe(`C-A-${RUN}`);
  });

  it("menolak ubah/hapus mutasi Cdesa lintas desa", async (ctx) => {
    if (!dbReady || !fixture) return ctx.skip();

    const berhasil = await updateCdesaMutasi(fixture.desaB, fixture.mutasiA, {
      cdesaId: fixture.cdesaA,
      nomor: "HACK",
      tanggal: "2026-01-01",
      tipe: "hibah",
      keterangan: null,
      sortOrder: 0,
    });
    await deleteCdesaMutasi(fixture.desaB, fixture.mutasiA);

    expect(berhasil).toBe(false);
    const mutasi = await listCdesaMutasi(fixture.desaA);
    expect(mutasi.map((item) => item.nomor)).toEqual([`M-A-${RUN}`]);
  });

  it("katalog simbol bersifat global dan memuat simbol baru", async (ctx) => {
    if (!dbReady || !fixture) return ctx.skip();

    const simbol = await listSimbol();
    expect(simbol.some((item) => item.simbol === `SIM-${RUN}`)).toBe(true);
    expect(fixture.simbolId).toBeGreaterThan(0);
  });
});
