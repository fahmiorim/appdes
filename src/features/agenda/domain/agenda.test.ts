import { describe, expect, it } from "vitest";

import { agendaFormSchema, agendaLabelTanggal } from "./agenda";

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
