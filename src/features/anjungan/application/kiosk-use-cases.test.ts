import { beforeEach, describe, expect, it, vi } from "vitest";

import * as surat from "@/features/layanan-mandiri/application/ajukan-surat";
import * as penduduk from "@/features/penduduk/application/use-cases";

import type { AnjunganDTO } from "../domain/anjungan";
import { buatTokenGuest } from "../domain/kiosk-guest";
import {
  ajukanSuratKioskData,
  bacaSesiGuestKioskData,
  bukaSesiGuestKioskData,
  daftarJenisSuratKioskData,
} from "./kiosk-use-cases";

const { SECRET } = vi.hoisted(() => ({
  SECRET: "rahasia-uji-yang-cukup-panjang-untuk-hmac",
}));

vi.mock("@/lib/env", () => ({ env: { BETTER_AUTH_SECRET: SECRET } }));

vi.mock("@/features/penduduk/application/use-cases", () => ({
  cariPendudukHidupByNikData: vi.fn(),
}));

vi.mock("@/features/layanan-mandiri/application/ajukan-surat", () => ({
  getJenisSuratKiosk: vi.fn(async () => null),
  listJenisSuratKiosk: vi.fn(async () => []),
  listPermohonanKiosk: vi.fn(async () => []),
  simpanPermohonanSurat: vi.fn(async () => ({ id: 9, noAntrian: "AN-9" })),
}));

const perangkat = (overrides: Partial<AnjunganDTO> = {}): AnjunganDTO => ({
  id: 1,
  villageId: 2,
  nama: "Kiosk Balai Desa",
  deskripsi: null,
  aktif: 1,
  urutan: 0,
  uuid: "0f8fad5b-d9cb-469f-a165-70867728950e",
  ipAddress: null,
  macAddress: null,
  ipAddressPortPrinter: null,
  keyboard: 1,
  orientasiLayar: 1,
  permohonanSuratTanpaAkun: 1,
  status: "aktif",
  ...overrides,
});

const sesi = {
  letterTypeId: 3,
  isian: {},
  noHpAktif: "",
  keterangan: "",
  berkas: new Map(),
};

describe("bukaSesiGuestKioskData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(penduduk.cariPendudukHidupByNikData).mockResolvedValue({
      id: 5,
      nama: "Siti Aminah",
      nik: "3201234567890123",
      tanggalLahir: "1990-05-17",
    });
  });

  it("menerbitkan token saat NIK dan tanggal lahir cocok", async () => {
    const hasil = await bukaSesiGuestKioskData(2, perangkat(), {
      nik: "3201234567890123",
      tanggalLahir: "1990-05-17",
    });

    expect(penduduk.cariPendudukHidupByNikData).toHaveBeenCalledWith(2, "3201234567890123");
    expect(hasil.nama).toBe("Siti Aminah");
    expect(await bacaSesiGuestKioskData(2, perangkat(), hasil.token)).toMatchObject({
      residentId: 5,
      villageId: 2,
      nama: "Siti Aminah",
    });
  });

  it("menolak tanggal lahir yang tidak cocok", async () => {
    await expect(
      bukaSesiGuestKioskData(2, perangkat(), {
        nik: "3201234567890123",
        tanggalLahir: "1991-01-01",
      }),
    ).rejects.toThrow(/tidak cocok/i);
  });

  it("menolak perangkat yang tidak mengizinkan permohonan tanpa akun", async () => {
    await expect(
      bukaSesiGuestKioskData(2, perangkat({ permohonanSuratTanpaAkun: 0 }), {
        nik: "3201234567890123",
        tanggalLahir: "1990-05-17",
      }),
    ).rejects.toThrow(/tidak tersedia/i);
    expect(penduduk.cariPendudukHidupByNikData).not.toHaveBeenCalled();
  });
});

describe("bacaSesiGuestKioskData", () => {
  it("mengabaikan token desa lain dan perangkat tanpa izin", async () => {
    const token = buatTokenGuest({ residentId: 5, villageId: 99, nama: "Siti" }, SECRET);

    expect(await bacaSesiGuestKioskData(2, perangkat(), token)).toBeNull();
    expect(
      await bacaSesiGuestKioskData(2, perangkat({ permohonanSuratTanpaAkun: 0 }), token),
    ).toBeNull();
    expect(await bacaSesiGuestKioskData(2, perangkat(), null)).toBeNull();
  });
});

describe("ajukanSuratKioskData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("memakai residentId dari sesi, bukan dari input", async () => {
    const token = buatTokenGuest({ residentId: 5, villageId: 2, nama: "Siti" }, SECRET);
    const sesiGuest = await bacaSesiGuestKioskData(2, perangkat(), token);

    await ajukanSuratKioskData(2, perangkat(), sesiGuest, sesi);

    expect(surat.simpanPermohonanSurat).toHaveBeenCalledWith(2, 5, sesi);
  });

  it("menolak bila sesi kiosk tidak ada", async () => {
    await expect(ajukanSuratKioskData(2, perangkat(), null, sesi)).rejects.toThrow(
      /sesi kiosk berakhir/i,
    );
    expect(surat.simpanPermohonanSurat).not.toHaveBeenCalled();
  });
});

describe("daftarJenisSuratKioskData", () => {
  it("meneruskan daftar surat untuk perangkat yang berhak", async () => {
    await daftarJenisSuratKioskData(2, perangkat());
    expect(surat.listJenisSuratKiosk).toHaveBeenCalledWith(2);
  });
});
