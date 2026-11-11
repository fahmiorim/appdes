import { describe, expect, it } from "vitest";

import {
  bacaTokenGuest,
  buatTokenGuest,
  KIOSK_GUEST_TTL_MS,
  kioskGuestSchema,
} from "./kiosk-guest";

const SECRET = "rahasia-uji-yang-cukup-panjang-untuk-hmac";

describe("token sesi guest kiosk", () => {
  it("membaca kembali sesi yang ditandatangani", () => {
    const token = buatTokenGuest({ residentId: 5, villageId: 2, nama: "Siti" }, SECRET, 1_000);

    expect(bacaTokenGuest(token, SECRET, 1_000)).toEqual({
      residentId: 5,
      villageId: 2,
      nama: "Siti",
      exp: 1_000 + KIOSK_GUEST_TTL_MS,
    });
  });

  it("menolak token yang sudah kedaluwarsa", () => {
    const token = buatTokenGuest({ residentId: 5, villageId: 2, nama: "Siti" }, SECRET, 1_000);

    expect(bacaTokenGuest(token, SECRET, 1_000 + KIOSK_GUEST_TTL_MS)).toBeNull();
  });

  it("menolak token bila isinya diubah", () => {
    const token = buatTokenGuest({ residentId: 5, villageId: 2, nama: "Siti" }, SECRET, 1_000);
    const [isi, tanda] = token.split(".");
    const isiPalsu = Buffer.from(
      JSON.stringify({ residentId: 9, villageId: 2, nama: "Orang lain", exp: 1_000 + 60_000 }),
    ).toString("base64url");

    expect(bacaTokenGuest(`${isiPalsu}.${tanda}`, SECRET, 1_000)).toBeNull();
    expect(bacaTokenGuest(`${isi}.${tanda}x`, SECRET, 1_000)).toBeNull();
  });

  it("menolak token dengan secret berbeda atau tanpa tanda tangan", () => {
    const token = buatTokenGuest({ residentId: 5, villageId: 2, nama: "Siti" }, SECRET, 1_000);

    expect(bacaTokenGuest(token, `${SECRET}-lain`, 1_000)).toBeNull();
    expect(bacaTokenGuest("tanpa-titik", SECRET, 1_000)).toBeNull();
    expect(bacaTokenGuest("", SECRET, 1_000)).toBeNull();
    expect(bacaTokenGuest(null, SECRET, 1_000)).toBeNull();
  });
});

describe("kioskGuestSchema", () => {
  it("menerima NIK 16 angka dan tanggal lahir ISO", () => {
    expect(kioskGuestSchema.parse({ nik: "3201234567890123", tanggalLahir: "1990-05-17" })).toEqual(
      { nik: "3201234567890123", tanggalLahir: "1990-05-17" },
    );
  });

  it("menolak NIK bukan 16 angka dan tanggal lahir kosong", () => {
    expect(kioskGuestSchema.safeParse({ nik: "123", tanggalLahir: "" }).success).toBe(false);
    expect(
      kioskGuestSchema.safeParse({ nik: "320123456789012a", tanggalLahir: "1990-05-17" }).success,
    ).toBe(false);
  });
});
