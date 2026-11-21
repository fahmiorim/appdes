import { describe, expect, it } from "vitest";

import { klasifikasiDns } from "./status-dns";

describe("klasifikasiDns", () => {
  it("menandai hasil resolusi publik sebagai normal", () => {
    expect(klasifikasiDns({ addresses: ["203.0.113.10"], semuaPublik: true })).toBe("normal");
  });

  it("menolak alamat internal walau resolusi berhasil", () => {
    expect(klasifikasiDns({ addresses: ["10.0.0.2"], semuaPublik: false })).toBe("bermasalah");
  });

  it("menandai resolusi kosong atau error sebagai bermasalah", () => {
    expect(klasifikasiDns({ addresses: [], semuaPublik: true })).toBe("bermasalah");
    expect(
      klasifikasiDns({ addresses: ["203.0.113.10"], semuaPublik: true, error: "NXDOMAIN" }),
    ).toBe("bermasalah");
  });
});
