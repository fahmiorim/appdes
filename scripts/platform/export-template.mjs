/**
 * Ekspor template fondasi tenant dari instalasi referensi.
 *
 * Template platform (`src/db/templates/tenant-template.ts`) boleh berasal dari
 * dua sumber: bawaan (minimal, ditulis tangan) atau hasil ekspor desa yang sudah
 * dikonfigurasi dengan baik. Skrip ini menghasilkan bentuk template yang sama
 * dengan kunci alami (slug), sehingga hasilnya dapat direview lalu dipakai
 * sebagai template provisioning desa berikutnya.
 *
 * Batasan yang disengaja:
 * - Hanya membaca database; tidak menulis apa pun selain berkas `--out`.
 * - Tidak mengekspor katalog surat, buku bumindes, kategori inventaris, atau
 *   data warga. Semuanya data master milik desa, bukan fondasi tenant.
 * - Menu publik bertingkat belum didukung template; menu anak dilewati dan
 *   jumlahnya dilaporkan agar operator tahu ada yang tidak terbawa.
 * - Berkas tujuan tidak ditimpa tanpa `--force`.
 *
 * Pemakaian:
 *   npm run platform:export-template -- --village desa-sukamaju
 *   npm run platform:export-template -- --village desa-sukamaju \
 *     --out src/db/templates/tenant-template.export.json --json
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import mysql from "mysql2/promise";

const ROLE_ADMINISTRATOR = "administrator";
const BANTUAN = `Pemakaian:
  node scripts/platform/export-template.mjs [--village <slug|id>] [--out <berkas>] [--force] [--json]

Opsi:
  --village <slug|id>  Desa referensi. Wajib bila instalasi punya lebih dari satu desa.
  --out <berkas>       Tulis template ke berkas. Tanpa opsi ini, JSON dicetak ke stdout.
  --force              Izinkan menimpa berkas tujuan yang sudah ada.
  --json               Cetak ringkasan mesin (JSON) ke stdout; wajib bersama --out.
  --help               Tampilkan bantuan ini.`;

/** Muat `.env` tanpa menimpa environment yang sudah disetel pemanggil. */
function muatEnv() {
  if (!fs.existsSync(".env")) return;
  for (const baris of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const cocok = baris.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!cocok) continue;
    const [, kunci, nilai] = cocok;
    if (process.env[kunci] !== undefined) continue;
    process.env[kunci] = nilai.replace(/^["']|["']$/g, "");
  }
}

function gagal(pesan) {
  const error = new Error(pesan);
  error.pesanPengguna = pesan;
  throw error;
}

/**
 * Urai argumen CLI.
 *
 * Fungsi murni agar dapat diuji tanpa database maupun filesystem.
 */
export function parseArgumen(argv) {
  const hasil = { village: null, out: null, force: false, json: false, help: false };
  const sisa = [...argv];

  while (sisa.length > 0) {
    const arg = sisa.shift();

    if (arg === "--help" || arg === "-h") {
      hasil.help = true;
      continue;
    }
    if (arg === "--force") {
      hasil.force = true;
      continue;
    }
    if (arg === "--json") {
      hasil.json = true;
      continue;
    }
    if (arg === "--village" || arg === "--out") {
      const nilai = sisa.shift();
      if (nilai === undefined || nilai.startsWith("--")) {
        gagal(`Opsi ${arg} membutuhkan nilai.`);
      }
      if (arg === "--village") hasil.village = nilai.trim();
      else hasil.out = nilai.trim();
      continue;
    }

    gagal(`Argumen tidak dikenal: ${arg}`);
  }

  if (hasil.json && !hasil.out) {
    gagal("Opsi --json membutuhkan --out agar keluaran template dan ringkasan tidak tercampur.");
  }

  return hasil;
}

/**
 * Susun template dari baris database desa referensi.
 *
 * @param {{
 *   desa: { id: number, slug: string | null, name: string | null },
 *   roles: Array<{ slug: string, name: string, is_system: number | boolean }>,
 *   modules: Array<{ id: number, slug: string, name: string, url: string | null,
 *     icon: string | null, is_group: number | boolean, is_hidden: number | boolean,
 *     is_active: number | boolean, sort_order: number | null, parent_id: number | null }>,
 *   akses: Array<{ role_slug: string, module_slug: string, access: string }>,
 *   tema: { slug: string, nama: string, versi: string, opsi: string | null } | null,
 *   menuPublik: Array<{ nama: string, link: string, link_tipe: string,
 *     aktif: number | boolean, urut: number | null, parent_id: number | null }>,
 *   tanggal?: Date,
 * }} masukan
 */
export function susunTemplate(masukan) {
  const { desa, roles, modules, akses, tema, menuPublik } = masukan;
  const tanggal = masukan.tanggal ?? new Date();

  const roleSlugs = new Set(roles.map((role) => role.slug));
  if (!roleSlugs.has(ROLE_ADMINISTRATOR)) {
    gagal(
      `Desa referensi tidak memiliki role "${ROLE_ADMINISTRATOR}". Template wajib memuat role tersebut.`,
    );
  }

  const modulIdPerSlug = new Map(modules.map((modul) => [modul.id, modul.slug]));
  const moduleSlugs = new Set(modules.map((modul) => modul.slug));

  const modulTemplate = modules.map((modul) => ({
    slug: modul.slug,
    name: modul.name,
    url: modul.url ?? null,
    icon: modul.icon ?? null,
    isGroup: Boolean(modul.is_group),
    isHidden: Boolean(modul.is_hidden),
    isActive: Boolean(modul.is_active),
    sortOrder: Number(modul.sort_order ?? 0),
    parentSlug: modulIdPerSlug.get(modul.parent_id) ?? null,
  }));

  const kunciAkses = new Set();
  const aksesTemplate = [];
  for (const grant of akses) {
    if (!roleSlugs.has(grant.role_slug) || !moduleSlugs.has(grant.module_slug)) continue;
    const kunci = `${grant.role_slug}::${grant.module_slug}`;
    if (kunciAkses.has(kunci)) continue;
    kunciAkses.add(kunci);
    aksesTemplate.push({
      roleSlug: grant.role_slug,
      moduleSlug: grant.module_slug,
      access: grant.access,
    });
  }

  const menuAkar = menuPublik.filter((menu) => menu.parent_id === null || menu.parent_id === 0);
  const menuAnakDiabaikan = menuPublik.length - menuAkar.length;

  const template = {
    versi: 1,
    sumber: {
      jenis: "ekspor",
      villageId: desa.id,
      dibuatPada: tanggal.toISOString().slice(0, 10),
    },
    roles: roles.map((role) => ({
      slug: role.slug,
      name: role.name,
      isSystem: Boolean(role.is_system),
    })),
    modules: modulTemplate,
    akses: aksesTemplate,
    tema: tema
      ? {
          slug: tema.slug,
          nama: tema.nama,
          versi: tema.versi,
          opsi: tema.opsi ?? null,
        }
      : null,
    menuPublik: menuAkar.map((menu) => ({
      nama: menu.nama,
      link: menu.link,
      linkTipe: menu.link_tipe === "eksternal" ? "eksternal" : "internal",
      aktif: Boolean(menu.aktif),
      urut: Number(menu.urut ?? 0),
    })),
  };

  return {
    template,
    ringkasan: {
      desa: { id: desa.id, slug: desa.slug, name: desa.name },
      roles: template.roles.length,
      modules: template.modules.length,
      akses: template.akses.length,
      menuPublik: template.menuPublik.length,
      menuAnakDiabaikan,
      tema: template.tema?.slug ?? null,
    },
  };
}

/** Ringkasan target koneksi tanpa membocorkan kredensial. */
function ringkasTarget(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return `${url.hostname}:${url.port || "3306"}/${url.pathname.replace(/^\//, "")}`;
  } catch {
    return "(DATABASE_URL tidak dapat diurai)";
  }
}

