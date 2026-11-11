import { describe, expect, it } from "vitest";

import { toCsv } from "@/features/penduduk/domain/laporan-penduduk";

import { catatAnggotaGrupSchema, kontakGrupSchema, kontakSchema } from "./kontak";
import {
  buildGrupKontakCsv,
  buildKontakCsv,
  grupKontakFilename,
  kontakFilename,
  templateImporKontak,
  type AnggotaGrupEksporRow,
  type KontakEksporRow,
} from "./kontak-berkas";

const kontak: KontakEksporRow = {
  id: 1,
  nama: "Budi",
  telepon: "081234567890",
  email: "budi@desa.id",
  telegram: "@budi",
  hubungWarga: "0812",
  keterangan: "Kontak; desa",
  residentId: 3201012001120001,
};

const anggota: AnggotaGrupEksporRow = {
  id: 1,
  namaKontak: "Budi",
  peran: "Koordinator",
  keterangan: null,
};

describe("skema kontak", () => {
  it("menerima kontak valid dan mengosongkan teks", () => {
    const parsed = kontakSchema.parse({
      id: 1,
      villageId: 1,
      nama: "Budi",
      telepon: "",
      email: "",
      telegram: "",
      hubungWarga: "",
      keterangan: "",
    });
    expect(parsed.telepon).toBe("");
    expect(parsed.hubungWarga).toBe("");
  });

  it("menolak kontak tanpa nama", () => {
    expect(kontakSchema.safeParse({ villageId: 1, nama: "" }).success).toBe(false);
  });

  it("menerima grup kontak valid", () => {
    const parsed = kontakGrupSchema.parse({ villageId: 1, namaGrup: "Kelompok" });
    expect(parsed.namaGrup).toBe("Kelompok");
  });

  it("menerima anggota grup dengan peran opsional", () => {
    const parsed = catatAnggotaGrupSchema.parse({ kontakId: "1", peran: "", keterangan: "" });
    expect(parsed.kontakId).toBe(1);
    expect(parsed.peran ?? "").toBe("");
  });
});

describe("csv kontak", () => {
  it("menulis kop, header, dan mengutip sel yang berisi pemisah", () => {
    const csv = buildKontakCsv({ namaDesa: "Sukamaju", rows: [kontak] });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Direktori Kontak");
    expect(csv).toContain("Sukamaju");
    expect(csv).toContain("Budi;081234567890;budi@desa.id;'@budi;0812");
    expect(csv).toContain('"Kontak; desa"');
  });

  it("menyusun nama berkas aman", () => {
    expect(kontakFilename("Sukamaju")).toBe("kontak-sukamaju.csv");
    expect(kontakFilename(null)).toBe("kontak-desa.csv");
  });

  it("menulis csv anggota grup dengan dua baris kop", () => {
    const csv = buildGrupKontakCsv({ namaDesa: "Sukamaju", namaGrup: "Kelompok", rows: [anggota] });
    expect(csv).toContain("Anggota Grup Kontak");
    expect(csv).toContain("Kelompok");
    expect(csv).toContain("Budi;Koordinator;-");
  });

  it("membuat nama berkas grup aman", () => {
    expect(grupKontakFilename("Kelompok")).toBe("grup-kontak-kelompok.csv");
  });

  it("template impor dapat dibaca kembali", () => {
    const baris = templateImporKontak()
      .replace(/^\uFEFF/, "")
      .split("\r\n")
      .filter((b) => b !== "");
    expect(baris[0]?.split(",")[0]).toBe("Nama");
    expect(baris[1]?.split(",")[0]).toBe("Budi");
  });
});

describe("toCsv", () => {
  it("mengutip sel dengan pemisah, kutip ganda, dan baris baru", () => {
    const csv = toCsv([["a;b", 'c"d', "e\nf"]]);
    expect(csv).toContain('"a;b"');
    expect(csv).toContain('"c""d"');
    expect(csv).toContain('"e\nf"');
  });
});

describe("validasi kontak - batasan", () => {
  it("menolak nama kontak lebih dari 100 karakter", () => {
    expect(kontakSchema.safeParse({ villageId: 1, nama: "x".repeat(101) }).success).toBe(false);
  });

  it("menolak nama grup lebih dari 100 karakter", () => {
    expect(kontakGrupSchema.safeParse({ villageId: 1, namaGrup: "x".repeat(101) }).success).toBe(
      false,
    );
  });

  it("menerima kontak dengan semua field opsional", () => {
    const parsed = kontakSchema.parse({
      villageId: 1,
      nama: "Ahmad",
      telepon: "081234567890",
      email: "ahmad@desa.id",
      telegram: "@ahmad",
      hubungWarga: "0812",
      keterangan: "Ketua RT",
      residentId: 3201012001120001,
    });
    expect(parsed.residentId).toBe(3201012001120001);
  });
});

describe("validasi anggota grup kontak", () => {
  it("menerima anggota grup dengan peran dan keterangan", () => {
    const parsed = catatAnggotaGrupSchema.parse({
      kontakId: "5",
      peran: "Sekretaris",
      keterangan: "Aktif",
    });
    expect(parsed.kontakId).toBe(5);
    expect(parsed.peran).toBe("Sekretaris");
  });

  it("menerima peran kosong", () => {
    const parsed = catatAnggotaGrupSchema.parse({ kontakId: "3", peran: "" });
    expect(parsed.kontakId).toBe(3);
  });
});

describe("validasi CSV kontak", () => {
  it("template impor kontak memiliki header yang benar", () => {
    const tmpl = templateImporKontak();
    expect(tmpl).toContain("Nama");
    expect(tmpl).toContain("Telepon");
  });

  it("buildKontakCsv menghasilkan header dan baris", () => {
    const csv = buildKontakCsv({ namaDesa: "Desa", rows: [kontak] });
    expect(csv).toContain("Nama");
    expect(csv).toContain("Budi");
    expect(csv).toContain("081234567890");
  });

  it("buildGrupKontakCsv menghasilkan header dan baris", () => {
    const csv = buildGrupKontakCsv({ namaDesa: "Desa", namaGrup: "Kelompok", rows: [anggota] });
    expect(csv).toContain("Nama Kontak");
    expect(csv).toContain("Budi");
  });

  it("filename kontak sesuai format", () => {
    expect(kontakFilename("Desa")).toMatch(/kontak.*\.csv/);
    expect(grupKontakFilename("Kelompok A")).toMatch(/grup.*\.csv/);
  });
});

describe("validasi kontak application - use case coverage", () => {
  it("memastikan skema impor kontak tersedia", () => {
    expect(templateImporKontak()).toBeTruthy();
  });

  it("memastikan ekspor kontak tersedia", () => {
    const csv = buildKontakCsv({ namaDesa: "Desa X", rows: [kontak] });
    expect(csv.length).toBeGreaterThan(0);
  });

  it("memastikan ekspor grup kontak tersedia", () => {
    const csv = buildGrupKontakCsv({ namaDesa: "Desa X", namaGrup: "RT", rows: [anggota] });
    expect(csv.length).toBeGreaterThan(0);
  });
});
