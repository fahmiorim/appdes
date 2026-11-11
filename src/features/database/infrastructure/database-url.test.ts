import { describe, expect, it, vi } from "vitest";

import { parseDatabaseUrl } from "./database-url";

vi.mock("server-only", () => ({}));

describe("parseDatabaseUrl", () => {
  it("membaca kredensial, port, dan nama basis data", () => {
    expect(parseDatabaseUrl("mysql://pengguna:rahasia%40ku@db.contoh:3307/desa")).toEqual({
      username: "pengguna",
      password: "rahasia@ku",
      host: "db.contoh",
      port: "3307",
      database: "desa",
    });
  });

  it("memakai port 3306 bila tidak disebutkan", () => {
    expect(parseDatabaseUrl("mysql://u:p@localhost/desa").port).toBe("3306");
  });
});
