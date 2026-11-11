import { describe, expect, it } from "vitest";

import {
  areaFormSchema,
  cdesaMutasiSchema,
  cdesaSchema,
  garisFormSchema,
  isPolygonActive,
  parseGeoJsonPath,
  persilFormSchema,
  pointFormSchema,
  POLYGON_TIPE_LABELS,
  polygonFormSchema,
  polygonTipeLabel,
  simbolFormSchema,
} from "@/features/gis/domain/gis";

describe("gis: polygonFormSchema", () => {
  it("menerima input valid dan memangkas spasi", () => {
    const result = polygonFormSchema.parse({
      nama: "  Polygon Utama ",
      simbol: "home",
      color: "#FF5733",
      tipe: 0,
      parrent: null,
      enabled: true,
      sortOrder: 0,
    });

    expect(result).toEqual({
      nama: "Polygon Utama",
      simbol: "home",
      color: "#FF5733",
      tipe: 0,
      parrent: null,
      enabled: true,
      sortOrder: 0,
    });
  });

  it("menetapkan default tipe=0, enabled=true, sortOrder=0", () => {
    const result = polygonFormSchema.parse({ nama: "Test" });
    expect(result.tipe).toBe(0);
    expect(result.enabled).toBe(true);
    expect(result.sortOrder).toBe(0);
  });

  it("menolak nama kosong", () => {
    const result = polygonFormSchema.safeParse({ nama: "   " });
    expect(result.success).toBe(false);
  });

  it("menolak warna bukan format HEX 6 digit", () => {
    const invalid = polygonFormSchema.safeParse({ nama: "Test", color: "FF5733" });
    const invalid2 = polygonFormSchema.safeParse({ nama: "Test", color: "#FF573" });
    const invalid3 = polygonFormSchema.safeParse({ nama: "Test", color: "#GG5733" });
    expect(invalid.success).toBe(false);
    expect(invalid2.success).toBe(false);
    expect(invalid3.success).toBe(false);
  });

  it("menolak tipe di luar rentang 0-1", () => {
    const invalid1 = polygonFormSchema.safeParse({ nama: "Test", tipe: -1 });
    const invalid2 = polygonFormSchema.safeParse({ nama: "Test", tipe: 2 });
    expect(invalid1.success).toBe(false);
    expect(invalid2.success).toBe(false);
  });

  it("menolak sortOrder negatif", () => {
    const result = polygonFormSchema.safeParse({ nama: "Test", sortOrder: -1 });
    expect(result.success).toBe(false);
  });
});

describe("gis: areaFormSchema", () => {
  it("menerima input valid", () => {
    const result = areaFormSchema.parse({
      nama: "  Area Perumahan ",
      path: '{"type":"LineString","coordinates":[[106.8, -6.2],[106.9, -6.2]]}',
      refPolygon: 1,
      foto: null,
      desk: "Area perumahan elastis",
      sortOrder: 1,
    });
    expect(result.nama).toBe("Area Perumahan");
    expect(result.refPolygon).toBe(1);
    expect(result.sortOrder).toBe(1);
  });

  it("menetapkan default sortOrder=0", () => {
    const result = areaFormSchema.parse({ nama: "Test" });
    expect(result.sortOrder).toBe(0);
  });

  it("menolak nama kosong", () => {
    const result = areaFormSchema.safeParse({ nama: "   " });
    expect(result.success).toBe(false);
  });

  it("menerima string apapun sebagai path (validasi GeoJSON di lapisan aplikasi)", () => {
    const result = areaFormSchema.safeParse({ nama: "Test", path: "not json" });
    expect(result.success).toBe(true);
  });
});

describe("gis: garisFormSchema", () => {
  it("menerima input valid", () => {
    const result = garisFormSchema.parse({
      nama: "  Jalan Utama ",
      path: '{"type":"LineString","coordinates":[[106.8, -6.2],[106.81, -6.21]]}',
      refLine: 2,
      foto: null,
      desk: "Jalan utama desa",
      sortOrder: 5,
    });
    expect(result.nama).toBe("Jalan Utama");
    expect(result.refLine).toBe(2);
    expect(result.sortOrder).toBe(5);
  });

  it("menolak nama kosong", () => {
    const result = garisFormSchema.safeParse({ nama: "   " });
    expect(result.success).toBe(false);
  });
});

describe("gis: pointFormSchema", () => {
  it("menerima input valid", () => {
    const result = pointFormSchema.parse({
      nama: "  Balai Desa ",
      simbol: "building-2",
      tipe: 1,
      parrent: 1,
      path: '{"type":"Point","coordinates":[106.827, -6.175]}',
    });
    expect(result.nama).toBe("Balai Desa");
    expect(result.simbol).toBe("building-2");
    expect(result.tipe).toBe(1);
    expect(result.parrent).toBe(1);
  });

  it("menolak nama kosong", () => {
    const result = pointFormSchema.safeParse({ nama: "   " });
    expect(result.success).toBe(false);
  });
});

describe("gis: simbolFormSchema", () => {
  it("menerima input valid", () => {
    const result = simbolFormSchema.parse({
      simbol: "home",
      desk: "Simbol rumah",
      sortOrder: 0,
    });
    expect(result.simbol).toBe("home");
  });

  it("menolak simbol kosong", () => {
    const result = simbolFormSchema.safeParse({ simbol: "   " });
    expect(result.success).toBe(false);
  });

  it("menolak simbol terlalu panjang (>40)", () => {
    const result = simbolFormSchema.safeParse({ simbol: "a".repeat(41) });
    expect(result.success).toBe(false);
  });
});

