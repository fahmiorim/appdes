import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit test untuk jalur migrasi integration test.
 *
 * `mysql2` dan `migrate` dimock sepenuhnya: test ini membuktikan guard berjalan
 * lebih dulu, sehingga tidak ada koneksi atau operasi database yang dibuka saat
 * environment tidak valid. Tidak ada database nyata yang disentuh.
 */
const mocks = vi.hoisted(() => ({
  buatKoneksi: vi.fn(),
  migrasi: vi.fn(),
}));

vi.mock("mysql2/promise", () => ({
  default: { createConnection: mocks.buatKoneksi },
}));

vi.mock("drizzle-orm/mysql2/migrator", () => ({
  migrate: mocks.migrasi,
}));

const DSN = "mysql://uji:uji@127.0.0.1:3306/desa_test";
const FOLDER = "src/db/migrations";
const KUNCI_ENV = ["NODE_ENV", "TEST_DATABASE_ACK", "TEST_DATABASE_URL", "DATABASE_URL"] as const;

type KunciEnv = (typeof KUNCI_ENV)[number];

const envAsli = Object.fromEntries(KUNCI_ENV.map((kunci) => [kunci, process.env[kunci]])) as Record<
  KunciEnv,
  string | undefined
>;

function setelEnv(ubah: Partial<Record<KunciEnv, string | undefined>> = {}): void {
  // NODE_ENV bertipe read-only pada deklarasi Next; Reflect.set tetap menulis
  // nilai runtime yang dibaca guard.
  Reflect.set(process.env, "NODE_ENV", "test");
  process.env.TEST_DATABASE_ACK = "1";
  process.env.TEST_DATABASE_URL = DSN;
  // Setup integration test menyalin TEST_DATABASE_URL ke DATABASE_URL sebelum
  // pool Drizzle dibuat. Test jalur migrasi meniru kondisi tersebut.
  process.env.DATABASE_URL = DSN;

  for (const [kunci, nilai] of Object.entries(ubah)) {
    if (nilai === undefined) {
      Reflect.deleteProperty(process.env, kunci);
    } else {
      process.env[kunci] = nilai;
    }
  }
}

async function muatMigrasi() {
  vi.resetModules();
  return import("./migrasi-uji");
}

function koneksiBerhasil() {
  const query = vi
    .fn()
    .mockResolvedValueOnce([[{ ok: 1 }], []])
    .mockResolvedValueOnce([[], []]);
  const end = vi.fn().mockResolvedValue(undefined);
  return { query, end };
}

beforeEach(() => {
  vi.clearAllMocks();
  setelEnv();
  mocks.migrasi.mockResolvedValue(undefined);
});

afterEach(() => {
  for (const kunci of KUNCI_ENV) {
    const nilai = envAsli[kunci];
    if (nilai === undefined) {
      Reflect.deleteProperty(process.env, kunci);
    } else {
      Reflect.set(process.env, kunci, nilai);
    }
  }
});

