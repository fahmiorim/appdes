import { describe, expect, it } from "vitest";

import { anjunganFormSchema } from "./anjungan";

const UUID_VALID = "550e8400-e29b-41d4-a716-446655440000";

function masukan(ubah: Record<string, unknown> = {}) {
  return {
    nama: "  Anjungan Surat  ",
    uuid: "",
    ...ubah,
  };
}

describe("anjunganFormSchema", () => {
  it("memangkas nama dan menerima UUID kosong sebagai null", () => {
    const parsed = anjunganFormSchema.parse(masukan());

    expect(parsed.nama).toBe("Anjungan Surat");
    expect(parsed.uuid).toBeNull();
  });

  it("memperlakukan UUID berisi spasi sebagai kosong", () => {
    const parsed = anjunganFormSchema.parse(masukan({ uuid: "   " }));

    expect(parsed.uuid).toBeNull();
  });

  it("mempertahankan UUID yang valid", () => {
    const parsed = anjunganFormSchema.parse(masukan({ uuid: UUID_VALID }));

    expect(parsed.uuid).toBe(UUID_VALID);
  });

  it("menolak UUID yang tidak valid", () => {
    expect(() => anjunganFormSchema.parse(masukan({ uuid: "bukan-uuid" }))).toThrow(
      "UUID tidak valid",
    );
  });
});
