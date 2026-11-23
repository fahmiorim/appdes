#!/usr/bin/env node
/**
 * Memvalidasi klaim angka inventaris pada dokumen aktif.
 *
 * Pemakaian:
 *   node scripts/check-doc-claims.mjs
 *   npm run docs:check-claims
 *
 * Angka dihitung langsung dari source: halaman App Router, route handler,
 * entri `RUTE_ADMIN_TERSEDIA`, isi template tenant, dan migration Drizzle.
 * Dokumen di `docs/reports/` sengaja dikecualikan karena laporan adalah
 * snapshot historis dan tidak boleh ditulis ulang saat angka berubah.
 *
 * Skrip hanya memakai Node built-in agar tetap berjalan pada PR dokumentasi
 * yang tidak memasang dependency.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const docsDir = path.join(root, "docs");
const reportsDir = path.join(docsDir, "reports");

function fail(message) {
  process.stderr.write(`[docs-claims] GAGAL: ${message}\n`);
  process.exit(1);
}

function read(relativePath) {
  try {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
  } catch (error) {
    fail(
      `tidak dapat membaca ${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** Daftar semua berkas .md di docs/, kecuali docs/reports/. */
function daftarDokumen(directory = docsDir) {
  const hasil = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (absolute === reportsDir) continue;
      hasil.push(...daftarDokumen(absolute));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      hasil.push(absolute);
    }
  }
  return hasil;
}

/** Hitung berkas dengan nama tertentu di bawah src/app secara rekursif. */
function hitungBerkasApp(nama) {
  const appDir = path.join(root, "src", "app");
  let jumlah = 0;

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.name === nama) {
        jumlah += 1;
      }
    }
  }

  walk(appDir);
  return jumlah;
}

/** Ambil isi array literal pada source TypeScript berdasarkan pembuka/penutupnya. */
function blokArray(source, awal, akhir, label) {
  const start = source.indexOf(awal);
  if (start === -1) fail(`blok "${label}" tidak ditemukan`);
  const end = source.indexOf(akhir, start + awal.length);
  if (end === -1) fail(`penutup blok "${label}" tidak ditemukan`);
  return source.slice(start + awal.length, end);
}

function hitungPola(teks, pola) {
  return [...teks.matchAll(pola)].length;
}

// --- Fakta dari source -----------------------------------------------------

const halamanTotal = hitungBerkasApp("page.tsx");
const routeHandlerTotal = hitungBerkasApp("route.ts") + hitungBerkasApp("route.tsx");

const adminDir = path.join(root, "src", "app", "(admin)");
const halamanAdminTotal = (() => {
  let jumlah = 0;
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name === "page.tsx") jumlah += 1;
    }
  }
  walk(adminDir);
  return jumlah;
})();
const halamanSuperAdmin = (() => {
  let jumlah = 0;
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name === "page.tsx") jumlah += 1;
    }
  }
  walk(path.join(adminDir, "super-admin"));
  return jumlah;
})();

const menuSource = read("src/features/navigation/domain/menu-tampil.ts");
const ruteAdmin = hitungPola(
  blokArray(menuSource, "RUTE_ADMIN_TERSEDIA: readonly string[] = [", "];", "RUTE_ADMIN_TERSEDIA"),
  /^\s*"\/[^"]*",?\s*$/gm,
);

