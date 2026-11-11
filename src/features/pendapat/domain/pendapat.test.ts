import { describe, expect, it } from "vitest";

import { JAWABAN_KEPUASAN, pendapatSchema } from "./pendapat";

describe("JAWABAN_KEPUASAN", () => {
  it("memiliki 4 entri jawaban kepuasan", () => {
    expect(JAWABAN_KEPUASAN).toHaveLength(4);
    expect(JAWABAN_KEPUASAN.map((j) => j.value)).toEqual([1, 2, 3, 4]);
    expect(JAWABAN_KEPUASAN.map((j) => j.label)).toEqual([
      "Sangat Puas",
      "Puas",
      "Cukup Puas",
      "Tidak Puas",
    ]);
  });

  it("nilai pilihan berupa angka 1-4 yang berkelanjutan", () => {
    const nilai = JAWABAN_KEPUASAN.map((j) => j.value);
    expect(nilai).toEqual([1, 2, 3, 4]);
  });
});

describe("pendapatSchema", () => {
  it("menerima input wajib dengan villageId positif dan pilihan 1-4", () => {
    const input = {
      villageId: 1,
      pengguna: "Budi",
      pilihan: 2,
      ipAddress: "192.168.1.1",
    };
    const result = pendapatSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.villageId).toBe(1);
      expect(result.data.pilihan).toBe(2);
    }
  });

  it("menolak pilihan di luar 1-4", () => {
    expect(pendapatSchema.safeParse({ villageId: 1, pengguna: "A", pilihan: 0 }).success).toBe(
      false,
    );
    expect(pendapatSchema.safeParse({ villageId: 1, pengguna: "A", pilihan: 5 }).success).toBe(
      false,
    );
  });

  it("menolak villageId bukan positif", () => {
    expect(pendapatSchema.safeParse({ villageId: 0, pengguna: "A", pilihan: 1 }).success).toBe(
      false,
    );
  });
});

describe("validasi pendapat - sessionKey", () => {
  it("menerima input pendapat dengan sessionKey unik", () => {
    const parsed = pendapatSchema.parse({
      villageId: 1,
      pengguna: "Budi",
      pilihan: 2,
      ipAddress: "192.168.1.1",
      sessionKey: "hash12345678901234567890123456789012",
    });
    expect(parsed.sessionKey).toBeTruthy();
    expect((parsed.sessionKey || "").length).toBeGreaterThan(0);
  });
});
