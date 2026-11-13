import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { inventaris, inventarisKategori, inventarisMutasi, villages } from "@/db/schema";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-034 Batch 3 — composite tenant FK untuk `inventaris_mutasi.inventaris_id`.
 *
 * Test ini memakai `db.insert`/`db.update` langsung, sehingga kegagalan akan
 * muncul bila composite FK dihapus dari schema meskipun seluruh jalur aplikasi
 * masih menyaring `villageId`.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = String(Date.now()).slice(-8);
/** `villages.code` hanya 10 karakter; prefiks pendek agar tidak terpotong. */
const KODE = String(Date.now()).slice(-5);

interface Fixture {
  desaA: number;
  desaB: number;
  asetA: number;
  asetB: number;
}

let fixture: Fixture | null = null;

function dataUji(): Fixture {
  if (fixture === null) throw new Error("Fixture integrasi tidak siap.");
  return fixture;
}

function idDari(baris: { id: number } | undefined, label: string): number {
  const id = baris?.id;
  if (id === undefined) throw new Error(`Seed uji gagal: ${label} tidak terbentuk.`);
  return id;
}

/** Ambil `code`/`errno` dari error Drizzle maupun mysql2 di `cause`. */
async function kodeGalat(upaya: () => Promise<unknown>): Promise<unknown> {
  let error: unknown;
  try {
    await upaya();
  } catch (caught) {
    error = caught;
  }
  let current = error;
  let kode: unknown;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const nilai = current as { code?: unknown; errno?: unknown; cause?: unknown };
    kode = nilai.code ?? nilai.errno;
    if (kode !== undefined) break;
    current = nilai.cause;
  }
  return kode;
}

