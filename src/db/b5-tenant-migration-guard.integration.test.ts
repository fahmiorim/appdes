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

const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = randomUUID().slice(0, 6).toLowerCase();
const DATABASE = `desa_test_aud034b1_${RUN}`;
const RELASI = [
  "kontak.resident_id",
  "lapak.resident_id",
  "notifikasi_terkirim.resident_id",
  "pendapat.resident_id",
  "family_member_logs.family_id",
  "family_member_logs.resident_id",
  "users.resident_id",
  "letter_number_archive.letter_id",
] as const;

const FK_LAMA = [
  "kontak_resident_id_residents_id_fk",
  "lapak_resident_id_residents_id_fk",
  "notifikasi_terkirim_resident_id_residents_id_fk",
  "pendapat_resident_id_residents_id_fk",
  "family_member_logs_family_id_families_id_fk",
  "family_member_logs_resident_id_residents_id_fk",
  "users_resident_id_residents_id_fk",
  "letter_number_archive_letter_id_letters_id_fk",
] as const;

const FK_BARU = [
  "kontak_resident_tenant_fk",
  "lapak_resident_tenant_fk",
  "notifikasi_terkirim_resident_tenant_fk",
  "pendapat_resident_tenant_fk",
  "family_member_logs_family_tenant_fk",
  "family_member_logs_resident_tenant_fk",
  "users_resident_tenant_fk",
  "letter_number_archive_letter_tenant_fk",
] as const;

let pool: Pool | null = null;
let galatMigrasi: unknown = null;
let temuan: Array<{ relasi: string; jenis: string; jumlah: number }> = [];
let fk: string[] = [];
let folderSampai0010: string | null = null;

function buatFolderMigrasiSampai0010(): string {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "aud034-b1-migrasi-"));
  fs.mkdirSync(path.join(folder, "meta"));
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
  ) as { entries: Array<{ idx: number; tag: string }> };
  const entries = journal.entries.filter((entry) => entry.idx <= 10);
  for (const entry of entries) {
    fs.copyFileSync(
      path.join(MIGRATIONS_FOLDER, `${entry.tag}.sql`),
      path.join(folder, `${entry.tag}.sql`),
    );
  }
  fs.writeFileSync(
    path.join(folder, "meta", "_journal.json"),
    JSON.stringify({ ...journal, entries }, null, 2),
  );
  return folder;
}

async function bukaKoneksiServer() {
  const { opsiKoneksi } = validasiDatabaseUji(process.env);
  return mysql.createConnection({
    host: opsiKoneksi.host,
    port: opsiKoneksi.port,
    user: opsiKoneksi.user,
    password: opsiKoneksi.password,
  });
}

function pesanGalat(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;
  while (current && typeof current === "object" && messages.length < 5) {
    const item = current as { message?: unknown; cause?: unknown };
    if (typeof item.message === "string") messages.push(item.message);
    current = item.cause;
  }
  return messages.join(" | ");
}

