import { describe, expect, it } from "vitest";

import { broadcastSchema, parseFilterNotifikasi } from "./notifikasi";

describe("filter notifikasi", () => {
  it("memakai bawaan saat query kosong", () => {
    expect(parseFilterNotifikasi({})).toEqual({ kanal: null, status: "semua" });
  });

  it("menerima kanal dan status yang sah", () => {
    expect(parseFilterNotifikasi({ kanal: "email", status: "sukses" })).toEqual({
      kanal: "email",
      status: "sukses",
    });
  });

  it("mengabaikan nilai asing", () => {
    expect(parseFilterNotifikasi({ kanal: "invalid", status: "hilang" })).toEqual({
      kanal: null,
      status: "semua",
    });
  });
});

describe("broadcastSchema", () => {
  it("menerima pesan yang sah dan memangkas spasi", () => {
    const hasil = broadcastSchema.parse({
      kanal: "whatsapp",
      target: " 08123456789 ",
      pesan: "  Halo warga  ",
    });

    expect(hasil.target).toBe("08123456789");
    expect(hasil.pesan).toBe("Halo warga");
  });

  it("menolak pesan terlalu pendek atau target kosong", () => {
    expect(broadcastSchema.safeParse({ kanal: "email", target: "a@b", pesan: "hai" }).success).toBe(
      false,
    );
    expect(
      broadcastSchema.safeParse({ kanal: "invalid", target: "08123", pesan: "pesan cukup" })
        .success,
    ).toBe(false);
  });
});
