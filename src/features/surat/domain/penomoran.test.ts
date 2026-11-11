import { describe, expect, it } from "vitest";

import {
  DEFAULT_PENOMORAN_SURAT,
  normalizePenomoranMode,
  PENOMORAN_SURAT_LABELS,
  PENOMORAN_SURAT_MODES,
} from "./penomoran";

describe("mode penomoran surat", () => {
  it("menerima mode 1 sampai 4", () => {
    for (const mode of PENOMORAN_SURAT_MODES) {
      expect(normalizePenomoranMode(mode)).toBe(mode);
      expect(normalizePenomoranMode(String(mode))).toBe(mode);
      expect(PENOMORAN_SURAT_LABELS[mode]).toBeTruthy();
    }
  });

  it("kembali ke mode per jenis untuk nilai kosong/tidak dikenal", () => {
    expect(normalizePenomoranMode(null)).toBe(DEFAULT_PENOMORAN_SURAT);
    expect(normalizePenomoranMode(undefined)).toBe(DEFAULT_PENOMORAN_SURAT);
    expect(normalizePenomoranMode("")).toBe(DEFAULT_PENOMORAN_SURAT);
    expect(normalizePenomoranMode(0)).toBe(DEFAULT_PENOMORAN_SURAT);
    expect(normalizePenomoranMode(9)).toBe(DEFAULT_PENOMORAN_SURAT);
  });
});
