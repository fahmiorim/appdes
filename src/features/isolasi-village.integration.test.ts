import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  anjungan,
  arsip,
  bukuTamu,
  kehadiranPerangkat,
  lapak,
  sisaLebih,
  villages,
} from "@/db/schema";
import {
  deleteAnjungan,
  listAnjungan,
  updateAnjungan,
} from "@/features/anjungan/infrastructure/anjungan-repository";
import {
  deleteArsip,
  listArsip,
  updateArsip,
} from "@/features/arsip/infrastructure/arsip-repository";
import { listBukuTamu } from "@/features/buku-tamu/infrastructure/buku-tamu-repository";
import { listKehadiran } from "@/features/kehadiran/infrastructure/kehadiran-repository";
import { listSisaLebih } from "@/features/keuangan/infrastructure/sisa-lebih-repository";
import {
  deleteLapak,
  listKategoriLapak,
  listLapak,
  updateLapak,
} from "@/features/lapak/infrastructure/lapak-repository";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * Uji isolasi tenant pada lapisan data untuk modul yang tidak punya test khusus:
 * SiLPA, Lapak, Buku Tamu, Arsip, dan Kehadiran.
 *
 * Menggantikan `tests/isolation.e2e.ts` yang hanya memeriksa URL tanpa data.
 * Isolasi `villageId` ditegakkan di repository, sehingga pengujian dengan dua
 * desa nyata di database memberi bukti yang lebih kuat daripada smoke browser.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../db/migrations", import.meta.url));
const RUN = randomUUID().slice(0, 8);

