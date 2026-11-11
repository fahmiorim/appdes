/**
 * Test integrasi basis data — area warga.
 *
 * Berbeda dengan test unit lain yang murni, test ini menyentuh MySQL:
 * koneksi memakai `DATABASE_URL` dari lingkungan test (`desa_test`),
 * migrasi dijalankan programatik lewat `migrate()` Drizzle, dan data
 * uji dibersihkan setelah selesai (`villages` cascade ke penduduk dan
 * jenis surat; `users` memakai `residentId` set-null).
 *
 * Bila basis data tidak tersedia (CI tanpa MySQL, dsb.), seluruh suite
 * di-skip otomatis — tidak menyebabkan pipeline gagal.
 */
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { letterTypes, residents, users, villages } from "@/db/schema";
import {
  buatPermohonan,
  getPermohonanWarga,
  listPermohonanWarga,
  listSuratUntukWarga,
} from "@/features/layanan-mandiri/infrastructure/layanan-mandiri-repository";
import {
  clearMustChangePin,
  createWargaAccount,
  findResidentForAccount,
  resetWargaPin,
} from "@/features/warga/infrastructure/warga-repository";
import { jalankanMigrasiUji } from "@/testing/migrasi-uji";

let dbReady = false;
const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/migrations", import.meta.url));

/** Akhiran unik per run agar data uji tidak bentrok dengan run sebelumnya. */
const RUN = randomUUID().slice(0, 8);

interface TenantUji {
  villageA: number;
  villageB: number;
  residentA: number;
  residentB: number;
  jenisSurat: number;
  nikA: string;
}

let tenant: TenantUji | null = null;

/** `$returningId()` memberi `id?: number`; seed wajib gagal tegas bila kosong. */
function pastiId(row: { id: number | undefined } | undefined, label: string): number {
  const id = row?.id;
  if (id === undefined) throw new Error(`Seed uji gagal: ${label}`);
  return id;
}

async function seedTenant(): Promise<TenantUji> {
  const [villageARow] = await db
    .insert(villages)
    .values({ name: `Desa Uji A ${RUN}`, code: `UA${RUN}` })
    .$returningId();
  const [villageBRow] = await db
    .insert(villages)
    .values({ name: `Desa Uji B ${RUN}`, code: `UB${RUN}` })
    .$returningId();
  const villageA = pastiId(villageARow, "village A");
  const villageB = pastiId(villageBRow, "village B");

  const nikA = `3201${randomUUID().replace(/\D/g, "").padStart(10, "0").slice(0, 12)}`;
  const nikB = `3202${randomUUID().replace(/\D/g, "").padStart(10, "0").slice(0, 12)}`;

  const [residentARow] = await db
    .insert(residents)
    .values({
      villageId: villageA,
      name: `Penduduk A ${RUN}`,
      gender: "male",
      nationalId: nikA,
    })
    .$returningId();
  const [residentBRow] = await db
    .insert(residents)
    .values({
      villageId: villageA,
      name: `Penduduk B ${RUN}`,
      gender: "female",
      nationalId: nikB,
    })
    .$returningId();

  const [jenisRow] = await db
    .insert(letterTypes)
    .values({
      villageId: villageA,
      code: `SK${RUN.slice(0, 6)}`,
      name: `Surat Uji ${RUN}`,
      templateBody: `<p>Data [nama_desa]</p>`,
    })
    .$returningId();

  return {
    villageA,
    villageB,
    residentA: pastiId(residentARow, "resident A"),
    residentB: pastiId(residentBRow, "resident B"),
    jenisSurat: pastiId(jenisRow, "jenis surat"),
    nikA,
  };
}

beforeAll(async () => {
  // Database target mungkin belum ada pada mesin baru — buat sendiri
  // (idempotent) sebelum mencoba koneksi.
  const dsn = process.env.DATABASE_URL ?? "";
  try {
    const dbName = new URL(dsn).pathname.replace(/^\//, "") || "desa_test";
    const server = await mysql.createConnection(dsn.replace(/\/[^/]*$/, ""));
    await server.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await server.end();
  } catch (error) {
    console.warn("[integrasi-warga] Persiapan basis data gagal, suite di-skip:", error);
    return;
  }

  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    console.warn("[integrasi-warga] DB tidak tersedia, test di-skip:", error);
    return;
  }
  dbReady = true;

  await jalankanMigrasiUji(db, { dsn, migrationsFolder: MIGRATIONS_FOLDER });
  tenant = await seedTenant();
});

afterAll(async () => {
  if (!dbReady || tenant === null) return;

  // Akun warga dulu (village_id/resident_id set-null), lalu villages yang
  // meng-cascade penduduk, jenis surat, dan permohonan.
  await db.delete(users).where(inArray(users.residentId, [tenant.residentA, tenant.residentB]));
  await db.delete(villages).where(inArray(villages.id, [tenant.villageA, tenant.villageB]));
});

