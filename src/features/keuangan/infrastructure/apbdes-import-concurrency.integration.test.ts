import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { and, eq, inArray } from "drizzle-orm";
import type { RowDataPacket } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db, pool } from "@/db";
import { keuangan, keuanganTemplate, users, villages } from "@/db/schema";
import {
  saveKeuanganNilai,
  upsertKeuanganBatch,
} from "@/features/keuangan/infrastructure/keuangan-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-013 lanjutan — impor APBDes (`upsertKeuanganBatch`) harus memakai kunci
 * per (desa, tahun) yang sama dengan penyimpanan manual, lalu mengagregasi ulang
 * induk. Tanpa kunci bersama, impor yang berjalan bersamaan dengan simpan
 * manual dapat meninggalkan nilai induk yang tidak sama dengan jumlah anaknya.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);
const BASE = String(100 + (Number.parseInt(RUN.slice(0, 3), 16) % 800));
const INDUK = `8${BASE}`;
const ANAK = [`${INDUK}.01`, `${INDUK}.02`, `${INDUK}.03`, `${INDUK}.04`] as const;
/** Subtree lain pada chart global; tidak boleh ikut tertulis oleh desa ini. */
const LAIN = `7${BASE}`;
const LAIN_ANAK = `${LAIN}.01`;

let villageId: number | null = null;
let userId: string | null = null;

function kunci(desa: number, tahun: number): string {
  return `keuangan:${desa}:${tahun}`;
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaRow] = await db
    .insert(villages)
    .values({ name: `Desa Impor APBDes ${RUN}`, code: `FI${RUN}` })
    .$returningId();
  if (desaRow?.id === undefined) throw new Error("Seed uji gagal: desa tidak terbentuk.");
  villageId = desaRow.id;

  userId = randomUUID();
  await db.insert(users).values({
    id: userId,
    name: `Operator Impor ${RUN}`,
    email: `impor-apbdes-${RUN}@example.test`,
    villageId,
  });

  await db
    .insert(keuanganTemplate)
    .values([
      { uuid: INDUK, parentUuid: null, uraian: `Induk ${RUN}` },
      ...ANAK.map((uuid) => ({ uuid, parentUuid: INDUK, uraian: `Anak ${uuid}` })),
      { uuid: LAIN, parentUuid: null, uraian: `Lain ${RUN}` },
      { uuid: LAIN_ANAK, parentUuid: LAIN, uraian: `Anak lain ${RUN}` },
    ]);
});

afterAll(async () => {
  if (villageId === null) return;
  await db.delete(keuangan).where(eq(keuangan.villageId, villageId));
  await db
    .delete(keuanganTemplate)
    .where(inArray(keuanganTemplate.uuid, [INDUK, ...ANAK, LAIN, LAIN_ANAK]));
  await db.delete(users).where(eq(users.id, userId ?? ""));
  await db.delete(villages).where(eq(villages.id, villageId));
});

async function bacaTahun(desa: number, tahun: number) {
  return db
    .select({
      templateUuid: keuangan.templateUuid,
      anggaran: keuangan.anggaran,
      realisasi: keuangan.realisasi,
    })
    .from(keuangan)
    .where(and(eq(keuangan.villageId, desa), eq(keuangan.tahun, tahun)));
}

