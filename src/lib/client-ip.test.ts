import { describe, expect, it } from "vitest";

import { alamatIpDariHeader } from "@/lib/client-ip";

function header(nilai: Record<string, string>) {
  return new Headers(nilai);
}

describe("alamatIpDariHeader", () => {
  it("mengabaikan header proxy saat proxy tidak dipercaya", () => {
    const hasil = alamatIpDariHeader(
      header({ "x-forwarded-for": "203.0.113.9", "x-real-ip": "203.0.113.9" }),
      false,
    );

    expect(hasil).toBe("tidak-diketahui");
  });

  it("memakai header platform tepercaya dan memvalidasi bentuk IP", () => {
    expect(alamatIpDariHeader(header({ "cf-connecting-ip": "2001:db8::1" }), true)).toBe(
      "2001:db8::1",
    );
    expect(alamatIpDariHeader(header({ "x-real-ip": "bukan-ip" }), true)).toBe("tidak-diketahui");
  });

  it("mengambil IP pertama dari X-Forwarded-For sebagai fallback", () => {
    expect(alamatIpDariHeader(header({ "x-forwarded-for": "198.51.100.7, 10.0.0.1" }), true)).toBe(
      "198.51.100.7",
    );
  });
});
