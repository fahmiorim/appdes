import { describe, expect, it } from "vitest";

import {
  fallbackEmail,
  penggunaCreateSchema,
  penggunaUpdateSchema,
  USERNAME_PATTERN,
} from "./pengguna";

const validCreate = {
  name: "Operator Desa",
  username: "operator",
  email: "operator@desa.id",
  roleId: "2",
  active: true,
  password: "Rahasia#123",
};

describe("penggunaCreateSchema", () => {
  it("menerima isian valid dan mengubah roleId menjadi angka", () => {
    const parsed = penggunaCreateSchema.parse(validCreate);

    expect(parsed.roleId).toBe(2);
    expect(parsed.username).toBe("operator");
    expect(parsed.email).toBe("operator@desa.id");
  });

  it("menormalkan email kosong menjadi null", () => {
    const parsed = penggunaCreateSchema.parse({ ...validCreate, email: "" });

    expect(parsed.email).toBeNull();
  });

  it("menolak kata sandi kurang dari 8 karakter", () => {
    const result = penggunaCreateSchema.safeParse({ ...validCreate, password: "pendek" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Kata sandi minimal 8 karakter.");
    }
  });

  it("menolak grup akses yang belum dipilih", () => {
    const result = penggunaCreateSchema.safeParse({ ...validCreate, roleId: "none" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Grup akses wajib dipilih.");
    }
  });

  it("menolak username dengan karakter tidak diizinkan", () => {
    expect(USERNAME_PATTERN.test("operator desa")).toBe(false);

    const result = penggunaCreateSchema.safeParse({ ...validCreate, username: "operator desa" });

    expect(result.success).toBe(false);
  });

  it("menolak email yang tidak valid", () => {
    const result = penggunaCreateSchema.safeParse({ ...validCreate, email: "bukan-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Format email tidak valid.");
    }
  });
});

describe("penggunaUpdateSchema", () => {
  it("menganggap kata sandi kosong sebagai null (tidak diubah)", () => {
    const parsed = penggunaUpdateSchema.parse({ ...validCreate, password: "" });

    expect(parsed.password).toBeNull();
  });

  it("menerima kata sandi baru yang valid", () => {
    const parsed = penggunaUpdateSchema.parse({ ...validCreate, password: "SandiBaru#1" });

    expect(parsed.password).toBe("SandiBaru#1");
  });

  it("menolak kata sandi baru yang terlalu pendek", () => {
    const result = penggunaUpdateSchema.safeParse({ ...validCreate, password: "1234567" });

    expect(result.success).toBe(false);
  });
});

describe("fallbackEmail", () => {
  it("membentuk email bawaan dari username huruf kecil", () => {
    expect(fallbackEmail("Operator.Desa")).toBe("operator.desa@desa.local");
  });
});
