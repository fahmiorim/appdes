import { fileURLToPath } from "node:url";
import { and, eq, inArray } from "drizzle-orm";
import mysql, { type ResultSetHeader } from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { inventaris, inventarisKategori, inventarisMutasi, villages } from "@/db/schema";
import { users } from "@/db/schema/auth";
import {
  ajukanMutasi,
  saveInventaris,
} from "@/features/inventaris/application/inventaris-use-cases";
import {
  inventarisFormSchema,
  type InventarisInput,
} from "@/features/inventaris/domain/inventaris";
import {
  listInventaris,
  listMutasi,
} from "@/features/inventaris/infrastructure/inventaris-repository";
import type { CurrentUser } from "@/lib/dal";
import * as dal from "@/lib/dal";
import { validasiDatabaseUji } from "@/testing/db-test-guard";
import { siapkanDatabaseUji } from "@/testing/migrasi-uji";

/**
 * AUD-034 Batch 3 — isolasi tenant modul inventaris.
 *
 * Dua celah yang diuji:
 * 1. `listInventaris`/`listMutasi` melakukan LEFT JOIN hanya dengan `id`,
 *    sehingga baris legacy dapat menampilkan nama/kode kategori atau nama
 *    barang milik desa lain pada route aktif (ekspor admin, ekspor publik,
 *    API publik).
 * 2. `saveInventaris` meneruskan `kategoriId` dari input apa adanya. Database
 *    hanya memeriksa keberadaan kategori (`ON DELETE SET NULL`, single-column
 *    FK), sehingga kategori desa lain dapat ditautkan.
 *
 * Izin tidak sedang diuji di sini; `requirePermission` dimock agar desa aktif
 * berasal dari sesi seperti pada production.
 */

const MIGRATIONS_FOLDER = fileURLToPath(new URL("../../../db/migrations", import.meta.url));
const RUN = String(Date.now()).slice(-8);

vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn() }));

const KATEGORI_TIDAK_ADA = 999_999_999;

let pengguna: CurrentUser | null = null;

function penggunaSaatIni(): CurrentUser {
  if (pengguna === null) throw new Error("Pengguna uji belum disiapkan.");
  return pengguna;
}

interface Fixture {
  desaA: number;
  desaB: number;
  kategoriA: number;
  kategoriB: number;
  asetValidA: number;
  asetLegacyA: number;
  asetTanpaKategoriA: number;
  asetUbahA: number;
  asetB: number;
  namaAsetValidA: string;
  namaAsetB: string;
  mutasiValidA: number;
  mutasiLegacyA: number;
}

let fixture: Fixture | null = null;

function dataUji(): Fixture {
  if (fixture === null) throw new Error("Fixture integrasi tidak siap.");
  return fixture;
}

function idDari(baris: { id: number } | undefined, label: string): number {
  const id = baris?.id;
  if (id === undefined) throw new Error(`Seed uji gagal: ${label} tidak terbentuk.`);
  return id;
}

/**
 * Sisipkan mutasi legacy desa A yang menunjuk inventaris desa B.
 *
 * Setelah migration Batch 3, composite FK menolak pasangan ini pada jalur
 * normal. Baris dibuat dengan pengecekan FK dimatikan untuk mereproduksi data
 * yang dibuat sebelum constraint terpasang; pengecualian selalu dikembalikan di
 * blok `finally`.
 */
async function sisipMutasiLegacy(params: {
  villageId: number;
  inventarisId: number;
}): Promise<number> {
  const koneksi = await mysql.createConnection(validasiDatabaseUji(process.env).opsiKoneksi);
  try {
    await koneksi.query("SET FOREIGN_KEY_CHECKS = 0");
    const [hasil] = await koneksi.query<ResultSetHeader>(
      "INSERT INTO inventaris_mutasi (village_id, inventaris_id, jenis, tanggal_mutasi, alasan) VALUES (?, ?, 'pindah', '2026-02-01', ?)",
      [params.villageId, params.inventarisId, `Legacy ${RUN}`],
    );
    return hasil.insertId;
  } finally {
    await koneksi.query("SET FOREIGN_KEY_CHECKS = 1");
    await koneksi.end();
  }
}

function inputInventaris(
  overrides: Partial<InventarisInput> & { namaBarang: string },
): InventarisInput {
  return inventarisFormSchema.parse({
    kategoriId: "",
    jumlah: 1,
    satuan: "buah",
    kondisi: "baik",
    ...overrides,
  });
}

