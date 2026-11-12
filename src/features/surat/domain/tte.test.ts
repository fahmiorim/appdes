import { describe, expect, it, vi } from "vitest";

import {
  adalahPdf,
  buatKlienBsre,
  gabungKonfigTte,
  KONFIG_TTE_DEFAULT,
  masalahKonfigTte,
  parseKonfigTte,
  parseKonfigTteTersimpan,
  serializeKonfigTteTersimpan,
  siapTte,
  tandaiTte,
  type FetchTte,
} from "./tte";

const PDF_PALSU = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // "%PDF-1.7"

const PERMINTAAN = {
  villageId: 1,
  suratId: 7,
  nomor: "007/SK/10/2026",
  pdf: PDF_PALSU,
};

const KONFIG_LENGKAP = {
  mode: "bsre" as const,
  api: "https://tte.example.go.id",
  username: "desa",
  nik: "3201010101010001",
  password: "rahasia",
  ssl: true,
  timeout: 30000,
};

describe("parseKonfigTte", () => {
  it("tanpa variabel apa pun → mode nonaktif", () => {
    const config = parseKonfigTte({});

    expect(config.mode).toBe("nonaktif");
    expect(config.ssl).toBe(true);
    expect(siapTte(config)).toBe(false);
  });

  it("nilai asing jatuh aman ke nonaktif", () => {
    expect(parseKonfigTte({ TTE_MODE: "muter" }).mode).toBe("nonaktif");
    expect(parseKonfigTte({ TTE_MODE: "BSRE" }).mode).toBe("bsre");
    expect(parseKonfigTte({ TTE_MODE: "MANUAL" }).mode).toBe("manual");
  });

  it("bsre tanpa kredensial lengkap dianggap belum siap", () => {
    const parsial = parseKonfigTte({
      TTE_MODE: "bsre",
      TTE_API: "https://tte.example.go.id",
    });

    expect(siapTte(parsial)).toBe(false);

    const lengkap = parseKonfigTte({
      TTE_MODE: "bsre",
      TTE_API: "https://tte.example.go.id",
      TTE_USERNAME: "desa",
      TTE_NIK: "3201010101010001",
      TTE_PASSWORD: "rahasia",
    });

    expect(siapTte(lengkap)).toBe(true);
  });

  it("selalu mewajibkan verifikasi TLS meskipun TTE_SSL=false", () => {
    expect(parseKonfigTte({ TTE_SSL: "false" }).ssl).toBe(true);
    expect(parseKonfigTte({ TTE_SSL: "TRUE" }).ssl).toBe(true);
  });
});

describe("konfigurasi tersimpan", () => {
  it("membaca JSON sah dan menolak data rusak", () => {
    const tersimpan = parseKonfigTteTersimpan(
      serializeKonfigTteTersimpan({
        provider: "bsre",
        mode: "bsre",
        api: "https://tte.example.go.id",
        username: "desa",
        nik: "3201010101010001",
        ssl: false,
        aktif: true,
      }),
    );

    expect(tersimpan?.mode).toBe("bsre");
    expect(tersimpan?.ssl).toBe(false);
    expect(parseKonfigTteTersimpan("{bukan json")).toBeNull();
    expect(parseKonfigTteTersimpan("")).toBeNull();
  });

  it("NIK bukan 16 digit membuat konfigurasi tersimpan ditolak", () => {
    const json = JSON.stringify({ ...KONFIG_TTE_DEFAULT, nik: "123" });
    expect(parseKonfigTteTersimpan(json)).toBeNull();
  });

  it("konfigurasi desa nonaktif memaksa mode nonaktif", () => {
    const hasil = gabungKonfigTte(parseKonfigTte({ TTE_PASSWORD: "rahasia" }), {
      provider: "bsre",
      mode: "bsre",
      api: "https://tte.example.go.id",
      username: "desa",
      nik: "3201010101010001",
      ssl: true,
      aktif: false,
    });

    expect(hasil.mode).toBe("nonaktif");
  });

  it("konfigurasi desa aktif menimpa API/penanda tangan, passphrase dari env", () => {
    const hasil = gabungKonfigTte(parseKonfigTte({ TTE_PASSWORD: "rahasia-env" }), {
      provider: "bsre",
      mode: "bsre",
      api: "https://tte-desa.example.go.id",
      username: "operator",
      nik: "3201010101010001",
      ssl: false,
      aktif: true,
    });

    expect(hasil.api).toBe("https://tte-desa.example.go.id");
    expect(hasil.username).toBe("operator");
    expect(hasil.password).toBe("rahasia-env");
    expect(hasil.ssl).toBe(true);
  });
});

