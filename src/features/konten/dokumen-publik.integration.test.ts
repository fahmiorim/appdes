import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { dokumenPublik, villages } from "@/db/schema";
import { cariDokumenPublik } from "@/features/publik/infrastructure/content-repository";
import { jalankanMigrasiUji } from "@/testing/migrasi-uji";

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);
let dbReady = false;
let fixture: { villageIds: number[] } | null = null;

function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed uji gagal: ${label}`);
  return row.id;
}

beforeAll(async () => {
  const dsn = process.env.DATABASE_URL ?? "";
  try {
    const dbName = new URL(dsn).pathname.replace(/^\//, "") || "desa_test";
    const server = await mysql.createConnection(dsn.replace(/\/[^/]*$/, ""));
    await server.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await server.end();
    await db.execute(sql`SELECT 1`);
  } catch {
    return;
  }

  dbReady = true;
  await jalankanMigrasiUji(db, { dsn, migrationsFolder: MIGRATIONS_FOLDER });

  const [villageA] = await db
    .insert(villages)
    .values({ name: `Desa Dokumen ${RUN}`, code: `DA${RUN}` })
    .$returningId();
  const [villageB] = await db
    .insert(villages)
    .values({ name: `Desa Lain ${RUN}`, code: `DB${RUN}` })
    .$returningId();
  const villageId = pastiId(villageA, "desa utama");
  const villageLainId = pastiId(villageB, "desa lain");
  fixture = { villageIds: [villageId, villageLainId] };

  await db.insert(dokumenPublik).values([
    {
      villageId,
      nama: `Peraturan Desa ${RUN}`,
      slug: `peraturan-desa-${RUN}`,
      kategori: "produk_hukum",
      jenis: "Peraturan Desa",
      nomor: "1/2025",
      tahun: 2025,
      tautan: "https://example.test/peraturan.pdf",
      aktif: true,
    },
    {
      villageId,
      nama: `Informasi APBDes ${RUN}`,
      slug: `informasi-apbdes-${RUN}`,
      kategori: "informasi_publik",
      tahun: 2024,
      tautan: "https://example.test/apbdes.pdf",
      aktif: true,
    },
    {
      villageId,
      nama: `Peraturan nonaktif ${RUN}`,
      slug: `peraturan-nonaktif-${RUN}`,
      kategori: "produk_hukum",
      tahun: 2025,
      tautan: "https://example.test/nonaktif.pdf",
      aktif: false,
    },
    {
      villageId: villageLainId,
      nama: `Peraturan desa lain ${RUN}`,
      slug: `peraturan-desa-lain-${RUN}`,
      kategori: "produk_hukum",
      tahun: 2025,
      tautan: "https://example.test/desa-lain.pdf",
      aktif: true,
    },
  ]);

  await db.insert(dokumenPublik).values(
    Array.from({ length: 21 }, (_, index) => {
      const suffix = String(index).padStart(2, "0");
      return {
        villageId,
        nama: `Pagination ${RUN} ${suffix}`,
        slug: `pagination-${RUN}-${suffix}`,
        kategori: "informasi_publik",
        tahun: 2023,
        tautan: `https://example.test/pagination-${suffix}.pdf`,
        aktif: true,
      };
    }),
  );
});

afterAll(async () => {
  if (dbReady && fixture) {
    for (const villageId of fixture.villageIds) {
      await db.delete(villages).where(eq(villages.id, villageId));
    }
  }
});

describe("pencarian dokumen publik", () => {
  it("membatasi hasil aktif menurut host, kategori, teks, dan tahun", async (ctx) => {
    if (!dbReady || !fixture) {
      ctx.skip();
      return;
    }

    const result = await cariDokumenPublik(fixture.villageIds[0]!, {
      search: `Peraturan Desa ${RUN}`,
      category: "produk_hukum",
      year: 2025,
      page: 1,
    });

    expect(result).toMatchObject({
      total: 1,
      page: 1,
      pageSize: 20,
      rows: [
        {
          nama: `Peraturan Desa ${RUN}`,
          kategori: "produk_hukum",
          tahun: 2025,
        },
      ],
    });
  });

  it("mengisolasi tenant dan mengecualikan dokumen nonaktif", async (ctx) => {
    if (!dbReady || !fixture) {
      ctx.skip();
      return;
    }

    const result = await cariDokumenPublik(fixture.villageIds[0]!, {
      search: "",
      category: "produk_hukum",
      year: 2025,
      page: 1,
    });

    expect(result.total).toBe(1);
    expect(result.rows.map((row) => row.nama)).toEqual([`Peraturan Desa ${RUN}`]);
  });

  it("mengembalikan halaman yang benar dalam hasil pencarian", async (ctx) => {
    if (!dbReady || !fixture) {
      ctx.skip();
      return;
    }

    const result = await cariDokumenPublik(fixture.villageIds[0]!, {
      search: `Pagination ${RUN}`,
      category: "semua",
      page: 2,
    });

    expect(result).toMatchObject({
      total: 21,
      page: 2,
      pageSize: 20,
      rows: [{ nama: `Pagination ${RUN} 20` }],
    });

    const overflow = await cariDokumenPublik(fixture.villageIds[0]!, {
      search: `Pagination ${RUN}`,
      category: "semua",
      page: 100,
    });
    expect(overflow.page).toBe(2);
    expect(overflow.rows).toHaveLength(1);
  });
});
