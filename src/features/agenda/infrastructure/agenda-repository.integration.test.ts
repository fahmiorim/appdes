import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import { villages } from "@/db/schema";
import {
  createAgenda,
  listAgendaPublik,
  listAgendaPublikRentang,
} from "@/features/agenda/infrastructure/agenda-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Uji kalender publik pada database nyata.
 *
 * Kalender harus dapat membuka arsip bulan lampau tanpa membocorkan agenda
 * desa lain dan tanpa menampilkan agenda yang belum ditayangkan.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

let fixture: { desaA: number; desaB: number } | null = null;

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa Agenda A ${RUN}`, code: `AA${RUN}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa Agenda B ${RUN}`, code: `AB${RUN}` })
    .$returningId();

  const desaA = desaARow?.id;
  const desaB = desaBRow?.id;
  if (desaA === undefined || desaB === undefined) {
    throw new Error("Seed uji gagal: desa tidak terbentuk");
  }

  await createAgenda(desaA, {
    judul: `Arsip ${RUN}`,
    mulai: "2024-03-10",
    selesai: null,
    jamMulai: null,
    jamSelesai: null,
    kategori: "umum",
    status: "selesai",
    lokasi: null,
    deskripsi: null,
    tayang: true,
  });
  await createAgenda(desaA, {
    judul: `Kegiatan November ${RUN}`,
    mulai: "2026-11-20",
    selesai: null,
    jamMulai: "09:00",
    jamSelesai: "12:00",
    kategori: "pemerintahan",
    status: "berlangsung",
    lokasi: "Balai Desa",
    deskripsi: null,
    tayang: true,
  });
  await createAgenda(desaA, {
    judul: `Draf ${RUN}`,
    mulai: "2026-11-21",
    selesai: null,
    jamMulai: null,
    jamSelesai: null,
    kategori: "umum",
    status: "rencana",
    lokasi: null,
    deskripsi: null,
    tayang: false,
  });
  await createAgenda(desaB, {
    judul: `Kegiatan Desa B ${RUN}`,
    mulai: "2026-11-20",
    selesai: null,
    jamMulai: null,
    jamSelesai: null,
    kategori: "umum",
    status: "rencana",
    lokasi: null,
    deskripsi: null,
    tayang: true,
  });

  fixture = { desaA, desaB };
});

afterAll(async () => {
  if (!fixture) return;
  await db.delete(villages).where(inArray(villages.id, [fixture.desaA, fixture.desaB]));
});

describe("repository agenda: arsip publik", () => {
  it("mengembalikan agenda bulan lampau yang sudah ditayangkan", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const rows = await listAgendaPublikRentang(fixture.desaA, "2024-03-01", "2024-04-01");
    expect(rows.map((row) => row.judul)).toEqual([`Arsip ${RUN}`]);
  });

  it("menyaring draf dan hanya membaca tenant yang diminta", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const desaA = await listAgendaPublikRentang(fixture.desaA, "2026-11-01", "2026-12-01");
    expect(desaA.map((row) => row.judul)).toEqual([`Kegiatan November ${RUN}`]);

    const desaB = await listAgendaPublikRentang(fixture.desaB, "2026-11-01", "2026-12-01");
    expect(desaB.map((row) => row.judul)).toEqual([`Kegiatan Desa B ${RUN}`]);
  });

  it("menggunakan batas akhir eksklusif sehingga bulan berikutnya tidak ikut", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const rows = await listAgendaPublikRentang(fixture.desaA, "2024-04-01", "2024-05-01");
    expect(rows).toEqual([]);
  });

  it("listAgendaPublik tetap hanya menampilkan agenda mendatang", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const rows = await listAgendaPublik(fixture.desaA, 20, "2026-11-01");
    expect(rows.map((row) => row.judul)).toEqual([`Kegiatan November ${RUN}`]);
  });

  it("menyimpan jam, kategori, dan status agenda", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    const rows = await listAgendaPublikRentang(fixture.desaA, "2026-11-01", "2026-12-01");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      jamMulai: "09:00:00",
      jamSelesai: "12:00:00",
      kategori: "pemerintahan",
      status: "berlangsung",
    });
  });
});
