import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  auditLogs,
  tenantDomainTombstones,
  tenantExports,
  tenantPurgeArchive,
  users,
  villageDomains,
  villages,
} from "@/db/schema";
import { setStatusDesa } from "@/features/multi-desa/infrastructure/kelola-desa-repository";
import {
  eksporDataTenant,
  getDesaRetensi,
  purgeTenant,
} from "@/features/multi-desa/infrastructure/lifecycle-tenant-repository";
import { provisionDesa } from "@/features/multi-desa/infrastructure/provisioning-repository";
import { akarPenyimpananMedia } from "@/features/publik/infrastructure/media-storage";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Lifecycle tenant: nonaktif → masa tenggang → ekspor wajib → purge.
 *
 * Test ini membuktikan purge benar-benar menghapus data tenant (role, user,
 * domain, media), menyisakan statistik agregat + audit log + tombstone domain,
 * dan menolak domain bekas tenant untuk provisioning baru.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);
const DOMAIN = `retensi-${RUN}.test`;
const EMAIL_ADMIN = `admin-retensi-${RUN}@contoh.id`;

let villageId: number | null = null;
let slug: string | null = null;
let berkasEkspor: string | null = null;

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const hasil = await provisionDesa({
    name: `Desa Retensi ${RUN}`,
    code: `4${String(Date.now()).slice(-9)}`,
    domain: DOMAIN,
    adminName: "Admin Retensi",
    adminUsername: `admin-retensi-${RUN}`,
    adminEmail: EMAIL_ADMIN,
    adminPassword: "sandi-uji-panjang-2026",
    kuotaMediaMb: null,
  });
  villageId = hasil.id;
  slug = (await getDesaRetensi(hasil.id))?.slug ?? null;

  // Audit log desa harus bertahan setelah purge (retensi audit 2 tahun).
  await db.insert(auditLogs).values({
    villageId: hasil.id,
    event: "uji.lifecycle",
    resource: "villages",
    resourceId: String(hasil.id),
    details: JSON.stringify({ catatan: "baris audit sebelum purge" }),
  });
});

afterAll(async () => {
  if (villageId === null) return;

  if (berkasEkspor) {
    await rm(path.resolve(process.cwd(), berkasEkspor), { force: true });
  }
  await rm(path.join(akarPenyimpananMedia(), String(villageId)), { recursive: true, force: true });
  await rm(path.join(process.cwd(), "storage", "exports", String(villageId)), {
    recursive: true,
    force: true,
  });

  await db.delete(tenantExports).where(eq(tenantExports.villageId, villageId));
  await db.delete(tenantPurgeArchive).where(eq(tenantPurgeArchive.villageId, villageId));
  await db.delete(auditLogs).where(eq(auditLogs.villageId, villageId));
  await db.delete(tenantDomainTombstones).where(eq(tenantDomainTombstones.villageId, villageId));
  await db.delete(villages).where(eq(villages.id, villageId));
});

