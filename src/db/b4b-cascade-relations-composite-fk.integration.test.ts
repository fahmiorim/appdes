import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/db";
import {
  anggotaGrupKontak,
  incomingLetterDispositions,
  incomingLetters,
  kelompok,
  kelompokAnggota,
  kontak,
  kontakGrup,
  outgoingLetters,
  outgoingLetterShipments,
  residents,
  villages,
} from "@/db/schema";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/** AUD-034 Batch 4B: direct database enforcement for five CASCADE relations. */
const MIGRATIONS_FOLDER = fileURLToPath(new URL("./migrations", import.meta.url));
const RUN = String(Date.now()).slice(-7);
const KODE = String(Date.now()).slice(-5);

interface Fixture {
  desaA: number;
  desaB: number;
  kontakA: number;
  kontakB: number;
  grupA: number;
  grupB: number;
  suratMasukA: number;
  suratMasukB: number;
  suratKeluarA: number;
  suratKeluarB: number;
  kelompokA: number;
  kelompokB: number;
  wargaA: number;
  wargaB: number;
}

let fixture: Fixture | null = null;

function dataUji(): Fixture {
  if (fixture === null) throw new Error("Fixture integrasi belum siap.");
  return fixture;
}

function idDari(row: { id: number } | undefined, label: string): number {
  if (row?.id === undefined) throw new Error(`Seed gagal: ${label}.`);
  return row.id;
}

async function kodeGalat(upaya: () => Promise<unknown>): Promise<unknown> {
  let current: unknown;
  try {
    await upaya();
  } catch (error) {
    current = error;
  }
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const item = current as { code?: unknown; errno?: unknown; cause?: unknown };
    const code = item.code ?? item.errno;
    if (code !== undefined) return code;
    current = item.cause;
  }
  return undefined;
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa B4B A ${RUN}`, code: `B4CA${KODE}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa B4B B ${RUN}`, code: `B4CB${KODE}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [kontakARow] = await db
    .insert(kontak)
    .values({ villageId: desaA, nama: `Kontak A ${RUN}` })
    .$returningId();
  const [kontakBRow] = await db
    .insert(kontak)
    .values({ villageId: desaB, nama: `Kontak B ${RUN}` })
    .$returningId();

  const [grupARow] = await db
    .insert(kontakGrup)
    .values({ villageId: desaA, namaGrup: `Grup A ${RUN}` })
    .$returningId();
  const [grupBRow] = await db
    .insert(kontakGrup)
    .values({ villageId: desaB, namaGrup: `Grup B ${RUN}` })
    .$returningId();

  const [suratMasukARow] = await db
    .insert(incomingLetters)
    .values({ villageId: desaA, receivedDate: "2026-11-16", letterNumber: `SMA-${RUN}` })
    .$returningId();
  const [suratMasukBRow] = await db
    .insert(incomingLetters)
    .values({ villageId: desaB, receivedDate: "2026-11-16", letterNumber: `SMB-${RUN}` })
    .$returningId();

  const [suratKeluarARow] = await db
    .insert(outgoingLetters)
    .values({ villageId: desaA, letterNumber: `SKA-${RUN}`, letterDate: "2026-11-16" })
    .$returningId();
  const [suratKeluarBRow] = await db
    .insert(outgoingLetters)
    .values({ villageId: desaB, letterNumber: `SKB-${RUN}`, letterDate: "2026-11-16" })
    .$returningId();

  const [kelompokARow] = await db
    .insert(kelompok)
    .values({
      villageId: desaA,
      name: `Kelompok A ${RUN}`,
      slug: `kelompok-a-${RUN}`,
      type: "kelompok",
    })
    .$returningId();
  const [kelompokBRow] = await db
    .insert(kelompok)
    .values({
      villageId: desaB,
      name: `Kelompok B ${RUN}`,
      slug: `kelompok-b-${RUN}`,
      type: "kelompok",
    })
    .$returningId();

  const [wargaARow] = await db
    .insert(residents)
    .values({ villageId: desaA, name: `Warga A ${RUN}`, gender: "female" })
    .$returningId();
  const [wargaBRow] = await db
    .insert(residents)
    .values({ villageId: desaB, name: `Warga B ${RUN}`, gender: "male" })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    kontakA: idDari(kontakARow, "kontak A"),
    kontakB: idDari(kontakBRow, "kontak B"),
    grupA: idDari(grupARow, "grup A"),
    grupB: idDari(grupBRow, "grup B"),
    suratMasukA: idDari(suratMasukARow, "surat masuk A"),
    suratMasukB: idDari(suratMasukBRow, "surat masuk B"),
    suratKeluarA: idDari(suratKeluarARow, "surat keluar A"),
    suratKeluarB: idDari(suratKeluarBRow, "surat keluar B"),
    kelompokA: idDari(kelompokARow, "kelompok A"),
    kelompokB: idDari(kelompokBRow, "kelompok B"),
    wargaA: idDari(wargaARow, "warga A"),
    wargaB: idDari(wargaBRow, "warga B"),
  };
});

