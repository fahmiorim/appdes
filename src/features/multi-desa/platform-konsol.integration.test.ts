import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { accounts, auditLogs, roles, sessions, users, villages } from "@/db/schema";
import { listAuditLogsLintasDesa } from "@/features/audit/infrastructure/audit-repository";
import {
  buatPenggunaPlatform,
  cabutSesiPenggunaPlatform,
  getPenggunaPlatform,
  getPeranPlatform,
  listPenggunaPlatform,
  resetSandiPenggunaPlatform,
  setStatusPenggunaPlatform,
} from "@/features/multi-desa/infrastructure/pengguna-platform-repository";
import { provisionDesa } from "@/features/multi-desa/infrastructure/provisioning-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Query konsol platform yang dibaca halaman Pengguna dan Audit trail.
 *
 * Yang dibuktikan: daftar pengguna platform tidak pernah memuat akun yang
 * terikat desa, audit lintas desa mengembalikan peristiwa dari beberapa tenant
 * beserta nama desanya, peristiwa tingkat platform tetap tampil tanpa desa, dan
 * pencarian memfilter berdasarkan nama desa.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

const idPlatform = randomUUID();
let desaA: number | null = null;
let desaB: number | null = null;
let idRolePlatform: number | null = null;
// Hanya role yang dibuat test ini yang boleh dihapus saat cleanup.
let idRoleDibuat: number | null = null;
let idPenggunaBaru: string | null = null;
const idAudit: number[] = [];

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const a = await provisionDesa({
    name: `Desa Konsol A ${RUN}`,
    code: `7${String(Date.now()).slice(-9)}`,
    domain: `konsol-a-${RUN}.test`,
    adminName: "Admin Konsol A",
    adminUsername: `admin-konsol-a-${RUN}`,
    adminEmail: `admin-konsol-a-${RUN}@contoh.id`,
    adminPassword: "sandi-uji-panjang-2026",
    kuotaMediaMb: null,
  });
  const b = await provisionDesa({
    name: `Desa Konsol B ${RUN}`,
    code: `8${String(Date.now() + 1).slice(-9)}`,
    domain: `konsol-b-${RUN}.test`,
    adminName: "Admin Konsol B",
    adminUsername: `admin-konsol-b-${RUN}`,
    adminEmail: `admin-konsol-b-${RUN}@contoh.id`,
    adminPassword: "sandi-uji-panjang-2026",
    kuotaMediaMb: null,
  });
  desaA = a.id;
  desaB = b.id;

  // Akun pengelola platform: tanpa desa dan tanpa role (role tidak wajib untuk
  // menguji query; guard role diuji terpisah di unit test).
  await db.insert(users).values({
    id: idPlatform,
    name: `Pengelola Platform ${RUN}`,
    email: `platform-${RUN}@contoh.id`,
    username: `platform-${RUN}`,
    displayUsername: `platform-${RUN}`,
    villageId: null,
    roleId: null,
    active: true,
    mustChangePin: false,
  });

  const [logA] = await db
    .insert(auditLogs)
    .values({
      villageId: desaA,
      actorId: idPlatform,
      event: "desa.create",
      resource: "villages",
      resourceId: String(desaA),
    })
    .$returningId();
  const [logB] = await db
    .insert(auditLogs)
    .values({
      villageId: desaB,
      event: "desa.status",
      resource: "villages",
      resourceId: String(desaB),
    })
    .$returningId();
  const [logPlatform] = await db
    .insert(auditLogs)
    .values({
      villageId: null,
      actorId: idPlatform,
      event: "database.backup",
      resource: "database",
    })
    .$returningId();

  for (const baris of [logA, logB, logPlatform]) {
    if (baris) idAudit.push(baris.id);
  }

  // Role platform untuk menguji pembuatan akun; role ini tidak terikat desa.
  // Database uji bersifat disposable, sehingga slug platform dapat dibuat di sini.
  const peranAda = await getPeranPlatform();
  if (peranAda) {
    idRolePlatform = peranAda.id;
  } else {
    const [role] = await db
      .insert(roles)
      .values({ name: `Super Admin Uji ${RUN}`, slug: "super-admin", isSystem: true })
      .$returningId();
    idRolePlatform = role?.id ?? null;
    idRoleDibuat = role?.id ?? null;
  }
});

