import { describe, expect, it } from "vitest";

import {
  generateApbdesTemplate,
  normalizePagu,
  parseApbdesFile,
  transformToUpsert,
  validateApbdesRows,
  type ApbdesTemplateRow,
} from "@/features/keuangan/domain/apbdes-import";

describe("apbdes-import", () => {
  describe("normalizePagu", () => {
    it("formats integer values", () => {
      expect(normalizePagu("50000000")).toBe("50000000.00");
    });

    it("formats decimal values", () => {
      expect(normalizePagu("50000.5")).toBe("50000.50");
    });

    it("handles empty string as zero", () => {
      expect(normalizePagu("")).toBe("0.00");
    });

    it("handles negative values as zero", () => {
      expect(normalizePagu("-100")).toBe("0.00");
    });
  });

  describe("validateApbdesRows", () => {
    it("validates correct rows", () => {
      const rows: ApbdesTemplateRow[] = [
        {
          kode_rekening: "4",
          nama: "PENDAPATAN",
          pagu: "0",
          bidang: "",
          kelompok: "",
          subkelompok: "",
          akun: "4",
          sumber_dana: "",
          level: 1,
          parent_kode: null,
        },
        {
          kode_rekening: "4.1",
          nama: "PENDAPATAN ASLI DESA",
          pagu: "0",
          bidang: "Pendapatan",
          kelompok: "4.1",
          subkelompok: "",
          akun: "4",
          sumber_dana: "",
          level: 2,
          parent_kode: "4",
        },
      ];

      const { validRows, results } = validateApbdesRows(rows);
      expect(validRows).toHaveLength(2);
      expect(results).toHaveLength(2);
      expect(results[0]?.valid).toBe(true);
      expect(results[1]?.valid).toBe(true);
    });

    it("rejects invalid level/kode mismatch", () => {
      const rows: ApbdesTemplateRow[] = [
        {
          kode_rekening: "4.1",
          nama: "TEST",
          pagu: "0",
          bidang: "",
          kelompok: "",
          subkelompok: "",
          akun: "",
          sumber_dana: "",
          level: 1,
          parent_kode: null,
        },
      ];

      const { validRows, results } = validateApbdesRows(rows);
      expect(validRows).toHaveLength(0);
      expect(results[0]?.valid).toBe(false);
      expect(results[0]?.errors[0]).toContain("Level tidak konsisten");
    });

    it("rejects duplicate codes", () => {
      const rows: ApbdesTemplateRow[] = [
        {
          kode_rekening: "4",
          nama: "PENDAPATAN",
          pagu: "0",
          bidang: "",
          kelompok: "",
          subkelompok: "",
          akun: "",
          sumber_dana: "",
          level: 1,
          parent_kode: null,
        },
        {
          kode_rekening: "4",
          nama: "DUPLICATE",
          pagu: "0",
          bidang: "",
          kelompok: "",
          subkelompok: "",
          akun: "",
          sumber_dana: "",
          level: 1,
          parent_kode: null,
        },
      ];

      const { validRows, results } = validateApbdesRows(rows);
      expect(validRows).toHaveLength(1);
      expect(results[1]?.valid).toBe(false);
      expect(results[1]?.errors[0]).toContain("duplikat");
    });

    it("rejects negative pagu", () => {
      const rows: ApbdesTemplateRow[] = [
        {
          kode_rekening: "4",
          nama: "PENDAPATAN",
          pagu: "-100",
          bidang: "",
          kelompok: "",
          subkelompok: "",
          akun: "",
          sumber_dana: "",
          level: 1,
          parent_kode: null,
        },
      ];

      const { validRows } = validateApbdesRows(rows);
      expect(validRows).toHaveLength(0);
    });
  });

  describe("transformToUpsert", () => {
    it("transforms rows to upsert format", () => {
      const rows: ApbdesTemplateRow[] = [
        {
          kode_rekening: "4.1.1.01",
          nama: "Hasil BUMDes",
          pagu: "50000000",
          bidang: "",
          kelompok: "",
          subkelompok: "",
          akun: "",
          sumber_dana: "",
          level: 4,
          parent_kode: "4.1.1",
        },
      ];

      const upsert = transformToUpsert(rows, 1, 2025, "user-123");
      expect(upsert).toHaveLength(1);
      expect(upsert[0]).toEqual({
        villageId: 1,
        templateUuid: "4.1.1.01",
        tahun: 2025,
        anggaran: "50000000.00",
        realisasi: "0.00",
        createdBy: "user-123",
      });
    });
  });

  describe("generateApbdesTemplate", () => {
    it("generates valid Excel template", async () => {
      const buffer = await generateApbdesTemplate();
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);

      // Should start with ZIP header (PK)
      expect(buffer.subarray(0, 2).toString("binary")).toBe("PK");
    });
  });

  describe("parseApbdesFile", () => {
    it("parses CSV data", async () => {
      const csv = `kode_rekening,nama,pagu,bidang,kelompok,subkelompok,akun,sumber_dana,level,parent_kode
4,PENDAPATAN,0,,,,4,,1,
4.1,PENDAPATAN ASLI DESA,0,Pendapatan,4.1,,4,,2,4`;

      const buffer = Buffer.from(csv);
      const rows = await parseApbdesFile(buffer, "test.csv");

      expect(rows[0]?.kode_rekening).toBe("4");
      expect(rows[0]?.nama).toBe("PENDAPATAN");
      expect(rows[1]?.kode_rekening).toBe("4.1");
      expect(rows[1]?.parent_kode).toBe("4");
    });
  });
});
