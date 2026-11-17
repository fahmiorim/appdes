#!/usr/bin/env node
/**
 * Menentukan job CI yang relevan dari daftar file yang berubah.
 *
 * Pemakaian:
 *   node scripts/ci-changes.mjs <base-sha> <head-sha>
 *   node scripts/ci-changes.mjs --files <path> [path...]
 *
 * Output berupa baris `key=true|false`; bila GITHUB_OUTPUT tersedia, hasil
 * ditulis ke file tersebut untuk dipakai job berikutnya.
 *
 * Prinsip:
 * - `code`: typecheck, lint, dan unit test dijalankan;
 * - `integration`: perubahan database, repository/application, API, action,
 *   konfigurasi database, atau integration test;
 * - `build`: perubahan source non-test, dependency, konfigurasi build, atau
 *   aset publik.
 *
 * Dokumentasi saja tidak menjalankan ketiganya; job tetap dibuat agar required
 * check branch protection selalu memiliki status.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const args = process.argv.slice(2);
let files;

if (args[0] === "--files") {
  files = args.slice(1);
} else {
  const [base, head] = args;
  if (!base || !head) {
    process.stderr.write(
      "Pemakaian: node scripts/ci-changes.mjs <base-sha> <head-sha> | --files <path...>\n",
    );
    process.exit(1);
  }

  try {
    files = execFileSync("git", ["diff", "--name-only", `${base}...${head}`], {
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch (error) {
    process.stderr.write(
      `Gagal membaca diff ${base}...${head}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
}

const normalized = files.map((file) => file.replaceAll("\\", "/"));
const isTest = (file) => /\.(test|integration\.test|integrasi\.test)\.tsx?$/.test(file);
const isSource = (file) => file.startsWith("src/");
const isDocs = (file) => file.startsWith("docs/") || file.endsWith(".md");
const isTooling = (file) => file.startsWith("scripts/") || file.startsWith(".github/");
const isBuildConfig = (file) =>
  [
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "next.config.mjs",
    "tsconfig.json",
    "postcss.config.mjs",
    "postcss.config.js",
    "eslint.config.mjs",
    "prettier.config.mjs",
    "prettier.config.js",
  ].includes(file) || file.startsWith("public/");
const isIntegrationConfig = (file) =>
  [
    "package.json",
    "package-lock.json",
    "drizzle.config.ts",
    "vitest.integration.config.mts",
  ].includes(file);
const isIntegrationPath = (file) =>
  isTest(file)
    ? /integration|integrasi/.test(file)
    : isSource(file) &&
      (file.startsWith("src/db/") ||
        file.startsWith("src/testing/") ||
        file.startsWith("src/app/api/") ||
        file.endsWith("actions.ts") ||
        file.includes("/infrastructure/") ||
        file.includes("/application/"));
const code = normalized.some(
  (file) => (isSource(file) && !isDocs(file)) || isBuildConfig(file) || isTooling(file),
);
const integration = normalized.some((file) => isIntegrationConfig(file) || isIntegrationPath(file));
const build = normalized.some(
  (file) => (isSource(file) && !isTest(file) && !isDocs(file)) || isBuildConfig(file),
);

const outputs = { code, integration, build };
const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`);
}

process.stdout.write(
  `${lines.join("\n")}\nfiles=${normalized.length}\n${normalized.map((file) => `- ${file}`).join("\n")}\n`,
);
