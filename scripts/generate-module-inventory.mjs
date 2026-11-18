#!/usr/bin/env node
/**
 * Membuat docs/architecture/MODULE-INVENTORY.md dari satu ref git.
 *
 * Default-nya `origin/main` supaya inventaris selalu menggambarkan kode main,
 * bukan working tree yang mungkin berisi perubahan belum di-merge. Jalankan
 * ulang setelah route, Server Action, repository, atau use case bertambah,
 * lalu review diff-nya.
 *
 * Pemakaian: npm run docs:inventory [-- <ref>]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" });
}

function refExists(ref) {
  try {
    git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

const requestedRef = process.argv[2];
const ref = requestedRef ?? (refExists("origin/main") ? "origin/main" : "HEAD");
if (!refExists(ref)) {
  process.stderr.write(`Ref tidak ditemukan: ${ref}\n`);
  process.exit(1);
}

const commit = git(["rev-parse", "--short", ref]).trim();
const commitDate = new Date(git(["show", "-s", "--format=%cI", ref]).trim());
const tanggal = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
}).format(commitDate);

function isTest(file) {
  return file.includes(".test.") || file.includes(".integration.");
}

const files = git(["ls-tree", "-r", "--name-only", ref, "--", "src"])
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean);

const routePattern = /^src\/app\/(?:.*\/)?(page|route)\.tsx?$/;
const routes = files
  .filter((file) => routePattern.test(file))
  .map((file) => {
    const rel = file.replace(/^src\/app\//, "");
    const isPage = /(?:^|\/)(page)\.tsx?$/.test(rel);
    const route =
      "/" +
      rel
        .replace(/\/?(page|route)\.tsx?$/, "")
        .replace(/\([^/]+\)\/?/g, "")
        .replace(/\/+$/, "");

    const group = rel.startsWith("(admin)")
      ? "Admin"
      : rel.startsWith("(auth)")
        ? "Auth"
        : rel.startsWith("(warga)")
          ? "Warga"
          : rel.startsWith("api/")
            ? "API"
            : "Publik";

    return {
      route: route || "/",
      kind: isPage ? "Halaman" : "Route handler",
      group,
      file,
    };
  })
  .sort((a, b) => a.route.localeCompare(b.route));

const actions = git(["grep", "-l", "use server", ref, "--", "src"])
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.slice(ref.length + 1))
  .filter((file) => /\.(ts|tsx)$/.test(file) && !isTest(file))
  .map((file) => {
    const content = git(["show", `${ref}:${file}`]);
    return content.includes('"use server"') ? file : null;
  })
  .filter(Boolean)
  .sort();

const modules = fs
  .readdirSync(path.join(root, "src/features"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const moduleRows = modules.map((name) => {
  const repo = files.filter(
    (file) =>
      file.startsWith(`src/features/${name}/`) &&
      /repository[^/]*\.ts$/.test(file) &&
      !isTest(file),
  );
  const app = files.filter(
    (file) =>
      file.startsWith(`src/features/${name}/application/`) && file.endsWith(".ts") && !isTest(file),
  );
  return { name, repo, app };
});

const totalRepo = moduleRows.reduce((total, row) => total + row.repo.length, 0);
const totalApp = moduleRows.reduce((total, row) => total + row.app.length, 0);
const totalPages = routes.filter((route) => route.kind === "Halaman").length;
const totalRoutes = routes.length - totalPages;
const layouts = files.filter((file) => /^src\/app\/.*layout\.tsx?$/.test(file)).sort();
const adminPages = routes.filter((route) => route.kind === "Halaman" && route.group === "Admin");

const routeRows = routes
  .map((route) => `| \`${route.route}\` | ${route.kind} | ${route.group} | \`${route.file}\` |`)
  .join("\n");

const actionRows = actions.length
  ? actions.map((file) => `| \`${file}\` |`).join("\n")
  : "| _(tidak ada)_ |";

const summaryRows = moduleRows
  .map(({ name, repo, app }) => `| ${name} | ${app.length} | ${repo.length} |`)
  .join("\n");

const detail = moduleRows
  .map(({ name, repo, app }) => {
    const lines = [`### ${name}`, "", "**Use case/application**"];
    lines.push(app.length ? app.map((file) => `- \`${file}\``).join("\n") : "- Tidak ada.");
    lines.push("", "**Repository**");
    lines.push(repo.length ? repo.map((file) => `- \`${file}\``).join("\n") : "- Tidak ada.");
    return lines.join("\n");
  })
  .join("\n\n");

const doc = `# Inventaris Modul Appdes SID

Dokumen ini adalah inventaris route, Server Action, repository, dan use case yang
digenerate ulang dari tree \`${ref}\` commit \`${commit}\` (${tanggal}).
Ini adalah inventaris faktual, bukan daftar fitur yang dijanjikan.

- ${totalPages} halaman (\`page.tsx\`), ${layouts.length} layout, dan ${totalRoutes} route handler.
- ${actions.length} berkas berisi \`"use server"\` (Server Action).
- ${modules.length} direktori fitur di \`src/features\`; ${totalRepo} berkas \`*-repository.ts\` dan ${totalApp} berkas application/use case non-test.
- ${adminPages.length} halaman admin: \`/beranda\` dan \`/super-admin/*\`.

> Metode: \`git ls-tree -r --name-only ${ref}\`; hitungan \`page.tsx\`,
> \`route.ts\`, \`layout.tsx\`, \`src/features/*/application/*.ts\` non-test, dan
> \`src/features/*/infrastructure/**/*-repository.ts\` non-test. Route group
> Next.js (\`(admin)\`, \`(auth)\`, \`(public)\`, \`(warga)\`) dihapus dari path;
> dynamic segment ditulis apa adanya, misalnya \`[id]\`.

Layout: ${layouts.map((file) => `\`${file}\``).join(", ")}.

## 1. Ringkasan per modul

| Modul | Berkas application/use case | Repository |
|---|---:|---:|
${summaryRows}

## 2. Route dan route handler

Halaman adalah UI; route handler adalah endpoint ekspor, PDF, berkas, API, atau
webhook. Route handler Admin di bawah umumnya bukan UI pengelolaan.

| Path | Jenis | Area | Berkas |
|---|---|---|---|
${routeRows}

## 3. Server Action

| Berkas |
|---|
${actionRows}

## 4. Rincian use case dan repository per modul

${detail}

## 5. Batasan

- Inventaris mencakup berkas di \`src/features/*/application\`; beberapa berkas di
  sana adalah helper/notifikasi, bukan use case tunggal.
- Route handler di \`src/app/api\` tercatat sebagai route, bukan Server Action.
- Halaman yang memakai data langsung dari repository tanpa lapisan application
  tetap tercatat route-nya, tetapi tidak menambah daftar use case.
- Inventaris tidak menilai kualitas, cakupan test, atau status fitur. Untuk
  status fitur lihat \`docs/SID_FEATURE_MAP.md\`.
- Angka mengikuti ref yang digenerate; jalankan \`npm run docs:inventory\`
  setelah route atau modul bertambah.
`;

fs.mkdirSync(path.join(root, "docs/architecture"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/architecture/MODULE-INVENTORY.md"), doc);
process.stdout.write(
  `ref=${ref} commit=${commit} pages=${totalPages} routes=${totalRoutes} layouts=${layouts.length} ` +
    `features=${modules.length} app=${totalApp} repo=${totalRepo} actions=${actions.length}\n`,
);