async function pilihDesa(koneksi, selector) {
  if (selector !== null) {
    const kolom = /^\d+$/.test(selector) ? "id" : "slug";
    const nilai = kolom === "id" ? Number(selector) : selector;
    const [baris] = await koneksi.query(
      `SELECT id, slug, name FROM villages WHERE ${kolom} = ? LIMIT 1`,
      [nilai],
    );
    if (baris.length === 0) gagal(`Desa referensi tidak ditemukan (${kolom} = ${selector}).`);
    return baris[0];
  }

  const [daftar] = await koneksi.query("SELECT id, slug, name FROM villages ORDER BY id");
  if (daftar.length === 0) {
    gagal("Instalasi belum memiliki desa. Jalankan provisioning atau tentukan --village.");
  }
  if (daftar.length > 1) {
    const pilihan = daftar.map((desa) => `  - ${desa.slug ?? "(tanpa slug)"} (id ${desa.id})`);
    gagal(
      `Instalasi memiliki ${daftar.length} desa; tentukan referensi dengan --village.\n${pilihan.join("\n")}`,
    );
  }
  return daftar[0];
}

async function bacaBarisTenant(koneksi, villageId) {
  const [roles] = await koneksi.query(
    "SELECT slug, name, is_system FROM roles WHERE village_id = ? ORDER BY id",
    [villageId],
  );
  const [modules] = await koneksi.query(
    `SELECT id, slug, name, url, icon, is_group, is_hidden, is_active, sort_order, parent_id
     FROM modules WHERE village_id = ? ORDER BY sort_order, id`,
    [villageId],
  );
  const [akses] = await koneksi.query(
    `SELECT r.slug AS role_slug, m.slug AS module_slug, rp.access
     FROM role_permissions rp
     JOIN roles r ON r.id = rp.role_id
     JOIN modules m ON m.id = rp.module_id
     WHERE r.village_id = ? AND m.village_id = ?
     ORDER BY r.slug, m.slug`,
    [villageId, villageId],
  );
  const [tema] = await koneksi.query(
    `SELECT slug, nama, versi, opsi FROM theme
     WHERE village_id = ? AND aktif = 1
     ORDER BY id DESC LIMIT 1`,
    [villageId],
  );
  const [menu] = await koneksi.query(
    `SELECT nama, link, link_tipe, aktif, urut, parent_id FROM menu_publik
     WHERE village_id = ? ORDER BY urut, id`,
    [villageId],
  );

  return {
    roles,
    modules,
    akses,
    tema: tema[0] ?? null,
    menuPublik: menu,
  };
}

