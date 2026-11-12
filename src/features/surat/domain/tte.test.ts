import { describe, expect, it, vi } from "vitest";

import {
  adalahPdf,
  BATAS_RESPONS_JSON,
  BATAS_RESPONS_PDF,
  buatKlienBsre,
  gabungKonfigTte,
  KONFIG_TTE_DEFAULT,
  konfigTteFormSchema,
  masalahKonfigTte,
  parseKonfigTte,
  parseKonfigTteTersimpan,
  serializeKonfigTteTersimpan,
  siapTte,
  tandaiTte,
  testKoneksi,
  type KonfigTte,
} from "./tte";
import type { ResolverDns, ResponsTte, TransportTte } from "./tte-jaringan";

const PDF_PALSU = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // "%PDF-1.7"

const PERMINTAAN = {
  villageId: 1,
  suratId: 7,
  nomor: "007/SK/10/2026",
  pdf: PDF_PALSU,
};

const KONFIG_LENGKAP: KonfigTte = {
  mode: "bsre",
  api: "https://tte.example.go.id/bsre",
  username: "desa",
  nik: "3201010101010001",
  password: "rahasia",
  timeout: 30000,
};

const ALAMAT_PUBLIK = [{ alamat: "93.184.216.34", family: 4 }];

const ALLOW_TTE = ["tte.example.go.id:443"];

/** Resolver palsu yang menggantung sampai sinyal batas waktu aktif. */
function resolverMenggantung(): ResolverDns {
  return (_hostname, signal) =>
    new Promise((_, gagal) => {
      signal?.addEventListener("abort", () => gagal(new Error("aborted")), { once: true });
    });
}

interface PanggilanTransport {
  url: string;
  method: string;
  alamat: string;
  headers: Record<string, string>;
  body?: Uint8Array;
}

function responsPdf(bytes: Uint8Array, status = 200): ResponsTte {
  return {
    status,
    header: (nama) => (nama.toLowerCase() === "content-type" ? "application/pdf" : null),
    baca: async (maks) => {
      if (bytes.byteLength > maks) throw new Error("Respons provider TTE melebihi batas ukuran.");
      return bytes;
    },
  };
}

function responsJson(data: unknown, status = 200): ResponsTte {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return {
    status,
    header: (nama) => (nama.toLowerCase() === "content-type" ? "application/json" : null),
    baca: async (maks) => {
      if (bytes.byteLength > maks) throw new Error("Respons provider TTE melebihi batas ukuran.");
      return bytes;
    },
  };
}

/** Transport palsu: seluruh respons diambil dari antrean, panggilan dicatat. */
function transportAntre(...respons: Array<ResponsTte | Error>): {
  transport: TransportTte;
  panggilan: PanggilanTransport[];
} {
  const panggilan: PanggilanTransport[] = [];
  const transport: TransportTte = async (url, permintaan, alamat) => {
    panggilan.push({
      url: url.href,
      method: permintaan.method,
      alamat,
      headers: permintaan.headers,
      body: permintaan.body,
    });
    const berikut = respons.shift();
    if (!berikut) throw new Error("Transport palsu kehabisan respons.");
    if (berikut instanceof Error) throw berikut;
    return berikut;
  };
  return { transport, panggilan };
}

function buatKlien(
  transport: TransportTte,
  resolver: ResolverDns = async () => ALAMAT_PUBLIK,
  allowedHosts: readonly string[] = ALLOW_TTE,
) {
  const klien = buatKlienBsre({ transport, resolver, allowedHosts });
  if (!klien) throw new Error("klien BSrE seharusnya selalu tersedia");
  return klien;
}

/** Ambil entri ke-`indeks` tanpa akses indeks yang mungkin kosong. */
function entri<T>(daftar: readonly T[], indeks: number): T {
  const item = daftar[indeks];
  if (item === undefined) throw new Error(`Panggilan transport ke-${indeks} tidak ada.`);
  return item;
}

