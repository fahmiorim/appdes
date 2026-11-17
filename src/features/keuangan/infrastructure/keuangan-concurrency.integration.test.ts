import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { keuangan, keuanganTemplate, users, villages } from "@/db/schema";
import { saveKeuanganNilai } from "@/features/keuangan/infrastructure/keuangan-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-013 — `saveKeuanganNilai` membaca agregasi lama, menghitung ulang induk,
 * lalu menulis. Test ini membuktikan penyimpanan bersamaan tidak lagi saling
 * menimpa: nilai induk harus sama dengan jumlah anak setelah seluruh penulisan
 * selesai.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);
const BASE = String(100 + (Number.parseInt(RUN.slice(0, 3), 16) % 800));
const INDUK = `9${BASE}`;
const ANAK = [`${INDUK}.01`, `${INDUK}.02`, `${INDUK}.03`, `${INDUK}.04`] as const;

let villageId: number | null = null;
let userId: string | null = null;

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaRow] = await db
    .insert(villages)
    .values({ name: `Desa Keuangan ${RUN}`, code: `FK${RUN}` })
    .$returningId();
  if (desaRow?.id === undefined) throw new Error("Seed uji gagal: desa tidak terbentuk.");
  villageId = desaRow.id;

  userId = randomUUID();
  await db.insert(users).values({
    id: userId,
    name: `Operator Keuangan ${RUN}`,
    email: `keuangan-${RUN}@example.test`,
    villageId,
  });

  await db
    .insert(keuanganTemplate)
    .values([
      { uuid: INDUK, parentUuid: null, uraian: `Induk ${RUN}` },
      ...ANAK.map((uuid) => ({ uuid, parentUuid: INDUK, uraian: `Anak ${uuid}` })),
    ]);
});

afterAll(async () => {
  if (villageId === null) return;
  await db.delete(keuangan).where(eq(keuangan.villageId, villageId));
  await db.delete(keuanganTemplate).where(inArray(keuanganTemplate.uuid, [INDUK, ...ANAK]));
  await db.delete(users).where(eq(users.id, userId ?? ""));
  await db.delete(villages).where(eq(villages.id, villageId));
});

describe("AUD-013 penyimpanan nilai keuangan bersamaan", () => {
  it("menjaga nilai induk tetap sama dengan jumlah anak", async () => {
    if (villageId === null || userId === null) throw new Error("Fixture tidak tersedia.");
    const desa = villageId;
    const operator = userId;

    const input = [
      { templateUuid: ANAK[0], anggaran: "1000000.00", realisasi: "100000.00" },
      { templateUuid: ANAK[1], anggaran: "2000000.00", realisasi: "200000.00" },
      { templateUuid: ANAK[2], anggaran: "3000000.00", realisasi: "300000.00" },
      { templateUuid: ANAK[3], anggaran: "4000000.00", realisasi: "400000.00" },
    ];

    // Tiga tahun berbeda agar pengujian tidak bergantung pada satu interleaving.
    for (const tahun of [2031, 2032, 2033]) {
      await Promise.all(input.map((baris) => saveKeuanganNilai(desa, tahun, operator, [baris])));

      const baris = await db
        .select({
          templateUuid: keuangan.templateUuid,
          anggaran: keuangan.anggaran,
          realisasi: keuangan.realisasi,
        })
        .from(keuangan)
        .where(and(eq(keuangan.villageId, desa), eq(keuangan.tahun, tahun)));

      const induk = baris.find((row) => row.templateUuid === INDUK);
      expect(induk, `baris induk tahun ${tahun} tidak ada`).toBeDefined();
      expect(induk?.anggaran).toBe("10000000.00");
      expect(induk?.realisasi).toBe("1000000.00");

      for (const nilai of input) {
        expect(baris.find((row) => row.templateUuid === nilai.templateUuid)).toMatchObject({
          anggaran: nilai.anggaran,
          realisasi: nilai.realisasi,
        });
      }
    }
  }, 60_000);
});
