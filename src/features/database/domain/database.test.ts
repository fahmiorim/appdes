import { describe, expect, it } from "vitest";

import { isAllowedSqlFile, normalizeSqlFilename, tabelHilang } from "./database";

describe("domain database", () => {
  it("menerima hanya berkas sql dan sql.gz", () => {
    expect(isAllowedSqlFile("backup.sql")).toBe(true);
    expect(isAllowedSqlFile("backup.sql.gz")).toBe(true);
    expect(isAllowedSqlFile("backup.zip")).toBe(false);
    expect(isAllowedSqlFile("backup.txt")).toBe(false);
  });

  it("menormalkan nama file sql", () => {
    expect(normalizeSqlFilename("backup desa.sql")).toBe("backup_desa.sql");
    expect(normalizeSqlFilename("backup.sql.gz")).toBe("backup.sql.gz");
    expect(normalizeSqlFilename("backup")).toBe("backup.sql");
  });

  it("mendeteksi tabel inti yang hilang setelah restore", () => {
    expect(tabelHilang(["users", "villages", "roles"], ["users", "roles"])).toEqual([]);
    expect(tabelHilang(["users"], ["users", "villages", "roles"])).toEqual(["villages", "roles"]);
    expect(tabelHilang(["USERS"], ["users"])).toEqual([]);
  });
});
