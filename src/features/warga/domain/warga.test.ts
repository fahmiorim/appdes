import { describe, expect, it } from "vitest";

import { pinSchema, ubahPinSchema } from "./warga";

describe("pinSchema", () => {
  it("menerima tepat 6 digit angka", () => {
    expect(pinSchema.safeParse("123456").success).toBe(true);
    expect(pinSchema.safeParse("000001").success).toBe(true);
  });

  it("menolak panjang salah, bukan angka, dan spasi internal", () => {
    expect(pinSchema.safeParse("12345").success).toBe(false);
    expect(pinSchema.safeParse("1234567").success).toBe(false);
    expect(pinSchema.safeParse("12a456").success).toBe(false);
    expect(pinSchema.safeParse("123 56").success).toBe(false);
  });
});

describe("ubahPinSchema", () => {
  const valid = { pinLama: "123456", pinBaru: "654321", konfirmasiPin: "654321" };

  it("menerima PIN baru yang berbeda dan konfirmasi cocok", () => {
    expect(ubahPinSchema.safeParse(valid).success).toBe(true);
  });

  it("menolak konfirmasi berbeda", () => {
    const result = ubahPinSchema.safeParse({ ...valid, konfirmasiPin: "111111" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["konfirmasiPin"]);
    }
  });

  it("menolak PIN baru yang sama dengan PIN lama", () => {
    const result = ubahPinSchema.safeParse({
      pinLama: "123456",
      pinBaru: "123456",
      konfirmasiPin: "123456",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["pinBaru"]);
    }
  });
});
