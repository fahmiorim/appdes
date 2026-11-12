import { beforeEach, describe, expect, it, vi } from "vitest";

import { buatPenjagaKonkurensi, buatResolverDns } from "./tte-https";

const HOST = "tte.example.go.id";

/**
 * `dns.Resolver` palsu yang dapat dikendalikan penuh: tidak ada query jaringan
 * dan tidak ada timing acak. Mode `menggantung` meniru query yang belum selesai
 * sampai `cancel()` dipanggil.
 */
const dnsPalsu = vi.hoisted(() => {
  const state = {
    mode: "normal" as "normal" | "menggantung",
    dibuat: 0,
    dibatalkan: 0,
    resolve4: 0,
    resolve6: 0,
    ecancelled: 0,
    pending: [] as Array<(error: Error) => void>,
  };

  class ResolverPalsu {
    constructor(_opsi?: { timeout?: number; tries?: number }) {
      state.dibuat += 1;
    }

    resolve4(): Promise<string[]> {
      state.resolve4 += 1;
      if (state.mode === "normal") return Promise.resolve(["93.184.216.34"]);
      return new Promise<string[]>((_, reject) => state.pending.push(reject));
    }

    resolve6(): Promise<string[]> {
      state.resolve6 += 1;
      if (state.mode === "normal") return Promise.resolve(["2606:4700:4700::1111"]);
      return new Promise<string[]>(() => {});
    }

    cancel(): void {
      state.dibatalkan += 1;
      const pending = state.pending.splice(0);
      for (const reject of pending) {
        state.ecancelled += 1;
        reject(Object.assign(new Error("query cancelled"), { code: "ECANCELLED" }));
      }
    }
  }

  return { state, ResolverPalsu };
});

vi.mock("node:dns/promises", () => ({ Resolver: dnsPalsu.ResolverPalsu }));

beforeEach(() => {
  dnsPalsu.state.mode = "normal";
  dnsPalsu.state.dibuat = 0;
  dnsPalsu.state.dibatalkan = 0;
  dnsPalsu.state.resolve4 = 0;
  dnsPalsu.state.resolve6 = 0;
  dnsPalsu.state.ecancelled = 0;
  dnsPalsu.state.pending = [];
});

describe("buatPenjagaKonkurensi", () => {
  it("menolak permintaan baru saat batas tercapai (fail fast)", async () => {
    const jalankan = buatPenjagaKonkurensi(1);
    let lepas: (() => void) | undefined;
    const pertama = jalankan(
      () =>
        new Promise<void>((selesai) => {
          lepas = selesai;
        }),
    );

    await expect(jalankan(async () => "kedua")).rejects.toThrow("Terlalu banyak");

    lepas?.();
    await expect(pertama).resolves.toBeUndefined();
  });

  it("melepas slot setelah kerja selesai, baik sukses maupun gagal", async () => {
    const jalankan = buatPenjagaKonkurensi(1);

    await expect(
      jalankan(async () => {
        throw new Error("gagal");
      }),
    ).rejects.toThrow("gagal");
    await expect(jalankan(async () => "ok")).resolves.toBe("ok");
  });

  it("menolak batas konkurensi yang tidak masuk akal", () => {
    expect(() => buatPenjagaKonkurensi(0)).toThrow("tidak valid");
    expect(() => buatPenjagaKonkurensi(1.5)).toThrow("tidak valid");
  });
});

