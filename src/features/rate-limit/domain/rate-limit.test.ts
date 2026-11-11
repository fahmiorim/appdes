import { describe, expect, it } from "vitest";

import {
  hasilBatasPermintaan,
  milidetikKeKuotaBerikutnya,
  saringPermintaanAktif,
} from "./rate-limit";

describe("hasilBatasPermintaan", () => {
  it("allows counts through the quota and reports the remaining amount", () => {
    expect(hasilBatasPermintaan(2, 3, 12_000)).toEqual({
      dibatasi: false,
      sisa: 1,
      resetMs: 12_000,
    });
  });

  it("blocks excess requests without returning a negative quota", () => {
    expect(hasilBatasPermintaan(4, 3, 12_000)).toEqual({
      dibatasi: true,
      sisa: 0,
      resetMs: 12_000,
    });
  });
  it("keeps only requests inside the exact sliding window", () => {
    expect(saringPermintaanAktif([1_000, 2_000, 60_000, 62_000], 61_000, 60_000)).toEqual([
      2_000, 60_000, 62_000,
    ]);
  });

  it("uses the oldest live request to calculate the next available quota", () => {
    expect(milidetikKeKuotaBerikutnya([2_000, 60_000], 61_000, 60_000)).toBe(1_000);
  });
});