describe("AUD-013 impor APBDes dan penyimpanan manual", () => {
  it("impor menunggu kunci (desa, tahun) yang sama dengan simpan nilai", async () => {
    if (villageId === null || userId === null) throw new Error("Fixture tidak tersedia.");
    const desa = villageId;
    const operator = userId;
    const tahun = 2034;

    const koneksi = await pool.getConnection();
    let impor: Promise<void> | null = null;
    try {
      const [baris] = await koneksi.query<(RowDataPacket & { ok: number | null })[]>(
        "SELECT GET_LOCK(?, ?) AS ok",
        [kunci(desa, tahun), 5],
      );
      expect(Number(baris[0]?.ok)).toBe(1);

      impor = upsertKeuanganBatch(desa, tahun, operator, [
        { templateUuid: ANAK[0], anggaran: "5000000.00", realisasi: "0.00" },
      ]);

      // Beri waktu cukup agar impor mencoba menulis; tanpa kunci bersama baris
      // sudah muncul di sini dan pemeriksaan berikut gagal.
      await new Promise((resolve) => setTimeout(resolve, 400));
      expect(await bacaTahun(desa, tahun)).toHaveLength(0);
    } finally {
      await koneksi.query("SELECT RELEASE_LOCK(?)", [kunci(desa, tahun)]);
      koneksi.release();
      if (impor) await impor;
    }

    const sesudah = await bacaTahun(desa, tahun);
    expect(sesudah.find((row) => row.templateUuid === ANAK[0])?.anggaran).toBe("5000000.00");
  }, 60_000);

  it("mengagregasi induk dari baris impor, bukan memakai nilai induk berkas", async () => {
    if (villageId === null || userId === null) throw new Error("Fixture tidak tersedia.");
    const desa = villageId;
    const operator = userId;
    const tahun = 2035;

    await upsertKeuanganBatch(desa, tahun, operator, [
      { templateUuid: ANAK[0], anggaran: "1000000.00", realisasi: "100000.00" },
      { templateUuid: ANAK[1], anggaran: "2000000.00", realisasi: "200000.00" },
      // Berkas APBDes umumnya membawa baris induk dengan pagu 0.
      { templateUuid: INDUK, anggaran: "0.00", realisasi: "0.00" },
    ]);

    const baris = await bacaTahun(desa, tahun);
    expect(baris.find((row) => row.templateUuid === INDUK)?.anggaran).toBe("3000000.00");
    // Berkas APBDes tidak membawa realisasi; rekening baru tetap 0,00.
    expect(baris.find((row) => row.templateUuid === INDUK)?.realisasi).toBe("0.00");
  }, 60_000);

  it("impor hanya mengganti pagu dan mempertahankan realisasi tersimpan", async () => {
    if (villageId === null || userId === null) throw new Error("Fixture tidak tersedia.");
    const desa = villageId;
    const operator = userId;
    const tahun = 2040;

    await saveKeuanganNilai(desa, tahun, operator, [
      { templateUuid: ANAK[0], anggaran: "1000000.00", realisasi: "250000.00" },
      { templateUuid: ANAK[1], anggaran: "2000000.00", realisasi: "50000.00" },
    ]);

    // Impor hanya membawa pagu; realisasi berasal dari pencairan/SPJ.
    await upsertKeuanganBatch(desa, tahun, operator, [
      { templateUuid: ANAK[0], anggaran: "3000000.00", realisasi: "0.00" },
      { templateUuid: ANAK[2], anggaran: "1000000.00", realisasi: "0.00" },
    ]);

    const baris = await bacaTahun(desa, tahun);
    const nilai = (uuid: string) => baris.find((row) => row.templateUuid === uuid);

    expect(nilai(ANAK[0])).toMatchObject({ anggaran: "3000000.00", realisasi: "250000.00" });
    expect(nilai(ANAK[1])).toMatchObject({ anggaran: "2000000.00", realisasi: "50000.00" });
    expect(nilai(ANAK[2])).toMatchObject({ anggaran: "1000000.00", realisasi: "0.00" });
    expect(nilai(INDUK)).toMatchObject({ anggaran: "6000000.00", realisasi: "300000.00" });
  }, 60_000);

  it("hanya menulis kode yang tersentuh, bukan baris nol untuk seluruh chart", async () => {
    if (villageId === null || userId === null) throw new Error("Fixture tidak tersedia.");
    const desa = villageId;
    const operator = userId;
    const tahun = 2039;

    await upsertKeuanganBatch(desa, tahun, operator, [
      { templateUuid: ANAK[0], anggaran: "1000000.00", realisasi: "0.00" },
    ]);

    // Menulis baris nol untuk seluruh chart bukan hanya boros: dua desa yang
    // menyimpan bersamaan akan menyentuh kode template milik fixture lain.
    const kode = (await bacaTahun(desa, tahun)).map((row) => row.templateUuid).sort();
    expect(kode).toEqual([INDUK, ANAK[0]].sort());
  }, 60_000);

  it("impor dan simpan manual bersamaan menjaga induk = jumlah anak", async () => {
    if (villageId === null || userId === null) throw new Error("Fixture tidak tersedia.");
    const desa = villageId;
    const operator = userId;

    for (const tahun of [2036, 2037, 2038]) {
      await Promise.all([
        upsertKeuanganBatch(desa, tahun, operator, [
          { templateUuid: ANAK[0], anggaran: "5000000.00", realisasi: "0.00" },
          { templateUuid: ANAK[1], anggaran: "6000000.00", realisasi: "0.00" },
          { templateUuid: ANAK[2], anggaran: "7000000.00", realisasi: "0.00" },
          { templateUuid: ANAK[3], anggaran: "8000000.00", realisasi: "0.00" },
          { templateUuid: INDUK, anggaran: "0.00", realisasi: "0.00" },
        ]),
        saveKeuanganNilai(desa, tahun, operator, [
          { templateUuid: ANAK[3], anggaran: "9000000.00", realisasi: "100000.00" },
        ]),
      ]);

      const baris = await bacaTahun(desa, tahun);
      const induk = baris.find((row) => row.templateUuid === INDUK);
      expect(induk, `baris induk tahun ${tahun} tidak ada`).toBeDefined();

      const totalAnggaran = ANAK.reduce(
        (total, uuid) => total + Number(baris.find((row) => row.templateUuid === uuid)?.anggaran),
        0,
      );
      const totalRealisasi = ANAK.reduce(
        (total, uuid) => total + Number(baris.find((row) => row.templateUuid === uuid)?.realisasi),
        0,
      );

      expect(induk?.anggaran).toBe(totalAnggaran.toFixed(2));
      expect(induk?.realisasi).toBe(totalRealisasi.toFixed(2));
    }
  }, 90_000);
});
