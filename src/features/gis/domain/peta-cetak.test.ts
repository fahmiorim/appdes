import { describe, expect, it } from "vitest";

import type { AreaDTO, GarisDTO, PointDTO, PolygonDTO } from "./gis";
import {
  bangunPetaCetak,
  parseGeoJsonKoordinat,
  parseGeoJsonRings,
  pathSvg,
  proyeksikanKelompokRings,
  type KoordinatPeta,
} from "./peta-cetak";

function polygon(overrides: Partial<PolygonDTO> = {}): PolygonDTO {
  return {
    id: 1,
    villageId: 10,
    nama: "Permukiman",
    simbol: null,
    color: "#3b82f6",
    tipe: 0,
    parrent: null,
    enabled: 1,
    sortOrder: 0,
    ...overrides,
  };
}

function area(overrides: Partial<AreaDTO> = {}): AreaDTO {
  return {
    id: 1,
    villageId: 10,
    refPolygon: 1,
    nama: "Blok A",
    path: JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [110, -7],
          [111, -7],
          [111, -8],
          [110, -7],
        ],
      ],
    }),
    foto: null,
    desk: null,
    enabled: 1,
    sortOrder: 0,
    ...overrides,
  };
}

function garis(overrides: Partial<GarisDTO> = {}): GarisDTO {
  return {
    id: 2,
    villageId: 10,
    refLine: null,
    nama: "Jalan Desa",
    path: JSON.stringify({
      type: "LineString",
      coordinates: [
        [110, -7],
        [110.5, -7.5],
      ],
    }),
    foto: null,
    desk: null,
    enabled: 1,
    sortOrder: 0,
    ...overrides,
  };
}

function point(overrides: Partial<PointDTO> = {}): PointDTO {
  return {
    id: 3,
    villageId: 10,
    nama: "Kantor Desa",
    simbol: null,
    tipe: 0,
    parrent: 1,
    path: JSON.stringify({ type: "Point", coordinates: [110.25, -7.25] }),
    enabled: 1,
    sortOrder: 0,
    ...overrides,
  };
}

describe("parseGeoJsonKoordinat", () => {
  it("mengurai Polygon, LineString, dan Point sesuai tipe", () => {
    expect(parseGeoJsonKoordinat(area().path, "Polygon")).toHaveLength(4);
    expect(parseGeoJsonKoordinat(garis().path, "LineString")).toEqual([
      { lat: -7, lon: 110 },
      { lat: -7.5, lon: 110.5 },
    ]);
    expect(parseGeoJsonKoordinat(point().path, "Point")).toEqual([{ lat: -7.25, lon: 110.25 }]);
  });

  it("menolak tipe yang tidak sesuai dan path rusak", () => {
    expect(parseGeoJsonKoordinat(area().path, "LineString")).toEqual([]);
    expect(parseGeoJsonKoordinat("{rusak", "Polygon")).toEqual([]);
    expect(parseGeoJsonKoordinat(null, "Point")).toEqual([]);
  });

  it("menolak koordinat di luar rentang bumi", () => {
    const path = JSON.stringify({ type: "Point", coordinates: [200, -7] });
    expect(parseGeoJsonKoordinat(path, "Point")).toEqual([]);
  });
});

describe("parseGeoJsonRings", () => {
  const ring = [
    [110, -7],
    [111, -7],
    [111, -8],
    [110, -7],
  ];

  it("menerima Polygon dan Feature yang membungkus Polygon", () => {
    const polygon = JSON.stringify({ type: "Polygon", coordinates: [ring] });
    const feature = JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [ring] },
    });

    expect(parseGeoJsonRings(polygon)).toHaveLength(1);
    expect(parseGeoJsonRings(feature)).toHaveLength(1);
    expect(parseGeoJsonRings(feature)[0]?.[0]).toEqual({ lat: -7, lon: 110 });
  });

  it("mengurai MultiPolygon menjadi ring luar per polygon", () => {
    const path = JSON.stringify({
      type: "MultiPolygon",
      coordinates: [
        [ring],
        [
          [
            [112, -7],
            [113, -7],
            [113, -8],
            [112, -7],
          ],
        ],
      ],
    });

    const rings = parseGeoJsonRings(path);
    expect(rings).toHaveLength(2);
    expect(rings.every((item) => item.length === 4)).toBe(true);
  });

  it("menolak seluruh path bila ada koordinat di luar rentang bumi", () => {
    const lintang = JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [110, -91],
          [111, -7],
          [111, -8],
          [110, -7],
        ],
      ],
    });
    const bujur = JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [181, -7],
          [111, -7],
          [111, -8],
          [110, -7],
        ],
      ],
    });

    expect(parseGeoJsonRings(lintang)).toEqual([]);
    expect(parseGeoJsonRings(bujur)).toEqual([]);
  });

  it("menolak path rusak, tipe lain, dan ring kurang dari tiga titik", () => {
    expect(parseGeoJsonRings(null)).toEqual([]);
    expect(parseGeoJsonRings("{rusak")).toEqual([]);
    expect(parseGeoJsonRings(garis().path)).toEqual([]);
    expect(
      parseGeoJsonRings(
        JSON.stringify({
          type: "Polygon",
          coordinates: [
            [
              [110, -7],
              [111, -7],
            ],
          ],
        }),
      ),
    ).toEqual([]);
  });
});

