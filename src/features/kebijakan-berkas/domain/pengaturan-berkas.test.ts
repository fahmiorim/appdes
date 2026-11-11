/**
 * Unit tests untuk pengaturan-berkas domain.
 *
 * Menguji:
 * - Fallback ke default domain saat settings DB kosong
 * - Override dari DB
 * - Validasi MIME, ukuran, jumlah file
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";

import {
  getMediaSettings,
  validasiJumlahFile,
  validasiMediaDenganPengaturan,
  type MediaSettingsEfektif,
} from "../domain/pengaturan-berkas";

const MB = 1024 * 1024;

// Mock drizzle dengan chain builder yang sederhana
function createMockDb(returnValue: unknown = []) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(returnValue),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onDuplicateKeyUpdate: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return {
    db: {
      select: vi.fn().mockReturnValue(chain),
      insert: vi.fn().mockReturnValue(chain),
      delete: vi.fn().mockReturnValue(chain),
    },
  };
}

// Mock module sebelum import
vi.mock("@/db", async () => {
  const mod = await vi.importActual("@/db");
  const { db } = createMockDb([]);
  return { ...mod, db, mediaSettings: {} };
});

describe("pengaturan-berkas domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMediaSettings - fallback ke default", () => {
    it("harus mengembalikan default untuk kategori 'surat' saat DB kosong", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.select as any).mockImplementation(mockSelect);

      const result = await getMediaSettings(1, "surat");
      expect(result.kategori).toBe("surat");
      expect(result.maxSizeBytes).toBe(10 * MB);
    });

    it("harus mengembalikan default untuk kategori 'dokumen'", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.select as any).mockImplementation(mockSelect);

      const result = await getMediaSettings(1, "dokumen");
      expect(result.kategori).toBe("dokumen");
      expect(result.maxSizeBytes).toBe(20 * MB);
    });
  });

  describe("getMediaSettings - override dari DB", () => {
    it("harus mengembalikan pengaturan dari DB jika ada", async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              villageId: 1,
              kategori: "surat",
              maxFiles: 5,
              maxSizeBytes: 20 * MB,
              mimeAllowlist: JSON.stringify(["application/pdf"]),
            },
          ]),
        }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.select as any).mockImplementation(mockSelect);

      const result = await getMediaSettings(1, "surat");
      expect(result.maxFiles).toBe(5);
      expect(result.maxSizeBytes).toBe(20 * MB);
      expect(result.overridden).toBe(true);
    });
  });

  describe("validasiMediaDenganPengaturan", () => {
    it("menerima file yang valid", () => {
      const settings: MediaSettingsEfektif = {
        kategori: "surat",
        maxFiles: 5,
        maxSizeBytes: 10 * MB,
        mimeAllowlist: ["application/pdf"],
        overridden: false,
      };
      const result = validasiMediaDenganPengaturan(settings, "application/pdf", MB * 5);
      expect(result).toBeUndefined();
    });

    it("menolak file dengan ukuran melebihi batas", () => {
      const settings: MediaSettingsEfektif = {
        kategori: "surat",
        maxFiles: 5,
        maxSizeBytes: 10 * MB,
        mimeAllowlist: ["application/pdf"],
        overridden: false,
      };
      const result = validasiMediaDenganPengaturan(settings, "application/pdf", MB * 15);
      expect(result).toBeDefined();
    });

    it("menolak MIME yang tidak didukung", () => {
      const settings: MediaSettingsEfektif = {
        kategori: "surat",
        maxFiles: 5,
        maxSizeBytes: 10 * MB,
        mimeAllowlist: ["application/pdf"],
        overridden: false,
      };
      const result = validasiMediaDenganPengaturan(settings, "image/jpeg", MB * 5);
      expect(result).toBeDefined();
    });
  });

  describe("validasiJumlahFile", () => {
    it("menerima jumlah file dalam batas", () => {
      const settings: MediaSettingsEfektif = {
        kategori: "surat",
        maxFiles: 5,
        maxSizeBytes: 10 * MB,
        mimeAllowlist: ["application/pdf"],
        overridden: false,
      };
      const result = validasiJumlahFile(settings, 3);
      expect(result).toBeUndefined();
    });

    it("menolak jumlah file melebihi batas", () => {
      const settings: MediaSettingsEfektif = {
        kategori: "surat",
        maxFiles: 5,
        maxSizeBytes: 10 * MB,
        mimeAllowlist: ["application/pdf"],
        overridden: false,
      };
      const result = validasiJumlahFile(settings, 6);
      expect(result).toBeDefined();
    });
  });

  // Catatan: upsertMediaSettings tidak diuji secara langsung karena kompleksitas mock drizzle.
  // Test validasi dan fallback sudah mencakup logika domain utama.
});
