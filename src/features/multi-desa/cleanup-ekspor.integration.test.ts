import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { accounts, roles, tenantExports, users, villageDomains, villages } from "@/db/schema";
import { bersihkanEksporKedaluwarsa } from "@/features/multi-desa/infrastructure/lifecycle-tenant-repository";
import { provisionDesa } from "@/features/multi-desa/infrastructure/provisioning-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Penjadwal pembersihan ekspor (`scripts/platform/cleanup-exports.mjs`).
 *
 * Dijalankan sebagai proses terpisah, seperti systemd timer menjalankannya,
 * agar yang diuji adalah jalur operasional sebenarnya: `DATABASE_URL`,
 * pemilihan baris kedaluwarsa, penghapusan berkas di `storage/exports`, dan
 * perlindungan path di luar folder itu.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/migrations", import.meta.url));
const SKRIP = path.join(process.cwd(), "scripts", "platform", "cleanup-exports.mjs");
const AKAR_EKSPOR = path.join(process.cwd(), "storage", "exports");
const RUN = randomUUID().slice(0, 8);

let villageId: number | null = null;

interface Ringkasan {
  ok: boolean;
  dryRun: boolean;
  diperiksa: number;
  berkasDihapus: number;
  berkasTidakAda: number;
  berkasDilewati: number;
  barisDihapus: number;
}

function jalankanCleanup(args: string[] = ["--json"]): Ringkasan {
  const keluaran = execFileSync(process.execPath, [SKRIP, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL ?? "" },
  });
  return JSON.parse(keluaran) as Ringkasan;
}

/** Buat berkas ekspor uji dan catatannya di `tenant_exports`. */
async function buatEkspor(nama: string, kedaluwarsaPada: Date, berkas?: string) {
  if (villageId === null) throw new Error("Desa uji belum siap.");
  const relatif = berkas ?? `storage/exports/${villageId}/${nama}.json`;
  if (berkas === undefined) {
    const absolut = path.join(process.cwd(), relatif);
    mkdirSync(path.dirname(absolut), { recursive: true });
    writeFileSync(absolut, JSON.stringify({ uji: nama }), "utf8");
  }
  const [baris] = await db
    .insert(tenantExports)
    .values({
      villageId,
      dibuatOleh: "uji-cleanup",
      berkas: relatif,
      ukuranByte: 10,
      jumlahBaris: 1,
      kedaluwarsaPada,
    })
    .$returningId();
  return { id: baris?.id ?? 0, relatif, absolut: path.join(process.cwd(), relatif) };
}

const HARI = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });
  const hasil = await provisionDesa({
    name: `Desa Cleanup ${RUN}`,
    code: `7${String(Date.now()).slice(-9)}`,
    domain: `cleanup-${RUN}.test`,
    adminName: "Admin Cleanup",
    adminUsername: `admin-cleanup-${RUN}`,
    adminEmail: `admin-cleanup-${RUN}@contoh.id`,
    adminPassword: "sandi-uji-panjang-2026",
    kuotaMediaMb: null,
  });
  villageId = hasil.id;
});

afterAll(async () => {
  if (villageId === null) return;
  await db.delete(tenantExports).where(eq(tenantExports.villageId, villageId));
  const id = villageId;
  rmSync(path.join(AKAR_EKSPOR, String(id)), { recursive: true, force: true });
  await db.delete(villageDomains).where(eq(villageDomains.villageId, id));
  await db
    .delete(accounts)
    .where(
      eq(
        accounts.userId,
        (await db.select({ id: users.id }).from(users).where(eq(users.villageId, id)))[0]?.id ?? "",
      ),
    );
  await db.delete(users).where(eq(users.villageId, id));
  await db.delete(roles).where(eq(roles.villageId, id));
  await db.delete(villages).where(eq(villages.id, id));
});

