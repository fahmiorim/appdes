import { beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

import { TABEL_WAJIB_RESTORE, tabelHilang } from "../domain/database";
import { daftarTabelDatabase } from "./verifikasi-restore";

const MIGRATIONS_FOLDER = "src/db/migrations";
let dsn = "";

beforeAll(async () => {
  ({ dsn } = await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER }));
}, 120_000);

describe("verifikasi restore skema penuh", () => {
  it("menemukan seluruh tabel inti pada skema hasil migrasi", async () => {
    const tabel = await daftarTabelDatabase(dsn);

    expect(tabel.length).toBeGreaterThan(100);
    expect(tabelHilang(tabel)).toEqual([]);
    expect(tabel).toEqual(expect.arrayContaining([...TABEL_WAJIB_RESTORE]));
  });
});
