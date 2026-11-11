import { describe, expect, it } from "vitest";

import {
  formatNomorTiket,
  identitasCocok,
  lacakPengaduanSchema,
  normalisasiNomorTiket,
  normalisasiTelepon,
  prefiksNomorTiket,
  samarkanNama,
} from "./pengaduan";

const PELAPOR = {
  nik: "3201010101010001",
  telepon: "+62 812-3456-7890",
  email: "Budi@Example.com",
};

describe("nomor tiket", () => {
  it("menyusun prefiks & nomor tiket harian", () => {
    const tanggal = new Date(2026, 9, 24);

    expect(prefiksNomorTiket(tanggal)).toBe("PGD-20261024-");
    expect(formatNomorTiket(tanggal, 7)).toBe("PGD-20261024-0007");
    expect(formatNomorTiket(tanggal, 0)).toBe("PGD-20261024-0001");
  });

  it("normalisasi nomor tiket tidak membedakan huruf besar/kecil & spasi", () => {
    expect(normalisasiNomorTiket("  pgd-20261024-0001 ")).toBe("PGD-20261024-0001");
  });
});

describe("normalisasiTelepon", () => {
  it("membuang karakter non-digit dan menyeragamkan awalan 62 → 0", () => {
    expect(normalisasiTelepon("+62 812-3456-7890")).toBe("081234567890");
    expect(normalisasiTelepon("0812 3456 7890")).toBe("081234567890");
    expect(normalisasiTelepon("(021) 555 123")).toBe("021555123");
  });
});

describe("identitasCocok", () => {
  it("menerima NIK yang sama", () => {
    expect(identitasCocok(PELAPOR, "3201010101010001")).toBe(true);
  });

  it("menerima telepon meski format berbeda", () => {
    expect(identitasCocok(PELAPOR, "0812-3456-7890")).toBe(true);
    expect(identitasCocok(PELAPOR, "+62 812 3456 7890")).toBe(true);
  });

  it("menerima email tanpa membedakan huruf besar/kecil", () => {
    expect(identitasCocok(PELAPOR, "  budi@example.com ")).toBe(true);
  });

  it("menolak identitas yang tidak cocok atau kosong", () => {
    expect(identitasCocok(PELAPOR, "3201010101010002")).toBe(false);
    expect(identitasCocok(PELAPOR, "081200000000")).toBe(false);
    expect(identitasCocok(PELAPOR, "lain@example.com")).toBe(false);
    expect(identitasCocok(PELAPOR, "")).toBe(false);
  });

  it("NIK berawalan 62 tidak salah dianggap telepon", () => {
    const row = { nik: "6201010101010001", telepon: null, email: null };

    expect(identitasCocok(row, "6201010101010001")).toBe(true);
    expect(identitasCocok(row, "01010101010001")).toBe(false);
  });
});

describe("lacakPengaduanSchema", () => {
  it("menerima tiket & identitas yang wajar", () => {
    const hasil = lacakPengaduanSchema.safeParse({
      nomorTiket: " PGD-20261024-0001 ",
      identitas: "3201010101010001",
    });

    expect(hasil.success).toBe(true);
  });

  it("menolak nomor tiket terlalu pendek", () => {
    const hasil = lacakPengaduanSchema.safeParse({ nomorTiket: "PGD-1", identitas: "123" });

    expect(hasil.success).toBe(false);
  });
});

describe("samarkanNama", () => {
  it("menyisakan nama depan + inisial nama belakang", () => {
    expect(samarkanNama("Budi Santoso")).toBe("Budi S.");
    expect(samarkanNama("Siti")).toBe("Siti");
    expect(samarkanNama("  ")).toBe("Warga");
  });
});
