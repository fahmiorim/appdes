import { beforeEach, describe, expect, it, vi } from "vitest";

import { simpanUnggahanMedia } from "./media-storage";

vi.mock("server-only", () => ({}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock("@/db", () => {
  const limit = vi.fn(async () => [{ kuotaMediaMb: null }]);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const pool = {
    getConnection: vi.fn(async () => ({
      query: vi.fn(async () => [[{ ok: 1 }]]),
      release: vi.fn(),
    })),
  };
  return { db: { select: vi.fn(() => ({ from })) }, pool };
});

const { writeFile } = await import("node:fs/promises");

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const pdf = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n");

describe("simpanUnggahanMedia", () => {
  beforeEach(() => vi.clearAllMocks());

  it("menolak berkas yang isinya tidak cocok dengan MIME kiriman", async () => {
    await expect(
      simpanUnggahanMedia(1, "umum", {
        nama: "gambar.png",
        mime: "image/png",
        ukuran: pdf.length,
        isi: pdf,
      }),
    ).rejects.toThrow("tidak sesuai");

    expect(writeFile).not.toHaveBeenCalled();
  });

  it("menolak isi yang bukan media meski MIME diizinkan", async () => {
    await expect(
      simpanUnggahanMedia(1, "umum", {
        nama: "logo.png",
        mime: "image/png",
        ukuran: 20,
        isi: new TextEncoder().encode("<?php echo 1; ?>"),
      }),
    ).rejects.toThrow("tidak dikenali");

    expect(writeFile).not.toHaveBeenCalled();
  });

  it("menyimpan berkas sah dengan ekstensi dari MIME tervalidasi", async () => {
    const hasil = await simpanUnggahanMedia(1, "umum", {
      nama: "logo.php",
      mime: "image/png",
      ukuran: png.length,
      isi: png,
    });

    expect(hasil.mime).toBe("image/png");
    expect(hasil.jalur).toMatch(/^1\/umum\/\d+-logo\.png$/);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });
});