let fixture: {
  desaA: number;
  desaB: number;
  lapakA: number;
  arsipA: number;
  bukuTamuA: number;
  anjunganA: number;
} | null = null;

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa Isolasi A ${RUN}`, code: `IA${RUN}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa Isolasi B ${RUN}`, code: `IB${RUN}` })
    .$returningId();
  const desaA = desaARow?.id;
  const desaB = desaBRow?.id;
  if (desaA === undefined || desaB === undefined) {
    throw new Error("Seed uji gagal: desa tidak terbentuk");
  }

  for (const villageId of [desaA, desaB]) {
    const penanda = villageId === desaA ? "A" : "B";
    await db.insert(lapak).values([
      {
        villageId,
        nama: `Lapak ${penanda} ${RUN}`,
        pemilik: `Pemilik ${penanda}`,
        kategori: `Kategori ${penanda}`,
        alamat: `Alamat ${penanda}`,
      },
    ]);
    await db.insert(arsip).values({
      villageId,
      kategori: `Kategori ${penanda}`,
      judul: `Arsip ${penanda} ${RUN}`,
      berkas: `arsip-${penanda.toLowerCase()}.pdf`,
    });
    await db.insert(bukuTamu).values({
      villageId,
      nama: `Tamu ${penanda} ${RUN}`,
      instansi: `Instansi ${penanda}`,
      tanggal: penanda === "A" ? new Date(2026, 0, 15) : new Date(2026, 1, 20),
      keperluan: `Keperluan ${penanda}`,
    });
    await db.insert(sisaLebih).values({
      villageId,
      tahun: 2025,
      jumlah: penanda === "A" ? "1000000" : "2000000",
      keterangan: `SiLPA ${penanda}`,
    });
    await db.insert(kehadiranPerangkat).values({
      villageId,
      tanggal: new Date(2026, 0, 5),
      status: "hadir",
    });
    await db.insert(anjungan).values({
      villageId,
      nama: `Anjungan ${penanda} ${RUN}`,
      uuid: randomUUID(),
      aktif: 1,
      status: "aktif",
      permohonanSuratTanpaAkun: 1,
    });
  }

  const lapakA = await db
    .select({ id: lapak.id })
    .from(lapak)
    .where(sql`${lapak.villageId} = ${desaA}`)
    .then((rows) => rows[0]?.id);
  const arsipA = await db
    .select({ id: arsip.id })
    .from(arsip)
    .where(sql`${arsip.villageId} = ${desaA}`)
    .then((rows) => rows[0]?.id);
  const bukuTamuA = await db
    .select({ id: bukuTamu.id })
    .from(bukuTamu)
    .where(sql`${bukuTamu.villageId} = ${desaA}`)
    .then((rows) => rows[0]?.id);
  const anjunganA = await db
    .select({ id: anjungan.id })
    .from(anjungan)
    .where(sql`${anjungan.villageId} = ${desaA}`)
    .then((rows) => rows[0]?.id);
  if (
    lapakA === undefined ||
    arsipA === undefined ||
    bukuTamuA === undefined ||
    anjunganA === undefined
  ) {
    throw new Error("Seed uji gagal: baris modul tidak terbentuk");
  }

  fixture = { desaA, desaB, lapakA, arsipA, bukuTamuA, anjunganA };
});

afterAll(async () => {
  if (!fixture) return;
  await db.delete(villages).where(inArray(villages.id, [fixture.desaA, fixture.desaB]));
});

describe("isolasi villageId antar desa", () => {
  it("hanya menampilkan lapak milik desa sendiri", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const items = await listLapak(fixture.desaA);

    expect(items.rows).toHaveLength(1);
    expect(items.rows[0]?.nama).toContain(`Lapak A ${RUN}`);
    expect(await listKategoriLapak(fixture.desaA)).toEqual([`Kategori A`]);
  });

  it("menyaring pencarian dan kategori di dalam desa sendiri", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    expect((await listLapak(fixture.desaA, { q: `Lapak A ${RUN}` })).rows).toHaveLength(1);
    expect((await listLapak(fixture.desaA, { q: `Lapak B ${RUN}` })).rows).toHaveLength(0);
    expect((await listLapak(fixture.desaA, { kategori: "Kategori B" })).rows).toHaveLength(0);
  });

  it("tidak mengubah atau menghapus lapak desa lain", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    await updateLapak(fixture.lapakA, fixture.desaB, { nama: "Diambil alih desa B" });
    await deleteLapak(fixture.lapakA, fixture.desaB);

    const masihAda = await listLapak(fixture.desaA);
    expect(masihAda.rows).toHaveLength(1);
    expect(masihAda.rows[0]?.nama).toContain(`Lapak A ${RUN}`);
  });

  it("hanya menampilkan arsip milik desa sendiri", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const items = await listArsip(fixture.desaA);

    expect(items).toHaveLength(1);
    expect(items[0]?.judul).toContain(`Arsip A ${RUN}`);
    expect(await listArsip(fixture.desaA, { q: `Arsip B ${RUN}` })).toHaveLength(0);

    await updateArsip(fixture.arsipA, fixture.desaB, { judul: "Diambil alih desa B" });
    await deleteArsip(fixture.arsipA, fixture.desaB);
    const masihAda = await listArsip(fixture.desaA);
    expect(masihAda[0]?.judul).toContain(`Arsip A ${RUN}`);
  });

  it("hanya menampilkan buku tamu milik desa sendiri dan menghormati filter tanggal", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const semua = await listBukuTamu(fixture.desaA);

    expect(semua).toHaveLength(1);
    expect(semua[0]?.nama).toContain(`Tamu A ${RUN}`);
    expect(await listBukuTamu(fixture.desaA, { tanggalMulai: "2026-02-01" })).toHaveLength(0);
    expect(await listBukuTamu(fixture.desaA, { tanggalAkhir: "2026-01-31" })).toHaveLength(1);
  });

  it("hanya menampilkan SiLPA milik desa sendiri", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const items = await listSisaLebih(fixture.desaA);

    expect(items).toHaveLength(1);
    expect(items[0]?.jumlah).toBe("1000000");
  });

  it("hanya menampilkan kehadiran milik desa sendiri", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");
    const items = await listKehadiran(fixture.desaA);

    expect(items).toHaveLength(1);
    expect(items[0]?.villageId).toBe(fixture.desaA);
  });

  it("tidak mengubah atau menghapus anjungan desa lain", async () => {
    if (!fixture) throw new Error("Fixture integrasi tidak siap.");

    expect((await listAnjungan(fixture.desaA, true)).map((item) => item.nama)).toEqual([
      expect.stringContaining(`Anjungan A ${RUN}`),
    ]);

    await updateAnjungan(fixture.anjunganA, fixture.desaB, { nama: "Diambil alih desa B" });
    await deleteAnjungan(fixture.anjunganA, fixture.desaB);

    const masihAda = await listAnjungan(fixture.desaA);
    expect(masihAda).toHaveLength(1);
    expect(masihAda[0]?.nama).toContain(`Anjungan A ${RUN}`);
  });
});