describe("lifecycle retensi dan purge tenant", () => {
  it("mencatat waktu nonaktif saat desa dinonaktifkan", async () => {
    if (villageId === null) throw new Error("Tenant uji belum terbentuk.");

    await setStatusDesa(villageId, false);

    const desa = await getDesaRetensi(villageId);
    expect(desa?.active).toBe(false);
    expect(desa?.nonaktifSejak).toBeInstanceOf(Date);
  });

  it("mengekspor data tenant tanpa kolom rahasia", async () => {
    if (villageId === null) throw new Error("Tenant uji belum terbentuk.");

    const hasil = await eksporDataTenant(villageId, "uji-integrasi");
    berkasEkspor = hasil.berkas;

    expect(hasil.jumlahBaris).toBeGreaterThan(0);
    expect(hasil.berkas).toBe(`storage/exports/${villageId}/${hasil.berkas.split("/").pop()}`);

    const isi = JSON.parse(await readFile(path.resolve(process.cwd(), hasil.berkas), "utf8")) as {
      desa: { id: number };
      tabel: Record<string, Record<string, unknown>[]>;
    };

    expect(isi.desa.id).toBe(villageId);
    expect(isi.tabel.villages).toBeUndefined();
    expect(isi.tabel.users?.length).toBeGreaterThan(0);
    // Kolom PIN tidak boleh ikut terekspor.
    expect(isi.tabel.users?.[0]?.must_change_pin).toBeNull();
  });

  it("menolak purge selama masa tenggang belum selesai", async () => {
    if (villageId === null) throw new Error("Tenant uji belum terbentuk.");

    await db
      .update(villages)
      .set({ nonaktifSejak: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) })
      .where(eq(villages.id, villageId));

    // Repository menolak desa aktif; use case menolak masa tenggang. Di sini
    // dibuktikan repositori tidak menghapus apa pun saat desa masih aktif.
    await db.update(villages).set({ active: true }).where(eq(villages.id, villageId));
    await expect(purgeTenant({ villageId, actorId: "uji-integrasi" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(await getDesaRetensi(villageId)).not.toBeNull();
  });

  it("mem-purge data tenant setelah masa tenggang dan ekspor", async () => {
    if (villageId === null || slug === null) throw new Error("Tenant uji belum terbentuk.");

    // Lewati masa tenggang 90 hari.
    await db
      .update(villages)
      .set({ active: false, nonaktifSejak: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000) })
      .where(eq(villages.id, villageId));

    // Media tenant harus ikut terhapus.
    const folderMedia = path.join(akarPenyimpananMedia(), String(villageId), "umum");
    await mkdir(folderMedia, { recursive: true });
    await writeFile(path.join(folderMedia, "uji.txt"), "media tenant", "utf8");

    const hasil = await purgeTenant({ villageId, actorId: "uji-integrasi" });

    expect(hasil.jumlahBarisDihapus).toBeGreaterThan(0);
    expect(hasil.mediaDihapus).toBe(true);

    // Data tenant hilang.
    const sisaPengguna = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.villageId, villageId));
    expect(sisaPengguna).toEqual([]);
    const sisaDomain = await db
      .select({ id: villageDomains.id })
      .from(villageDomains)
      .where(eq(villageDomains.villageId, villageId));
    expect(sisaDomain).toEqual([]);
    await expect(readFile(path.join(folderMedia, "uji.txt"), "utf8")).rejects.toThrow();

    // Baris desa tetap ada sebagai tombstone.
    const desa = await getDesaRetensi(villageId);
    expect(desa?.purgedAt).toBeInstanceOf(Date);
    expect(desa?.slug).toBe(slug);

    // Tombstone domain, arsip agregat, catatan ekspor, dan audit log bertahan.
    const tombstone = await db
      .select({ domain: tenantDomainTombstones.domain })
      .from(tenantDomainTombstones)
      .where(eq(tenantDomainTombstones.villageId, villageId));
    expect(tombstone).toEqual([{ domain: DOMAIN }]);

    const [arsip] = await db
      .select({ ringkasan: tenantPurgeArchive.ringkasan })
      .from(tenantPurgeArchive)
      .where(eq(tenantPurgeArchive.villageId, villageId))
      .limit(1);
    expect(arsip).toBeDefined();
    const ringkasan = JSON.parse(arsip?.ringkasan ?? "{}") as {
      jumlahBarisPerTabel?: Record<string, number>;
    };
    expect(ringkasan.jumlahBarisPerTabel?.users).toBe(1);

    const catatanEkspor = await db
      .select({ id: tenantExports.id })
      .from(tenantExports)
      .where(eq(tenantExports.villageId, villageId));
    expect(catatanEkspor.length).toBe(1);

    const audit = await db
      .select({ event: auditLogs.event })
      .from(auditLogs)
      .where(eq(auditLogs.villageId, villageId));
    expect(audit.map((baris) => baris.event)).toContain("uji.lifecycle");
  });

  it("menolak purge kedua pada desa yang sama", async () => {
    if (villageId === null) throw new Error("Tenant uji belum terbentuk.");

    await expect(purgeTenant({ villageId, actorId: "uji-integrasi" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("menolak provisioning baru dengan domain bekas tenant", async () => {
    await expect(
      provisionDesa({
        name: `Desa Daur Ulang ${RUN}`,
        code: `5${String(Date.now()).slice(-9)}`,
        domain: DOMAIN,
        adminName: "Admin Daur Ulang",
        adminUsername: `admin-daur-${RUN}`,
        adminEmail: `admin-daur-${RUN}@contoh.id`,
        adminPassword: "sandi-uji-panjang-2026",
        kuotaMediaMb: null,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
