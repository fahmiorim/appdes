#!/usr/bin/env node
/**
 * Memvalidasi peta integration test terhadap daftar include Vitest.
 *
 * Pemakaian:
 *   node scripts/integration-test-map.mjs --check
 *   node scripts/integration-test-map.mjs --markdown
 *
 * Peta disimpan di scripts/integration-test-map.json dan menjadi sumber data
 * untuk seleksi test per modul. Validator memastikan tidak ada test yang
 * terlewat, hilang, atau terdaftar ganda.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const mapPath = path.join(root, "scripts", "integration-test-map.json");
const configPath = path.join(root, "vitest.integration.config.mts");
const mode = process.argv.includes("--markdown") ? "markdown" : "check";

function fail(message) {
  process.stderr.write(`[integration-map] GAGAL: ${message}\n`);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`tidak dapat membaca ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function bacaInclude() {
  const config = fs.readFileSync(configPath, "utf8");
  const block = config.match(/include:\s*\[([\s\S]*?)\],\s*setupFiles/);
  if (!block) fail("blok include tidak ditemukan di vitest.integration.config.mts");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

const map = readJson(mapPath);
if (map.version !== 1) fail(`versi peta tidak dikenal: ${String(map.version)}`);

const groups = [];
for (const group of map.crossCutting ?? []) {
  if (!group.id || !Array.isArray(group.tests) || group.tests.length === 0) {
    fail("setiap crossCutting wajib memiliki id dan tests yang tidak kosong");
  }
  groups.push({ id: group.id, label: group.id, tests: group.tests, kind: "crossCutting" });
}
for (const [moduleName, tests] of Object.entries(map.modules ?? {})) {
  if (!Array.isArray(tests) || tests.length === 0) {
    fail(`modul ${moduleName} tidak memiliki test`);
  }
  groups.push({ id: moduleName, label: moduleName, tests, kind: "module" });
}

const seen = new Map();
for (const group of groups) {
  for (const test of group.tests) {
    if (seen.has(test)) {
      fail(`${test} terdaftar ganda di ${seen.get(test)} dan ${group.id}`);
    }
    seen.set(test, group.id);

    if (!fs.existsSync(path.join(root, test))) {
      fail(`file test tidak ditemukan: ${test}`);
    }

    if (group.kind === "module" && !test.startsWith(`src/features/${group.id}/`)) {
      fail(`${test} tidak berada di direktori modul ${group.id}`);
    }
  }
}

for (const group of map.crossCutting ?? []) {
  for (const moduleName of group.coversModules ?? []) {
    if (!fs.existsSync(path.join(root, "src", "features", moduleName))) {
      fail(`coversModules ${group.id} merujuk direktori modul yang tidak ada: ${moduleName}`);
    }
  }
}

const include = bacaInclude();
const missing = include.filter((test) => !seen.has(test));
const extra = [...seen.keys()].filter((test) => !include.includes(test));
if (missing.length > 0) fail(`test di Vitest belum dipetakan: ${missing.join(", ")}`);
if (extra.length > 0) fail(`test di peta tidak ada di Vitest: ${extra.join(", ")}`);

const totalTests = [...seen.keys()].length;
const totalCrossCutting = groups
  .filter((group) => group.kind === "crossCutting")
  .reduce((sum, group) => sum + group.tests.length, 0);
const totalModules = groups.filter((group) => group.kind === "module").length;

if (mode === "markdown") {
  process.stdout.write("# Peta Integration Test per Modul\n\n");
  process.stdout.write(
    `Total: **${totalTests}** test, **${totalModules}** modul, **${totalCrossCutting}** test lintas modul.\n\n`,
  );
  process.stdout.write("| Modul / kelompok | Jumlah test | File |\n|---|---:|---|\n");
  for (const group of groups) {
    process.stdout.write(
      `| ${group.label} | ${group.tests.length} | ${group.tests.map((test) => `\`${test}\``).join("<br>")} |\n`,
    );
  }
} else {
  process.stdout.write(
    `[integration-map] PASS: ${totalTests} test, ${totalModules} modul, ${totalCrossCutting} test lintas modul.\n`,
  );
}