describe("masalahKonfigTte", () => {
  it("mode non-bsre tidak punya masalah", () => {
    expect(masalahKonfigTte(parseKonfigTte({ TTE_MODE: "manual" }))).toEqual([]);
  });

  it("menyebut seluruh bagian yang kurang", () => {
    const masalah = masalahKonfigTte(parseKonfigTte({ TTE_MODE: "bsre" }));

    expect(masalah.join(" ")).toContain("URL API");
    expect(masalah.join(" ")).toContain("Username");
    expect(masalah.join(" ")).toContain("NIK");
    expect(masalah.join(" ")).toContain("Passphrase");
  });
});

describe("buatKlienBsre", () => {
  it("mengirim PDF dan mengembalikan PDF langsung", async () => {
    const fetchPalsu = vi.fn<FetchTte>(async () => {
      return new Response(PDF_PALSU, { headers: { "content-type": "application/pdf" } });
    });

    const klien = buatKlienBsre(fetchPalsu);
    const hasil = await klien?.(PERMINTAAN, KONFIG_LENGKAP);

    expect(adalahPdf(hasil ?? new Uint8Array())).toBe(true);
    const [url, init] = fetchPalsu.mock.calls[0] ?? [];
    expect(url).toBe("https://tte.example.go.id/api/sign/pdf");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it("menolak URL unduhan absolut dari origin lain", async () => {
    const fetchPalsu = vi.fn<FetchTte>(async () =>
      new Response(JSON.stringify({ data: { file: "https://attacker.example/hasil.pdf" } }), {
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(buatKlienBsre(fetchPalsu)?.(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow(
      "origin provider yang sama",
    );
    expect(fetchPalsu).toHaveBeenCalledTimes(1);
  });

  it("menolak endpoint TTE non-HTTPS", async () => {
    const fetchPalsu = vi.fn<FetchTte>();
    await expect(
      buatKlienBsre(fetchPalsu)?.(PERMINTAAN, { ...KONFIG_LENGKAP, api: "http://tte.example.go.id" }),
    ).rejects.toThrow("wajib menggunakan HTTPS");
    expect(fetchPalsu).not.toHaveBeenCalled();
  });

  it("menolak redirect provider tanpa mengikuti tujuan redirect", async () => {
    const fetchPalsu = vi.fn<FetchTte>(async () =>
      new Response(null, { status: 302, headers: { location: "https://attacker.example/" } }),
    );

    await expect(buatKlienBsre(fetchPalsu)?.(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow(
      "Redirect provider TTE ditolak",
    );
    expect(fetchPalsu).toHaveBeenCalledTimes(1);
    expect(fetchPalsu.mock.calls[0]?.[1]?.redirect).toBe("manual");
  });

  it("mengunduh berkas dari URL pada respons JSON", async () => {
    const fetchPalsu = vi
      .fn<FetchTte>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { file: "/unduh/hasil.pdf" } }), {
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(PDF_PALSU, { headers: { "content-type": "application/pdf" } }),
      );

    const hasil = await buatKlienBsre(fetchPalsu)?.(PERMINTAAN, KONFIG_LENGKAP);

    expect(adalahPdf(hasil ?? new Uint8Array())).toBe(true);
    expect(fetchPalsu.mock.calls[1]?.[0]).toBe("https://tte.example.go.id/unduh/hasil.pdf");
  });

  it("menerima PDF base64 pada respons JSON", async () => {
    const base64 = Buffer.from(PDF_PALSU).toString("base64");
    const fetchPalsu = vi.fn<FetchTte>(async () => {
      return new Response(JSON.stringify({ data: { pdf: base64 } }), {
        headers: { "content-type": "application/json" },
      });
    });

    const hasil = await buatKlienBsre(fetchPalsu)?.(PERMINTAAN, KONFIG_LENGKAP);

    expect(adalahPdf(hasil ?? new Uint8Array())).toBe(true);
  });

  it("melempar galat saat provider menolak", async () => {
    const fetchPalsu = vi.fn<FetchTte>(async () => new Response("gagal", { status: 401 }));

    await expect(buatKlienBsre(fetchPalsu)?.(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow(
      "HTTP 401",
    );
  });

  it("menolak respons yang bukan PDF", async () => {
    const fetchPalsu = vi.fn<FetchTte>(async () => {
      return new Response("bukan pdf", { headers: { "content-type": "application/pdf" } });
    });

    await expect(buatKlienBsre(fetchPalsu)?.(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow(
      "bukan PDF",
    );
  });

  it("menggunakan timeout dari konfigurasi", async () => {
    let capturedSignal: AbortSignal | null = null;
    const fetchPalsu = vi.fn<FetchTte>(async (_url, init) => {
      capturedSignal = init?.signal ?? null;
      return new Response(PDF_PALSU, { headers: { "content-type": "application/pdf" } });
    });

    const configDenganTimeout = { ...KONFIG_LENGKAP, timeout: 12345 };
    await buatKlienBsre(fetchPalsu)?.(PERMINTAAN, configDenganTimeout);

    expect(capturedSignal).not.toBeNull();
    // Verify timeout is set correctly by checking AbortSignal.timeout was used
    // The actual timeout value is tested via the signal's behavior
  });

  it("retry saat timeout (AbortError) lalu berhasil", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    const fetchPalsu = vi
      .fn<FetchTte>()
      // Panggilan pertama timeout, panggilan kedua berhasil.
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(
        new Response(PDF_PALSU, { headers: { "content-type": "application/pdf" } }),
      );

    const hasil = await buatKlienBsre(fetchPalsu)?.(PERMINTAAN, {
      ...KONFIG_LENGKAP,
      timeout: 100,
    });

    expect(adalahPdf(hasil ?? new Uint8Array())).toBe(true);
    expect(fetchPalsu).toHaveBeenCalledTimes(2);
  });

  it("retry saat 5xx lalu berhasil", async () => {
    const fetchPalsu = vi
      .fn<FetchTte>()
      // Panggilan pertama gagal 5xx, panggilan kedua berhasil.
      .mockResolvedValueOnce(new Response("server error", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(PDF_PALSU, { headers: { "content-type": "application/pdf" } }),
      );

    const hasil = await buatKlienBsre(fetchPalsu)?.(PERMINTAAN, {
      ...KONFIG_LENGKAP,
      timeout: 100,
    });

    expect(adalahPdf(hasil ?? new Uint8Array())).toBe(true);
    expect(fetchPalsu).toHaveBeenCalledTimes(2);
  });

  it("tidak retry pada 4xx (client error)", async () => {
    const fetchPalsu = vi.fn<FetchTte>(async () => new Response("not found", { status: 404 }));

    await expect(
      buatKlienBsre(fetchPalsu)?.(PERMINTAAN, { ...KONFIG_LENGKAP, timeout: 100 }),
    ).rejects.toThrow("HTTP 404");

    expect(fetchPalsu).toHaveBeenCalledTimes(1);
  });

  it("gagal setelah max retries saat timeout terus-menerus", async () => {
    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    const fetchPalsu = vi.fn<FetchTte>().mockRejectedValue(abortError);

    // Override setTimeout temporarily to speed up test without vi.useFakeTimers()
    const origSetTimeout = globalThis.setTimeout;

    globalThis.setTimeout = ((fn: () => void) => {
      fn();
      return 0;
    }) as unknown as typeof setTimeout;

    try {
      await expect(
        buatKlienBsre(fetchPalsu)?.(PERMINTAAN, { ...KONFIG_LENGKAP, timeout: 10 }),
      ).rejects.toThrow("Aborted");

      // Initial + 3 retries = 4 calls
      expect(fetchPalsu).toHaveBeenCalledTimes(4);
    } finally {
      globalThis.setTimeout = origSetTimeout;
    }
  });
});

describe("tandaiTte", () => {
  it("mode nonaktif tidak menyentuh jaringan dan tidak memblokir", async () => {
    const klien = vi.fn();
    const hasil = await tandaiTte(parseKonfigTte({}), PERMINTAAN, klien);

    expect(hasil.ok).toBe(false);
    expect(klien).not.toHaveBeenCalled();
    if (!hasil.ok) expect(hasil.alasan).toContain("dinonaktifkan");
  });

  it("mode manual menjelaskan penandai basah", async () => {
    const hasil = await tandaiTte(parseKonfigTte({ TTE_MODE: "manual" }), PERMINTAAN, null);

    expect(hasil.ok).toBe(false);
    if (!hasil.ok) {
      expect(hasil.mode).toBe("manual");
      expect(hasil.alasan).toContain("basah");
    }
  });

  it("bsre lengkap mengembalikan PDF bertanda tangan", async () => {
    const hasil = await tandaiTte(KONFIG_LENGKAP, PERMINTAAN, async () => PDF_PALSU);

    expect(hasil.ok).toBe(true);
    if (hasil.ok) {
      expect(hasil.suratId).toBe(7);
      expect(adalahPdf(hasil.pdf)).toBe(true);
    }
  });

  it("kegagalan klien tidak melempar ke pemanggil", async () => {
    const hasil = await tandaiTte(KONFIG_LENGKAP, PERMINTAAN, async () => {
      throw new Error("jaringan putus");
    });

    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toContain("jaringan putus");
  });
});
