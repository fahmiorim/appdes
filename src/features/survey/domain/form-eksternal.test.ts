import { describe, expect, it } from "vitest";

import {
  buatTokenFormEksternal,
  MASA_TOKEN_FORM_EKSTERNAL_MS,
  verifikasiTokenFormEksternal,
} from "./form-eksternal";

const SECRET = "rahasia-uji-minimal-32-karakter-ok";

describe("token formulir eksternal", () => {
  it("menerima token yang dibuat untuk survei yang sama", () => {
    const token = buatTokenFormEksternal(SECRET, 12);
    expect(verifikasiTokenFormEksternal(SECRET, token, 12)).toBe("valid");
  });

  it("menolak token untuk survei lain", () => {
    const token = buatTokenFormEksternal(SECRET, 12);
    expect(verifikasiTokenFormEksternal(SECRET, token, 13)).toBe("tidak-valid");
  });

  it("menolak token yang dimodifikasi", () => {
    const token = buatTokenFormEksternal(SECRET, 12);
    expect(verifikasiTokenFormEksternal(SECRET, `${token}x`, 12)).toBe("tidak-valid");
    expect(verifikasiTokenFormEksternal(SECRET, token.replace(".", ".1"), 12)).toBe("tidak-valid");
  });

  it("mendeteksi token kedaluwarsa", () => {
    const sekarang = 1_700_000_000_000;
    const token = buatTokenFormEksternal(SECRET, 12, sekarang, 1);
    expect(verifikasiTokenFormEksternal(SECRET, token, 12, sekarang + 2)).toBe("kedaluwarsa");
  });

  it("memakai masa berlaku bawaan tujuh hari", () => {
    const sekarang = 1_700_000_000_000;
    const token = buatTokenFormEksternal(SECRET, 5, sekarang);
    expect(
      verifikasiTokenFormEksternal(SECRET, token, 5, sekarang + MASA_TOKEN_FORM_EKSTERNAL_MS - 1),
    ).toBe("valid");
  });
});
