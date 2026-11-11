import { describe, expect, it } from "vitest";

import {
  canTransitionPermohonan,
  labelPermohonanStatus,
  parseBerkasSyarat,
  serializeBerkasSyarat,
  statusPermohonan,
} from "./layanan-mandiri";

describe("transisi status permohonan", () => {
  it("mengizinkan alur normal dan pengembalian/pembatalan", () => {
    expect(canTransitionPermohonan("0", "1")).toBe(true);
    expect(canTransitionPermohonan("1", "2")).toBe(true);
    expect(canTransitionPermohonan("2", "3")).toBe(true);
    expect(canTransitionPermohonan("3", "4")).toBe(true);
    expect(canTransitionPermohonan("1", "0")).toBe(true);
    expect(canTransitionPermohonan("2", "5")).toBe(true);
  });

  it("menolak lompatan tahap dan membuka permohonan final", () => {
    expect(canTransitionPermohonan("1", "4")).toBe(false);
    expect(canTransitionPermohonan("0", "3")).toBe(false);
    expect(canTransitionPermohonan("4", "1")).toBe(false);
    expect(canTransitionPermohonan("5", "3")).toBe(false);
  });
});

describe("statusPermohonan", () => {
  it("memetakan angka valid dan menolak angka lain", () => {
    expect(statusPermohonan(0)).toBe("0");
    expect(statusPermohonan(5)).toBe("5");
    expect(statusPermohonan(6)).toBeNull();
    expect(labelPermohonanStatus(3)).toBe("Siap Diambil");
    expect(labelPermohonanStatus(99)).toBe("Tidak diketahui");
  });
});

describe("berkas syarat permohonan", () => {
  it("membaca JSON berkas yang valid dan mengabaikan data rusak", () => {
    const items = [
      {
        id: 3,
        nama: "Fotokopi KTP",
        berkas: "1/permohonan/ktp.pdf",
        mime: "application/pdf",
        namaAsli: "ktp.pdf",
      },
    ];

    expect(parseBerkasSyarat(serializeBerkasSyarat(items))).toEqual(items);
    expect(
      parseBerkasSyarat(
        JSON.stringify([
          { id: 0, nama: "X" },
          { id: 4, nama: "Kartu Keluarga", berkas: "1/permohonan/kk.jpg", mime: "image/jpeg" },
          "bukan objek",
        ]),
      ),
    ).toEqual([
      {
        id: 4,
        nama: "Kartu Keluarga",
        berkas: "1/permohonan/kk.jpg",
        mime: "image/jpeg",
        namaAsli: "berkas",
      },
    ]);
    expect(parseBerkasSyarat("{rusak")).toEqual([]);
    expect(parseBerkasSyarat("{}")).toEqual([]);
  });
});
