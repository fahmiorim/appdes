#!/usr/bin/env node
/**
 * Membuat docs/architecture/MODULE-INVENTORY.md dari isi repository.
 *
 * Inventaris bersifat snapshot: jalankan ulang setelah menambah route,
 * Server Action, repository, atau use case, lalu review diff-nya.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function isTest(file) {
  return file.includes(".test.") || file.includes(".integration.");
}

const files = walk(path.join(root, "src")).map((file) =>
  path.relative(root, file).replaceAll("\\", "/"),
);

const routePattern = /^src\/app\/(?:.*\/)?(page|route)\.tsx?$/;
const routes = files
  .filter((file) => routePattern.test(file))
  .map((file) => {
    const rel = file.replace(/^src\/app\//, "");
    const isPage = /(?:^|\/)(page)\.tsx?$/.test(rel);
    const route =
      "/" +
      rel
        .replace(/\/(page|route)\.tsx?$/, "")
        .replace(/^(page|route)\.tsx?$/, "")
        .replace(/\/\([^/]+\)/g, "")
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
  .sort((a, b) => a.group.localeCompare(b.group) || a.route.localeCompare(b.route));

const actions = files.filter(
  (file) => !isTest(file) && /"use server"/.test(fs.readFileSync(path.join(root, file), "utf8")),
);

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
const totalLayouts = files.filter((file) => /^src\/app\/.*layout\.tsx?$/.test(file)).length;

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
    lines.push(app.length ? app.map((file) => `- \`${file}\``).join("\n") : "- _(tidak ada)_");
    lines.push("", "**Repository**");
    lines.push(repo.length ? repo.map((file) => `- \`${file}\``).join("\n") : "- _(tidak ada)_");
    return lines.join("\n");
  })
  .join("\n\n");

const doc = `# Inventaris Modul Appdes SID

Dokumen ini adalah inventaris route, Server Action, repository, dan use case
yang ada di kode pada snapshot \`main\` commit \`f19267d\` (17 November 2026).
Ini adalah inventaris faktual, bukan daftar fitur yang dijanjikan.

- ${totalPages} halaman (\`page.tsx\`), ${totalLayouts} layout, dan ${routes.length - totalPages} route handler.
- ${actions.length} berkas berisi \`"use server"\` (Server Action).
- ${modules.length} direktori fitur di \`src/features\`; ${totalRepo} repository dan ${totalApp} berkas application/use case non-test.

> Catatan: route di bawah adalah path URL setelah route group Next.js
> (\`(admin)\`, \`(auth)\`, \`(public)\`, \`(warga)\`) dihapus. Dynamic segment
> ditulis apa adanya, misalnya \`[id]\`.

## 1. Ringkasan per modul

| Modul | Berkas application/use case | Repository |
|---|---:|---:|
${summaryRows}

## 2. Route dan route handler

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

- Inventaris ini mencakup berkas application di \`src/features/*/application\`;
  beberapa berkas di sana adalah helper/notification, bukan use case tunggal.
- Route handler di \`src/app/api\` tercatat sebagai route, bukan Server Action.
- Halaman yang memakai data langsung dari repository tanpa lapisan application
  tetap tercatat route-nya, tetapi tidak menambah daftar use case.
- Inventaris tidak menilai kualitas, cakupan test, atau status fitur. Untuk
  status fitur lihat \`docs/SID_FEATURE_MAP.md\`.
`;

fs.mkdirSync(path.join(root, "docs/architecture"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/architecture/MODULE-INVENTORY.md"), doc);
process.stdout.write(
  `routes=${routes.length} actions=${actions.length} modules=${modules.length} app=${totalApp} repo=${totalRepo}\n`,
);
