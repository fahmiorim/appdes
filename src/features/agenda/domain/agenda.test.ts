import { describe, expect, it } from "vitest";

import {
  agendaFormSchema,
  agendaJamLabel,
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

  it("menerima jam, kategori, dan status kegiatan", () => {
    const hasil = agendaFormSchema.safeParse({
      judul: "Posyandu Balita",
      mulai: "2026-11-21",
      jamMulai: "08:00",
      jamSelesai: "11:30",
      kategori: "kesehatan",
      status: "berlangsung",
    });

    expect(hasil.success).toBe(true);
    if (hasil.success) {
      expect(hasil.data.jamMulai).toBe("08:00");
      expect(hasil.data.jamSelesai).toBe("11:30");
      expect(hasil.data.kategori).toBe("kesehatan");
      expect(hasil.data.status).toBe("berlangsung");
    }
  });

  it("memberi default kategori umum dan status rencana", () => {
    const hasil = agendaFormSchema.safeParse({ judul: "Rapat", mulai: "2026-11-20" });

    expect(hasil.success).toBe(true);
    if (hasil.success) {
      expect(hasil.data.kategori).toBe("umum");
      expect(hasil.data.status).toBe("rencana");
      expect(hasil.data.jamMulai).toBeNull();
      expect(hasil.data.jamSelesai).toBeNull();
    }
  });

  it("menerima jam berdetik dari database dan menormalkannya", () => {
    const hasil = agendaFormSchema.safeParse({
      judul: "Rapat",
      mulai: "2026-11-20",
      jamMulai: "09:00:00",
      jamSelesai: "12:30:00",
    });

    expect(hasil.success).toBe(true);
    if (hasil.success) {
      expect(hasil.data.jamMulai).toBe("09:00");
      expect(hasil.data.jamSelesai).toBe("12:30");
    }
  });

  it("menolak format jam yang tidak valid", () => {
    const hasil = agendaFormSchema.safeParse({
      judul: "Rapat",
      mulai: "2026-11-20",
      jamMulai: "25:00",
    });

    expect(hasil.success).toBe(false);
    if (!hasil.success) {
      expect(hasil.error.issues.map((issue) => issue.path.join("."))).toContain("jamMulai");
    }
  });

  it("menolak jam selesai tanpa jam mulai", () => {
    const hasil = agendaFormSchema.safeParse({
      judul: "Rapat",
      mulai: "2026-11-20",
      jamSelesai: "12:00",
    });

    expect(hasil.success).toBe(false);
    if (!hasil.success) {
      expect(hasil.error.issues.map((issue) => issue.path.join("."))).toContain("jamMulai");
    }
  });

  it("menolak jam selesai yang mendahului jam mulai pada hari yang sama", () => {
    const hasil = agendaFormSchema.safeParse({
      judul: "Rapat",
      mulai: "2026-11-20",
      jamMulai: "13:00",
      jamSelesai: "09:00",
    });

    expect(hasil.success).toBe(false);
    if (!hasil.success) {
      expect(hasil.error.issues.map((issue) => issue.path.join("."))).toContain("jamSelesai");
    }
  });

  it("mengizinkan jam lebih awal pada kegiatan lintas hari", () => {
    const hasil = agendaFormSchema.safeParse({
      judul: "Kemah Bakti",
      mulai: "2026-11-20",
      selesai: "2026-11-21",
      jamMulai: "19:00",
      jamSelesai: "06:00",
    });

    expect(hasil.success).toBe(true);
  });

  it("menolak status agenda di luar daftar", () => {
    const hasil = agendaFormSchema.safeParse({
      judul: "Rapat",
      mulai: "2026-11-20",
      status: "dibatalkan",
    });

    expect(hasil.success).toBe(false);
    if (!hasil.success) {
      expect(hasil.error.issues.map((issue) => issue.path.join("."))).toContain("status");
    }
  });
});

describe("agendaJamLabel", () => {
  it("merangkai rentang jam dan membuang detik", () => {
    expect(agendaJamLabel("09:00:00", "12:00:00")).toBe("09.00–12.00");
  });

  it("menampilkan satu jam bila selesai kosong atau sama", () => {
    expect(agendaJamLabel("09:00", null)).toBe("09.00");
    expect(agendaJamLabel("09:00", "09:00")).toBe("09.00");
  });

  it("mengembalikan null bila jam mulai belum diisi", () => {
    expect(agendaJamLabel(null, null)).toBeNull();
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