describe("jalankanMigrasiUji — guard sebelum koneksi", () => {
  it("menjalankan migrasi dengan opsi koneksi eksplisit setelah semua guard lolos", async () => {
    const koneksi = koneksiBerhasil();
    mocks.buatKoneksi.mockResolvedValue(koneksi);
    const { jalankanMigrasiUji } = await muatMigrasi();

    await jalankanMigrasiUji({} as never, { dsn: DSN, migrationsFolder: FOLDER });

    // String URL tidak pernah diberikan ke mysql2; hanya field yang divalidasi.
    expect(mocks.buatKoneksi).toHaveBeenCalledWith({
      host: "127.0.0.1",
      port: 3306,
      user: "uji",
      password: "uji",
      database: "desa_test",
    });
    expect(koneksi.query).toHaveBeenNthCalledWith(1, "SELECT GET_LOCK(?, 120) AS ok", [
      "sid_desa_migrasi_uji",
    ]);
    expect(mocks.migrasi).toHaveBeenCalledWith({}, { migrationsFolder: FOLDER });
    expect(koneksi.end).toHaveBeenCalledTimes(1);
  });

  it("menolak migrasi tanpa TEST_DATABASE_ACK dan tidak membuka koneksi", async () => {
    setelEnv({ TEST_DATABASE_ACK: undefined });
    const { jalankanMigrasiUji } = await muatMigrasi();

    await expect(
      jalankanMigrasiUji({} as never, { dsn: DSN, migrationsFolder: FOLDER }),
    ).rejects.toThrow(/TEST_DATABASE_ACK/);

    expect(mocks.buatKoneksi).not.toHaveBeenCalled();
    expect(mocks.migrasi).not.toHaveBeenCalled();
  });

  it("menolak migrasi bila NODE_ENV bukan test dan tidak membuka koneksi", async () => {
    setelEnv({ NODE_ENV: "development" });
    const { jalankanMigrasiUji } = await muatMigrasi();

    await expect(
      jalankanMigrasiUji({} as never, { dsn: DSN, migrationsFolder: FOLDER }),
    ).rejects.toThrow(/NODE_ENV harus "test"/);

    expect(mocks.buatKoneksi).not.toHaveBeenCalled();
    expect(mocks.migrasi).not.toHaveBeenCalled();
  });

  it("menolak DSN pemanggil yang berbeda dari TEST_DATABASE_URL", async () => {
    const { jalankanMigrasiUji } = await muatMigrasi();

    await expect(
      jalankanMigrasiUji({} as never, {
        dsn: "mysql://uji:uji@127.0.0.1:3306/desa_test_lain",
        migrationsFolder: FOLDER,
      }),
    ).rejects.toThrow(/berbeda dari TEST_DATABASE_URL/);

    expect(mocks.buatKoneksi).not.toHaveBeenCalled();
    expect(mocks.migrasi).not.toHaveBeenCalled();
  });

  it("menolak bila DATABASE_URL aplikasi berbeda dari TEST_DATABASE_URL", async () => {
    setelEnv({ DATABASE_URL: "mysql://uji:uji@127.0.0.1:3306/desa_test_lain" });
    const { jalankanMigrasiUji } = await muatMigrasi();

    await expect(
      jalankanMigrasiUji({} as never, { dsn: DSN, migrationsFolder: FOLDER }),
    ).rejects.toThrow(/DATABASE_URL berbeda/);

    expect(mocks.buatKoneksi).not.toHaveBeenCalled();
    expect(mocks.migrasi).not.toHaveBeenCalled();
  });

  it("menolak TEST_DATABASE_URL dengan query string sebelum koneksi", async () => {
    setelEnv({
      TEST_DATABASE_URL: `${DSN}?socketPath=/tmp/mysql.sock`,
      DATABASE_URL: `${DSN}?socketPath=/tmp/mysql.sock`,
    });
    const { jalankanMigrasiUji } = await muatMigrasi();

    await expect(
      jalankanMigrasiUji({} as never, {
        dsn: `${DSN}?socketPath=/tmp/mysql.sock`,
        migrationsFolder: FOLDER,
      }),
    ).rejects.toThrow(/query string/);

    expect(mocks.buatKoneksi).not.toHaveBeenCalled();
    expect(mocks.migrasi).not.toHaveBeenCalled();
  });
});

describe("siapkanDatabaseUji — guard sebelum CREATE DATABASE", () => {
  it("membuat database lewat koneksi tanpa nama database, lalu memigrasi", async () => {
    const serverQuery = vi.fn().mockResolvedValue([[], []]);
    const serverEnd = vi.fn().mockResolvedValue(undefined);
    const koneksi = koneksiBerhasil();

    mocks.buatKoneksi
      .mockResolvedValueOnce({ query: serverQuery, end: serverEnd })
      .mockResolvedValueOnce(koneksi);

    const { siapkanDatabaseUji } = await muatMigrasi();

    await siapkanDatabaseUji({} as never, { migrationsFolder: FOLDER });

    expect(mocks.buatKoneksi).toHaveBeenNthCalledWith(1, {
      host: "127.0.0.1",
      port: 3306,
      user: "uji",
      password: "uji",
    });
    expect(serverQuery).toHaveBeenCalledWith("CREATE DATABASE IF NOT EXISTS `desa_test`");
    expect(mocks.buatKoneksi).toHaveBeenNthCalledWith(2, {
      host: "127.0.0.1",
      port: 3306,
      user: "uji",
      password: "uji",
      database: "desa_test",
    });
    expect(mocks.migrasi).toHaveBeenCalledWith({}, { migrationsFolder: FOLDER });
  });

  it("menolak pembuatan database tanpa ACK sebelum koneksi apa pun", async () => {
    setelEnv({ TEST_DATABASE_ACK: undefined });
    const { siapkanDatabaseUji } = await muatMigrasi();

    await expect(siapkanDatabaseUji({} as never, { migrationsFolder: FOLDER })).rejects.toThrow(
      /TEST_DATABASE_ACK/,
    );

    expect(mocks.buatKoneksi).not.toHaveBeenCalled();
    expect(mocks.migrasi).not.toHaveBeenCalled();
  });
});
