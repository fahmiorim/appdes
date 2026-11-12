import { describe, expect, it } from "vitest";

import {
  parseAllowlistProvider,
  periksaUrlProviderStatis,
  urlDiizinkan,
  validasiUrlBerkas,
  validasiUrlProvider,
  type AlamatDns,
} from "./tte-jaringan";

const PUBLIK: AlamatDns[] = [{ alamat: "93.184.216.34", family: 4 }];

const ALLOW = ["tte.example.go.id:443", "93.184.216.34:443", "[2606:4700:4700::1111]:443"];

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
    const hasil = await validasiUrlProvider(
      "https://93.184.216.34/bsre",
      async () => {
        throw new Error("resolver tidak boleh dipanggil");
      },
      { allowedHosts: ALLOW },
    );
    expect(hasil.alamat).toEqual([{ alamat: "93.184.216.34", family: 4 }]);
  });

  it("mencatat family IPv6 pada IP literal", async () => {
    const hasil = await validasiUrlProvider("https://[2606:4700:4700::1111]/bsre", async () => [], {
      allowedHosts: ALLOW,
    });
    expect(hasil.alamat).toEqual([{ alamat: "2606:4700:4700::1111", family: 6 }]);
  });

  it("menerima seluruh record DNS bila semuanya publik", async () => {
    const hasil = await validasiUrlProvider(
      "https://tte.example.go.id/bsre",
      resolverTetap([
        { alamat: "93.184.216.34", family: 4 },
        { alamat: "2606:4700:4700::1111", family: 6 },
      ]),
      { allowedHosts: ALLOW },
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
        { allowedHosts: ALLOW },
      ),
    ).rejects.toThrow("alamat internal");
  });

  it("menolak record DNS yang bukan alamat IP", async () => {
    await expect(
      validasiUrlProvider(
        "https://tte.example.go.id",
        resolverTetap([{ alamat: "internal", family: 4 }]),
        { allowedHosts: ALLOW },
      ),
    ).rejects.toThrow("alamat internal");
  });

  it("menolak host tanpa record dan resolusi yang gagal", async () => {
    await expect(
      validasiUrlProvider("https://tte.example.go.id", resolverTetap([]), {
        allowedHosts: ALLOW,
      }),
    ).rejects.toThrow("tidak dapat diresolusi");
    await expect(
      validasiUrlProvider(
        "https://tte.example.go.id",
        async () => {
          throw new Error("NXDOMAIN");
        },
        { allowedHosts: ALLOW },
      ),
    ).rejects.toThrow("tidak dapat diresolusi");
  });

  it("tidak melakukan resolusi DNS kedua saat URL berkas divalidasi (anti-rebinding)", async () => {
    const hitung = { n: 0 };
    const provider = await validasiUrlProvider(
      "https://tte.example.go.id/bsre",
      resolverTetap(PUBLIK, hitung),
      { allowedHosts: ALLOW },
    );

    const pertama = validasiUrlBerkas("unduh/1.pdf", provider);
    const kedua = validasiUrlBerkas("https://tte.example.go.id/berkas/2.pdf", provider);

    expect(hitung.n).toBe(1);
    expect(pertama.alamat).toBe(provider.alamat);
    expect(kedua.alamat).toBe(provider.alamat);
    expect(pertama.alamat[0]?.alamat).toBe("93.184.216.34");
  });
});

describe("parseAllowlistProvider", () => {
  it("kosong atau tidak diatur → allowlist kosong dengan masalah", () => {
    for (const nilai of [undefined, null, "", "   "]) {
      const hasil = parseAllowlistProvider(nilai);
      expect(hasil.entri).toEqual([]);
      expect(hasil.masalah.join(" ")).toContain("TTE_ALLOWED_HOSTS belum diatur");
    }
  });

  it("menormalkan huruf besar, trailing dot, port default, dan duplikat", () => {
    const hasil = parseAllowlistProvider(
      "TTE.Example.Go.ID., tte.example.go.id:443\nhttps://API.example.go.id:8443",
    );

    expect(hasil.masalah).toEqual([]);
    expect(hasil.entri).toEqual(["api.example.go.id:8443", "tte.example.go.id:443"]);
  });

  it("mendukung IPv6 dan IPv4 literal", () => {
    const hasil = parseAllowlistProvider("https://[2606:4700:4700::1111], 93.184.216.34:8443");

    expect(hasil.masalah).toEqual([]);
    expect(hasil.entri).toEqual(["93.184.216.34:8443", "[2606:4700:4700::1111]:443"]);
  });

  it.each([
    "tte.example.go.id/bsre",
    "https://tte.example.go.id/bsre",
    "https://tte.example.go.id/?x=1",
    "https://user:rahasia@tte.example.go.id",
    "http://tte.example.go.id",
    "https://*.example.go.id",
    "https://tte.example.go.id:0",
    "https://tte..example.go.id",
  ])("menolak seluruh allowlist bila ada entri tidak sah: %s", (nilai) => {
    const hasil = parseAllowlistProvider(`tte.example.go.id, ${nilai}`);

    expect(hasil.entri).toEqual([]);
    expect(hasil.masalah.length).toBeGreaterThan(0);
  });

  it("pesan masalah tidak memuat nilai mentah yang mungkin berisi kredensial", () => {
    const hasil = parseAllowlistProvider("https://user:rahasia@tte.example.go.id");

    expect(hasil.masalah.join(" ")).not.toContain("rahasia");
  });
});

