import { describe, expect, it } from "vitest";

import {
  DSN_BAWAAN,
  namaDatabaseDariDsn,
  ringkasTarget,
  validasiDsnVisual,
  validasiEnvVisual,
} from "../../scripts/visual-qa/guard.mjs";

/**
 * Uji guard basis data visual QA.
 *
 * Guard ini satu-satunya penghalang antara skrip seed (yang menulis fixture ke
 * database) dan database pengembangan/produksi, sehingga jalur penolakan diuji
 * selengkap jalur penerimaannya.
 */
describe("namaDatabaseDariDsn", () => {
  it("membaca nama database dari DSN", () => {
    expect(namaDatabaseDariDsn("mysql://root:rahasia@127.0.0.1:3307/desa_visual_qa")).toBe(
      "desa_visual_qa",
    );
  });

  it("menolak protokol non-mysql dan nama kosong", () => {
    expect(() => namaDatabaseDariDsn("postgres://127.0.0.1/desa_visual_qa")).toThrow(/mysql:/);
    expect(() => namaDatabaseDariDsn("mysql://root:rahasia@127.0.0.1:3307/")).toThrow(
      /tidak menyebutkan nama database/,
    );
  });
});

describe("validasiDsnVisual", () => {
  it("menerima DSN bawaan compose dengan opsi koneksi eksplisit", () => {
    const konfigurasi = validasiDsnVisual(DSN_BAWAAN);

    expect(konfigurasi.database).toBe("desa_visual_qa");
    expect(konfigurasi.host).toBe("127.0.0.1");
    expect(konfigurasi.opsiKoneksi).toEqual({
      host: "127.0.0.1",
      port: 3307,
      user: "root",
      password: "visual_qa_root",
      database: "desa_visual_qa",
    });
    expect(ringkasTarget(konfigurasi)).toBe("desa_visual_qa @ 127.0.0.1:3307");
    expect(ringkasTarget(konfigurasi)).not.toContain("visual_qa_root");
  });

  it("menerima suffix huruf kecil dan menolak host non-loopback", () => {
    expect(validasiDsnVisual("mysql://u:p@localhost/desa_visual_qa_run1").database).toBe(
      "desa_visual_qa_run1",
    );
    expect(() => validasiDsnVisual("mysql://u:p@10.0.0.5:3306/desa_visual_qa")).toThrow(
      /host loopback/,
    );
    expect(() => validasiDsnVisual("mysql://u:p@db.example.com/desa_visual_qa")).toThrow(
      /host loopback/,
    );
  });

  it("menolak nama database pengembangan/produksi dan pola lain", () => {
    expect(() => validasiDsnVisual("mysql://u:p@127.0.0.1/desa")).toThrow(/tidak diizinkan/);
    expect(() => validasiDsnVisual("mysql://u:p@127.0.0.1/desa_test")).toThrow(/tidak diizinkan/);
    expect(() => validasiDsnVisual("mysql://u:p@127.0.0.1/desa_visual_qa_prod")).toThrow(
      /penanda produksi/,
    );
    expect(() => validasiDsnVisual("mysql://u:p@127.0.0.1/desa_visual_qa_development")).toThrow(
      /penanda produksi/,
    );
    expect(() => validasiDsnVisual("mysql://u:p@127.0.0.1/DESA_VISUAL_QA")).toThrow(
      /tidak diizinkan/,
    );
  });

  it("menolak query string dan fragment yang dapat mengubah koneksi", () => {
    expect(() =>
      validasiDsnVisual("mysql://u:p@127.0.0.1:3307/desa_visual_qa?socketPath=/tmp/mysql.sock"),
    ).toThrow(/query string/);
    expect(() => validasiDsnVisual("mysql://u:p@127.0.0.1:3307/desa_visual_qa#rahasia")).toThrow(
      /fragment/,
    );
  });

  it("menolak port tidak valid", () => {
    expect(() => validasiDsnVisual("mysql://u:p@127.0.0.1:0/desa_visual_qa")).toThrow(
      /Port database/,
    );
  });
});

describe("validasiEnvVisual", () => {
  const envDasar = {
    VISUAL_QA_DATABASE_ACK: "1",
    VISUAL_QA_DATABASE_URL: DSN_BAWAAN,
  };

  it("menerima environment lengkap dan memakai DSN bawaan bila URL kosong", () => {
    expect(validasiEnvVisual(envDasar).database).toBe("desa_visual_qa");
    expect(validasiEnvVisual({ VISUAL_QA_DATABASE_ACK: "1" }).database).toBe("desa_visual_qa");
  });

  it("mewajibkan ack eksplisit dan menolak NODE_ENV production", () => {
    expect(() => validasiEnvVisual({ VISUAL_QA_DATABASE_URL: DSN_BAWAAN })).toThrow(/ACK/);
    expect(() => validasiEnvVisual({ ...envDasar, VISUAL_QA_DATABASE_ACK: "true" })).toThrow(/ACK/);
    expect(() => validasiEnvVisual({ ...envDasar, NODE_ENV: "production" })).toThrow(
      /NODE_ENV=production/,
    );
  });

  it("tidak pernah memakai DATABASE_URL pengembangan sebagai fallback", () => {
    expect(() =>
      validasiEnvVisual({
        VISUAL_QA_DATABASE_ACK: "1",
        DATABASE_URL: "mysql://root:rahasia@127.0.0.1:3306/desa",
      }),
    ).not.toThrow();
    expect(
      validasiEnvVisual({
        VISUAL_QA_DATABASE_ACK: "1",
        DATABASE_URL: "mysql://root:rahasia@127.0.0.1:3306/desa",
      }).database,
    ).toBe("desa_visual_qa");
  });
});