describe("parseKonfigTte", () => {
  it("tanpa variabel apa pun → mode nonaktif", () => {
    const config = parseKonfigTte({});

    expect(config.mode).toBe("nonaktif");
    expect(config.timeout).toBe(30000);
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
      TTE_TIMEOUT: "45000",
    });

    expect(siapTte(lengkap)).toBe(true);
    expect(lengkap.timeout).toBe(45000);
  });

  it("TTE_SSL tidak lagi dibaca karena verifikasi TLS selalu aktif", () => {
    const config = parseKonfigTte({ TTE_SSL: "false" });
    expect("ssl" in config).toBe(false);
    expect(parseKonfigTte({ TTE_SSL: "TRUE" })).not.toHaveProperty("ssl");
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
        aktif: true,
      }),
    );

    expect(tersimpan?.mode).toBe("bsre");
    expect(tersimpan?.aktif).toBe(true);
    expect(parseKonfigTteTersimpan("{bukan json")).toBeNull();
    expect(parseKonfigTteTersimpan("")).toBeNull();
  });

  it("baris lama dengan field ssl tetap terbaca dan nilainya diabaikan", () => {
    const lama = JSON.stringify({
      provider: "bsre",
      mode: "bsre",
      api: "https://tte.example.go.id",
      username: "desa",
      nik: "3201010101010001",
      ssl: false,
      aktif: true,
    });

    const tersimpan = parseKonfigTteTersimpan(lama);
    // Baris lama tetap terbaca walau memuat field ssl yang sudah tidak dipakai.
    expect(tersimpan).not.toBeNull();
    expect(tersimpan?.mode).toBe("bsre");
    expect(tersimpan?.aktif).toBe(true);
    expect(parseKonfigTte({ TTE_SSL: "false" })).not.toHaveProperty("ssl");
  });

  it("NIK bukan 16 digit membuat konfigurasi tersimpan ditolak", () => {
    expect(
      parseKonfigTteTersimpan(JSON.stringify({ ...KONFIG_TTE_DEFAULT, nik: "123" })),
    ).toBeNull();
  });

  it("konfigurasi desa nonaktif memaksa mode nonaktif", () => {
    const hasil = gabungKonfigTte(parseKonfigTte({ TTE_PASSWORD: "rahasia" }), {
      provider: "bsre",
      mode: "bsre",
      api: "https://tte.example.go.id",
      username: "desa",
      nik: "3201010101010001",
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
      aktif: true,
      timeout: 15000,
    });

    expect(hasil.api).toBe("https://tte-desa.example.go.id");
    expect(hasil.username).toBe("operator");
    expect(hasil.password).toBe("rahasia-env");
    expect(hasil.timeout).toBe(15000);
    expect(hasil).not.toHaveProperty("ssl");
  });
});

describe("masalahKonfigTte", () => {
  it("mode non-bsre tidak punya masalah", () => {
    expect(masalahKonfigTte(parseKonfigTte({ TTE_MODE: "manual" }))).toEqual([]);
  });

  it("menyebut seluruh bagian yang kurang", () => {
    const masalah = masalahKonfigTte(parseKonfigTte({ TTE_MODE: "bsre" })).join(" ");

    expect(masalah).toContain("URL API");
    expect(masalah).toContain("Username");
    expect(masalah).toContain("NIK");
    expect(masalah).toContain("Passphrase");
  });

  it("memakai aturan URL yang sama dengan runtime", () => {
    expect(
      masalahKonfigTte({ ...KONFIG_LENGKAP, api: "http://tte.example.go.id" }).join(" "),
    ).toContain("HTTPS");
    expect(
      masalahKonfigTte({ ...KONFIG_LENGKAP, api: "https://10.0.0.9/bsre" }).join(" "),
    ).toContain("IP internal");
    expect(masalahKonfigTte(KONFIG_LENGKAP)).toEqual([]);
  });
});

