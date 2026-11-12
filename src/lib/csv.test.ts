import { describe, expect, it } from "vitest";

import { csvCell, toCsv } from "@/lib/csv";

describe("csvCell", () => {
  it("mengutip pemisah, kutip, dan baris baru", () => {
    expect(csvCell("biasa")).toBe("biasa");
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('kata "kutip"')).toBe('"kata ""kutip"""');
    expect(csvCell("baris\nbaru")).toBe('"baris\nbaru"');
    expect(csvCell("a,b", ",")).toBe('"a,b"');
  });

  it("melindungi formula tanpa merusak angka negatif", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("\t@SUM(A1)")).toBe("'\t@SUM(A1)");
    expect(csvCell("-5")).toBe("-5");
    expect(csvCell("-5,5")).toBe("-5,5");
  });
});

describe("toCsv", () => {
  it("menggabungkan baris dengan CRLF dan pemisah yang dipilih", () => {
    expect(
      toCsv(
        [
          ["a", "b"],
          ["c", "d"],
        ],
        ",",
      ),
    ).toBe("a,b\r\nc,d");
  });

  it("melindungi formula dan escaping saat menyusun CSV dengan koma", () => {
    expect(
      toCsv(
        [
          ["Nama", "Identitas"],
          ['=HYPERLINK("https://example.invalid","klik")', 'Nama, "contoh"\nbaris kedua'],
        ],
        ",",
      ),
    ).toBe(
      'Nama,Identitas\r\n\'=HYPERLINK(""https://example.invalid"",""klik"")","Nama, ""contoh""\nbaris kedua"',
    );
  });
});