afterAll(async () => {
  if (fixture === null) return;
  await db.delete(villages).where(inArray(villages.id, [fixture.desaA, fixture.desaB]));
});

describe("AUD-034 B4B composite tenant FK", () => {
  it("berjalan pada MySQL 8", async () => {
    const versi = (await db.execute(sql`SELECT VERSION() AS versi`)) as unknown as [
      Array<{ versi: string }>,
      unknown,
    ];
    expect(versi[0][0]?.versi).toMatch(/^8\./);
  });

  it("menolak insert lintas desa pada kelima relasi", async () => {
    const f = dataUji();
    const kasus: Array<{ nama: string; jalankan: () => Promise<unknown> }> = [
      {
        nama: "anggota_grup_kontak.kontak_id",
        jalankan: () =>
          db.insert(anggotaGrupKontak).values({
            villageId: f.desaA,
            grupId: f.grupA,
            kontakId: f.kontakB,
          }),
      },
      {
        nama: "anggota_grup_kontak.grup_id",
        jalankan: () =>
          db.insert(anggotaGrupKontak).values({
            villageId: f.desaA,
            grupId: f.grupB,
            kontakId: f.kontakA,
          }),
      },
      {
        nama: "incoming_letter_dispositions.incoming_letter_id",
        jalankan: () =>
          db.insert(incomingLetterDispositions).values({
            villageId: f.desaA,
            incomingLetterId: f.suratMasukB,
            instruction: "cross tenant",
          }),
      },
      {
        nama: "outgoing_letter_shipments.outgoing_letter_id",
        jalankan: () =>
          db.insert(outgoingLetterShipments).values({
            villageId: f.desaA,
            outgoingLetterId: f.suratKeluarB,
            sentDate: "2026-11-16",
          }),
      },
      {
        nama: "kelompok_anggota.kelompok_id",
        jalankan: () =>
          db.insert(kelompokAnggota).values({
            villageId: f.desaA,
            kelompokId: f.kelompokB,
            residentId: f.wargaA,
            position: 90,
          }),
      },
    ];

    for (const item of kasus) {
      const errorCode = await kodeGalat(item.jalankan);
      expect([1452, "ER_NO_REFERENCED_ROW_2"], item.nama).toContain(errorCode);
    }
  });

  it("menerima kelima relasi yang sah", async () => {
    const f = dataUji();
    await expect(
      db.insert(anggotaGrupKontak).values({
        villageId: f.desaA,
        grupId: f.grupA,
        kontakId: f.kontakA,
      }),
    ).resolves.toBeDefined();
    await expect(
      db.insert(incomingLetterDispositions).values({
        villageId: f.desaA,
        incomingLetterId: f.suratMasukA,
        instruction: "valid",
      }),
    ).resolves.toBeDefined();
    await expect(
      db.insert(outgoingLetterShipments).values({
        villageId: f.desaA,
        outgoingLetterId: f.suratKeluarA,
        sentDate: "2026-11-16",
      }),
    ).resolves.toBeDefined();
    await expect(
      db.insert(kelompokAnggota).values({
        villageId: f.desaA,
        kelompokId: f.kelompokA,
        residentId: f.wargaA,
        position: 90,
      }),
    ).resolves.toBeDefined();
  });

  it("menolak update yang memindahkan relasi ke desa lain", async () => {
    const f = dataUji();
    // Pasangan kontak/grup dan penduduk baru agar tidak bentrok dengan unique
    // (grup_id, kontak_id) dan (kelompok_id, resident_id) milik test sebelumnya.
    const [kontakRow] = await db
      .insert(kontak)
      .values({ villageId: f.desaA, nama: `Kontak A2 ${RUN}` })
      .$returningId();
    const [grupRow] = await db
      .insert(kontakGrup)
      .values({ villageId: f.desaA, namaGrup: `Grup A2 ${RUN}` })
      .$returningId();
    const [wargaRow] = await db
      .insert(residents)
      .values({ villageId: f.desaA, name: `Warga A2 ${RUN}`, gender: "female" })
      .$returningId();
    const [anggota] = await db
      .insert(anggotaGrupKontak)
      .values({
        villageId: f.desaA,
        grupId: idDari(grupRow, "grup A2"),
        kontakId: idDari(kontakRow, "kontak A2"),
      })
      .$returningId();
    const [disposisi] = await db
      .insert(incomingLetterDispositions)
      .values({
        villageId: f.desaA,
        incomingLetterId: f.suratMasukA,
        instruction: "update guard",
      })
      .$returningId();
    const [ekspedisi] = await db
      .insert(outgoingLetterShipments)
      .values({
        villageId: f.desaA,
        outgoingLetterId: f.suratKeluarA,
        sentDate: "2026-11-16",
      })
      .$returningId();
    const [keanggotaan] = await db
      .insert(kelompokAnggota)
      .values({
        villageId: f.desaA,
        kelompokId: f.kelompokA,
        residentId: idDari(wargaRow, "warga A2"),
        position: 91,
      })
      .$returningId();

    const kasus: Array<{ nama: string; jalankan: () => Promise<unknown> }> = [
      {
        nama: "anggota_grup_kontak",
        jalankan: () =>
          db
            .update(anggotaGrupKontak)
            .set({ kontakId: f.kontakB })
            .where(eq(anggotaGrupKontak.id, idDari(anggota, "anggota"))),
      },
      {
        nama: "incoming_letter_dispositions",
        jalankan: () =>
          db
            .update(incomingLetterDispositions)
            .set({ incomingLetterId: f.suratMasukB })
            .where(eq(incomingLetterDispositions.id, idDari(disposisi, "disposisi"))),
      },
      {
        nama: "outgoing_letter_shipments",
        jalankan: () =>
          db
            .update(outgoingLetterShipments)
            .set({ outgoingLetterId: f.suratKeluarB })
            .where(eq(outgoingLetterShipments.id, idDari(ekspedisi, "ekspedisi"))),
      },
      {
        nama: "kelompok_anggota",
        jalankan: () =>
          db
            .update(kelompokAnggota)
            .set({ kelompokId: f.kelompokB })
            .where(eq(kelompokAnggota.id, idDari(keanggotaan, "keanggotaan"))),
      },
    ];

    for (const item of kasus) {
      const errorCode = await kodeGalat(item.jalankan);
      expect([1452, "ER_NO_REFERENCED_ROW_2"], item.nama).toContain(errorCode);
    }
  });

  it("menghapus anak melalui CASCADE tanpa menghapus data desa lain", async () => {
    const f = dataUji();
    const [kontakRow] = await db
      .insert(kontak)
      .values({ villageId: f.desaA, nama: `Kontak A3 ${RUN}` })
      .$returningId();
    const [grupRow] = await db
      .insert(kontakGrup)
      .values({ villageId: f.desaA, namaGrup: `Grup A3 ${RUN}` })
      .$returningId();
    const [wargaRow] = await db
      .insert(residents)
      .values({ villageId: f.desaA, name: `Warga A3 ${RUN}`, gender: "female" })
      .$returningId();

    const [anggotaRow] = await db
      .insert(anggotaGrupKontak)
      .values({
        villageId: f.desaA,
        grupId: idDari(grupRow, "grup A3"),
        kontakId: idDari(kontakRow, "kontak A3"),
      })
      .$returningId();
    const [disposisiRow] = await db
      .insert(incomingLetterDispositions)
      .values({
        villageId: f.desaA,
        incomingLetterId: f.suratMasukA,
        instruction: "cascade",
      })
      .$returningId();
    const [ekspedisiRow] = await db
      .insert(outgoingLetterShipments)
      .values({
        villageId: f.desaA,
        outgoingLetterId: f.suratKeluarA,
        sentDate: "2026-11-16",
      })
      .$returningId();
    const [keanggotaanRow] = await db
      .insert(kelompokAnggota)
      .values({
        villageId: f.desaA,
        kelompokId: f.kelompokA,
        residentId: idDari(wargaRow, "warga A3"),
        position: 92,
      })
      .$returningId();

    await db.delete(kontak).where(eq(kontak.id, idDari(kontakRow, "kontak A3")));
    await db.delete(kontakGrup).where(eq(kontakGrup.id, idDari(grupRow, "grup A3")));
    await db.delete(incomingLetters).where(eq(incomingLetters.id, f.suratMasukA));
    await db.delete(outgoingLetters).where(eq(outgoingLetters.id, f.suratKeluarA));
    await db.delete(kelompok).where(eq(kelompok.id, f.kelompokA));

    const hasil = await Promise.all([
      db
        .select({ id: anggotaGrupKontak.id })
        .from(anggotaGrupKontak)
        .where(eq(anggotaGrupKontak.id, idDari(anggotaRow, "anggota"))),
      db
        .select({ id: incomingLetterDispositions.id })
        .from(incomingLetterDispositions)
        .where(eq(incomingLetterDispositions.id, idDari(disposisiRow, "disposisi"))),
      db
        .select({ id: outgoingLetterShipments.id })
        .from(outgoingLetterShipments)
        .where(eq(outgoingLetterShipments.id, idDari(ekspedisiRow, "ekspedisi"))),
      db
        .select({ id: kelompokAnggota.id })
        .from(kelompokAnggota)
        .where(eq(kelompokAnggota.id, idDari(keanggotaanRow, "keanggotaan"))),
    ]);
    expect(hasil.every((rows) => rows.length === 0)).toBe(true);

    const [kontakDesaB] = await db
      .select({ id: kontak.id })
      .from(kontak)
      .where(eq(kontak.id, f.kontakB));
    expect(kontakDesaB).toBeDefined();
    expect(f.desaB).toBeGreaterThan(0);
  });
});