describe("buatResolverDns", () => {
  it("langsung berhenti tanpa query DNS bila sinyal sudah aktif", async () => {
    const kontrol = new AbortController();
    kontrol.abort();

    await expect(buatResolverDns()(HOST, kontrol.signal)).rejects.toThrow("batas waktu");

    expect(dnsPalsu.state.resolve4).toBe(0);
    expect(dnsPalsu.state.resolve6).toBe(0);
    expect(dnsPalsu.state.dibatalkan).toBeGreaterThan(0);
  });

  it("membatalkan tanpa memulai query saat abort terjadi tepat ketika listener dipasang", async () => {
    const kontrol = new AbortController();
    const tambahAsli = kontrol.signal.addEventListener.bind(kontrol.signal);
    vi.spyOn(kontrol.signal, "addEventListener").mockImplementation((tipe, pendengar, opsi) => {
      tambahAsli(tipe, pendengar, opsi);
      // Abort tepat setelah listener terpasang, sebelum query dimulai.
      kontrol.abort();
    });

    await expect(buatResolverDns()(HOST, kontrol.signal)).rejects.toThrow("batas waktu");

    expect(dnsPalsu.state.resolve4).toBe(0);
    expect(dnsPalsu.state.resolve6).toBe(0);
    expect(dnsPalsu.state.dibatalkan).toBeGreaterThan(0);
  });

  it("membatalkan query yang sedang berjalan saat abort", async () => {
    dnsPalsu.state.mode = "menggantung";
    const kontrol = new AbortController();

    const janji = buatResolverDns()(HOST, kontrol.signal);
    await Promise.resolve();
    expect(dnsPalsu.state.resolve4).toBe(1);

    kontrol.abort();

    await expect(janji).rejects.toThrow("batas waktu");
    expect(dnsPalsu.state.dibatalkan).toBeGreaterThan(0);
    // c-ares rejects in-flight resolve4/resolve6 with ECANCELLED when cancel() runs.
    expect(dnsPalsu.state.ecancelled).toBe(2);
  });

  it("menyelesaikan resolusi normal dan memetakan family A/AAAA", async () => {
    const hasil = await buatResolverDns()(HOST);

    expect(hasil).toEqual([
      { alamat: "93.184.216.34", family: 4 },
      { alamat: "2606:4700:4700::1111", family: 6 },
    ]);
  });

  it("membersihkan listener abort pada jalur sukses dan timeout", async () => {
    const kontrol = new AbortController();
    const tambah = vi.spyOn(kontrol.signal, "addEventListener");
    const hapus = vi.spyOn(kontrol.signal, "removeEventListener");

    await buatResolverDns()(HOST, kontrol.signal);

    expect(tambah).toHaveBeenCalledTimes(1);
    expect(hapus).toHaveBeenCalledTimes(1);

    dnsPalsu.state.mode = "menggantung";
    const kontrolTimeout = new AbortController();
    const tambahTimeout = vi.spyOn(kontrolTimeout.signal, "addEventListener");
    const hapusTimeout = vi.spyOn(kontrolTimeout.signal, "removeEventListener");

    const janji = buatResolverDns()(HOST, kontrolTimeout.signal);
    kontrolTimeout.abort();
    await expect(janji).rejects.toThrow("batas waktu");

    expect(tambahTimeout).toHaveBeenCalledTimes(1);
    expect(hapusTimeout).toHaveBeenCalledTimes(1);
  });

  it("melepas slot konkurensi setelah abort sehingga resolusi berikutnya berjalan", async () => {
    dnsPalsu.state.mode = "menggantung";
    const kontrol = new AbortController();
    const jalankan = buatResolverDns({ maksBersamaan: 1 });

    const pertama = jalankan(HOST, kontrol.signal);
    await expect(jalankan(HOST)).rejects.toThrow("Terlalu banyak");

    kontrol.abort();
    await expect(pertama).rejects.toThrow("batas waktu");

    dnsPalsu.state.mode = "normal";
    await expect(jalankan(HOST)).resolves.toHaveLength(2);
  });

  it("tidak menghasilkan unhandled rejection saat abort sebelum race dipasang", async () => {
    const ditolak: unknown[] = [];
    const catat = (alasan: unknown) => ditolak.push(alasan);
    process.on("unhandledRejection", catat);

    try {
      const kontrol = new AbortController();
      const tambahAsli = kontrol.signal.addEventListener.bind(kontrol.signal);
      vi.spyOn(kontrol.signal, "addEventListener").mockImplementation((tipe, pendengar, opsi) => {
        tambahAsli(tipe, pendengar, opsi);
        kontrol.abort();
      });

      await expect(buatResolverDns()(HOST, kontrol.signal)).rejects.toThrow("batas waktu");

      await new Promise((selesai) => setImmediate(selesai));
      expect(ditolak).toHaveLength(0);
    } finally {
      process.off("unhandledRejection", catat);
    }
  });
});
