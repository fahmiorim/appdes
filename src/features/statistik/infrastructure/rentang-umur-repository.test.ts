import { describe, expect, it } from "vitest";

/**
 * Domain test untuk rentang umur — menguji logika mapping baris DB ke DTO
 * tanpa ketergantungan pada database.
 */
import { mapRentangUmurRow } from "./rentang-umur-repository";

describe("mapRentangUmurRow", () => {
  it("mengonversi baris DB ke DTO dengan benar", () => {
    const row = {
      id: 1,
      villageId: 9,
      nama: "0–5 Tahun",
      dari: 0,
      sampai: 5,
      status: true,
    };

    const dto = mapRentangUmurRow(row);

    expect(dto).toEqual({
      id: 1,
      villageId: 9,
      nama: "0–5 Tahun",
      dari: 0,
      sampai: 5,
      status: true,
    });
  });

  it("menangani sampai null (tanpa batas atas)", () => {
    const row = {
      id: 2,
      villageId: 9,
      nama: "60+ Tahun",
      dari: 60,
      sampai: null,
      status: true,
    };

    const dto = mapRentangUmurRow(row);

    expect(dto.sampai).toBeNull();
    expect(dto.dari).toBe(60);
  });
});
