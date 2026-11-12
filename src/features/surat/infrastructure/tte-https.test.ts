import { describe, expect, it } from "vitest";

import { buatPenjagaKonkurensi, buatResolverDns } from "./tte-https";

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
    const resolver = buatResolverDns();

    await expect(resolver("tte.example.go.id", AbortSignal.abort())).rejects.toThrow("batas waktu");
  });
});