describe("allowlist provider pada validasiUrlProvider", () => {
  const ALLOW_TTE = ["tte.example.go.id:443"];
  const resolverDilarang = async (): Promise<AlamatDns[]> => {
    throw new Error("resolver tidak boleh dipanggil");
  };

  it("menerima host dan port yang tepat terdaftar", async () => {
    const hasil = await validasiUrlProvider(
      "https://tte.example.go.id/bsre",
      resolverTetap(PUBLIK),
      {
        allowedHosts: ALLOW_TTE,
      },
    );

    expect(hasil.url.hostname).toBe("tte.example.go.id");
    expect(hasil.alamat).toEqual(PUBLIK);
  });

  it("menolak host HTTPS publik yang tidak terdaftar", async () => {
    await expect(
      validasiUrlProvider("https://evil.example.com/bsre", resolverTetap(PUBLIK), {
        allowedHosts: ALLOW_TTE,
      }),
    ).rejects.toThrow("allowlist platform");
  });

  it.each([
    "https://tte.example.go.id.evil.com",
    "https://evil-tte.example.go.id",
    "https://sub.tte.example.go.id",
    "https://tteexample.go.id",
  ])("menolak host dengan suffix/host mirip allowlist: %s", async (url) => {
    await expect(
      validasiUrlProvider(url, resolverTetap(PUBLIK), { allowedHosts: ALLOW_TTE }),
    ).rejects.toThrow("allowlist platform");
  });

  it("menormalkan trailing dot pada host URL dan entri allowlist", async () => {
    const allowlist = parseAllowlistProvider("TTE.Example.Go.ID.");
    const hasil = await validasiUrlProvider(
      "https://tte.example.go.id./bsre",
      resolverTetap(PUBLIK),
      {
        allowedHosts: allowlist.entri,
      },
    );

    expect(allowlist.entri).toEqual(["tte.example.go.id:443"]);
    expect(hasil.url.hostname).toBe("tte.example.go.id.");
  });

  it("menolak port yang tidak diizinkan allowlist", async () => {
    await expect(
      validasiUrlProvider("https://tte.example.go.id:8443/bsre", resolverTetap(PUBLIK), {
        allowedHosts: ALLOW_TTE,
      }),
    ).rejects.toThrow("allowlist platform");
  });

  it("menerima port nonstandar hanya bila tercantum eksplisit", async () => {
    const hasil = await validasiUrlProvider(
      "https://tte.example.go.id:8443/bsre",
      resolverTetap(PUBLIK),
      { allowedHosts: ["tte.example.go.id:8443"] },
    );

    expect(hasil.url.port).toBe("8443");
  });

  it("menolak semua provider saat allowlist kosong (fail-closed)", async () => {
    await expect(
      validasiUrlProvider("https://tte.example.go.id/bsre", resolverDilarang, {
        allowedHosts: [],
      }),
    ).rejects.toThrow("allowlist platform");
  });

  it("menolak semua provider saat allowlist tidak sah", async () => {
    const allowlist = parseAllowlistProvider(
      "https://tte.example.go.id, https://evil.example.com/x",
    );

    await expect(
      validasiUrlProvider("https://tte.example.go.id/bsre", resolverDilarang, {
        allowedHosts: allowlist.entri,
      }),
    ).rejects.toThrow("allowlist platform");
  });

  it("host dari konfigurasi tenant tidak dapat menambah allowlist", async () => {
    expect(urlDiizinkan(new URL("https://desa-lain.example.com"), ALLOW_TTE)).toBe(false);
    await expect(
      validasiUrlProvider("https://desa-lain.example.com/bsre", resolverTetap(PUBLIK), {
        allowedHosts: parseAllowlistProvider("tte.example.go.id").entri,
      }),
    ).rejects.toThrow("allowlist platform");
  });

  it("menolak host sebelum resolver DNS dipanggil", async () => {
    const hitung = { n: 0 };
    const resolver = resolverTetap(PUBLIK, hitung);

    await expect(
      validasiUrlProvider("https://evil.example.com/bsre", resolver, {
        allowedHosts: ALLOW_TTE,
      }),
    ).rejects.toThrow("allowlist platform");
    expect(hitung.n).toBe(0);
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
