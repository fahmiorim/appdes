import { describe, expect, it } from "vitest";

import { kehadiranFormSchema } from "./kehadiran";

describe("kehadiranFormSchema", () => {
  it.each(["hadir", "izin", "sakit", "alpa"])("menerima status %s dari formulir", (status) => {
    expect(
      kehadiranFormSchema.safeParse({
        perangkatId: "1",
        tanggal: "2026-11-04",
        status,
      }).success,
    ).toBe(true);
  });

  it("menolak label status tampilan sebagai nilai data", () => {
    expect(
      kehadiranFormSchema.safeParse({
        perangkatId: "1",
        tanggal: "2026-11-04",
        status: "Present",
      }).success,
    ).toBe(false);
  });
  it("menolak tanggal kalender yang tidak valid", () => {
    expect(
      kehadiranFormSchema.safeParse({
        perangkatId: "1",
        tanggal: "2026-02-30",
        status: "hadir",
      }).success,
    ).toBe(false);
  });
});
