import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { validasiDatabaseUji, validasiDsnUji } from "@/testing/db-test-guard";

/**
 * B2 — bukti bahwa preflight read-only, guard migration, dan inverse migration
 * berperilaku seperti yang dijanjikan, tanpa menyentuh database uji utama.
 *
 * Test membuat database sendiri (`desa_test_b2_*`) agar dapat memigrasi ke
 * state antara (0000+0001), menyuntikkan data legacy yang melanggar, mencoba
 * migration penuh, lalu memutar balik migration pada database lain. Semua
 * database dibuang di `afterAll`.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const PREFLIGHT_SQL = fileURLToPath(
  new URL("../../docs/reports/01-security/B2-preflight.sql", import.meta.url),
);
const ROLLBACK_SQL = fileURLToPath(
  new URL("../../docs/reports/01-security/B2-rollback.sql", import.meta.url),
);
const RUN = randomUUID().slice(0, 8);
const TABEL_TERDAMPAK = [
  "dtks",
  "dtks_anggota",
  "dtks_lampiran",
  "dtks_ref_lampiran",
  "suplemen",
  "suplemen_terdata",
] as const;

type Temuan = { relasi: string; jenis: string };
type SkemaTabel = { kolom: string[]; index: string[]; foreignKey: string[] };
type Skema = Record<string, SkemaTabel>;

interface Konteks {
  pool: Pool;
  database: string;
}

let dasar: ReturnType<typeof validasiDatabaseUji> | null = null;
let migrasiSampai0001: string | null = null;
let konteksGuard: Konteks | null = null;
let konteksRollback: Konteks | null = null;
let konteksBaseline: Konteks | null = null;
let temuanPreflight: Temuan[] = [];
const hitunganSebelumPreflight: Record<string, number> = {};
const hitunganSesudahPreflight: Record<string, number> = {};
let galatGuard: unknown = null;
let temuanGuard: Temuan[] = [];
let skemaSesudahGuard: Skema = {};
let skemaRollback: Skema = {};
let skemaBaseline: Skema = {};

function dsnUntuk(namaDatabase: string): string {
  if (dasar === null) throw new Error("Konfigurasi database uji belum dibaca.");
  const url = new URL(dasar.dsn);
  url.pathname = `/${namaDatabase}`;
  const dsn = url.toString();
  validasiDsnUji(dsn); // nama database divalidasi guard yang sama dengan suite utama
  return dsn;
}

async function buatDatabaseKosong(namaDatabase: string): Promise<void> {
  const dsn = dsnUntuk(namaDatabase);
  const { opsiKoneksi } = validasiDsnUji(dsn);
  const server = await mysql.createConnection({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
  });
  try {
    // Database ini milik test (nama `desa_test_b2_*`), jadi selalu dibuat ulang.
    await server.query(`DROP DATABASE IF EXISTS \`${namaDatabase}\``);
    await server.query(`CREATE DATABASE \`${namaDatabase}\``);
  } finally {
    await server.end();
  }
}

async function bukaKonteks(namaDatabase: string): Promise<Konteks> {
  const { opsiKoneksi } = validasiDsnUji(dsnUntuk(namaDatabase));
  const pool = mysql.createPool({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
    database: namaDatabase,
    multipleStatements: true,
  });
  return { pool, database: namaDatabase };
}

async function tutupDanBuang(konteks: Konteks | null): Promise<void> {
  if (konteks === null) return;
  await konteks.pool.end();
  const { opsiKoneksi } = validasiDsnUji(dsnUntuk(konteks.database));
  const server = await mysql.createConnection({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
  });
  try {
    await server.query(`DROP DATABASE IF EXISTS \`${konteks.database}\``);
  } finally {
    await server.end();
  }
}

/** Salin migration 0000..`idxMaks` ke folder sementara agar migrator berhenti di sana. */
function buatFolderMigrasiSampai(idxMaks: number): string {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "b2-migrasi-"));
  fs.mkdirSync(path.join(folder, "meta"));
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
  ) as { entries: Array<{ idx: number; tag: string }> };
  const entri = journal.entries.filter((item) => item.idx <= idxMaks);
  for (const item of entri) {
    fs.copyFileSync(
      path.join(MIGRATIONS_FOLDER, `${item.tag}.sql`),
      path.join(folder, `${item.tag}.sql`),
    );
  }
  fs.writeFileSync(
    path.join(folder, "meta", "_journal.json"),
    JSON.stringify({ ...journal, entries: entri }, null, 2),
  );
  return folder;
}