describe("konfigTteFormSchema", () => {
  const isian = {
    mode: "bsre" as const,
    api: "https://tte.example.go.id/bsre",
    username: "desa",
    nik: "3201010101010001",
    aktif: true,
  };

  it("menerima konfigurasi HTTPS publik", () => {
    expect(konfigTteFormSchema.safeParse(isian).success).toBe(true);
  });

  it.each([
    "http://tte.example.go.id",
    "https://127.0.0.1/bsre",
    "https://169.254.169.254/",
    "https://metadata.google.internal/",
    "https://user:pass@tte.example.go.id/",
  ])("menolak isian yang juga ditolak runtime: %s", (api) => {
    const hasil = konfigTteFormSchema.safeParse({ ...isian, api });
    expect(hasil.success).toBe(false);
  });

  it("URL kosong boleh disimpan untuk mode nonaktif", () => {
    expect(konfigTteFormSchema.safeParse({ ...isian, mode: "nonaktif", api: "" }).success).toBe(
      true,
    );
  });
});

describe("buatKlienBsre", () => {
  it("mengirim PDF ke endpoint dengan alamat hasil validasi dan path prefix", async () => {
    const { transport, panggilan } = transportAntre(responsPdf(PDF_PALSU));
    const hasil = await buatKlien(transport)(PERMINTAAN, KONFIG_LENGKAP);

    expect(adalahPdf(hasil)).toBe(true);
    expect(panggilan).toHaveLength(1);
    expect(entri(panggilan, 0).url).toBe("https://tte.example.go.id/bsre/api/sign/pdf");
    expect(entri(panggilan, 0).method).toBe("POST");
    expect(entri(panggilan, 0).alamat).toBe("93.184.216.34");
    expect(entri(panggilan, 0).headers.Authorization).toBe(`Basic ${btoa("desa:rahasia")}`);
    expect(entri(panggilan, 0).headers["Content-Type"]).toContain("multipart/form-data");

    const isi = new TextDecoder().decode(entri(panggilan, 0).body);
    expect(isi).toContain("%PDF-1.7");
    expect(isi).toContain("3201010101010001");
    expect(isi).toContain("007-SK-10-2026.pdf");
  });

  it("mempertahankan path prefix saat base URL berakhiran slash", async () => {
    const { transport, panggilan } = transportAntre(responsPdf(PDF_PALSU));
    await buatKlien(transport)(PERMINTAAN, {
      ...KONFIG_LENGKAP,
      api: "https://tte.example.go.id/",
    });

    expect(entri(panggilan, 0).url).toBe("https://tte.example.go.id/api/sign/pdf");
  });

  it("mengunduh berkas relatif dari origin yang sama tanpa resolusi DNS ulang", async () => {
    const resolver = vi.fn(async () => ALAMAT_PUBLIK);
    const { transport, panggilan } = transportAntre(
      responsJson({ data: { file: "unduh/hasil.pdf" } }),
      responsPdf(PDF_PALSU),
    );

    const hasil = await buatKlien(transport, resolver)(PERMINTAAN, KONFIG_LENGKAP);

    expect(adalahPdf(hasil)).toBe(true);
    expect(resolver).toHaveBeenCalledTimes(1);
    expect(entri(panggilan, 1).url).toBe("https://tte.example.go.id/bsre/unduh/hasil.pdf");
    expect(entri(panggilan, 1).alamat).toBe("93.184.216.34");
    expect(entri(panggilan, 1).method).toBe("GET");
    // Authorization tidak pernah dikirim ke origin lain; origin sudah dipastikan sama.
    expect(entri(panggilan, 1).headers.Authorization).toBe(
      entri(panggilan, 0).headers.Authorization,
    );
  });

  it("menolak URL unduhan dari origin lain tanpa mengirim kredensial", async () => {
    const { transport, panggilan } = transportAntre(
      responsJson({ data: { file: "https://attacker.example/hasil.pdf" } }),
    );

    await expect(buatKlien(transport)(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow(
      "origin provider yang sama",
    );
    expect(panggilan).toHaveLength(1);
  });

  it("menolak URL protokol-relatif dan HTTP pada respons berkas", async () => {
    const protokolRelatif = transportAntre(
      responsJson({ data: { file: "//attacker.example/hasil.pdf" } }),
    );
    await expect(buatKlien(protokolRelatif.transport)(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow(
      "origin provider yang sama",
    );

    const http = transportAntre(
      responsJson({ data: { file: "http://tte.example.go.id/hasil.pdf" } }),
    );
    await expect(buatKlien(http.transport)(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow("HTTPS");
  });

  it("menerima PDF base64 pada respons JSON tanpa permintaan kedua", async () => {
    const base64 = Buffer.from(PDF_PALSU).toString("base64");
    const { transport, panggilan } = transportAntre(responsJson({ data: { pdf: base64 } }));

    const hasil = await buatKlien(transport)(PERMINTAAN, KONFIG_LENGKAP);

    expect(adalahPdf(hasil)).toBe(true);
    expect(panggilan).toHaveLength(1);
  });

  it("menolak endpoint non-HTTPS, IP internal, dan host internal sebelum menghubungi jaringan", async () => {
    const { transport, panggilan } = transportAntre();

    await expect(
      buatKlien(transport)(PERMINTAAN, { ...KONFIG_LENGKAP, api: "http://tte.example.go.id" }),
    ).rejects.toThrow("wajib menggunakan HTTPS");
    await expect(
      buatKlien(transport)(PERMINTAAN, { ...KONFIG_LENGKAP, api: "https://10.0.0.9/bsre" }),
    ).rejects.toThrow("IP internal");
    await expect(
      buatKlien(transport)(PERMINTAAN, {
        ...KONFIG_LENGKAP,
        api: "https://metadata.google.internal",
      }),
    ).rejects.toThrow("host internal");

    expect(panggilan).toHaveLength(0);
  });

  it("menolak host di luar allowlist sebelum DNS dan tanpa mengirim kredensial", async () => {
    const transport = vi.fn<TransportTte>();
    const resolver = vi.fn<ResolverDns>(async () => ALAMAT_PUBLIK);

    await expect(
      buatKlien(transport, resolver)(PERMINTAAN, {
        ...KONFIG_LENGKAP,
        api: "https://evil.example.com/bsre",
      }),
    ).rejects.toThrow("allowlist platform");

    expect(resolver).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it("menolak semua provider saat allowlist kosong", async () => {
    const transport = vi.fn<TransportTte>();

    await expect(
      buatKlien(transport, async () => ALAMAT_PUBLIK, [])(PERMINTAAN, KONFIG_LENGKAP),
    ).rejects.toThrow("allowlist platform");
    expect(transport).not.toHaveBeenCalled();
  });

  it("membatalkan resolusi DNS yang menggantung sesuai deadline total", async () => {
    const { transport, panggilan } = transportAntre();

    const mulai = Date.now();
    await expect(
      buatKlien(transport, resolverMenggantung())(PERMINTAAN, {
        ...KONFIG_LENGKAP,
        timeout: 100,
      }),
    ).rejects.toThrow("batas waktu");

    expect(Date.now() - mulai).toBeLessThan(1000);
    expect(panggilan).toHaveLength(0);
  });

  it("satu deadline mencakup DNS dan permintaan HTTP", async () => {
    const transport: TransportTte = (_url, permintaan) =>
      new Promise((_, gagal) => {
        permintaan.signal.addEventListener("abort", () => gagal(new Error("aborted")), {
          once: true,
        });
      });
    const resolver: ResolverDns = (_hostname, signal) =>
      new Promise((selesai, gagal) => {
        const timer = setTimeout(() => selesai(ALAMAT_PUBLIK), 80);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            gagal(new Error("aborted"));
          },
          { once: true },
        );
      });

    const mulai = Date.now();
    await expect(
      buatKlien(transport, resolver)(PERMINTAAN, { ...KONFIG_LENGKAP, timeout: 120 }),
    ).rejects.toThrow("batas waktu");

    expect(Date.now() - mulai).toBeLessThan(1000);
  });

  it("tidak retry kegagalan TLS dan tidak mengirim ulang kredensial", async () => {
    const galat = Object.assign(new Error("sertifikat tidak valid"), {
      code: "ERR_TLS_CERT_ALTNAME_INVALID",
    });
    const { transport, panggilan } = transportAntre(galat);

    await expect(
      buatKlien(transport)(PERMINTAAN, { ...KONFIG_LENGKAP, timeout: 5000 }),
    ).rejects.toThrow("Koneksi ke provider TTE gagal");

    expect(panggilan).toHaveLength(1);
  });

  it("mengulang kegagalan jaringan sementara", async () => {
    const galat = Object.assign(new Error("reset"), { code: "ECONNRESET" });
    const { transport, panggilan } = transportAntre(galat, responsPdf(PDF_PALSU));

    const hasil = await buatKlien(transport)(PERMINTAAN, KONFIG_LENGKAP);

    expect(adalahPdf(hasil)).toBe(true);
    expect(panggilan).toHaveLength(2);
  });

  it("mengganti pesan transport mentah saat body dihentikan", async () => {
    const { transport } = transportAntre({
      status: 200,
      header: () => "application/pdf",
      baca: async () => {
        throw new Error("aborted");
      },
    });

    await expect(buatKlien(transport)(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow("batas waktu");
  });

  it("menolak host yang resolve ke alamat internal", async () => {
    const { transport, panggilan } = transportAntre();

    await expect(
      buatKlien(transport, async () => [
        { alamat: "93.184.216.34", family: 4 },
        { alamat: "127.0.0.1", family: 4 },
      ])(PERMINTAAN, KONFIG_LENGKAP),
    ).rejects.toThrow("alamat internal");

    expect(panggilan).toHaveLength(0);
  });

  it("menolak redirect tanpa mengikuti tujuan redirect", async () => {
    const { transport, panggilan } = transportAntre(responsPdf(PDF_PALSU, 302));

    await expect(buatKlien(transport)(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow(
      "Redirect provider TTE ditolak",
    );
    expect(panggilan).toHaveLength(1);
  });

  it("melempar galat saat provider menolak dan tidak retry pada 4xx", async () => {
    const { transport, panggilan } = transportAntre(responsPdf(PDF_PALSU, 401));

    await expect(buatKlien(transport)(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow("HTTP 401");
    expect(panggilan).toHaveLength(1);
  });

  it("menolak respons yang bukan PDF", async () => {
    const { transport } = transportAntre({
      status: 200,
      header: () => "text/html",
      baca: async () => new TextEncoder().encode("<html>galat</html>"),
    });

    await expect(buatKlien(transport)(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow(
      "tidak dapat dibaca",
    );
  });

  it("menolak PDF yang isinya bukan berkas PDF", async () => {
    const { transport } = transportAntre(responsPdf(new TextEncoder().encode("bukan pdf")));

    await expect(buatKlien(transport)(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow("bukan PDF");
  });

  it("menerapkan batas ukuran berbeda untuk PDF dan JSON", async () => {
    const batas: number[] = [];
    const transport: TransportTte = async (url) => {
      const permintaanTandaTangan = url.pathname.endsWith("sign/pdf");
      return {
        status: 200,
        header: () => (permintaanTandaTangan ? "application/json" : "application/pdf"),
        baca: async (maks) => {
          batas.push(maks);
          return permintaanTandaTangan
            ? new TextEncoder().encode(JSON.stringify({ data: { file: "unduh/hasil.pdf" } }))
            : PDF_PALSU;
        },
      };
    };

    await buatKlien(transport)(PERMINTAAN, KONFIG_LENGKAP);

    expect(batas).toEqual([BATAS_RESPONS_JSON, BATAS_RESPONS_PDF]);
    expect(BATAS_RESPONS_PDF).toBeGreaterThan(BATAS_RESPONS_JSON);
  });

  it("meneruskan kegagalan saat respons melebihi batas ukuran", async () => {
    const { transport } = transportAntre({
      status: 200,
      header: () => "application/pdf",
      baca: async () => {
        throw new Error("Respons provider TTE melebihi batas ukuran.");
      },
    });

    await expect(buatKlien(transport)(PERMINTAAN, KONFIG_LENGKAP)).rejects.toThrow(
      "melebihi batas ukuran",
    );
  });

  it("menghentikan operasi saat batas waktu total habis, tanpa retry berlarut", async () => {
    const transport: TransportTte = (_url, permintaan) =>
      new Promise((_, gagal) => {
        permintaan.signal.addEventListener("abort", () => gagal(new Error("aborted")), {
          once: true,
        });
      });

    const mulai = Date.now();
    await expect(
      buatKlien(transport)(PERMINTAAN, { ...KONFIG_LENGKAP, timeout: 60 }),
    ).rejects.toThrow("batas waktu");
    expect(Date.now() - mulai).toBeLessThan(1000);
  });

  it("batas waktu juga menutup jeda retry 5xx", async () => {
    const { transport, panggilan } = transportAntre(
      ...Array.from({ length: 4 }, () => responsPdf(PDF_PALSU, 503)),
    );

    const mulai = Date.now();
    await expect(
      buatKlien(transport)(PERMINTAAN, { ...KONFIG_LENGKAP, timeout: 250 }),
    ).rejects.toThrow("batas waktu");

    // Percobaan pertama + satu jeda retry, lalu dibatalkan oleh batas waktu total.
    expect(panggilan).toHaveLength(1);
    expect(Date.now() - mulai).toBeLessThan(2000);
  });
});

describe("testKoneksi", () => {
  it("melaporkan status provider yang merespons, dengan path prefix dan alamat ter-pin", async () => {
    const { transport, panggilan } = transportAntre(responsPdf(PDF_PALSU));

    const hasil = await testKoneksi(KONFIG_LENGKAP, {
      transport,
      resolver: async () => ALAMAT_PUBLIK,
      allowedHosts: ALLOW_TTE,
    });

    expect(hasil).toEqual({ ok: true, pesan: "Provider merespons HTTP 200." });
    expect(entri(panggilan, 0).url).toBe("https://tte.example.go.id/bsre/api/sign/status");
    expect(entri(panggilan, 0).alamat).toBe("93.184.216.34");
    expect(entri(panggilan, 0).method).toBe("GET");
  });

  it("melaporkan kredensial ditolak", async () => {
    const { transport } = transportAntre(responsPdf(PDF_PALSU, 401));

    const hasil = await testKoneksi(KONFIG_LENGKAP, {
      transport,
      resolver: async () => ALAMAT_PUBLIK,
      allowedHosts: ALLOW_TTE,
    });

    expect(hasil.ok).toBe(false);
    expect(hasil.pesan).toContain("Kredensial ditolak");
  });

  it("menolak redirect", async () => {
    const { transport } = transportAntre(responsPdf(PDF_PALSU, 301));

    const hasil = await testKoneksi(KONFIG_LENGKAP, {
      transport,
      resolver: async () => ALAMAT_PUBLIK,
      allowedHosts: ALLOW_TTE,
    });

    expect(hasil.pesan).toContain("Redirect provider TTE ditolak");
  });

  it("mencoba endpoint cadangan lalu fallback ke root provider", async () => {
    const { transport, panggilan } = transportAntre(
      responsPdf(PDF_PALSU, 404),
      responsPdf(PDF_PALSU, 404),
      responsPdf(PDF_PALSU, 404),
      responsPdf(PDF_PALSU, 404),
    );

    const hasil = await testKoneksi(KONFIG_LENGKAP, {
      transport,
      resolver: async () => ALAMAT_PUBLIK,
      allowedHosts: ALLOW_TTE,
    });

    expect(hasil.ok).toBe(false);
    expect(hasil.pesan).toContain("tidak merespons dengan status yang dikenal");
    expect(panggilan.map((p) => p.url)).toEqual([
      "https://tte.example.go.id/bsre/api/sign/status",
      "https://tte.example.go.id/bsre/api/version",
      "https://tte.example.go.id/bsre/api/health",
      "https://tte.example.go.id/bsre/",
    ]);
  });

  it("berhenti saat batas waktu habis tanpa menunggu endpoint lain", async () => {
    const transport: TransportTte = (_url, permintaan) =>
      new Promise((_, gagal) => {
        permintaan.signal.addEventListener("abort", () => gagal(new Error("aborted")), {
          once: true,
        });
      });

    const mulai = Date.now();
    const hasil = await testKoneksi(
      { ...KONFIG_LENGKAP, timeout: 60 },
      { transport, resolver: async () => ALAMAT_PUBLIK, allowedHosts: ALLOW_TTE },
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.pesan).toContain("timeout");
    expect(Date.now() - mulai).toBeLessThan(1000);
  });

  it("menolak URL yang tidak lolos validasi tanpa menghubungi jaringan", async () => {
    const transport = vi.fn<TransportTte>();

    const hasil = await testKoneksi(
      { ...KONFIG_LENGKAP, api: "https://127.0.0.1/bsre" },
      { transport, resolver: async () => ALAMAT_PUBLIK, allowedHosts: ALLOW_TTE },
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.pesan).toContain("IP internal");
    expect(transport).not.toHaveBeenCalled();
  });

  it("menolak host di luar allowlist tanpa menghubungi jaringan", async () => {
    const transport = vi.fn<TransportTte>();

    const hasil = await testKoneksi(
      { ...KONFIG_LENGKAP, api: "https://evil.example.com/bsre" },
      { transport, resolver: async () => ALAMAT_PUBLIK, allowedHosts: ALLOW_TTE },
    );

    expect(hasil.ok).toBe(false);
    expect(hasil.pesan).toContain("allowlist platform");
    expect(transport).not.toHaveBeenCalled();
  });

  it("membatasi resolusi DNS dengan deadline yang sama", async () => {
    const transport = vi.fn<TransportTte>();

    const mulai = Date.now();
    const hasil = await testKoneksi(
      { ...KONFIG_LENGKAP, timeout: 100 },
      { transport, resolver: resolverMenggantung(), allowedHosts: ALLOW_TTE },
    );

    expect(hasil).toEqual({ ok: false, pesan: "Koneksi timeout." });
    expect(Date.now() - mulai).toBeLessThan(1000);
    expect(transport).not.toHaveBeenCalled();
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

  it("mode bsre tanpa klien mengembalikan alasan konfigurasi", async () => {
    const hasil = await tandaiTte(KONFIG_LENGKAP, PERMINTAAN, null);

    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toContain("belum lengkap");
  });

  it("bsre lengkap mengembalikan PDF bertanda tangan", async () => {
    const hasil = await tandaiTte(KONFIG_LENGKAP, PERMINTAAN, async () => PDF_PALSU);

    expect(hasil.ok).toBe(true);
    if (hasil.ok) {
      expect(hasil.suratId).toBe(7);
      expect(adalahPdf(hasil.pdf)).toBe(true);
    }
  });

  it("PDF hasil yang tidak sah tidak diterima", async () => {
    const hasil = await tandaiTte(KONFIG_LENGKAP, PERMINTAAN, async () =>
      new TextEncoder().encode("bukan pdf"),
    );

    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toContain("bukan PDF");
  });

  it("kegagalan klien tidak melempar ke pemanggil", async () => {
    const hasil = await tandaiTte(KONFIG_LENGKAP, PERMINTAAN, async () => {
      throw new Error("jaringan putus");
    });

    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toContain("jaringan putus");
  });
});
