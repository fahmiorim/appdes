import { describe, expect, it } from "vitest";

import { jurnalFormSchema, saldoBankFormSchema } from "./jurnal";

function jurnalIsian(overrides: Record<string, unknown> = {}) {
  return {
    tahun: "2026",
    tanggal: "2026-10-30",
    kodeRekening: "1.1.1",
    uraian: "Penerimaan pajak desa",
    debet: "1500000",
    kredit: "0",
    ...overrides,
  };
}

describe("jurnalFormSchema", () => {
  it("menerima mutasi debet saja dan mengubah angka menjadi number", () => {
    const parsed = jurnalFormSchema.safeParse(jurnalIsian());

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tahun).toBe(2026);
      expect(parsed.data.debet).toBe(1500000);
      expect(parsed.data.kredit).toBe(0);
    }
  });

  it("menerima mutasi kredit saja", () => {
    const parsed = jurnalFormSchema.safeParse(jurnalIsian({ debet: "0", kredit: "250000" }));

    expect(parsed.success).toBe(true);
  });

  it("menolak debet dan kredit yang diisi bersamaan", () => {
    const parsed = jurnalFormSchema.safeParse(jurnalIsian({ debet: "1000", kredit: "1000" }));

    expect(parsed.success).toBe(false);
  });

  it("menolak baris tanpa debet maupun kredit", () => {
    const parsed = jurnalFormSchema.safeParse(jurnalIsian({ debet: "0", kredit: "0" }));

    expect(parsed.success).toBe(false);
  });

  it("menolak nilai negatif", () => {
    for (const nilai of ["-1", -500]) {
      const parsed = jurnalFormSchema.safeParse(jurnalIsian({ debet: nilai, kredit: "0" }));

      expect(parsed.success).toBe(false);
    }
  });

  it("menolak tanggal di luar format ISO", () => {
    const parsed = jurnalFormSchema.safeParse(jurnalIsian({ tanggal: "30/10/2026" }));

    expect(parsed.success).toBe(false);
  });

  it("menolak tahun anggaran di luar rentang 2000–2100", () => {
    for (const tahun of ["1999", "2101", "2026.5"]) {
      const parsed = jurnalFormSchema.safeParse(jurnalIsian({ tahun }));
      expect(parsed.success).toBe(false);
    }
  });

  it("memangkas spasi dan menolak uraian terlalu pendek", () => {
    const valid = jurnalFormSchema.safeParse(
      jurnalIsian({ kodeRekening: "  1.1.1  ", uraian: "  Pajak desa  " }),
    );
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.kodeRekening).toBe("1.1.1");
      expect(valid.data.uraian).toBe("Pajak desa");
    }

    for (const uraian of ["", "  ", "ab"]) {
      const parsed = jurnalFormSchema.safeParse(jurnalIsian({ uraian }));
      expect(parsed.success).toBe(false);
    }
  });

  it("mengosongkan referensi opsional menjadi undefined", () => {
    const parsed = jurnalFormSchema.safeParse(jurnalIsian({ referensi: "   " }));

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.referensi).toBeUndefined();
  });
});

describe("saldoBankFormSchema", () => {
  it("menerima saldo awal valid dan memangkas nama bank", () => {
    const parsed = saldoBankFormSchema.safeParse({
      tahun: "2026",
      rekeningBank: " 123-456  ",
      namaBank: "  Bank Desa  ",
      saldoAwal: "7500000",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.rekeningBank).toBe("123-456");
      expect(parsed.data.namaBank).toBe("Bank Desa");
      expect(parsed.data.saldoAwal).toBe(7500000);
    }
  });

  it("memakai saldo awal nol bila tidak diisi", () => {
    const parsed = saldoBankFormSchema.safeParse({
      tahun: 2026,
      rekeningBank: "123-456",
      namaBank: "Bank Desa",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.saldoAwal).toBe(0);
  });

  it("menolak rekening atau nama bank kosong", () => {
    const tanpaRekening = saldoBankFormSchema.safeParse({
      tahun: 2026,
      rekeningBank: "   ",
      namaBank: "Bank Desa",
      saldoAwal: "0",
    });
    const tanpaNama = saldoBankFormSchema.safeParse({
      tahun: 2026,
      rekeningBank: "123-456",
      namaBank: "",
      saldoAwal: "0",
    });

    expect(tanpaRekening.success).toBe(false);
    expect(tanpaNama.success).toBe(false);
  });

  it("menolak saldo awal negatif", () => {
    const parsed = saldoBankFormSchema.safeParse({
      tahun: 2026,
      rekeningBank: "123-456",
      namaBank: "Bank Desa",
      saldoAwal: "-1000",
    });

    expect(parsed.success).toBe(false);
  });
});