async function main() {
  muatEnv();

  const opsi = parseArgumen(process.argv.slice(2));
  if (opsi.help) {
    process.stdout.write(`${BANTUAN}\n`);
    return;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) gagal("DATABASE_URL belum disetel.");

  const koneksi = await mysql.createConnection(databaseUrl);
  let hasil;
  try {
    const desa = await pilihDesa(koneksi, opsi.village);
    const baris = await bacaBarisTenant(koneksi, desa.id);
    hasil = susunTemplate({ desa, ...baris });
  } finally {
    await koneksi.end();
  }

  const isiBerkas = `${JSON.stringify(hasil.template, null, 2)}\n`;

  if (opsi.out) {
    const tujuan = path.resolve(process.cwd(), opsi.out);
    if (fs.existsSync(tujuan) && !opsi.force) {
      gagal(`Berkas tujuan sudah ada: ${opsi.out}. Gunakan --force untuk menimpanya.`);
    }
    fs.mkdirSync(path.dirname(tujuan), { recursive: true });
    fs.writeFileSync(tujuan, isiBerkas, "utf8");
  } else {
    process.stdout.write(isiBerkas);
  }

  const ringkasan = {
    ok: true,
    target: ringkasTarget(databaseUrl),
    out: opsi.out,
    ...hasil.ringkasan,
  };

  if (opsi.json) {
    process.stdout.write(`${JSON.stringify(ringkasan)}\n`);
    return;
  }

  // Tanpa `--out`, stdout hanya berisi JSON template supaya hasilnya bisa
  // dipipe langsung (`| jq`); ringkasan manusia pindah ke stderr.
  const aliran = opsi.out ? process.stdout : process.stderr;
  aliran.write(
    `[platform:export-template] Desa: ${ringkasan.desa.slug ?? ringkasan.desa.id} ` +
      `(${ringkasan.target})\n`,
  );
  aliran.write(
    `[platform:export-template] roles=${ringkasan.roles} modules=${ringkasan.modules} ` +
      `akses=${ringkasan.akses} menu=${ringkasan.menuPublik} tema=${ringkasan.tema ?? "-"}\n`,
  );
  if (ringkasan.menuAnakDiabaikan > 0) {
    aliran.write(
      `[platform:export-template] ${ringkasan.menuAnakDiabaikan} menu bertingkat dilewati ` +
        `(template belum mendukung menu anak).\n`,
    );
  }
  aliran.write(
    opsi.out
      ? `[platform:export-template] Template ditulis ke ${opsi.out}.\n`
      : "[platform:export-template] Template dicetak ke stdout; tidak ada berkas yang ditulis.\n",
  );
}

const dijalankanLangsung =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (dijalankanLangsung) {
  main().catch((error) => {
    const pesan = error?.pesanPengguna ?? error?.message ?? String(error);
    console.error(`[platform:export-template] ${pesan}`);
    process.exit(1);
  });
}
