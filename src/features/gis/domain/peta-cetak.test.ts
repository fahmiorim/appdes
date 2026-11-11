import { describe, expect, it } from "vitest";

import type { AreaDTO, GarisDTO, PointDTO, PolygonDTO } from "./gis";
import { bangunPetaCetak, parseGeoJsonKoordinat, pathSvg } from "./peta-cetak";

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
