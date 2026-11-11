import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Penjaga paritas skema vs migrasi.
 *
 * Skema Drizzle (`src/db/schema`) adalah sumber kebenaran bentuk tabel, tetapi
 * database baru hanya terbentuk dari berkas migrasi. Tanpa test ini, tabel yang
 * hanya dibuat lewat `db:push` akan lolos dari CI dan membuat modul gagal 500
 * pada instalasi bersih.
 *
 * Catatan: test ini statis (tanpa koneksi DB) agar tetap berjalan di job CI
 * yang tidak menyediakan MySQL. Pembandingnya adalah snapshot Drizzle terakhir,
 * yang juga dipakai `db:generate` untuk menghitung diff.
 */

const SCHEMA_DIR = fileURLToPath(new URL("./schema/", import.meta.url));
const MIGRATIONS_DIR = fileURLToPath(new URL("./migrations/", import.meta.url));
const META_DIR = `${MIGRATIONS_DIR}meta/`;

interface SnapshotTabel {
  columns: Record<string, unknown>;
  indexes: Record<string, unknown>;
  foreignKeys: Record<string, unknown>;
}

interface Snapshot {
  tables: Record<string, SnapshotTabel>;
}

function tabelSkema(): Set<string> {
  const hasil = new Set<string>();
  for (const berkas of fs.readdirSync(SCHEMA_DIR)) {
    if (!berkas.endsWith(".ts") || berkas.endsWith(".test.ts") || berkas === "index.ts") continue;
    const isi = fs.readFileSync(SCHEMA_DIR + berkas, "utf8");
    for (const cocok of isi.matchAll(/mysqlTable\(\s*"([a-z0-9_]+)"/g)) {
      const tabel = cocok[1];
      if (tabel) hasil.add(tabel);
    }
  }
  return hasil;
}

function sqlMigrasi(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((berkas) => berkas.endsWith(".sql"))
    .map((berkas) => fs.readFileSync(MIGRATIONS_DIR + berkas, "utf8"));
}

function tabelMigrasi(): Set<string> {
  const hasil = new Set<string>();
  for (const isi of sqlMigrasi()) {
    for (const cocok of isi.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?`([a-z0-9_]+)`/g)) {
      const tabel = cocok[1];
      if (tabel) hasil.add(tabel);
    }
  }
  return hasil;
}

/** Nama kolom per tabel, dibaca dari badan `CREATE TABLE` pada seluruh migrasi. */
function kolomMigrasi(): Map<string, Set<string>> {
  const hasil = new Map<string, Set<string>>();
  for (const isi of sqlMigrasi()) {
    for (const tabel of isi.matchAll(
      /CREATE TABLE (?:IF NOT EXISTS )?`([a-z0-9_]+)` \(\n([\s\S]*?)\n\);/g,
    )) {
      const nama = tabel[1];
      const badan = tabel[2];
      if (!nama || badan === undefined) continue;
      const kolom = hasil.get(nama) ?? new Set<string>();
      for (const baris of badan.split("\n")) {
        const cocok = /^\t`([a-z0-9_]+)`/.exec(baris);
        if (cocok?.[1]) kolom.add(cocok[1]);
      }
      hasil.set(nama, kolom);
    }
  }
  return hasil;
}

function namaForeignKeyMigrasi(): Set<string> {
  const hasil = new Set<string>();
  for (const isi of sqlMigrasi()) {
    for (const cocok of isi.matchAll(/CONSTRAINT `([^`]+)` FOREIGN KEY/g)) hasil.add(cocok[1]!);
  }
  return hasil;
}

function namaIndexMigrasi(): Set<string> {
  const hasil = new Set<string>();
  for (const isi of sqlMigrasi()) {
    for (const cocok of isi.matchAll(/CREATE (?:UNIQUE )?INDEX `([^`]+)`/g)) hasil.add(cocok[1]!);
    for (const cocok of isi.matchAll(/^\tKEY `([^`]+)`/gm)) hasil.add(cocok[1]!);
    for (const cocok of isi.matchAll(/CONSTRAINT `([^`]+)` UNIQUE/g)) hasil.add(cocok[1]!);
  }
  return hasil;
}

