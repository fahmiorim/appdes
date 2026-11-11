import { describe, expect, it } from "vitest";

import { bacaParameterRekapKehadiran } from "./rekap";

describe("bacaParameterRekapKehadiran", () => {
  it("memakai tahun berjalan bila tahun tidak diberikan", () => {
    expect(bacaParameterRekapKehadiran(null, null, 2026)).toEqual({
      ok: true,
      parameter: { tahun: 2026 },
    });
  });

  it("menerima tahun dan bulan yang valid", () => {
    expect(bacaParameterRekapKehadiran("2025", "07", 2026)).toEqual({
      ok: true,
      parameter: { tahun: 2025, bulan: 7 },
    });
  });

  it("menolak tahun yang bukan bilangan 4 digit", () => {
    for (const mentah of ["abc", "", "24", "20245", "2024.5", "-2024", "+2024"]) {
      expect(bacaParameterRekapKehadiran(mentah, null, 2026)).toEqual({
        ok: false,
        pesan: "Parameter tahun tidak valid (1900–2100).",
      });
    }
  });

  it("menolak tahun di luar rentang yang didukung", () => {
    for (const mentah of ["1899", "2101", "0000"]) {
      expect(bacaParameterRekapKehadiran(mentah, null, 2026)).toEqual({
        ok: false,
        pesan: "Parameter tahun tidak valid (1900–2100).",
      });
    }
  });

  it("menolak bulan di luar 1–12 dan nilai non-numerik", () => {
    for (const mentah of ["0", "13", "abc", "", "1.5", "Januari"]) {
      expect(bacaParameterRekapKehadiran("2025", mentah, 2026)).toEqual({
        ok: false,
        pesan: "Parameter bulan tidak valid (1–12).",
      });
    }
  });

  it("menerima bulan tanpa tahun memakai tahun berjalan", () => {
    expect(bacaParameterRekapKehadiran(null, "12", 2026)).toEqual({
      ok: true,
      parameter: { tahun: 2026, bulan: 12 },
    });
  });
});
