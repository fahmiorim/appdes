import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { bumindesBuku, bumindesItem, villages } from "@/db/schema";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

interface Fixture {
  desaA: number;
  desaB: number;
  bukuA: number;
  bukuB: number;
}

let fixture: Fixture | null = null;

function dataUji(): Fixture {
  if (fixture === null) throw new Error("Fixture integrasi BUMDes tidak siap.");
  return fixture;
}

function idDari(row: { id: number } | undefined, label: string): number {
  const id = row?.id;
  if (id === undefined) throw new Error(`Seed uji gagal: ${label} tidak terbentuk.`);
  return id;
}

async function kodeGalat(upaya: () => Promise<unknown>): Promise<unknown> {
  let error: unknown;
  try {
    await upaya();
  } catch (caught) {
    error = caught;
  }
  let current = error;
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const nilai = current as { code?: unknown; errno?: unknown; cause?: unknown };
    const kode = nilai.code ?? nilai.errno;
    if (kode !== undefined) return kode;
    current = nilai.cause;
  }
  return undefined;
}

async function sisipItem(villageId: number, bukuId: number): Promise<number> {
  const [row] = await db
    .insert(bumindesItem)
    .values({ villageId, bukuId, uraian: `Item B4 ${RUN}` })
    .$returningId();
  return idDari(row, "item BUMDes");
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa B4 A ${RUN}`, code: `B4A${RUN.slice(0, 5)}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa B4 B ${RUN}`, code: `B4B${RUN.slice(0, 5)}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [bukuARow] = await db
    .insert(bumindesBuku)
    .values({ villageId: desaA, kodeBuku: `A${RUN}`, namaBuku: `Buku A ${RUN}` })
    .$returningId();
  const [bukuBRow] = await db
    .insert(bumindesBuku)
    .values({ villageId: desaB, kodeBuku: `B${RUN}`, namaBuku: `Buku B ${RUN}` })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    bukuA: idDari(bukuARow, "buku A"),
    bukuB: idDari(bukuBRow, "buku B"),
  };
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];
  await db.delete(bumindesItem).where(inArray(bumindesItem.villageId, desaIds));
  await db.delete(bumindesBuku).where(inArray(bumindesBuku.villageId, desaIds));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("B4 composite FK bumindes_item.buku_id", () => {
  it("menetapkan FK composite dengan unique key parent dan cascade", async () => {
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
        AND k.CONSTRAINT_NAME = 'bumindes_item_buku_tenant_fk'
      GROUP BY k.CONSTRAINT_NAME, r.DELETE_RULE
    `)) as unknown as [
      Array<{ nama: string; kolom: string; referensi: string; aturan: string }>,
      unknown,
    ];
    expect(hasil[0]).toEqual([
      {
        nama: "bumindes_item_buku_tenant_fk",
        kolom: "village_id,buku_id",
        referensi: "village_id,id",
        aturan: "CASCADE",
      },
    ]);

    const unique = (await db.execute(sql`
      SELECT INDEX_NAME AS nama, NON_UNIQUE AS nonUnik,
             GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS kolom
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bumindes_buku'
        AND INDEX_NAME = 'bumindes_buku_village_id_uq'
      GROUP BY INDEX_NAME, NON_UNIQUE
    `)) as unknown as [Array<{ nama: string; nonUnik: number; kolom: string }>, unknown];
    expect(unique[0]).toHaveLength(1);
    expect(Number(unique[0][0]?.nonUnik)).toBe(0);
    expect(unique[0][0]?.kolom).toBe("village_id,id");
  });

  it("menerima item yang menunjuk buku di desa yang sama", async () => {
    const { desaA, bukuA } = dataUji();
    await expect(sisipItem(desaA, bukuA)).resolves.toBeGreaterThan(0);
  });

  it("menolak insert item yang menunjuk buku desa lain dan buku yang tidak ada", async () => {
    const { desaA, bukuB } = dataUji();
    const errorLintasTenant = await kodeGalat(() => sisipItem(desaA, bukuB));
    const errorOrphan = await kodeGalat(() => sisipItem(desaA, 999_999_999));

    expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(errorLintasTenant);
    expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(errorOrphan);
  });

  it("menolak update item ke buku desa lain dan mempertahankan referensi lama", async () => {
    const { desaA, bukuA, bukuB } = dataUji();
    const itemId = await sisipItem(desaA, bukuA);
    const error = await kodeGalat(() =>
      db.update(bumindesItem).set({ bukuId: bukuB }).where(eq(bumindesItem.id, itemId)),
    );

    expect([1452, "ER_NO_REFERENCED_ROW_2"]).toContain(error);
    const [item] = await db
      .select({ bukuId: bumindesItem.bukuId })
      .from(bumindesItem)
      .where(eq(bumindesItem.id, itemId))
      .limit(1);
    expect(item).toEqual({ bukuId: bukuA });
  });

  it("menghapus item saat buku induk dihapus tanpa menyentuh desa lain", async () => {
    const { desaA, desaB, bukuB } = dataUji();
    const [bukuHapusRow] = await db
      .insert(bumindesBuku)
      .values({ villageId: desaA, kodeBuku: `C${RUN}`, namaBuku: `Buku hapus ${RUN}` })
      .$returningId();
    const bukuHapus = idDari(bukuHapusRow, "buku cascade");
    const itemA = await sisipItem(desaA, bukuHapus);
    const itemB = await sisipItem(desaB, bukuB);

    await db.delete(bumindesBuku).where(eq(bumindesBuku.id, bukuHapus));

    const sisaA = await db
      .select({ id: bumindesItem.id })
      .from(bumindesItem)
      .where(eq(bumindesItem.id, itemA));
    const sisaB = await db
      .select({ id: bumindesItem.id })
      .from(bumindesItem)
      .where(eq(bumindesItem.id, itemB));
    expect(sisaA).toHaveLength(0);
    expect(sisaB).toHaveLength(1);
  });
});