beforeAll(async () => {
  const base = validasiDatabaseUji(process.env);
  const url = new URL(base.dsn);
  url.pathname = `/${DATABASE}`;
  const { opsiKoneksi } = validasiDsnUji(url.toString());
  const server = await bukaKoneksiServer();
  try {
    await server.query(`CREATE DATABASE \`${DATABASE}\``);
  } finally {
    await server.end();
  }

  pool = mysql.createPool({ ...opsiKoneksi, multipleStatements: true });
  folderSampai0010 = buatFolderMigrasiSampai0010();
  const instance = drizzle(pool, { mode: "default" });
  await migrate(instance, { migrationsFolder: folderSampai0010 });

  const conn = await pool.getConnection();
  try {
    await conn.query(
      "INSERT INTO villages (id, name, code) VALUES (931, 'B1 Guard A', 'B1GUARDA'), (932, 'B1 Guard B', 'B1GUARDB')",
    );
    await conn.query(
      "INSERT INTO families (id, village_id, number) VALUES (931, 931, 'KK-B1-A'), (932, 932, 'KK-B1-B')",
    );
    await conn.query(
      "INSERT INTO residents (id, village_id, name, gender) VALUES (931, 931, 'Penduduk B1 A', 'male'), (932, 932, 'Penduduk B1 B', 'female')",
    );
    await conn.query(
      "INSERT INTO letter_types (id, village_id, code, name, template_body) VALUES (931, 931, 'LT-B1-A', 'Jenis Surat B1 A', 'Isi A'), (932, 932, 'LT-B1-B', 'Jenis Surat B1 B', 'Isi B')",
    );
    await conn.query(
      "INSERT INTO letters (id, village_id, type_id, resident_id, type_name, letter_date, year) VALUES (931, 931, 931, 931, 'Surat A', '2026-01-01', 2026), (932, 932, 932, 932, 'Surat B', '2026-01-01', 2026)",
    );

    // Simulasikan data yang ditulis sebelum composite tenant FK ada.
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    await conn.query(
      `INSERT INTO kontak (id, village_id, nama, resident_id) VALUES
        (931, 931, 'Kontak lintas', 932),
        (932, 931, 'Kontak orphan', 999999)`,
    );
    await conn.query(
      `INSERT INTO lapak (id, village_id, nama, resident_id) VALUES
        (931, 931, 'Lapak lintas', 932),
        (932, 931, 'Lapak orphan', 999999)`,
    );
    await conn.query(
      `INSERT INTO notifikasi_terkirim (id, village_id, resident_id, jenis, kanal, target) VALUES
        (931, 931, 932, 'uji.lintas', 'email', 'lintas@example.test'),
        (932, 931, 999999, 'uji.orphan', 'email', 'orphan@example.test')`,
    );
    await conn.query(
      `INSERT INTO pendapat (id, village_id, resident_id, pilihan) VALUES
        (931, 931, 932, 1),
        (932, 931, 999999, 2)`,
    );
    await conn.query(
      `INSERT INTO family_member_logs (id, village_id, family_id, resident_name, aksi) VALUES
        (931, 931, 932, 'Log lintas', 'added'),
        (932, 931, 999999, 'Log orphan', 'added')`,
    );
    await conn.query(
      `INSERT INTO family_member_logs (id, village_id, resident_id, resident_name, aksi) VALUES
        (933, 931, 932, 'Log resident lintas', 'added'),
        (934, 931, 999999, 'Log resident orphan', 'added')`,
    );
    await conn.query(
      `INSERT INTO users (id, name, email, village_id, resident_id) VALUES
        ('11111111-1111-1111-1111-111111111111', 'User lintas', 'lintas-b1@example.test', 931, 932),
        ('22222222-2222-2222-2222-222222222222', 'User orphan', 'orphan-b1@example.test', 931, 999999)`,
    );
    await conn.query(
      `INSERT INTO letter_number_archive (village_id, letter_id, number, sequence, year, type_id, type_name, issued_at) VALUES
        (931, 932, '001/LINTAS/B1', 1, 2026, 931, 'Surat A', '2026-01-01 00:00:00'),
        (931, 999999, '002/ORPHAN/B1', 2, 2026, 931, 'Surat A', '2026-01-01 00:00:00')`,
    );
    await conn.query("SET FOREIGN_KEY_CHECKS=1");
  } finally {
    conn.release();
  }

  try {
    await migrate(instance, { migrationsFolder: MIGRATIONS_FOLDER });
  } catch (error) {
    galatMigrasi = error;
  }

  const [findings] = await pool.query<RowDataPacket[]>(
    "SELECT relasi, jenis, jumlah FROM _b1_tenant_preflight_findings ORDER BY relasi, jenis",
  );
  temuan = findings.map((row) => ({
    relasi: String(row.relasi),
    jenis: String(row.jenis),
    jumlah: Number(row.jumlah),
  }));
  const [constraints] = await pool.query<RowDataPacket[]>(
    "SELECT CONSTRAINT_NAME AS nama FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=?",
    [DATABASE],
  );
  fk = constraints.map((row) => String(row.nama));
}, 180_000);

afterAll(async () => {
  if (pool) await pool.end();
  if (folderSampai0010) fs.rmSync(folderSampai0010, { recursive: true, force: true });
  const server = await bukaKoneksiServer();
  try {
    await server.query(`DROP DATABASE IF EXISTS \`${DATABASE}\``);
  } finally {
    await server.end();
  }
});

describe("AUD-034 B1 migration preflight", () => {
  it("gagal-closed dan menyebut temuan pada pesan migration", () => {
    expect(galatMigrasi).toBeDefined();
    expect(pesanGalat(galatMigrasi)).toContain("B1");
  });

  it("mendeteksi orphan dan cross-tenant pada kedelapan relasi", () => {
    expect(temuan).toHaveLength(16);
    for (const relasi of RELASI) {
      expect(temuan).toContainEqual({ relasi, jenis: "cross-tenant", jumlah: 1 });
      expect(temuan).toContainEqual({ relasi, jenis: "orphan", jumlah: 1 });
    }
  });

  it("tidak mengganti FK lama atau memasang FK composite saat preflight gagal", () => {
    for (const nama of FK_LAMA) {
      expect(fk).toContain(nama);
    }
    for (const nama of FK_BARU) {
      expect(fk).not.toContain(nama);
    }
  });
});