async function sisipMutasi(params: {
  villageId: number;
  inventarisId: number;
  jenis?: "pindah" | "hapus";
}): Promise<number> {
  const [row] = await db
    .insert(inventarisMutasi)
    .values({
      villageId: params.villageId,
      inventarisId: params.inventarisId,
      jenis: params.jenis ?? "pindah",
      tanggalMutasi: "2026-03-01",
      alasan: `Uji B3 ${RUN}`,
    })
    .$returningId();
  return idDari(row, "mutasi");
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa B3 FK A ${RUN}`, code: `F3A${KODE}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa B3 FK B ${RUN}`, code: `F3B${KODE}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [kategoriARow] = await db
    .insert(inventarisKategori)
    .values({
      villageId: desaA,
      kode: `KA${RUN}`,
      nama: `Kategori A ${RUN}`,
      golongan: "tanah",
    })
    .$returningId();

  const [asetARow] = await db
    .insert(inventaris)
    .values({
      villageId: desaA,
      kategoriId: idDari(kategoriARow, "kategori A"),
      namaBarang: `Aset A ${RUN}`,
      jumlah: "1.00",
    })
    .$returningId();
  const [asetBRow] = await db
    .insert(inventaris)
    .values({
      villageId: desaB,
      namaBarang: `Aset B ${RUN}`,
      jumlah: "1.00",
    })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    asetA: idDari(asetARow, "aset A"),
    asetB: idDari(asetBRow, "aset B"),
  };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];
  // Urutan eksplisit: baris lintas desa yang gagal ditolak tetap bisa ada bila
  // constraint belum terpasang, sehingga cascade satu statement tidak cukup.
  await db.delete(inventarisMutasi).where(inArray(inventarisMutasi.villageId, desaIds));
  await db.delete(inventaris).where(inArray(inventaris.villageId, desaIds));
  await db.delete(inventarisKategori).where(inArray(inventarisKategori.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("B3 composite FK inventaris_mutasi", () => {
  it("berjalan pada MySQL 8", async () => {
    const versi = (await db.execute(sql`SELECT VERSION() AS versi`)) as unknown as [
      Array<{ versi: string }>,
      unknown,
    ];
    expect(versi[0][0]?.versi).toMatch(/^8\./);
  });

  it("memasang unique key parent dan composite FK dengan aturan cascade", async () => {
    const hasil = (await db.execute(sql`
      SELECT k.CONSTRAINT_NAME AS nama,
             GROUP_CONCAT(k.COLUMN_NAME ORDER BY k.ORDINAL_POSITION) AS kolom,
             GROUP_CONCAT(k.REFERENCED_COLUMN_NAME ORDER BY k.ORDINAL_POSITION) AS referensi,
             r.DELETE_RULE AS aturan
      FROM information_schema.KEY_COLUMN_USAGE k
      JOIN information_schema.REFERENTIAL_CONSTRAINTS r
        ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
       AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
       AND r.TABLE_NAME = k.TABLE_NAME
      WHERE k.CONSTRAINT_SCHEMA = DATABASE()
        AND k.CONSTRAINT_NAME = 'inventaris_mutasi_inventaris_tenant_fk'
      GROUP BY k.CONSTRAINT_NAME, r.DELETE_RULE
    `)) as unknown as [
      Array<{ nama: string; kolom: string; referensi: string; aturan: string }>,
      unknown,
    ];
    expect(hasil[0]).toHaveLength(1);
    expect(hasil[0][0]).toMatchObject({
      kolom: "village_id,inventaris_id",
      referensi: "village_id,id",
      aturan: "CASCADE",
    });

    const lama = (await db.execute(sql`
      SELECT CONSTRAINT_NAME AS nama
      FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND CONSTRAINT_NAME = 'inventaris_mutasi_inventaris_id_inventaris_id_fk'
    `)) as unknown as [Array<{ nama: string }>, unknown];
    expect(lama[0]).toHaveLength(0);

    const unik = (await db.execute(sql`
      SELECT INDEX_NAME AS nama, NON_UNIQUE AS nonUnik,
             GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS kolom
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'inventaris'
        AND INDEX_NAME = 'inventaris_village_id_uq'
      GROUP BY INDEX_NAME, NON_UNIQUE
    `)) as unknown as [Array<{ nama: string; nonUnik: number; kolom: string }>, unknown];
    expect(unik[0]).toHaveLength(1);
    expect(Number(unik[0][0]?.nonUnik)).toBe(0);
    expect(unik[0][0]?.kolom).toBe("village_id,id");
  });

  it("menolak mutasi yang menunjuk inventaris desa lain", async () => {
    const { desaA, asetB } = dataUji();

    expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(
      await kodeGalat(() => sisipMutasi({ villageId: desaA, inventarisId: asetB })),
    );
  });

  it("menolak inventaris_id yang tidak ada walaupun desanya cocok", async () => {
    const { desaA } = dataUji();

    expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(
      await kodeGalat(() => sisipMutasi({ villageId: desaA, inventarisId: 999_999_999 })),
    );
  });

  it("menerima pasangan desa-inventaris yang sah", async () => {
    const { desaA, asetA } = dataUji();
    await expect(sisipMutasi({ villageId: desaA, inventarisId: asetA })).resolves.toBeGreaterThan(
      0,
    );
  });

  it("menolak update yang memindahkan mutasi ke inventaris desa lain", async () => {
    const { desaA, asetA, asetB } = dataUji();

    const mutasiId = await sisipMutasi({ villageId: desaA, inventarisId: asetA });

    expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(
      await kodeGalat(() =>
        db
          .update(inventarisMutasi)
          .set({ inventarisId: asetB })
          .where(eq(inventarisMutasi.id, mutasiId)),
      ),
    );

    const [tersimpan] = await db
      .select({ inventarisId: inventarisMutasi.inventarisId })
      .from(inventarisMutasi)
      .where(eq(inventarisMutasi.id, mutasiId))
      .limit(1);
    expect(tersimpan).toEqual({ inventarisId: asetA });
  });

  it("menghapus inventaris ikut menghapus mutasinya tanpa menyentuh desa lain", async () => {
    const { desaA, desaB } = dataUji();
    const [asetRow] = await db
      .insert(inventaris)
      .values({ villageId: desaA, namaBarang: `Aset cascade ${RUN}`, jumlah: "2.00" })
      .$returningId();
    const aset = idDari(asetRow, "aset cascade");

    const mutasiA = await sisipMutasi({ villageId: desaA, inventarisId: aset });
    const mutasiB = await sisipMutasi({
      villageId: desaB,
      inventarisId: dataUji().asetB,
      jenis: "hapus",
    });

    await db.delete(inventaris).where(eq(inventaris.id, aset));

    const sisaA = await db
      .select({ id: inventarisMutasi.id })
      .from(inventarisMutasi)
      .where(eq(inventarisMutasi.id, mutasiA));
    expect(sisaA).toHaveLength(0);

    const sisaB = await db
      .select({ id: inventarisMutasi.id })
      .from(inventarisMutasi)
      .where(eq(inventarisMutasi.id, mutasiB));
    expect(sisaB).toHaveLength(1);
  });
});
