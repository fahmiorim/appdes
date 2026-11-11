import { describe, expect, it } from "vitest";

import { suratDinasFormSchema } from "./surat";

describe("suratDinasFormSchema", () => {
  it("menerima surat dinas lengkap", () => {
    const hasil = suratDinasFormSchema.parse({
      letterNumber: "079/SD/44/2026",
      letterDate: "2026-10-24",
      recipient: "Camat",
      subject: "Undangan musyawarah",
      hapusArsip: false,
    });

    expect(hasil.letterNumber).toBe("079/SD/44/2026");
    expect(hasil.subject).toBe("Undangan musyawarah");
    expect(hasil.hapusArsip).toBe(false);
    expect(hasil.classificationId).toBeNull();
  });

  it("menolak nomor/perihal kosong dan tanggal salah", () => {
    expect(
      suratDinasFormSchema.safeParse({ letterNumber: "", letterDate: "2026-10-24", subject: "x" })
        .success,
    ).toBe(false);
    expect(
      suratDinasFormSchema.safeParse({ letterNumber: "1", letterDate: "2026-10-24", subject: "" })
        .success,
    ).toBe(false);
    expect(
      suratDinasFormSchema.safeParse({
        letterNumber: "1",
        letterDate: "tidak-tanggal",
        subject: "x",
      }).success,
    ).toBe(false);
  });
});