afterAll(async () => {
  if (idAudit.length > 0) await db.delete(auditLogs).where(inArray(auditLogs.id, idAudit));

  const idPenggunaPlatform = [idPlatform, idPenggunaBaru].filter(
    (id): id is string => typeof id === "string",
  );
  await db.delete(accounts).where(inArray(accounts.userId, idPenggunaPlatform));
  await db.delete(sessions).where(inArray(sessions.userId, idPenggunaPlatform));
  await db.delete(users).where(inArray(users.id, idPenggunaPlatform));

  if (idRoleDibuat !== null) await db.delete(roles).where(eq(roles.id, idRoleDibuat));

  const ids = [desaA, desaB].filter((id): id is number => id !== null);
  if (ids.length === 0) return;

  const pengguna = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.villageId, ids));
  if (pengguna.length > 0) {
    await db.delete(accounts).where(
      inArray(
        accounts.userId,
        pengguna.map((baris) => baris.id),
      ),
    );
    await db.delete(users).where(inArray(users.villageId, ids));
  }

  await db.delete(villages).where(inArray(villages.id, ids));
});

describe("pengguna platform", () => {
  it("hanya memuat akun tanpa desa", async () => {
    const daftar = await listPenggunaPlatform();
    const ids = daftar.map((baris) => baris.id);

    expect(ids).toContain(idPlatform);
    expect(daftar.filter((baris) => baris.id === idPlatform)).toEqual([
      expect.objectContaining({ username: `platform-${RUN}`, active: true }),
    ]);

    const adminDesa = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.villageId, [desaA ?? 0, desaB ?? 0]));
    for (const baris of adminDesa) {
      expect(ids).not.toContain(baris.id);
    }
  });

  it("membuat akun platform beserta kredensial sandi", async () => {
    const peran = await getPeranPlatform();
    expect(peran?.id).toBe(idRolePlatform);

    const hasil = await buatPenggunaPlatform({
      name: "Pengelola Baru",
      email: `baru-${RUN}@contoh.id`,
      username: `baru-${RUN}`,
      passwordHash: "hash-uji",
      roleId: idRolePlatform ?? 0,
    });
    idPenggunaBaru = hasil.id;

    const [kredensial] = await db
      .select({ password: accounts.password })
      .from(accounts)
      .where(eq(accounts.userId, hasil.id));
    expect(kredensial?.password).toBe("hash-uji");

    const daftar = await listPenggunaPlatform();
    expect(daftar.find((baris) => baris.id === hasil.id)).toMatchObject({
      email: `baru-${RUN}@contoh.id`,
      active: true,
      sesiAktif: 0,
    });
  });

  it("menonaktifkan akun platform sekaligus mencabut sesinya", async () => {
    if (!idPenggunaBaru) throw new Error("akun platform uji belum dibuat");

    await db.insert(sessions).values({
      id: randomUUID(),
      token: `token-${RUN}`,
      expiresAt: new Date(Date.now() + 60_000),
      userId: idPenggunaBaru,
    });

    await setStatusPenggunaPlatform(idPenggunaBaru, false);

    expect((await getPenggunaPlatform(idPenggunaBaru))?.active).toBe(false);
    const sisa = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, idPenggunaBaru));
    expect(sisa).toHaveLength(0);
  });

  it("mengganti sandi dan mengaktifkan akun kembali", async () => {
    if (!idPenggunaBaru) throw new Error("akun platform uji belum dibuat");

    await resetSandiPenggunaPlatform(idPenggunaBaru, "hash-baru");

    const [kredensial] = await db
      .select({ password: accounts.password })
      .from(accounts)
      .where(eq(accounts.userId, idPenggunaBaru));
    expect(kredensial?.password).toBe("hash-baru");
    expect((await getPenggunaPlatform(idPenggunaBaru))?.active).toBe(true);
  });

  it("mencabut sesi akun platform", async () => {
    if (!idPenggunaBaru) throw new Error("akun platform uji belum dibuat");

    await db.insert(sessions).values([
      {
        id: randomUUID(),
        token: `token-a-${RUN}`,
        expiresAt: new Date(Date.now() + 60_000),
        userId: idPenggunaBaru,
      },
      {
        id: randomUUID(),
        token: `token-b-${RUN}`,
        expiresAt: new Date(Date.now() + 60_000),
        userId: idPenggunaBaru,
      },
    ]);

    await expect(cabutSesiPenggunaPlatform(idPenggunaBaru)).resolves.toBe(2);
  });

  it("menolak mengubah akun administrator desa lewat jalur platform", async () => {
    const [adminDesa] = await db
      .select({ id: users.id, active: users.active })
      .from(users)
      .where(eq(users.villageId, desaA ?? 0))
      .limit(1);
    expect(adminDesa).toBeDefined();

    await expect(setStatusPenggunaPlatform(adminDesa?.id ?? "", false)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    const [setelah] = await db
      .select({ active: users.active })
      .from(users)
      .where(eq(users.id, adminDesa?.id ?? ""));
    expect(setelah?.active).toBe(adminDesa?.active);
  });
});