describe("gis: persilFormSchema", () => {
  it("menerima input valid", () => {
    const result = persilFormSchema.parse({
      nomor: "  123-AB ",
      nomorCdesa: "CD-456",
      luas: "1500.75",
      status: "milik",
      path: '{"type":"Polygon","coordinates":[[[106.8,-6.2],[106.81,-6.2],[106.81,-6.21],[106.8,-6.21],[106.8,-6.2]]]}',
      keterangan: "Persil contoh",
      sortOrder: 3,
    });
    expect(result.nomor).toBe("123-AB");
    expect(result.nomorCdesa).toBe("CD-456");
    expect(result.luas).toBe(1500.75);
  });

  it("menolak nomor kosong", () => {
    const result = persilFormSchema.safeParse({ nomor: "   " });
    expect(result.success).toBe(false);
  });

  it("menolak luas negatif", () => {
    const result = persilFormSchema.safeParse({ nomor: "1", luas: -10 });
    expect(result.success).toBe(false);
  });
});

describe("gis: cdesaSchema", () => {
  it("menerima input valid", () => {
    const result = cdesaSchema.parse({
      nomor: "  CDESA-001 ",
      nomorPersil: "123-AB",
      nomorSertifikat: "SERT-789",
      tanggal: "2024-01-15",
      namaPemegang: "Budi Santoso",
      luas: "2000.5",
      keterangan: "Tanah sertifikat",
      sortOrder: 1,
    });
    expect(result.nomor).toBe("CDESA-001");
    expect(result.nomorSertifikat).toBe("SERT-789");
  });

  it("menolak nomor kosong", () => {
    const result = cdesaSchema.safeParse({ nomor: "   " });
    expect(result.success).toBe(false);
  });
});

describe("gis: cdesaMutasiSchema", () => {
  it("menerima input valid", () => {
    const result = cdesaMutasiSchema.parse({
      cdesaId: 5,
      nomor: "  MUTASI-001 ",
      tanggal: "2024-06-01",
      tipe: "pindah",
      keterangan: "Pindah ke desa lain",
      sortOrder: 0,
    });
    expect(result.nomor).toBe("MUTASI-001");
    expect(result.tipe).toBe("pindah");
  });

  it("menolak nomor kosong", () => {
    const result = cdesaMutasiSchema.safeParse({
      cdesaId: 1,
      nomor: "   ",
      tanggal: "2024-01-01",
      tipe: "pindah",
    });
    expect(result.success).toBe(false);
  });

  it("menerima string apapun sebagai tanggal (validasi format di lapisan aplikasi)", () => {
    const result = cdesaMutasiSchema.safeParse({
      cdesaId: 1,
      nomor: "M-1",
      tanggal: "invalid",
      tipe: "pindah",
    });
    expect(result.success).toBe(true);
  });
});

describe("gis: parseGeoJsonPath", () => {
  it("memparsing LineString GeoJSON menjadi array [lon, lat]", () => {
    const path = '{"type":"LineString","coordinates":[[106.8,-6.2],[106.81,-6.21],[106.82,-6.22]]}';
    const result = parseGeoJsonPath(path);
    expect(result).toEqual([
      [106.8, -6.2],
      [106.81, -6.21],
      [106.82, -6.22],
    ]);
  });

  it("mengembalikan null untuk Point (bukan LineString)", () => {
    const path = '{"type":"Point","coordinates":[106.8,-6.2]}';
    const result = parseGeoJsonPath(path);
    expect(result).toBeNull();
  });

  it("mengembalikan null untuk Polygon (bukan LineString)", () => {
    const path =
      '{"type":"Polygon","coordinates":[[[106.8,-6.2],[106.81,-6.2],[106.81,-6.21],[106.8,-6.21],[106.8,-6.2]]]}';
    const result = parseGeoJsonPath(path);
    expect(result).toBeNull();
  });

  it("mengembalikan null untuk JSON tidak valid", () => {
    const result = parseGeoJsonPath("not json");
    expect(result).toBeNull();
  });

  it("mengembalikan null untuk string kosong", () => {
    const result = parseGeoJsonPath("");
    expect(result).toBeNull();
  });
});

describe("gis: isPolygonActive", () => {
  it("mengembalikan true untuk enabled=1", () => {
    expect(isPolygonActive({ enabled: 1 })).toBe(true);
  });

  it("mengembalikan false untuk enabled=0", () => {
    expect(isPolygonActive({ enabled: 0 })).toBe(false);
  });

  it("mengembalikan false untuk enabled bukan 1", () => {
    expect(isPolygonActive({ enabled: 0 })).toBe(false);
    expect(isPolygonActive({ enabled: 2 })).toBe(false);
  });
});

describe("gis: polygonTipeLabel", () => {
  it("mengembalikan label Root untuk tipe 0", () => {
    expect(polygonTipeLabel(0)).toBe(POLYGON_TIPE_LABELS[0]);
  });

  it("mengembalikan label Sub-Polygon untuk tipe 1", () => {
    expect(polygonTipeLabel(1)).toBe(POLYGON_TIPE_LABELS[1]);
  });

  it("mengembalikan 'Tipe N' untuk tipe tidak dikenal", () => {
    expect(polygonTipeLabel(99)).toBe("Tipe 99");
  });

  it("mengembalikan '-' untuk null", () => {
    expect(polygonTipeLabel(null)).toBe("-");
  });
});
