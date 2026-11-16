import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  analisisIndikator,
  analisisKategori,
  areas,
  inventaris,
  inventarisKategori,
  kelompok,
  kelompokMaster,
  polygons,
  villages,
} from "@/db/schema";
import { deleteAnalisisKategori } from "@/features/analisis/infrastructure/analisis-repository";
import { deletePolygon } from "@/features/gis/infrastructure/gis-repository";
import { deleteInventarisKategori } from "@/features/inventaris/infrastructure/inventaris-repository";
import { deleteKategori } from "@/features/kelompok/infrastructure/kelompok-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  desaA: number;
  desaB: number;
  analisisA: number;
  analisisB: number;
  polygonA: number;
  polygonB: number;
  inventarisA: number;
  inventarisB: number;
  kelompokA: number;
  kelompokB: number;
}

let fixture: Fixture | null = null;

function dataUji(): Fixture {
  if (fixture === null) throw new Error("Fixture integration belum siap.");
  return fixture;
}

function idDari(row: { id: number } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed gagal: ${label}.`);
  return row.id;
}

async function kodeGalat(upaya: () => Promise<unknown>): Promise<unknown> {
  let current: unknown;
  try {
    await upaya();
  } catch (error) {
    current = error;
  }
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const item = current as { code?: unknown; errno?: unknown; cause?: unknown };
    const code = item.code ?? item.errno;
    if (code !== undefined) return code;
    current = item.cause;
  }
  return undefined;
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa B4C2B A ${RUN}`, code: `BA${RUN}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa B4C2B B ${RUN}`, code: `BB${RUN}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [analisisARow] = await db
    .insert(analisisKategori)
    .values({ villageId: desaA, nama: `Analisis A ${RUN}` })
    .$returningId();
  const [analisisBRow] = await db
    .insert(analisisKategori)
    .values({ villageId: desaB, nama: `Analisis B ${RUN}` })
    .$returningId();
  const [polygonARow] = await db
    .insert(polygons)
    .values({ villageId: desaA, nama: `Polygon A ${RUN}` })
    .$returningId();
  const [polygonBRow] = await db
    .insert(polygons)
    .values({ villageId: desaB, nama: `Polygon B ${RUN}` })
    .$returningId();
  const [inventarisARow] = await db
    .insert(inventarisKategori)
    .values({ villageId: desaA, kode: `IA${RUN}`, nama: `Inventaris A ${RUN}`, golongan: "tanah" })
    .$returningId();
  const [inventarisBRow] = await db
    .insert(inventarisKategori)
    .values({
      villageId: desaB,
      kode: `IB${RUN}`,
      nama: `Inventaris B ${RUN}`,
      golongan: "peralatan_mesin",
    })
    .$returningId();
  const [kelompokARow] = await db
    .insert(kelompokMaster)
    .values({ villageId: desaA, name: `Kelompok A ${RUN}`, type: "kelompok" })
    .$returningId();
  const [kelompokBRow] = await db
    .insert(kelompokMaster)
    .values({ villageId: desaB, name: `Kelompok B ${RUN}`, type: "kelompok" })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    analisisA: idDari(analisisARow, "kategori analisis A"),
    analisisB: idDari(analisisBRow, "kategori analisis B"),
    polygonA: idDari(polygonARow, "polygon A"),
    polygonB: idDari(polygonBRow, "polygon B"),
    inventarisA: idDari(inventarisARow, "kategori inventaris A"),
    inventarisB: idDari(inventarisBRow, "kategori inventaris B"),
    kelompokA: idDari(kelompokARow, "kategori kelompok A"),
    kelompokB: idDari(kelompokBRow, "kategori kelompok B"),
  };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];
  await db.delete(analisisIndikator).where(inArray(analisisIndikator.villageId, desaIds));
  await db.delete(areas).where(inArray(areas.villageId, desaIds));
  await db.delete(inventaris).where(inArray(inventaris.villageId, desaIds));
  await db.delete(kelompok).where(inArray(kelompok.villageId, desaIds));
  await db.delete(analisisKategori).where(inArray(analisisKategori.villageId, desaIds));
  await db.delete(polygons).where(inArray(polygons.villageId, desaIds));
  await db.delete(inventarisKategori).where(inArray(inventarisKategori.villageId, desaIds));
  await db.delete(kelompokMaster).where(inArray(kelompokMaster.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("AUD-034 B4C-2b composite tenant FK", () => {
  it("menolak insert lintas desa pada keempat relasi", async () => {
    const f = dataUji();
    const attempts = [
      () =>
        db.insert(analisisIndikator).values({
          villageId: f.desaA,
          kategoriId: f.analisisB,
          kode: `AX${RUN}`,
          nama: "Indikator lintas desa",
        }),
      () =>
        db
          .insert(areas)
          .values({ villageId: f.desaA, nama: `Area lintas ${RUN}`, refPolygon: f.polygonB }),
      () =>
        db.insert(inventaris).values({
          villageId: f.desaA,
          kategoriId: f.inventarisB,
          namaBarang: `Barang lintas ${RUN}`,
        }),
      () =>
        db.insert(kelompok).values({
          villageId: f.desaA,
          name: `Kelompok lintas ${RUN}`,
          slug: `kelompok-lintas-${RUN}`,
          type: "kelompok",
          categoryId: f.kelompokB,
        }),
    ];

    for (const attempt of attempts) {
      expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(await kodeGalat(attempt));
    }
  });

  it("menerima referensi sewilayah dan NULL", async () => {
    const f = dataUji();
    await db.insert(analisisIndikator).values({
      villageId: f.desaA,
      kategoriId: f.analisisA,
      kode: `AV${RUN}`,
      nama: "Indikator sah",
    });
    await db
      .insert(areas)
      .values({ villageId: f.desaA, nama: `Area sah ${RUN}`, refPolygon: f.polygonA });
    await db.insert(inventaris).values({
      villageId: f.desaA,
      kategoriId: f.inventarisA,
      namaBarang: `Barang sah ${RUN}`,
    });
    await db.insert(kelompok).values({
      villageId: f.desaA,
      name: `Kelompok sah ${RUN}`,
      slug: `kelompok-sah-${RUN}`,
      type: "kelompok",
      categoryId: f.kelompokA,
    });

    await db.insert(analisisIndikator).values({
      villageId: f.desaA,
      kategoriId: null,
      kode: `AN${RUN}`,
      nama: "Indikator tanpa kategori",
    });
    await db.insert(areas).values({ villageId: f.desaA, nama: `Area tanpa polygon ${RUN}` });
    await db
      .insert(inventaris)
      .values({ villageId: f.desaA, namaBarang: `Barang tanpa kategori ${RUN}` });
    await db.insert(kelompok).values({
      villageId: f.desaA,
      name: `Kelompok tanpa kategori ${RUN}`,
      slug: `kelompok-tanpa-kategori-${RUN}`,
      type: "kelompok",
      categoryId: null,
    });
  });

  it("menolak update lintas desa pada keempat relasi", async () => {
    const f = dataUji();
    const [indikator] = await db
      .insert(analisisIndikator)
      .values({
        villageId: f.desaA,
        kategoriId: f.analisisA,
        kode: `AU${RUN}`,
        nama: "Indikator update",
      })
      .$returningId();
    const [area] = await db
      .insert(areas)
      .values({
        villageId: f.desaA,
        nama: `Area update ${RUN}`,
        refPolygon: f.polygonA,
      })
      .$returningId();
    const [barang] = await db
      .insert(inventaris)
      .values({
        villageId: f.desaA,
        kategoriId: f.inventarisA,
        namaBarang: `Barang update ${RUN}`,
      })
      .$returningId();
    const [grup] = await db
      .insert(kelompok)
      .values({
        villageId: f.desaA,
        name: `Kelompok update ${RUN}`,
        slug: `kelompok-update-${RUN}`,
        type: "kelompok",
        categoryId: f.kelompokA,
      })
      .$returningId();

    const attempts = [
      () =>
        db
          .update(analisisIndikator)
          .set({ kategoriId: f.analisisB })
          .where(eq(analisisIndikator.id, idDari(indikator, "indikator update"))),
      () =>
        db
          .update(areas)
          .set({ refPolygon: f.polygonB })
          .where(eq(areas.id, idDari(area, "area update"))),
      () =>
        db
          .update(inventaris)
          .set({ kategoriId: f.inventarisB })
          .where(eq(inventaris.id, idDari(barang, "barang update"))),
      () =>
        db
          .update(kelompok)
          .set({ categoryId: f.kelompokB })
          .where(eq(kelompok.id, idDari(grup, "kelompok update"))),
    ];
    for (const attempt of attempts) {
      expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(await kodeGalat(attempt));
    }
  });

  it("menolak penghapusan langsung parent yang masih dirujuk", async () => {
    const f = dataUji();
    const checks = [
      () => db.delete(analisisKategori).where(eq(analisisKategori.id, f.analisisA)),
      () => db.delete(polygons).where(eq(polygons.id, f.polygonA)),
      () => db.delete(inventarisKategori).where(eq(inventarisKategori.id, f.inventarisA)),
      () => db.delete(kelompokMaster).where(eq(kelompokMaster.id, f.kelompokA)),
    ];
    for (const check of checks) {
      expect([1451, "ER_ROW_IS_REFERENCED_2"]).toContain(await kodeGalat(check));
    }
  });

  it("melepas referensi sewilayah saat parent dihapus lewat repository", async () => {
    const f = dataUji();
    await db.insert(analisisIndikator).values({
      villageId: f.desaB,
      kategoriId: f.analisisB,
      kode: `BV${RUN}`,
      nama: "Indikator desa B",
    });
    await db
      .insert(areas)
      .values({ villageId: f.desaB, nama: `Area desa B ${RUN}`, refPolygon: f.polygonB });
    await db.insert(inventaris).values({
      villageId: f.desaB,
      kategoriId: f.inventarisB,
      namaBarang: `Barang desa B ${RUN}`,
    });
    await db.insert(kelompok).values({
      villageId: f.desaB,
      name: `Kelompok desa B ${RUN}`,
      slug: `kelompok-desa-b-${RUN}`,
      type: "kelompok",
      categoryId: f.kelompokB,
    });

    await deleteAnalisisKategori(f.analisisA, f.desaA);
    await deletePolygon(f.desaA, f.polygonA);
    await deleteInventarisKategori(f.desaA, f.inventarisA);
    await deleteKategori(f.desaA, f.kelompokA);

    const [indikator, area, barang, grup, indikatorB, areaB, barangB, grupB] = await Promise.all([
      db
        .select({ kategoriId: analisisIndikator.kategoriId })
        .from(analisisIndikator)
        .where(
          and(eq(analisisIndikator.villageId, f.desaA), eq(analisisIndikator.kode, `AV${RUN}`)),
        ),
      db
        .select({ refPolygon: areas.refPolygon })
        .from(areas)
        .where(and(eq(areas.villageId, f.desaA), eq(areas.nama, `Area sah ${RUN}`))),
      db
        .select({ kategoriId: inventaris.kategoriId })
        .from(inventaris)
        .where(
          and(eq(inventaris.villageId, f.desaA), eq(inventaris.namaBarang, `Barang sah ${RUN}`)),
        ),
      db
        .select({ categoryId: kelompok.categoryId })
        .from(kelompok)
        .where(and(eq(kelompok.villageId, f.desaA), eq(kelompok.slug, `kelompok-sah-${RUN}`))),
      db
        .select({ kategoriId: analisisIndikator.kategoriId })
        .from(analisisIndikator)
        .where(
          and(eq(analisisIndikator.villageId, f.desaB), eq(analisisIndikator.kode, `BV${RUN}`)),
        ),
      db
        .select({ refPolygon: areas.refPolygon })
        .from(areas)
        .where(and(eq(areas.villageId, f.desaB), eq(areas.nama, `Area desa B ${RUN}`))),
      db
        .select({ kategoriId: inventaris.kategoriId })
        .from(inventaris)
        .where(
          and(eq(inventaris.villageId, f.desaB), eq(inventaris.namaBarang, `Barang desa B ${RUN}`)),
        ),
      db
        .select({ categoryId: kelompok.categoryId })
        .from(kelompok)
        .where(and(eq(kelompok.villageId, f.desaB), eq(kelompok.slug, `kelompok-desa-b-${RUN}`))),
    ]);

    expect(indikator).toEqual([{ kategoriId: null }]);
    expect(area).toEqual([{ refPolygon: null }]);
    expect(barang).toEqual([{ kategoriId: null }]);
    expect(grup).toEqual([{ categoryId: null }]);
    expect(indikatorB).toEqual([{ kategoriId: f.analisisB }]);
    expect(areaB).toEqual([{ refPolygon: f.polygonB }]);
    expect(barangB).toEqual([{ kategoriId: f.inventarisB }]);
    expect(grupB).toEqual([{ categoryId: f.kelompokB }]);
  });
});