describe("audit lintas desa", () => {
  it("mengembalikan peristiwa beberapa tenant beserta nama desa", async () => {
    const hasil = await listAuditLogsLintasDesa({ search: RUN, pageSize: 100 });
    const perId = new Map(hasil.rows.map((baris) => [baris.id, baris]));

    expect(perId.get(idAudit[0] ?? 0)).toMatchObject({
      villageId: desaA,
      villageName: `Desa Konsol A ${RUN}`,
      event: "desa.create",
    });
    expect(perId.get(idAudit[1] ?? 0)).toMatchObject({
      villageId: desaB,
      villageName: `Desa Konsol B ${RUN}`,
    });
  });

  it("menampilkan peristiwa platform tanpa desa", async () => {
    const hasil = await listAuditLogsLintasDesa({ search: "database.backup", pageSize: 100 });
    const baris = hasil.rows.find((item) => item.id === (idAudit[2] ?? 0));

    expect(baris).toMatchObject({ villageId: null, villageName: null });
  });

  it("memfilter berdasarkan nama desa", async () => {
    const hasil = await listAuditLogsLintasDesa({ search: `Desa Konsol A ${RUN}`, pageSize: 100 });

    expect(hasil.rows.length).toBeGreaterThan(0);
    expect(hasil.rows.every((baris) => baris.villageId === desaA)).toBe(true);
    expect(hasil.total).toBe(hasil.rows.length);
  });

  it("membatasi halaman pada ukuran maksimum", async () => {
    const hasil = await listAuditLogsLintasDesa({ pageSize: 5000 });
    expect(hasil.pageSize).toBe(100);
    expect(hasil.page).toBe(1);
  });

  it("memfilter peristiwa berdasarkan desa dan jenis peristiwa", async () => {
    const hasil = await listAuditLogsLintasDesa({
      villageId: desaA ?? 0,
      event: "desa.create",
      pageSize: 100,
    });

    expect(hasil.rows.length).toBeGreaterThan(0);
    expect(hasil.rows.every((baris) => baris.villageId === desaA)).toBe(true);
    expect(hasil.rows.every((baris) => baris.event === "desa.create")).toBe(true);
    expect(hasil.rows.some((baris) => baris.id === idAudit[1])).toBe(false);
  });
});