beforeAll(async () => {
  await siapkanDatabaseUji(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const [desaARow] = await db
    .insert(villages)
    .values({ name: `Desa Inv A ${RUN}`, code: `IA${RUN}` })
    .$returningId();
  const [desaBRow] = await db
    .insert(villages)
    .values({ name: `Desa Inv B ${RUN}`, code: `IB${RUN}` })
    .$returningId();
  const desaA = idDari(desaARow, "desa A");
  const desaB = idDari(desaBRow, "desa B");

  const [kategoriARow] = await db
    .insert(inventarisKategori)
    .values({
      villageId: desaA,
      kode: `KA${RUN}`,
      nama: `Kategori A ${RUN}`,
      golongan: "tanah",
    })
    .$returningId();
  const [kategoriBRow] = await db
    .insert(inventarisKategori)
    .values({
      villageId: desaB,
      kode: `KB${RUN}`,
      nama: `Kategori B ${RUN}`,
      golongan: "peralatan_mesin",
    })
    .$returningId();
  const kategoriA = idDari(kategoriARow, "kategori A");
  const kategoriB = idDari(kategoriBRow, "kategori B");

  const namaAsetValidA = `Aset Valid A ${RUN}`;
  const namaAsetB = `Aset Desa B ${RUN}`;

  const [asetValidARow] = await db
    .insert(inventaris)
    .values({
      villageId: desaA,
      kategoriId: kategoriA,
      namaBarang: namaAsetValidA,
      jumlah: "1.00",
    })
    .$returningId();
  // Legacy: aset desa A menunjuk kategori desa B. FK single-column tetap
  // menerima pasangan ini, jadi tidak perlu mematikan pengecekan FK.
  const [asetLegacyARow] = await db
    .insert(inventaris)
    .values({
      villageId: desaA,
      kategoriId: kategoriB,
      namaBarang: `Aset Legacy A ${RUN}`,
      jumlah: "1.00",
    })
    .$returningId();
  const [asetTanpaKategoriARow] = await db
    .insert(inventaris)
    .values({
      villageId: desaA,
      namaBarang: `Aset Tanpa Kategori A ${RUN}`,
      jumlah: "1.00",
    })
    .$returningId();
  const [asetUbahARow] = await db
    .insert(inventaris)
    .values({
      villageId: desaA,
      kategoriId: kategoriA,
      namaBarang: `Aset Ubah A ${RUN}`,
      jumlah: "1.00",
    })
    .$returningId();
  const [asetBRow] = await db
    .insert(inventaris)
    .values({
      villageId: desaB,
      kategoriId: kategoriB,
      namaBarang: namaAsetB,
      jumlah: "1.00",
    })
    .$returningId();

  const asetValidA = idDari(asetValidARow, "aset valid A");
  const asetB = idDari(asetBRow, "aset B");

  const [mutasiValidARow] = await db
    .insert(inventarisMutasi)
    .values({
      villageId: desaA,
      inventarisId: asetValidA,
      jenis: "pindah",
      tanggalMutasi: "2026-02-01",
      alasan: `Mutasi sah ${RUN}`,
    })
    .$returningId();

  fixture = {
    desaA,
    desaB,
    kategoriA,
    kategoriB,
    asetValidA,
    asetLegacyA: idDari(asetLegacyARow, "aset legacy A"),
    asetTanpaKategoriA: idDari(asetTanpaKategoriARow, "aset tanpa kategori A"),
    asetUbahA: idDari(asetUbahARow, "aset ubah A"),
    asetB,
    namaAsetValidA,
    namaAsetB,
    mutasiValidA: idDari(mutasiValidARow, "mutasi valid A"),
    mutasiLegacyA: await sisipMutasiLegacy({ villageId: desaA, inventarisId: asetB }),
  };

  // Aktor nyata diperlukan agar audit trail (FK `audit_logs.actor_id`) dapat
  // ditulis; sesi sendiri tetap dimock di atas.
  const userId = `uji-b3-${RUN}`;
  await db.insert(users).values({
    id: userId,
    name: "Operator Uji",
    email: `uji-b3-${RUN}@contoh.test`,
    villageId: desaA,
  });

  pengguna = {
    id: userId,
    name: "Operator Uji",
    username: null,
    email: `uji-b3-${RUN}@contoh.test`,
    image: null,
    villageId: desaA,
    roleId: null,
    residentId: null,
    mustChangePin: false,
    permissions: { isSuperadmin: false, levelByResource: new Map() },
  };

  vi.mocked(dal.requirePermission).mockImplementation(async () => penggunaSaatIni());
});

afterAll(async () => {
  if (fixture === null) return;
  const desaIds = [fixture.desaA, fixture.desaB];
  // Baris legacy lintas desa dibuat dengan pemeriksaan FK dimatikan, jadi
  // cleanup harus berurutan dari anak ke parent.
  await db.delete(inventarisMutasi).where(inArray(inventarisMutasi.villageId, desaIds));
  await db.delete(inventaris).where(inArray(inventaris.villageId, desaIds));
  await db.delete(inventarisKategori).where(inArray(inventarisKategori.villageId, desaIds));
  if (pengguna !== null) await db.delete(users).where(eq(users.id, pengguna.id));
  await db.delete(villages).where(inArray(villages.id, desaIds));
});

describe("listInventaris — join kategori dibatasi desa", () => {
  it("menampilkan kategori desa sendiri pada aset yang sah", async () => {
    const { desaA, asetValidA } = dataUji();

    const { rows } = await listInventaris(desaA);
    const baris = rows.find((row) => row.id === asetValidA);

    expect(baris?.kategoriNama).toBe(`Kategori A ${RUN}`);
    expect(baris?.kategoriKode).toBe(`KA${RUN}`);
    expect(baris?.kategoriId).toBe(dataUji().kategoriA);
  });

  it("tidak membocorkan nama/kode kategori desa lain pada baris legacy", async () => {
    const { desaA, asetLegacyA } = dataUji();

    const { rows } = await listInventaris(desaA);
    const baris = rows.find((row) => row.id === asetLegacyA);

    // Sebelum perbaikan, join hanya memakai id sehingga nama kategori desa B
    // ikut tampil pada CSV/ekspor publik.
    expect(baris).toBeDefined();
    expect(baris?.kategoriNama).toBeNull();
    expect(baris?.kategoriKode).toBeNull();
  });

  it("membiarkan kategori NULL tetap NULL", async () => {
    const { desaA, asetTanpaKategoriA } = dataUji();

    const { rows } = await listInventaris(desaA);
    const baris = rows.find((row) => row.id === asetTanpaKategoriA);

    expect(baris?.kategoriId).toBeNull();
    expect(baris?.kategoriNama).toBeNull();
    expect(baris?.kategoriKode).toBeNull();
  });

  it("tidak mengembalikan aset desa lain maupun kategori miliknya", async () => {
    const { desaA, asetB } = dataUji();

    const { rows, total } = await listInventaris(desaA);

    expect(total).toBe(4);
    expect(rows.map((row) => row.id)).not.toContain(asetB);
    expect(rows.every((row) => row.kategoriNama !== `Kategori B ${RUN}`)).toBe(true);
  });
});

describe("listMutasi — join inventaris dibatasi desa", () => {
  it("menampilkan nama barang desa sendiri pada mutasi sah", async () => {
    const { desaA, mutasiValidA, namaAsetValidA } = dataUji();

    const rows = await listMutasi(desaA);
    const baris = rows.find((row) => row.id === mutasiValidA);

    expect(baris?.namaBarang).toBe(namaAsetValidA);
  });

  it("tidak menampilkan nama barang desa lain pada mutasi legacy", async () => {
    const { desaA, mutasiLegacyA } = dataUji();

    const rows = await listMutasi(desaA);
    const baris = rows.find((row) => row.id === mutasiLegacyA);

    expect(baris).toBeDefined();
    expect(baris?.namaBarang).toBeNull();
    expect(baris?.nomorInventaris).toBeNull();
  });

  it("mutasi desa lain tidak ikut terbaca", async () => {
    const { desaA } = dataUji();

    const rows = await listMutasi(desaA);
    expect(rows).toHaveLength(2);
  });
});

describe("saveInventaris — kategori wajib milik desa aktif", () => {
  it("menyimpan aset dengan kategori desa sendiri", async () => {
    const { desaA, kategoriA } = dataUji();

    const hasil = await saveInventaris(
      inputInventaris({ namaBarang: `Aset Baru A ${RUN}`, kategoriId: kategoriA }),
    );

    expect(hasil?.id).toBeGreaterThan(0);
    const [tersimpan] = await db
      .select({
        villageId: inventaris.villageId,
        kategoriId: inventaris.kategoriId,
        namaBarang: inventaris.namaBarang,
      })
      .from(inventaris)
      .where(eq(inventaris.id, hasil!.id))
      .limit(1);

    expect(tersimpan).toEqual({
      villageId: desaA,
      kategoriId: kategoriA,
      namaBarang: `Aset Baru A ${RUN}`,
    });
  });

  it("menolak kategori desa lain dan tidak menulis baris apa pun", async () => {
    const { desaB, kategoriB } = dataUji();

    await expect(
      saveInventaris(inputInventaris({ namaBarang: `Aset Ditolak ${RUN}`, kategoriId: kategoriB })),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Kategori inventaris tidak ditemukan.",
    });

    const bocor = await db
      .select({ id: inventaris.id })
      .from(inventaris)
      .where(eq(inventaris.namaBarang, `Aset Ditolak ${RUN}`));
    expect(bocor).toHaveLength(0);

    const kategoriLintasDesa = await db
      .select({ id: inventaris.id })
      .from(inventaris)
      .where(and(eq(inventaris.villageId, desaB), eq(inventaris.kategoriId, kategoriB)));
    expect(kategoriLintasDesa.length).toBeGreaterThan(0);
  });

  it("memakai pesan yang sama untuk kategori yang tidak ada", async () => {
    const { kategoriB } = dataUji();

    const pesanLintasDesa = await saveInventaris(
      inputInventaris({ namaBarang: `Aset Lintas ${RUN}`, kategoriId: kategoriB }),
    ).catch((error: unknown) => (error as { message?: string }).message);
    const pesanTidakAda = await saveInventaris(
      inputInventaris({ namaBarang: `Aset Hantu ${RUN}`, kategoriId: KATEGORI_TIDAK_ADA }),
    ).catch((error: unknown) => (error as { message?: string }).message);

    expect(pesanLintasDesa).toBe("Kategori inventaris tidak ditemukan.");
    expect(pesanTidakAda).toBe(pesanLintasDesa);
  });

  it("menerima kategori kosong sebagai NULL", async () => {
    const { desaA } = dataUji();

    const hasil = await saveInventaris(
      inputInventaris({ namaBarang: `Aset Tanpa Kategori Baru ${RUN}`, kategoriId: "" }),
    );

    const [tersimpan] = await db
      .select({ villageId: inventaris.villageId, kategoriId: inventaris.kategoriId })
      .from(inventaris)
      .where(eq(inventaris.id, hasil!.id))
      .limit(1);
    expect(tersimpan).toEqual({ villageId: desaA, kategoriId: null });
  });

  it("menolak update ke kategori desa lain dan membiarkan baris tidak berubah", async () => {
    const { kategoriA, kategoriB, asetUbahA } = dataUji();

    await expect(
      saveInventaris(
        inputInventaris({ namaBarang: `Aset Ubah A ${RUN}`, kategoriId: kategoriB }),
        asetUbahA,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    const [tersimpan] = await db
      .select({ kategoriId: inventaris.kategoriId, namaBarang: inventaris.namaBarang })
      .from(inventaris)
      .where(eq(inventaris.id, asetUbahA))
      .limit(1);
    expect(tersimpan).toEqual({
      kategoriId: kategoriA,
      namaBarang: `Aset Ubah A ${RUN}`,
    });
  });

  it("tetap dapat mengubah aset desa sendiri ke kategori desa sendiri", async () => {
    const { kategoriA, asetUbahA } = dataUji();

    await saveInventaris(
      inputInventaris({ namaBarang: `Aset Ubah A Baru ${RUN}`, kategoriId: kategoriA }),
      asetUbahA,
    );

    const [tersimpan] = await db
      .select({ kategoriId: inventaris.kategoriId, namaBarang: inventaris.namaBarang })
      .from(inventaris)
      .where(eq(inventaris.id, asetUbahA))
      .limit(1);
    expect(tersimpan).toEqual({
      kategoriId: kategoriA,
      namaBarang: `Aset Ubah A Baru ${RUN}`,
    });
  });

  it("menolak update aset desa lain dengan NOT_FOUND dan tanpa perubahan", async () => {
    const { asetB, namaAsetB } = dataUji();

    await expect(
      saveInventaris(inputInventaris({ namaBarang: `Aset Bajakan ${RUN}`, kategoriId: "" }), asetB),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const [tersimpan] = await db
      .select({ namaBarang: inventaris.namaBarang })
      .from(inventaris)
      .where(eq(inventaris.id, asetB))
      .limit(1);
    expect(tersimpan).toEqual({ namaBarang: namaAsetB });
  });
});

describe("ajukanMutasi — inventaris wajib milik desa aktif", () => {
  it("menolak pengajuan mutasi atas aset desa lain", async () => {
    const { asetB } = dataUji();

    await expect(
      ajukanMutasi({
        inventarisId: asetB,
        jenis: "pindah",
        tanggalMutasi: "2026-04-01",
        lokasiBaru: "Gudang lain",
        jumlahMutasi: 1,
        alasan: "Uji lintas desa",
        keterangan: "",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const mutasiAsing = await db
      .select({ id: inventarisMutasi.id })
      .from(inventarisMutasi)
      .where(
        and(
          eq(inventarisMutasi.inventarisId, asetB),
          eq(inventarisMutasi.alasan, "Uji lintas desa"),
        ),
      );
    expect(mutasiAsing).toHaveLength(0);
  });
});