const templateSource = read("src/db/templates/tenant-template.ts");
const templateModules = hitungPola(
  blokArray(templateSource, "modules: [", "\n  ],\n  akses:", "modules"),
  /\bslug:\s*"/g,
);
const templateGrants = hitungPola(
  blokArray(templateSource, "akses: [", "\n  ],\n  tema:", "akses"),
  /\broleSlug:\s*"/g,
);
const templateMenuPublik = hitungPola(
  blokArray(templateSource, "menuPublik: [", "\n  ],\n} satisfies", "menuPublik"),
  /\{ nama:\s*"/g,
);

const migrationDir = path.join(root, "src", "db", "migrations");
const migrationSql = fs
  .readdirSync(migrationDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql")).length;
let migrationJournal;
try {
  const journal = JSON.parse(
    fs.readFileSync(path.join(migrationDir, "meta", "_journal.json"), "utf8"),
  );
  if (!Array.isArray(journal.entries)) fail("meta/_journal.json tidak memiliki array entries");
  migrationJournal = journal.entries.length;
} catch (error) {
  fail(
    `tidak dapat membaca meta/_journal.json: ${error instanceof Error ? error.message : String(error)}`,
  );
}

const fakta = {
  halamanTotal,
  routeHandlerTotal,
  halamanAdminTotal,
  halamanSuperAdmin,
  halamanNonSuperAdmin: halamanAdminTotal - halamanSuperAdmin,
  ruteAdmin,
  templateModules,
  templateGrants,
  templateMenuPublik,
  migrationSql,
  migrationJournal,
};

// --- Klaim yang diperiksa --------------------------------------------------

/**
 * Setiap aturan mencari satu atau lebih angka dalam dokumen aktif dan
 * membandingkannya dengan fakta source. `files` membatasi aturan ke dokumen
 * tertentu bila ada angka serupa yang memang merupakan snapshot historis.
 */
const aturan = [
  {
    id: "halaman non-super-admin",
    pola: /(\d+) halaman non-super-admin/g,
    fakta: ["halamanNonSuperAdmin"],
  },
  {
    id: "halaman /super-admin",
    pola: /(\d+) halaman `\/super-admin`/g,
    fakta: ["halamanSuperAdmin"],
  },
  {
    id: "halaman admin total",
    pola: /(\d+) halaman di route group `\(admin\)`(?! non-super-admin)/g,
    fakta: ["halamanAdminTotal"],
  },
  {
    id: "entri RUTE_ADMIN_TERSEDIA",
    pola: /`RUTE_ADMIN_TERSEDIA`\s+(?:berisi\s+)?(\d+)\s+entri/g,
    fakta: ["ruteAdmin"],
  },
  {
    id: "modul template",
    pola: /(\d+) modul/g,
    fakta: ["templateModules"],
  },
  {
    id: "grant template",
    pola: /(\d+) grant/g,
    fakta: ["templateGrants"],
  },
  {
    id: "menu publik template",
    pola: /(\d+) menu publik/g,
    fakta: ["templateMenuPublik"],
  },
  {
    id: "berkas migration",
    pola: /(\d+) berkas migration/g,
    fakta: ["migrationSql"],
  },
  {
    id: "entri journal migration",
    pola: /(\d+) entri journal/g,
    fakta: ["migrationJournal"],
  },
  {
    id: "total page.tsx tanpa konteks admin",
    pola: /(\d+) (?:berkas |halaman )?`page\.tsx`(?![:(]| di `src\/app\/\(admin\)`)/g,
    fakta: ["halamanTotal"],
    // Snapshot 17 November di README deployment memang menyebut 29 halaman.
    skipFiles: ["docs/deployment/README.md"],
  },
  {
    id: "total page.tsx dalam tanda kurung",
    pola: /(\d+) halaman \(`page\.tsx`\)/g,
    fakta: ["halamanTotal"],
  },
  {
    id: "route handler pada inventaris modul",
    pola: /(\d+) route handler/g,
    fakta: ["routeHandlerTotal"],
    files: ["docs/architecture/MODULE-INVENTORY.md"],
  },
];

const dokumen = daftarDokumen();
let jumlahDiperiksa = 0;
const kegagalan = [];
const aturanTerpakai = new Set();

for (const absolute of dokumen) {
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  const isi = fs.readFileSync(absolute, "utf8");

  for (const rule of aturan) {
    if (rule.files && !rule.files.includes(relative)) continue;
    if (rule.skipFiles?.includes(relative)) continue;

    rule.pola.lastIndex = 0;
    let match;
    while ((match = rule.pola.exec(isi)) !== null) {
      aturanTerpakai.add(rule.id);
      const nilai = Number(match[1]);
      const posisiBaris = isi.slice(0, match.index).split("\n").length;
      const harapan = rule.fakta.map((kunci) => fakta[kunci]);
      if (nilai !== harapan[0]) {
        kegagalan.push(
          `${relative}:${posisiBaris} klaim "${rule.id}" = ${nilai}, source = ${harapan[0]}`,
        );
      }
      jumlahDiperiksa += 1;
    }
  }
}

for (const rule of aturan) {
  if (!aturanTerpakai.has(rule.id)) {
    kegagalan.push(
      `klaim "${rule.id}" tidak ditemukan di dokumen aktif; perbarui skrip atau dokumen`,
    );
  }
}

if (kegagalan.length > 0) {
  for (const pesan of kegagalan) process.stderr.write(`[docs-claims] ${pesan}\n`);
  fail(`${kegagalan.length} klaim angka tidak sesuai source`);
}

process.stdout.write(
  "[docs-claims] PASS: " +
    `${jumlahDiperiksa} klaim pada ${dokumen.length} dokumen aktif sesuai source ` +
    `(${halamanTotal} halaman, ${halamanAdminTotal} admin, ${routeHandlerTotal} route handler, ` +
    `${templateModules} modul/${templateGrants} grant template, ` +
    `${migrationSql} migration/${migrationJournal} journal).\n`,
);