describe("proyeksikanKelompokRings", () => {
  const ring = (lon: number): KoordinatPeta[] => [
    { lat: -7, lon },
    { lat: -7, lon: lon + 1 },
    { lat: -8, lon: lon + 1 },
    { lat: -7, lon },
  ];

  it("memakai skala bersama dan menaruh lintang utara di atas", () => {
    const hasil = proyeksikanKelompokRings([[ring(110)], [ring(112)]], {
      lebar: 1000,
      tinggi: 600,
      padding: 20,
    });

    expect(hasil).toHaveLength(2);
    for (const grup of hasil) {
      for (const titik of grup[0] ?? []) {
        expect(titik.x).toBeGreaterThanOrEqual(20);
        expect(titik.x).toBeLessThanOrEqual(980);
        expect(titik.y).toBeGreaterThanOrEqual(20);
        expect(titik.y).toBeLessThanOrEqual(580);
      }
    }

    expect(hasil[0]?.[0]?.[0]?.y).toBeLessThan(hasil[0]?.[0]?.[2]?.y ?? 0);
    expect(hasil[0]?.[0]?.[0]?.x).toBeLessThan(hasil[1]?.[0]?.[0]?.x ?? 0);
  });

  it("mengembalikan array kosong tanpa koordinat", () => {
    expect(proyeksikanKelompokRings([])).toEqual([]);
  });
});

describe("bangunPetaCetak", () => {
  it("memproyeksikan koordinat ke dalam kanvas dengan utara di atas", () => {
    const peta = bangunPetaCetak(
      { areas: [area()], garises: [], points: [], polygons: [polygon()] },
      { lebar: 400, tinggi: 300, padding: 20 },
    );

    expect(peta.kosong).toBe(false);
    const titik = peta.layers[0]?.titik ?? [];
    expect(titik).toHaveLength(4);

    for (const item of titik) {
      expect(item.x).toBeGreaterThanOrEqual(20);
      expect(item.x).toBeLessThanOrEqual(380);
      expect(item.y).toBeGreaterThanOrEqual(20);
      expect(item.y).toBeLessThanOrEqual(280);
    }

    // Lintang -7 (lebih utara) harus berada di atas lintang -8.
    expect(titik[0]?.y).toBeLessThan(titik[2]?.y ?? 0);
  });

  it("mengelompokkan legenda menurut polygon, garis, dan titik", () => {
    const peta = bangunPetaCetak({
      areas: [area(), area({ id: 2, refPolygon: null, nama: "Area Bebas" })],
      garises: [garis()],
      points: [point()],
      polygons: [polygon()],
    });

    expect(peta.layers).toHaveLength(4);
    expect(peta.legenda.map((item) => item.nama)).toEqual([
      "Permukiman",
      "Area Lainnya",
      "Garis / Jalan",
      "Titik Lokasi",
    ]);
    expect(peta.layers[1]?.warna).toBe("#10b981");
  });

  it("mengembalikan peta kosong tanpa layer valid", () => {
    const peta = bangunPetaCetak({
      areas: [area({ path: null })],
      garises: [garis({ path: "bukan json" })],
      points: [],
      polygons: [],
    });

    expect(peta).toEqual({ lebar: 800, tinggi: 560, kosong: true, layers: [], legenda: [] });
  });

  it("menentukan elemen SVG sesuai jenis layer", () => {
    const peta = bangunPetaCetak({
      areas: [area()],
      garises: [garis()],
      points: [point()],
      polygons: [polygon()],
    });

    expect(pathSvg(peta.layers[0]!).elemen).toBe("polygon");
    expect(pathSvg(peta.layers[1]!).elemen).toBe("polyline");
    expect(pathSvg(peta.layers[2]!).elemen).toBe("circle");
  });
});