async function jalankanMigrasi(konteks: Konteks, folder: string): Promise<void> {
  const instance = drizzle(konteks.pool, { mode: "default" });
  await migrate(instance, { migrationsFolder: folder });
}

async function hitungTabel(konteks: Konteks, tabel: string): Promise<number> {
  const [rows] = await konteks.pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS jumlah FROM \`${tabel}\``,
  );
  return Number(rows[0]?.jumlah ?? -1);
}

async function bacaSkema(konteks: Konteks): Promise<Skema> {
  const daftar = TABEL_TERDAMPAK.map((tabel) => `'${tabel}'`).join(", ");
  const [kolom] = await konteks.pool.query<RowDataPacket[]>(
    `SELECT TABLE_NAME AS tabel, COLUMN_NAME AS nama, COLUMN_TYPE AS tipe,
            IS_NULLABLE AS nullable, COLUMN_DEFAULT AS bawaan, EXTRA AS extra
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${daftar})
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [konteks.database],
  );
  const [index] = await konteks.pool.query<RowDataPacket[]>(
    `SELECT TABLE_NAME AS tabel, INDEX_NAME AS nama, NON_UNIQUE AS nonUnik,
            GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS kolom
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${daftar})
     GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
     ORDER BY TABLE_NAME, INDEX_NAME`,
    [konteks.database],
  );
  const [foreignKey] = await konteks.pool.query<RowDataPacket[]>(
    `SELECT rc.TABLE_NAME AS tabel, rc.CONSTRAINT_NAME AS nama,
            rc.DELETE_RULE AS hapus, rc.UPDATE_RULE AS ubah,
            GROUP_CONCAT(kcu.COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) AS kolom,
            GROUP_CONCAT(kcu.REFERENCED_TABLE_NAME ORDER BY kcu.ORDINAL_POSITION) AS tabelInduk,
            GROUP_CONCAT(kcu.REFERENCED_COLUMN_NAME ORDER BY kcu.ORDINAL_POSITION) AS kolomInduk
     FROM information_schema.REFERENTIAL_CONSTRAINTS AS rc
     JOIN information_schema.KEY_COLUMN_USAGE AS kcu
       ON kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
      AND kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      AND kcu.TABLE_NAME = rc.TABLE_NAME
     WHERE rc.CONSTRAINT_SCHEMA = ? AND rc.TABLE_NAME IN (${daftar})
     GROUP BY rc.TABLE_NAME, rc.CONSTRAINT_NAME, rc.DELETE_RULE, rc.UPDATE_RULE
     ORDER BY rc.TABLE_NAME, rc.CONSTRAINT_NAME`,
    [konteks.database],
  );

  const skema: Skema = {};
  for (const tabel of TABEL_TERDAMPAK) {
    skema[tabel] = { kolom: [], index: [], foreignKey: [] };
  }
  for (const row of kolom) {
    skema[String(row.tabel)]?.kolom.push(
      `${row.nama}|${row.tipe}|${row.nullable}|${row.bawaan ?? "NULL"}|${row.extra}`,
    );
  }
  for (const row of index) {
    skema[String(row.tabel)]?.index.push(`${row.nama}|${row.nonUnik}|${row.kolom}`);
  }
  for (const row of foreignKey) {
    skema[String(row.tabel)]?.foreignKey.push(
      `${row.nama}|${row.kolom}|${row.tabelInduk}|${row.kolomInduk}|${row.hapus}|${row.ubah}`,
    );
  }
  return skema;
}

/**
 * Data legacy yang melanggar composite FK. Suntikan memakai
 * `FOREIGN_KEY_CHECKS=0` agar meniru database lama yang lolos dari FK
 * single-column (orphan) atau berisi referensi desa lain.
 */
async function suntikDataLegacy(konteks: Konteks): Promise<void> {
  // Satu koneksi saja: `SET FOREIGN_KEY_CHECKS=0` bersifat per-sesi, sedangkan
  // pool dapat memakai koneksi berbeda untuk tiap query.
  const conn = await konteks.pool.getConnection();
  const insertId = async (sql: string, params: unknown[]): Promise<number> => {
    const [hasil] = await conn.query(sql, params);
    return Number((hasil as { insertId: number }).insertId);
  };

  try {
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    await isiDataLegacy(insertId);
  } finally {
    await conn.query("SET FOREIGN_KEY_CHECKS=1");
    conn.release();
  }
}

async function isiDataLegacy(insertId: (sql: string, params: unknown[]) => Promise<number>) {
  const vA = await insertId("INSERT INTO villages (name, code) VALUES (?, ?)", [
    `B2 Guard A ${RUN}`,
    `G${RUN}A`.slice(0, 10),
  ]);
  const vB = await insertId("INSERT INTO villages (name, code) VALUES (?, ?)", [
    `B2 Guard B ${RUN}`,
    `G${RUN}B`.slice(0, 10),
  ]);
  const rtmA = await insertId("INSERT INTO rtm (village_id, number) VALUES (?, ?)", [
    vA,
    `B2RTMA${RUN}`,
  ]);
  const rtmB = await insertId("INSERT INTO rtm (village_id, number) VALUES (?, ?)", [
    vB,
    `B2RTMB${RUN}`,
  ]);
  const rtmB2 = await insertId("INSERT INTO rtm (village_id, number) VALUES (?, ?)", [
    vB,
    `B2RTMB2${RUN}`,
  ]);
  const famA = await insertId("INSERT INTO families (village_id, number) VALUES (?, ?)", [
    vA,
    `B2KK${RUN}`,
  ]);
  const resA = await insertId(
    "INSERT INTO residents (village_id, name, gender) VALUES (?, ?, 'male')",
    [vA, `Guard Penduduk A ${RUN}`],
  );
  const resB = await insertId(
    "INSERT INTO residents (village_id, name, gender) VALUES (?, ?, 'female')",
    [vB, `Guard Penduduk B ${RUN}`],
  );

  const dtksA = await insertId("INSERT INTO dtks (village_id, rtm_id) VALUES (?, ?)", [vA, rtmA]);
  const dtksB = await insertId("INSERT INTO dtks (village_id, rtm_id) VALUES (?, ?)", [vB, rtmB]);
  // cross-tenant: DTKS desa B memakai RTM desa A
  await insertId("INSERT INTO dtks (village_id, rtm_id) VALUES (?, ?)", [vB, rtmA]);
  // cross-tenant: KK desa A dipakai DTKS desa B
  await insertId("INSERT INTO dtks (village_id, rtm_id, keluarga_id) VALUES (?, ?, ?)", [
    vB,
    rtmB2,
    famA,
  ]);

  // cross-tenant dan orphan pada anggota
  await insertId("INSERT INTO dtks_anggota (village_id, dtks_id, penduduk_id) VALUES (?, ?, ?)", [
    vB,
    dtksB,
    resA,
  ]);
  await insertId("INSERT INTO dtks_anggota (village_id, dtks_id, penduduk_id) VALUES (?, ?, ?)", [
    vB,
    999_999_990,
    resB,
  ]);

  await insertId("INSERT INTO dtks_lampiran (village_id, nama, berkas) VALUES (?, ?, ?)", [
    vA,
    `Guard Lampiran A ${RUN}`,
    `dtks/guard-a-${RUN}.pdf`,
  ]);
  const lampB = await insertId(
    "INSERT INTO dtks_lampiran (village_id, nama, berkas) VALUES (?, ?, ?)",
    [vB, `Guard Lampiran B ${RUN}`, `dtks/guard-b-${RUN}.pdf`],
  );

  // junction: lampiran desa B ditautkan ke DTKS desa A, plus dua baris orphan
  await insertId("INSERT INTO dtks_ref_lampiran (dtks_id, lampiran_id) VALUES (?, ?)", [
    dtksA,
    lampB,
  ]);
  await insertId("INSERT INTO dtks_ref_lampiran (dtks_id, lampiran_id) VALUES (?, ?)", [
    999_999_991,
    lampB,
  ]);
  await insertId("INSERT INTO dtks_ref_lampiran (dtks_id, lampiran_id) VALUES (?, ?)", [
    dtksB,
    999_999_992,
  ]);

  const supA = await insertId("INSERT INTO suplemen (village_id, nama, slug) VALUES (?, ?, ?)", [
    vA,
    `Guard Suplemen A ${RUN}`,
    `guard-a-${RUN}`,
  ]);
  const supB = await insertId("INSERT INTO suplemen (village_id, nama, slug) VALUES (?, ?, ?)", [
    vB,
    `Guard Suplemen B ${RUN}`,
    `guard-b-${RUN}`,
  ]);

  // suplemen desa A dipakai terdata desa B, penduduk/keluarga lintas desa, orphan
  await insertId(
    "INSERT INTO suplemen_terdata (village_id, id_suplemen, penduduk_id) VALUES (?, ?, ?)",
    [vB, supA, resB],
  );
  await insertId(
    "INSERT INTO suplemen_terdata (village_id, id_suplemen, penduduk_id) VALUES (?, ?, ?)",
    [vB, supB, resA],
  );
  await insertId(
    "INSERT INTO suplemen_terdata (village_id, id_suplemen, keluarga_id) VALUES (?, ?, ?)",
    [vB, supB, famA],
  );
  await insertId(
    "INSERT INTO suplemen_terdata (village_id, id_suplemen, penduduk_id) VALUES (?, ?, ?)",
    [vB, 999_999_993, resB],
  );
}

function pasanganTemuan(rows: RowDataPacket[]): Temuan[] {
  return rows.map((row) => ({ relasi: String(row.relasi), jenis: String(row.jenis) }));
}

/** Kunci stabil untuk membandingkan temuan tanpa bergantung urutan query/locale. */
function kunciTemuan(temuan: Temuan): string {
  return `${temuan.relasi}|${temuan.jenis}`;
}

/** Gabungkan pesan error Drizzle dan `cause` mysql2 (nilai duplicate entry ada di cause). */
function pesanLengkap(error: unknown): string {
  const bagian: string[] = [];
  let current: unknown = error;
  while (current !== null && typeof current === "object" && bagian.length < 5) {
    const item = current as { message?: unknown; cause?: unknown };
    if (typeof item.message === "string") bagian.push(item.message);
    current = item.cause;
  }
  return bagian.join(" | ");
}

beforeAll(async () => {
  dasar = validasiDatabaseUji(process.env);
  migrasiSampai0001 = buatFolderMigrasiSampai(1);

  // --- Database guard/Baseline: skema tepat sebelum B2 (0000 + 0001). ------
  const namaGuard = `desa_test_b2_guard_${RUN}`;
  await buatDatabaseKosong(namaGuard);
  konteksGuard = await bukaKonteks(namaGuard);
  await jalankanMigrasi(konteksGuard, migrasiSampai0001);
  await suntikDataLegacy(konteksGuard);

  // --- Preflight read-only sebelum migration. -----------------------------
  const isiPreflight = fs.readFileSync(PREFLIGHT_SQL, "utf8");
  const [hasilPreflight] = await konteksGuard.pool.query<RowDataPacket[][]>(isiPreflight);
  const barisPreflight = hasilPreflight.find((hasil) => Array.isArray(hasil)) ?? [];
  temuanPreflight = pasanganTemuan(barisPreflight as RowDataPacket[]);

  for (const tabel of TABEL_TERDAMPAK) {
    hitunganSebelumPreflight[tabel] = await hitungTabel(konteksGuard, tabel);
  }
  const [ulangPreflight] = await konteksGuard.pool.query<RowDataPacket[][]>(isiPreflight);
  void ulangPreflight;
  for (const tabel of TABEL_TERDAMPAK) {
    hitunganSesudahPreflight[tabel] = await hitungTabel(konteksGuard, tabel);
  }

  // --- Migration penuh harus berhenti karena data legacy. -----------------
  try {
    await jalankanMigrasi(konteksGuard, MIGRATIONS_FOLDER);
  } catch (error) {
    galatGuard = error;
  }

  let temuanTabelGuard: RowDataPacket[] = [];
  try {
    const [rows] = await konteksGuard.pool.query<RowDataPacket[]>(
      "SELECT relasi, jenis FROM `_b2_preflight_findings`",
    );
    temuanTabelGuard = rows;
  } catch {
    temuanTabelGuard = [];
  }
  temuanGuard = pasanganTemuan(temuanTabelGuard);

  skemaSesudahGuard = await bacaSkema(konteksGuard);

  // --- Rollback rehearsal: migrasi penuh lalu inverse migration. ----------
  const namaRollback = `desa_test_b2_rollback_${RUN}`;
  await buatDatabaseKosong(namaRollback);
  konteksRollback = await bukaKonteks(namaRollback);
  await jalankanMigrasi(konteksRollback, MIGRATIONS_FOLDER);
  await konteksRollback.pool.query(fs.readFileSync(ROLLBACK_SQL, "utf8"));
  skemaRollback = await bacaSkema(konteksRollback);

  // --- Pembanding: skema baseline murni (0000 + 0001). --------------------
  const namaBaseline = `desa_test_b2_baseline_${RUN}`;
  await buatDatabaseKosong(namaBaseline);
  konteksBaseline = await bukaKonteks(namaBaseline);
  await jalankanMigrasi(konteksBaseline, migrasiSampai0001);
  skemaBaseline = await bacaSkema(konteksBaseline);
});

afterAll(async () => {
  await tutupDanBuang(konteksGuard);
  await tutupDanBuang(konteksRollback);
  await tutupDanBuang(konteksBaseline);
  if (migrasiSampai0001 !== null) {
    fs.rmSync(migrasiSampai0001, { recursive: true, force: true });
  }
});

describe("B2 preflight, migration guard, dan rollback", () => {
  it("preflight read-only melaporkan orphan dan cross-tenant pada seluruh relasi", () => {
    const diharapkan: Temuan[] = [
      { relasi: "dtks.keluarga_id", jenis: "cross-tenant" },
      { relasi: "dtks.rtm_id", jenis: "cross-tenant" },
      { relasi: "dtks_anggota.dtks_id", jenis: "orphan" },
      { relasi: "dtks_anggota.penduduk_id", jenis: "cross-tenant" },
      { relasi: "dtks_ref_lampiran.dtks_id", jenis: "orphan" },
      { relasi: "dtks_ref_lampiran.lampiran_id", jenis: "cross-tenant" },
      { relasi: "dtks_ref_lampiran.lampiran_id", jenis: "orphan" },
      { relasi: "suplemen_terdata.keluarga_id", jenis: "cross-tenant" },
      { relasi: "suplemen_terdata.penduduk_id", jenis: "cross-tenant" },
      { relasi: "suplemen_terdata.suplemen_id", jenis: "cross-tenant" },
      { relasi: "suplemen_terdata.suplemen_id", jenis: "orphan" },
    ];
    expect(temuanPreflight.map(kunciTemuan).sort()).toEqual(diharapkan.map(kunciTemuan).sort());
  });

  it("preflight tidak mengubah data domain (read-only)", () => {
    expect(hitunganSesudahPreflight).toEqual(hitunganSebelumPreflight);
    expect(Object.values(hitunganSebelumPreflight).every((jumlah) => jumlah > 0)).toBe(true);
  });

  it("migration berhenti dengan pesan relasi dan jumlah baris sebelum mengubah schema", () => {
    expect(galatGuard, "migration seharusnya gagal karena data legacy").toBeDefined();
    expect(pesanLengkap(galatGuard)).toMatch(
      /B2 preflight gagal: [a-z_.]+ (orphan|cross-tenant) = \d+ baris/,
    );

    // Tabel temuan guard berisi relasi yang sama dengan preflight manual.
    expect(temuanGuard.map(kunciTemuan).sort()).toEqual(temuanPreflight.map(kunciTemuan).sort());

    // Tidak ada satu pun constraint B2 yang terpasang, kolom junction tidak ada.
    for (const tabel of TABEL_TERDAMPAK) {
      for (const fk of skemaSesudahGuard[tabel]?.foreignKey ?? []) {
        expect(fk).not.toContain("_tenant_fk");
      }
    }
    expect(
      skemaSesudahGuard["dtks_ref_lampiran"]?.kolom.some((kolom) =>
        kolom.startsWith("village_id|"),
      ),
    ).toBe(false);
    expect(
      skemaSesudahGuard["dtks"]?.foreignKey.some((fk) => fk.startsWith("dtks_rtm_id_rtm_id_fk|")),
    ).toBe(true);
  });

  it("inverse migration memulihkan schema baseline untuk seluruh tabel terdampak", () => {
    expect(skemaRollback).toEqual(skemaBaseline);
  });
});
