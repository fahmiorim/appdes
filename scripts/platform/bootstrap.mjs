/**
 * Bootstrap Super Admin platform pertama.
 *
 * Sebelumnya tidak ada jalur resmi untuk membuat akun pengelola platform:
 * dashboard `/super-admin` sudah ada, tetapi instalasi baru tidak punya akun
 * yang dapat masuk ke sana, sehingga provisioning desa tidak pernah bisa
 * dimulai. Skrip ini menutup celah itu tanpa membuat endpoint publik.
 *
 * Aturan keamanan:
 * - Hanya berjalan bila **belum ada** akun platform (`village_id IS NULL`).
 *   Skrip tidak pernah menimpa atau mereset akun yang sudah ada.
 * - Role `super-admin` bersifat platform (`village_id NULL`) dan tidak pernah
 *   diberikan ke akun yang terikat desa.
 * - Kredensial dibaca dari environment, bukan argumen, agar tidak tersimpan di
 *   shell history atau daftar proses.
 * - Penulisan hanya dilakukan dengan flag `--yes`; tanpa flag, skrip mencetak
 *   rencana lalu berhenti tanpa mengubah database.
 * - Sandi wajib minimal 12 karakter dan di-hash dengan `better-auth/crypto`
 *   agar cocok dengan jalur login aplikasi.
 *
 * Pemakaian:
 *   PLATFORM_ADMIN_NAME="Nama Pengelola" \
 *   PLATFORM_ADMIN_USERNAME=platform \
 *   PLATFORM_ADMIN_EMAIL=platform@contoh.id \
 *   PLATFORM_ADMIN_PASSWORD='sandi-acak-panjang' \
 *   npm run platform:bootstrap -- --yes
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { hashPassword } from "better-auth/crypto";
import mysql from "mysql2/promise";

const ROLE_SLUG = "super-admin";
const ROLE_NAME = "Super Admin";
const SANDI_MINIMAL = 12;

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
  console.error(`[platform:bootstrap] ${pesan}`);
  process.exit(1);
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

function bacaInput() {
  const name = process.env.PLATFORM_ADMIN_NAME?.trim() ?? "";
  const username = process.env.PLATFORM_ADMIN_USERNAME?.trim().toLowerCase() ?? "";
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.PLATFORM_ADMIN_PASSWORD ?? "";

  const masalah = [];
  if (name.length < 3) masalah.push("PLATFORM_ADMIN_NAME minimal 3 karakter.");
  if (!/^[a-z0-9._-]{3,50}$/.test(username))
    masalah.push("PLATFORM_ADMIN_USERNAME 3–50 karakter: huruf, angka, titik, garis.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) masalah.push("PLATFORM_ADMIN_EMAIL tidak valid.");
  if (password.length < SANDI_MINIMAL)
    masalah.push(`PLATFORM_ADMIN_PASSWORD minimal ${SANDI_MINIMAL} karakter.`);

  return { name, username, email, password, masalah };
}

muatEnv();

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) gagal("DATABASE_URL belum disetel.");

const input = bacaInput();
if (input.masalah.length > 0) {
  for (const masalah of input.masalah) console.error(`- ${masalah}`);
  gagal("Data akun platform belum lengkap atau tidak valid.");
}

const tulis = process.argv.includes("--yes");
process.stdout.write(`[platform:bootstrap] Target database: ${ringkasTarget(databaseUrl)}\n`);
process.stdout.write(
  `[platform:bootstrap] Akun: ${input.username} (tanpa desa, role ${ROLE_SLUG})\n`,
);

const koneksi = await mysql.createConnection(databaseUrl);

try {
  const [platformAda] = await koneksi.query(
    "SELECT id FROM users WHERE village_id IS NULL LIMIT 1",
  );
  if (platformAda.length > 0) {
    gagal(
      "Sudah ada akun platform. Skrip ini tidak mereset atau menimpa akun yang ada; gunakan alur pemulihan akun.",
    );
  }

  const [usernameDipakai] = await koneksi.query("SELECT id FROM users WHERE username = ? LIMIT 1", [
    input.username,
  ]);
  if (usernameDipakai.length > 0) gagal("Username sudah dipakai akun lain.");

  const [emailDipakai] = await koneksi.query("SELECT id FROM users WHERE email = ? LIMIT 1", [
    input.email,
  ]);
  if (emailDipakai.length > 0) gagal("Email sudah dipakai akun lain.");

  if (!tulis) {
    process.stdout.write(
      "[platform:bootstrap] Rencana siap. Tidak ada perubahan karena flag --yes belum diberikan.\n",
    );
    process.exit(0);
  }

  const passwordHash = await hashPassword(input.password);
  const userId = randomUUID();

  await koneksi.beginTransaction();
  try {
    const [roleAda] = await koneksi.query(
      "SELECT id FROM roles WHERE village_id IS NULL AND slug = ? LIMIT 1",
      [ROLE_SLUG],
    );
    let roleId = roleAda[0]?.id;
    if (roleId === undefined) {
      const [hasilRole] = await koneksi.execute(
        "INSERT INTO roles (village_id, name, slug, is_system) VALUES (NULL, ?, ?, 1)",
        [ROLE_NAME, ROLE_SLUG],
      );
      roleId = hasilRole.insertId;
    }

    await koneksi.execute(
      `INSERT INTO users
         (id, name, email, email_verified, username, display_username, village_id, role_id, active, must_change_pin)
       VALUES (?, ?, ?, 1, ?, ?, NULL, ?, 1, 1)`,
      [userId, input.name, input.email, input.username, input.username, roleId],
    );

    await koneksi.execute(
      `INSERT INTO accounts (id, account_id, provider_id, user_id, password)
       VALUES (?, ?, 'credential', ?, ?)`,
      [randomUUID(), userId, userId, passwordHash],
    );

    await koneksi.commit();
    process.stdout.write(
      "[platform:bootstrap] Akun platform dibuat. Sandi harus diganti saat login pertama (must_change_pin = 1).\n",
    );
  } catch (error) {
    await koneksi.rollback();
    throw error;
  }
} finally {
  await koneksi.end();
}
