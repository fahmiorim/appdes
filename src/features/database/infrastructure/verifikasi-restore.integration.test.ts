import mysql from "mysql2/promise";
import { beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { jalankanMigrasiUji } from "@/testing/migrasi-uji";

import { TABEL_WAJIB_RESTORE, tabelHilang } from "../domain/database";
import { daftarTabelDatabase } from "./verifikasi-restore";

const dsn = process.env.DATABASE_URL ?? "";
const MIGRATIONS_FOLDER = "src/db/migrations";

beforeAll(async () => {
  const dbName = new URL(dsn).pathname.replace(/^\//, "") || "desa_test";
  const server = await mysql.createConnection(dsn.replace(/\/[^/]*$/, ""));
  await server.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await server.end();

  await jalankanMigrasiUji(db, { dsn, migrationsFolder: MIGRATIONS_FOLDER });
}, 120_000);

describe("verifikasi restore skema penuh", () => {
  it("menemukan seluruh tabel inti pada skema hasil migrasi", async () => {
    const tabel = await daftarTabelDatabase(dsn);

    expect(tabel.length).toBeGreaterThan(100);
    expect(tabelHilang(tabel)).toEqual([]);
    expect(tabel).toEqual(expect.arrayContaining([...TABEL_WAJIB_RESTORE]));
  });
});