/** Skip dinamis: context.skip() tersedia di Vitest 5 saat DB tak tersedia. */
function kalauDbTersedia(ctx: { skip: () => void; task: unknown }): void {
  if (!dbReady || tenant === null) ctx.skip();
}

describe("permohonan surat ter-scope desa & warga (integrasi)", () => {
  it("warga lain tidak melihat permohonan milik warga lain", async (ctx) => {
    kalauDbTersedia(ctx);
    const { villageA, residentA, residentB, jenisSurat } = tenant!;

    const id = await buatPermohonan({
      villageId: villageA,
      residentId: residentA,
      letterTypeId: jenisSurat,
    });
    expect(id).toBeDefined();

    const milikA = await getPermohonanWarga(villageA, residentA, id!);
    expect(milikA).not.toBeNull();
    // Nomor antrian otomatis berbalasan "AN-<timestamp>" saat tidak diisi.
    expect(milikA?.noAntrian).toMatch(/^AN-.+/);

    // Warga lain di desa yang sama: null + tak masuk daftar.
    const milikB = await getPermohonanWarga(villageA, residentB, id!);
    expect(milikB).toBeNull();

    const daftarB = await listPermohonanWarga(villageA, residentB);
    expect(daftarB.find((row) => row.id === id!)).toBeUndefined();
    const daftarA = await listPermohonanWarga(villageA, residentA);
    expect(daftarA.find((row) => row.id === id!)).toBeDefined();
  });

  it("permohonan hanya terlihat dari desa pemiliknya", async (ctx) => {
    kalauDbTersedia(ctx);
    const { villageA, residentA, residentB, jenisSurat } = tenant!;
    const id = await buatPermohonan({
      villageId: villageA,
      residentId: residentA,
      letterTypeId: jenisSurat,
    });
    expect(id).toBeDefined();

    const milikB = await getPermohonanWarga(villageA, residentB, id!);
    expect(milikB).toBeNull();
    const daftarB = await listPermohonanWarga(villageA, residentB);
    expect(daftarB.some((row) => row.id === id!)).toBe(false);
  });

  it("jenis surat hanya tersedia untuk desa pemiliknya", async (ctx) => {
    kalauDbTersedia(ctx);
    const { villageA, villageB, jenisSurat } = tenant!;

    const daftarA = await listSuratUntukWarga(villageA);
    expect(daftarA.some((row) => row.id === jenisSurat)).toBe(true);

    const daftarB = await listSuratUntukWarga(villageB);
    expect(daftarB.some((row) => row.id === jenisSurat)).toBe(false);
  });
});

describe("akun warga & siklus PIN (integrasi)", () => {
  it("createWargaAccount → wajib ganti PIN → jelas → reset memaksa lagi", async (ctx) => {
    kalauDbTersedia(ctx);
    const tenantIni = tenant!;
    const akun = await createWargaAccount({
      villageId: tenantIni.villageA,
      residentId: tenantIni.residentA,
      name: `Warga Uji ${RUN}`,
      nationalId: tenantIni.nikA,
      pin: "432143",
    });
    expect(akun.mustChangePin).toBe(true);
    expect(akun.active).toBe(true);

    const [rowSebelum] = await db
      .select({ mustChangePin: users.mustChangePin })
      .from(users)
      .where(eq(users.id, akun.userId));
    expect(rowSebelum?.mustChangePin).toBe(true);

    // Warga mengganti PIN (dipanggil setelah better-auth sukses).
    await clearMustChangePin(akun.userId);
    const [rowJelas] = await db
      .select({ mustChangePin: users.mustChangePin })
      .from(users)
      .where(eq(users.id, akun.userId));
    expect(rowJelas?.mustChangePin).toBe(false);

    // Operator reset PIN → warga dipaksa ganti lagi dan akun aktif.
    await resetWargaPin(akun.userId, "654321");
    const [rowPasca] = await db
      .select({ mustChangePin: users.mustChangePin, active: users.active })
      .from(users)
      .where(eq(users.id, akun.userId));
    expect(rowPasca?.mustChangePin).toBe(true);
    expect(rowPasca?.active).toBe(true);
  });

  it("findResidentForAccount menolak penduduk dari desa lain", async (ctx) => {
    kalauDbTersedia(ctx);
    const { villageA, villageB, residentA } = tenant!;

    const milikA = await findResidentForAccount(villageA, residentA);
    expect(milikA).not.toBeNull();
    expect(milikA?.lifeStatus).toBe("alive");

    const milikB = await findResidentForAccount(villageB, residentA);
    expect(milikB).toBeNull();
  });
});
