import { describe, expect, it } from "vitest";

import { namaDatabaseDariDsn, pastikanNamaDatabaseUji, validasiDatabaseUji } from "./db-test-guard";

/** Environment valid minimal; setiap test mengubah satu hal saja. */
function envValid(ubah: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "test",
    TEST_DATABASE_ACK: "1",
    TEST_DATABASE_URL: "mysql://uji:uji@127.0.0.1:3306/desa_test",
    DATABASE_URL: "mysql://root:@127.0.0.1:3306/desa_dev",
    ...ubah,
  };
}

describe("guard database integration test", () => {
  it("menerima DSN desa_test pada host loopback", () => {
    expect(validasiDatabaseUji(envValid())).toEqual({
      dsn: "mysql://uji:uji@127.0.0.1:3306/desa_test",
      database: "desa_test",
      host: "127.0.0.1",
    });
  });

  it("menerima suffix desa_test_<suffix> dan localhost", () => {
    const hasil = validasiDatabaseUji(
      envValid({ TEST_DATABASE_URL: "mysql://uji@localhost/desa_test_phase01" }),
    );

    expect(hasil.database).toBe("desa_test_phase01");
    expect(hasil.host).toBe("localhost");
  });

  it("menolak NODE_ENV selain test", () => {
    expect(() => validasiDatabaseUji(envValid({ NODE_ENV: "development" }))).toThrow(
      /NODE_ENV harus "test"/,
    );
    expect(() => validasiDatabaseUji(envValid({ NODE_ENV: undefined }))).toThrow(
      /NODE_ENV harus "test"/,
    );
  });

  it("menolak bila acknowledgement eksplisit tidak ada", () => {
    expect(() => validasiDatabaseUji(envValid({ TEST_DATABASE_ACK: undefined }))).toThrow(
      /TEST_DATABASE_ACK/,
    );
    expect(() => validasiDatabaseUji(envValid({ TEST_DATABASE_ACK: "0" }))).toThrow(
      /TEST_DATABASE_ACK/,
    );
  });

  it("tidak memakai DATABASE_URL sebagai fallback", () => {
    expect(() => validasiDatabaseUji(envValid({ TEST_DATABASE_URL: undefined }))).toThrow(
      /TEST_DATABASE_URL wajib diisi/,
    );
  });

  it("menolak protokol selain mysql", () => {
    expect(() =>
      validasiDatabaseUji(envValid({ TEST_DATABASE_URL: "postgres://uji@127.0.0.1/desa_test" })),
    ).toThrow(/mysql/);
  });

  it("menolak host non-loopback meski namanya desa_test", () => {
    expect(() =>
      validasiDatabaseUji(envValid({ TEST_DATABASE_URL: "mysql://uji@db.contoh.id/desa_test" })),
    ).toThrow(/host loopback/);
  });

  it.each([
    "desa_dev",
    "desa",
    "desa_development",
    "desa_prod",
    "desa_production",
    "production",
    "prod",
    "test",
    "mysql",
    "sys",
  ])("menolak nama database terlarang: %s", (nama) => {
    expect(() =>
      validasiDatabaseUji(envValid({ TEST_DATABASE_URL: `mysql://uji@127.0.0.1/${nama}` })),
    ).toThrow(/tidak diizinkan|ditolak/);
  });

  it.each([
    "desa_test2",
    "DESA_TEST",
    "desa-test",
    "desa_test;DROP",
    "desa_test/produksi",
    "desa_test_prod",
    "desa_test_production",
    "desa_test_DEV",
    "desa_uji",
  ])("menolak nama database di luar allowlist: %s", (nama) => {
    expect(() => pastikanNamaDatabaseUji(`mysql://uji@127.0.0.1/${nama}`)).toThrow(
      /tidak diizinkan|ditolak|penanda produksi/,
    );
  });

  it("menolak DSN tanpa nama database dan DSN rusak", () => {
    expect(() => namaDatabaseDariDsn("mysql://uji@127.0.0.1:3306/")).toThrow(
      /tidak menyebutkan nama database/,
    );
    expect(() => namaDatabaseDariDsn("bukan-url")).toThrow(/bukan URL yang valid/);
  });

  it("menolak host IPv6 non-loopback", () => {
    expect(() =>
      validasiDatabaseUji(
        envValid({ TEST_DATABASE_URL: "mysql://uji@[2001:db8::1]:3306/desa_test" }),
      ),
    ).toThrow(/host loopback/);
  });

  it("menerima host IPv6 loopback", () => {
    const hasil = validasiDatabaseUji(
      envValid({ TEST_DATABASE_URL: "mysql://uji@[::1]:3306/desa_test" }),
    );

    expect(hasil.database).toBe("desa_test");
  });
});
