import { describe, expect, it } from "vitest";

import {
  agendaFormSchema,
  agendaLabelTanggal,
  bulanAgendaDalamRentang,
  geserBulanAgenda,
  rentangBulanAgenda,
} from "./agenda";

describe("agendaFormSchema", () => {
  it("menerima agenda dengan tanggal selesai opsional", () => {
    const hasil = agendaFormSchema.safeParse({
      judul: "Musyawarah Desa",
      mulai: "2026-11-20",
      selesai: "",
      lokasi: "Balai Desa",
      deskripsi: "Pembahasan rencana kerja tahun depan.",
      tayang: true,
    });

    expect(hasil.success).toBe(true);
    if (hasil.success) {
      expect(hasil.data.selesai).toBeNull();
      expect(hasil.data.tayang).toBe(true);
    }
  });

  it("menolak tanggal selesai yang mendahului tanggal mulai", () => {
    const hasil = agendaFormSchema.safeParse({
      judul: "Musyawarah Desa",
      mulai: "2026-11-20",
      selesai: "2026-11-19",
      tayang: true,
    });

    expect(hasil.success).toBe(false);
    if (!hasil.success) {
      expect(hasil.error.issues.map((issue) => issue.path.join("."))).toContain("selesai");
    }
  });

  it("menolak judul kosong dan tanggal tidak valid", () => {
    expect(agendaFormSchema.safeParse({ judul: "  ", mulai: "2026-11-20" }).success).toBe(false);
    expect(agendaFormSchema.safeParse({ judul: "Rapat", mulai: "20-11-2026" }).success).toBe(false);
  });

  it("menganggap agenda tanpa pilihan tayang sebagai tidak tayang", () => {
    const hasil = agendaFormSchema.safeParse({ judul: "Rapat", mulai: "2026-11-20" });
    expect(hasil.success).toBe(true);
    if (hasil.success) expect(hasil.data.tayang).toBe(false);
  });
});

describe("kalender agenda", () => {
  it("menggeser bulan melewati batas tahun", () => {
    expect(geserBulanAgenda({ tahun: 2026, bulan: 1 }, -1)).toEqual({ tahun: 2025, bulan: 12 });
    expect(geserBulanAgenda({ tahun: 2026, bulan: 12 }, 1)).toEqual({ tahun: 2027, bulan: 1 });
  });

  it("menghitung rentang setengah-terbuka satu bulan", () => {
    expect(rentangBulanAgenda(2026, 11)).toEqual({
      mulai: "2026-11-01",
      selesai: "2026-12-01",
    });
    expect(rentangBulanAgenda(2026, 12)).toEqual({
      mulai: "2026-12-01",
      selesai: "2027-01-01",
    });
    expect(rentangBulanAgenda(2028, 2)).toEqual({
      mulai: "2028-02-01",
      selesai: "2028-03-01",
    });
  });

  it("menolak navigasi di luar rentang tahun yang dilayani", () => {
    expect(bulanAgendaDalamRentang({ tahun: 2025, bulan: 12 }, 2025, 2028)).toBe(true);
    expect(bulanAgendaDalamRentang({ tahun: 2024, bulan: 12 }, 2025, 2028)).toBe(false);
    expect(bulanAgendaDalamRentang({ tahun: 2029, bulan: 1 }, 2025, 2028)).toBe(false);
    expect(bulanAgendaDalamRentang({ tahun: 2026, bulan: 13 }, 2025, 2028)).toBe(false);
  });
});

describe("agendaLabelTanggal", () => {
  it("merangkai rentang tanggal dalam satu bulan", () => {
    expect(agendaLabelTanggal("2026-11-20", "2026-11-22")).toBe("20–22 November 2026");
  });

  it("menampilkan satu tanggal bila selesai kosong atau sama", () => {
    expect(agendaLabelTanggal("2026-11-20", null)).toBe("20 November 2026");
    expect(agendaLabelTanggal("2026-11-20", "2026-11-20")).toBe("20 November 2026");
  });

  it("menyebut bulan pada kedua ujung bila berbeda bulan", () => {
    expect(agendaLabelTanggal("2026-11-30", "2026-12-02")).toBe(
      "30 November 2026 – 2 Desember 2026",
    );
  });
});