function tagJournal(): string[] {
  const journal = JSON.parse(fs.readFileSync(MIGRATIONS_DIR + "meta/_journal.json", "utf8")) as {
    entries: Array<{ idx: number; tag: string }>;
  };
  return journal.entries.map((entri) => entri.tag);
}

function snapshotTerakhir(): Snapshot {
  const berkas = fs
    .readdirSync(META_DIR)
    .filter((nama) => /^\d{4}_snapshot\.json$/.test(nama))
    .sort();

  const terakhir = berkas.at(-1);
  if (!terakhir) throw new Error("Tidak ada snapshot migrasi.");

  return JSON.parse(fs.readFileSync(`${META_DIR}${terakhir}`, "utf8")) as Snapshot;
}

function berkasMigrasi(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((berkas) => berkas.endsWith(".sql"))
    .map((berkas) => berkas.replace(/\.sql$/, ""));
}

describe("paritas skema vs migrasi", () => {
  it("setiap tabel pada skema dibuat oleh berkas migrasi", () => {
    const skema = tabelSkema();
    const migrasi = tabelMigrasi();
    const hilang = [...skema].filter((tabel) => !migrasi.has(tabel)).sort();

    expect(hilang).toEqual([]);
    expect(skema.size).toBeGreaterThan(0);
  });

  it("setiap berkas migrasi terdaftar di journal Drizzle", () => {
    const journal = new Set(tagJournal());
    const belumTerdaftar = berkasMigrasi()
      .filter((berkas) => !journal.has(berkas))
      .sort();

    expect(belumTerdaftar).toEqual([]);
  });

  it("tidak ada entri journal tanpa berkas migrasi", () => {
    const berkas = new Set(berkasMigrasi());
    const yatim = tagJournal()
      .filter((tag) => !berkas.has(tag))
      .sort();

    expect(yatim).toEqual([]);
  });

  it("setiap kolom pada snapshot dibuat oleh SQL migrasi", () => {
    const kolom = kolomMigrasi();
    const hilang: string[] = [];

    for (const [tabel, isi] of Object.entries(snapshotTerakhir().tables)) {
      const kolomSql = kolom.get(tabel);
      if (!kolomSql) {
        hilang.push(`${tabel} (tabel)`);
        continue;
      }
      for (const nama of Object.keys(isi.columns)) {
        if (!kolomSql.has(nama)) hilang.push(`${tabel}.${nama}`);
      }
    }

    expect(hilang.sort()).toEqual([]);
  });

  it("setiap foreign key pada snapshot dibuat oleh SQL migrasi", () => {
    const dibuat = namaForeignKeyMigrasi();
    const hilang: string[] = [];

    for (const isi of Object.values(snapshotTerakhir().tables)) {
      for (const nama of Object.keys(isi.foreignKeys)) {
        if (!dibuat.has(nama)) hilang.push(nama);
      }
    }

    expect(hilang.sort()).toEqual([]);
  });

  it("setiap indeks pada snapshot dibuat oleh SQL migrasi", () => {
    const dibuat = namaIndexMigrasi();
    const hilang: string[] = [];

    for (const isi of Object.values(snapshotTerakhir().tables)) {
      for (const nama of Object.keys(isi.indexes)) {
        if (!dibuat.has(nama)) hilang.push(nama);
      }
    }

    expect(hilang.sort()).toEqual([]);
  });

  it("setiap entri journal memiliki berkas snapshot", () => {
    const journal = JSON.parse(fs.readFileSync(MIGRATIONS_DIR + "meta/_journal.json", "utf8")) as {
      entries: Array<{ idx: number; tag: string }>;
    };
    const ada = new Set(
      fs
        .readdirSync(META_DIR)
        .filter((nama) => /^\d{4}_snapshot\.json$/.test(nama))
        .map((nama) => nama.replace("_snapshot.json", "")),
    );

    const hilang = journal.entries
      .filter((entri) => !ada.has(String(entri.idx).padStart(4, "0")))
      .map((entri) => entri.tag);

    expect(hilang).toEqual([]);
  });
});