describe("pembersihan ekspor tenant kedaluwarsa", () => {
  it("menghapus hanya ekspor kedaluwarsa beserta berkasnya", async () => {
    const lama = await buatEkspor(`lama-${RUN}`, new Date(Date.now() - HARI));
    const baru = await buatEkspor(`baru-${RUN}`, new Date(Date.now() + HARI));

    const ringkasan = jalankanCleanup();

    expect(ringkasan).toMatchObject({ ok: true, dryRun: false, diperiksa: 1, barisDihapus: 1 });
    expect(ringkasan.berkasDihapus).toBe(1);
    expect(existsSync(lama.absolut)).toBe(false);
    expect(existsSync(baru.absolut)).toBe(true);

    const sisa = await db
      .select({ id: tenantExports.id })
      .from(tenantExports)
      .where(eq(tenantExports.villageId, villageId as number));
    expect(sisa.map((baris) => baris.id)).toEqual([baru.id]);
  });

  it("idempoten: menjalankan ulang tidak menghapus apa pun lagi", () => {
    const ringkasan = jalankanCleanup();

    expect(ringkasan).toMatchObject({ ok: true, diperiksa: 0, barisDihapus: 0 });
  });

  it("--dry-run melaporkan tanpa mengubah berkas atau database", async () => {
    const lama = await buatEkspor(`kering-${RUN}`, new Date(Date.now() - HARI));

    const ringkasan = jalankanCleanup(["--dry-run", "--json"]);

    expect(ringkasan).toMatchObject({
      ok: true,
      dryRun: true,
      diperiksa: 1,
      barisDihapus: 0,
    });
    expect(existsSync(lama.absolut)).toBe(true);
    const masihAda = await db
      .select({ id: tenantExports.id })
      .from(tenantExports)
      .where(eq(tenantExports.id, lama.id));
    expect(masihAda).toHaveLength(1);

    expect(jalankanCleanup()).toMatchObject({ diperiksa: 1, barisDihapus: 1 });
    expect(existsSync(lama.absolut)).toBe(false);
  });

  it("tidak menghapus berkas di luar storage/exports", async () => {
    const luar = path.join(process.cwd(), "storage", `bukan-ekspor-${RUN}.txt`);
    mkdirSync(path.dirname(luar), { recursive: true });
    writeFileSync(luar, "jangan dihapus", "utf8");

    const catatan = await buatEkspor(
      `luar-${RUN}`,
      new Date(Date.now() - HARI),
      `storage/bukan-ekspor-${RUN}.txt`,
    );

    const ringkasan = jalankanCleanup();

    expect(ringkasan).toMatchObject({
      diperiksa: 1,
      berkasDihapus: 0,
      berkasDilewati: 1,
      barisDihapus: 1,
    });
    expect(existsSync(luar)).toBe(true);

    rmSync(luar, { force: true });
    expect(catatan.relatif).toBe(`storage/bukan-ekspor-${RUN}.txt`);
  });

  it("repository/use case memakai aturan yang sama dengan CLI", async () => {
    const lama = await buatEkspor(`repo-lama-${RUN}`, new Date(Date.now() - HARI));
    const baru = await buatEkspor(`repo-baru-${RUN}`, new Date(Date.now() + HARI));

    const hasil = await bersihkanEksporKedaluwarsa();

    expect(hasil.dihapus).toBe(1);
    expect(existsSync(lama.absolut)).toBe(false);
    expect(existsSync(baru.absolut)).toBe(true);
    const sisa = await db
      .select({ id: tenantExports.id })
      .from(tenantExports)
      .where(eq(tenantExports.villageId, villageId as number));
    const idSisa = sisa.map((baris) => baris.id);
    expect(idSisa).toContain(baru.id);
    expect(idSisa).not.toContain(lama.id);

    // CLI dan repository tidak boleh berbeda pendapat: setelah repository
    // membersihkan, CLI tidak menemukan sisa yang kedaluwarsa.
    expect(jalankanCleanup()).toMatchObject({ diperiksa: 0, barisDihapus: 0 });
  });

  it("menghapus catatan yang berkasnya sudah hilang", async () => {
    const catatan = await buatEkspor(`hilang-${RUN}`, new Date(Date.now() - HARI));
    rmSync(catatan.absolut, { force: true });

    const ringkasan = jalankanCleanup();

    expect(ringkasan).toMatchObject({ diperiksa: 1, berkasTidakAda: 1, barisDihapus: 1 });
  });
});
