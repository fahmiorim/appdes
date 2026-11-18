#!/usr/bin/env node
/**
 * Menghasilkan dataset wilayah untuk picker desa.
 *
 * Sumber: dump `db/wilayah.sql` dari https://github.com/cahyadsn/wilayah
 * (MIT) yang memuat Kode dan Data Wilayah Administrasi Pemerintahan sesuai
 * Kepmendagri No. 300.2.2-2138 Tahun 2025.
 *
 * Keluaran (minified JSON, kode desa tanpa titik):
 * - provinsi.json  [["11","Aceh"], ...]
 * - kabupaten.json { "11": [["11.01","Kabupaten Aceh Selatan"], ...] }
 * - kecamatan.json { "11.01": [["11.01.01","Bakongan"], ...] }
 * - desa.json      { "11.01.01": [["1101012001","Keude Bakongan"], ...] }
 *
 * Pemakaian: node scripts/wilayah/generate-wilayah.mjs [url-atau-path-sql]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SUMBER_DEFAULT = "https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql";
const TUJUAN = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/features/wilayah/data");

async function bacaSumber(sumber) {
  if (/^https?:\/\//i.test(sumber)) {
    const res = await fetch(sumber, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`Unduhan gagal: HTTP ${res.status}`);
    return res.text();
  }

  return readFile(resolve(sumber), "utf8");
}

/** Ambil pasangan (kode, nama) dari seluruh `INSERT INTO wilayah ... VALUES`. */
function ekstrakBaris(sql) {
  const pola = /\(\s*'([\d.]+)'\s*,\s*'((?:[^'\\]|\\.|'')*)'\s*\)/g;
  const baris = [];
  let cocok;

  while ((cocok = pola.exec(sql)) !== null) {
    const kode = cocok[1];
    const nama = cocok[2].replace(/\\(.)/g, "$1").replace(/''/g, "'").trim();
    if (kode && nama) baris.push([kode, nama]);
  }

  return baris;
}

function kelompokkan(baris) {
  const provinsi = [];
  const kabupaten = {};
  const kecamatan = {};
  const desa = {};

  for (const [kode, nama] of baris) {
    const bagian = kode.split(".");
    if (bagian.length === 1) {
      provinsi.push([kode, nama]);
    } else if (bagian.length === 2) {
      (kabupaten[bagian[0]] ??= []).push([kode, nama]);
    } else if (bagian.length === 3) {
      (kecamatan[bagian.slice(0, 2).join(".")] ??= []).push([kode, nama]);
    } else if (bagian.length === 4) {
      (desa[bagian.slice(0, 3).join(".")] ??= []).push([kode.replaceAll(".", ""), nama]);
    }
  }

  return { provinsi, kabupaten, kecamatan, desa };
}

const sumber = process.argv[2] ?? SUMBER_DEFAULT;
const sql = await bacaSumber(sumber);
const hasil = kelompokkan(ekstrakBaris(sql));

const jumlah = {
  provinsi: hasil.provinsi.length,
  kabupaten: Object.values(hasil.kabupaten).flat().length,
  kecamatan: Object.values(hasil.kecamatan).flat().length,
  desa: Object.values(hasil.desa).flat().length,
};

if (jumlah.provinsi < 38 || jumlah.kabupaten < 500 || jumlah.desa < 80_000) {
  throw new Error(`Data tidak lengkap: ${JSON.stringify(jumlah)}`);
}

await mkdir(TUJUAN, { recursive: true });
for (const [nama, isi] of Object.entries(hasil)) {
  await writeFile(resolve(TUJUAN, `${nama}.json`), JSON.stringify(isi), "utf8");
}

console.log(`Sumber: ${sumber}`);
console.log(jumlah);
