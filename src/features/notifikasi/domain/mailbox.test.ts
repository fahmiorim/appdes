import { describe, expect, it } from "vitest";

import { normalisasiEmail, pesanEmailMasukSchema } from "./mailbox";

describe("pesanEmailMasukSchema", () => {
  it("accepts a bounded inbound email payload", () => {
    expect(
      pesanEmailMasukSchema.safeParse({
        token: "a-secure-token",
        alamat: "sender@example.test",
        subjek: "Pertanyaan warga",
        isi: "Mohon informasi layanan desa.",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid addresses, missing content, and oversized subjects", () => {
    expect(
      pesanEmailMasukSchema.safeParse({
        token: "a-secure-token",
        alamat: "not-an-email",
        isi: "Isi pesan",
      }).success,
    ).toBe(false);
    expect(
      pesanEmailMasukSchema.safeParse({
        token: "a-secure-token",
        alamat: "sender@example.test",
        subjek: "x".repeat(256),
        isi: "Isi pesan",
      }).success,
    ).toBe(false);
  });
});

describe("normalisasiEmail", () => {
  it("trims whitespace and normalizes case", () => {
    expect(normalisasiEmail(" WARGA@Contoh.ID ")).toBe("warga@contoh.id");
  });
});
