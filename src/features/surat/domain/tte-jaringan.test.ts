import { describe, expect, it } from "vitest";

import {
  periksaUrlProviderStatis,
  validasiUrlBerkas,
  validasiUrlProvider,
  type AlamatDns,
} from "./tte-jaringan";

const PUBLIK: AlamatDns[] = [{ alamat: "93.184.216.34", family: 4 }];

function resolverTetap(alamat: AlamatDns[], hitung?: { n: number }) {
  return async () => {
    if (hitung) hitung.n += 1;
    return alamat;
  };
}

describe("periksaUrlProviderStatis", () => {
  it("menerima HTTPS publik dengan path prefix", () => {
    const hasil = periksaUrlProviderStatis("https://tte.example.go.id/bsre");
    expect(hasil.masalah).toEqual([]);
    expect(hasil.url?.href).toBe("https://tte.example.go.id/bsre");
  });

  it.each([
    ["http://tte.example.go.id", "wajib menggunakan HTTPS"],
    ["ftp://tte.example.go.id", "wajib menggunakan HTTPS"],
    ["https://user:rahasia@tte.example.go.id", "kredensial"],
    ["https://tte.example.go.id/bsre?token=abc", "query atau fragment"],
    ["https://tte.example.go.id/bsre#x", "query atau fragment"],
  ])("menolak %s", (url, pesan) => {
    const hasil = periksaUrlProviderStatis(url);
    expect(hasil.url).toBeNull();
    expect(hasil.masalah.join(" ")).toContain(pesan);
  });

  it.each([
    "https://127.0.0.1",
    "https://10.20.30.40/bsre",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/bsre",
    "https://[fd00::1]/bsre",
    "https://[::ffff:192.168.1.10]/bsre",
  ])("menolak IP literal internal %s tanpa DNS", (url) => {
    const hasil = periksaUrlProviderStatis(url);
    expect(hasil.url).toBeNull();
    expect(hasil.masalah.join(" ")).toContain("alamat IP internal");
  });

  it.each([
    "https://localhost/bsre",
    "https://metadata.google.internal/computeMetadata/v1",
    "https://bsre.local/",
  ])("menolak hostname internal %s", (url) => {
    const hasil = periksaUrlProviderStatis(url);
    expect(hasil.url).toBeNull();
    expect(hasil.masalah.join(" ")).toContain("host internal");
  });

  it("menolak URL kosong dan URL rusak", () => {
    expect(periksaUrlProviderStatis("").masalah[0]).toContain("belum diisi");
    expect(periksaUrlProviderStatis("bukan url").masalah[0]).toContain("tidak valid");
  });
});

describe("validasiUrlProvider", () => {
  it("memakai IP literal publik tanpa resolusi DNS", async () => {
    const hasil = await validasiUrlProvider("https://93.184.216.34/bsre", async () => {
      throw new Error("resolver tidak boleh dipanggil");
    });
    expect(hasil.alamat).toEqual([{ alamat: "93.184.216.34", family: 4 }]);
  });

  it("mencatat family IPv6 pada IP literal", async () => {
    const hasil = await validasiUrlProvider("https://[2606:4700:4700::1111]/bsre", async () => []);
    expect(hasil.alamat).toEqual([{ alamat: "2606:4700:4700::1111", family: 6 }]);
  });

  it("menerima seluruh record DNS bila semuanya publik", async () => {
    const hasil = await validasiUrlProvider(
      "https://tte.example.go.id/bsre",
      resolverTetap([
        { alamat: "93.184.216.34", family: 4 },
        { alamat: "2606:4700:4700::1111", family: 6 },
      ]),
    );
    expect(hasil.alamat).toHaveLength(2);
    expect(hasil.url.pathname).toBe("/bsre");
  });

  it("menolak bila salah satu record DNS menunjuk alamat internal", async () => {
    await expect(
      validasiUrlProvider(
        "https://tte.example.go.id/bsre",
        resolverTetap([
          { alamat: "93.184.216.34", family: 4 },
          { alamat: "10.0.0.5", family: 4 },
        ]),
      ),
    ).rejects.toThrow("alamat internal");
  });

  it("menolak record DNS yang bukan alamat IP", async () => {
    await expect(
      validasiUrlProvider(
        "https://tte.example.go.id",
        resolverTetap([{ alamat: "internal", family: 4 }]),
      ),
    ).rejects.toThrow("alamat internal");
  });

  it("menolak host tanpa record dan resolusi yang gagal", async () => {
    await expect(
      validasiUrlProvider("https://tte.example.go.id", resolverTetap([])),
    ).rejects.toThrow("tidak dapat diresolusi");
    await expect(
      validasiUrlProvider("https://tte.example.go.id", async () => {
        throw new Error("NXDOMAIN");
      }),
    ).rejects.toThrow("tidak dapat diresolusi");
  });

  it("tidak melakukan resolusi DNS kedua saat URL berkas divalidasi (anti-rebinding)", async () => {
    const hitung = { n: 0 };
    const provider = await validasiUrlProvider(
      "https://tte.example.go.id/bsre",
      resolverTetap(PUBLIK, hitung),
    );

    const pertama = validasiUrlBerkas("unduh/1.pdf", provider);
    const kedua = validasiUrlBerkas("https://tte.example.go.id/berkas/2.pdf", provider);

    expect(hitung.n).toBe(1);
    expect(pertama.alamat).toBe(provider.alamat);
    expect(kedua.alamat).toBe(provider.alamat);
    expect(pertama.alamat[0]?.alamat).toBe("93.184.216.34");
  });
});

describe("validasiUrlBerkas", () => {
  const provider = {
    url: new URL("https://tte.example.go.id/bsre"),
    alamat: PUBLIK,
  };

  it("mempertahankan path prefix provider pada URL relatif", () => {
    const hasil = validasiUrlBerkas("unduh/hasil.pdf", provider);
    expect(hasil.url.href).toBe("https://tte.example.go.id/bsre/unduh/hasil.pdf");
  });

  it("menerima URL absolut dari origin yang sama", () => {
    const hasil = validasiUrlBerkas("https://tte.example.go.id/arsip/9.pdf", provider);
    expect(hasil.url.pathname).toBe("/arsip/9.pdf");
    expect(hasil.alamat).toBe(PUBLIK);
  });

  it.each([
    ["https://evil.example.com/hasil.pdf", "origin provider yang sama"],
    ["//evil.example.com/hasil.pdf", "origin provider yang sama"],
    ["http://tte.example.go.id/hasil.pdf", "wajib menggunakan HTTPS"],
    ["https://user:pass@tte.example.go.id/hasil.pdf", "kredensial"],
  ])("menolak %s", (url, pesan) => {
    expect(() => validasiUrlBerkas(url, provider)).toThrow(pesan);
  });

  it("menolak URL yang tidak dapat diurai", () => {
    expect(() => validasiUrlBerkas("http://[::1", provider)).toThrow();
  });
});
