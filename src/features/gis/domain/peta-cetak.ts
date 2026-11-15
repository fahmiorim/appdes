/**
 * Peta cetak statis.
 *
 * Peta publik memakai Leaflet + tile daring, yang tidak ikut tercetak saat
 * halaman dicetak. Modul ini mengubah layer GeoJSON menjadi koordinat SVG
 * sehingga laporan peta tetap tampil tanpa jaringan dan dapat diuji murni.
 */

import type { AreaDTO, GarisDTO, PointDTO, PolygonDTO } from "./gis";

export interface KoordinatPeta {
  lat: number;
  lon: number;
}

export interface TitikPeta {
  x: number;
  y: number;
}

export type JenisLayerCetak = "area" | "garis" | "titik";

export interface LayerCetak {
  id: string;
  nama: string;
  warna: string;
  jenis: JenisLayerCetak;
  titik: TitikPeta[];
}

export interface LegendaCetak {
  nama: string;
  warna: string;
  jenis: JenisLayerCetak;
}

export interface PetaCetak {
  lebar: number;
  tinggi: number;
  kosong: boolean;
  layers: LayerCetak[];
  legenda: LegendaCetak[];
}

export interface OpsiPetaCetak {
  lebar?: number;
  tinggi?: number;
  padding?: number;
}

type TipeGeoJson = "Polygon" | "LineString" | "Point";

/** Validasi satu pasangan [bujur, lintang] GeoJSON. */
function koordinatValid(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    Math.abs(value[0]) <= 180 &&
    Math.abs(value[1]) <= 90
  );
}

/**
 * Urai path GeoJSON menjadi koordinat peta.
 *
 * Tipe harus sesuai agar polygon tidak tergambar sebagai garis (dan
 * sebaliknya). Satu koordinat tidak valid membatalkan seluruh path supaya peta
 * tidak menampilkan bentuk yang menyesatkan.
 */
export function parseGeoJsonKoordinat(path: string | null, tipe: TipeGeoJson): KoordinatPeta[] {
  if (!path) return [];
  try {
    const parsed = JSON.parse(path) as { type?: string; coordinates?: unknown };
    if (parsed.type !== tipe || !Array.isArray(parsed.coordinates)) return [];

    const mentah =
      tipe === "Point"
        ? [parsed.coordinates]
        : tipe === "Polygon"
          ? parsed.coordinates[0]
          : parsed.coordinates;

    if (!Array.isArray(mentah) || mentah.length === 0) return [];
    if (!mentah.every(koordinatValid)) return [];

    return (mentah as [number, number][]).map(([lon, lat]) => ({ lat, lon }));
  } catch {
    return [];
  }
}

/**
 * Urai path GeoJSON poligon menjadi daftar ring luar.
 *
 * Menerima geometry `Polygon`/`MultiPolygon` maupun `Feature` yang
 * membungkusnya. Seluruh koordinat wajib valid (termasuk batas bujur/lintang);
 * satu koordinat rusak membatalkan seluruh path agar bentuk tidak menyesatkan.
 */
export function parseGeoJsonRings(path: string | null): KoordinatPeta[][] {
  if (!path) return [];

  try {
    const parsed = JSON.parse(path) as {
      type?: string;
      coordinates?: unknown;
      geometry?: { type?: string; coordinates?: unknown } | null;
    };
    const geometry = parsed.type === "Feature" ? parsed.geometry : parsed;
    if (!geometry?.type || !Array.isArray(geometry.coordinates)) return [];

    let kandidat: unknown[];
    if (geometry.type === "Polygon") {
      kandidat = [geometry.coordinates[0]];
    } else if (geometry.type === "MultiPolygon") {
      kandidat = geometry.coordinates.map((polygon) =>
        Array.isArray(polygon) ? polygon[0] : undefined,
      );
    } else {
      return [];
    }

    const rings: KoordinatPeta[][] = [];
    for (const kandidatRing of kandidat) {
      if (!Array.isArray(kandidatRing) || kandidatRing.length < 3) return [];

      const ring: KoordinatPeta[] = [];
      for (const titik of kandidatRing) {
        if (!koordinatValid(titik)) return [];
        ring.push({ lat: titik[1], lon: titik[0] });
      }
      rings.push(ring);
    }

    return rings;
  } catch {
    return [];
  }
}

interface Batas {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

function hitungBatas(daftar: readonly KoordinatPeta[]): Batas | null {
  if (daftar.length === 0) return null;

  let minLat = daftar[0]!.lat;
  let maxLat = daftar[0]!.lat;
  let minLon = daftar[0]!.lon;
  let maxLon = daftar[0]!.lon;

  for (const titik of daftar) {
    minLat = Math.min(minLat, titik.lat);
    maxLat = Math.max(maxLat, titik.lat);
    minLon = Math.min(minLon, titik.lon);
    maxLon = Math.max(maxLon, titik.lon);
  }

  return { minLat, maxLat, minLon, maxLon };
}

function skalaKanvas(batas: Batas, lebar: number, tinggi: number, padding: number) {
  const lebarIsi = Math.max(1, lebar - padding * 2);
  const tinggiIsi = Math.max(1, tinggi - padding * 2);
  const spanLon = Math.max(1e-9, batas.maxLon - batas.minLon);
  const spanLat = Math.max(1e-9, batas.maxLat - batas.minLat);
  const skala = Math.min(lebarIsi / spanLon, tinggiIsi / spanLat);

  return {
    lebarIsi,
    tinggiIsi,
    skala,
    lebarKonten: spanLon * skala,
    tinggiKonten: spanLat * skala,
  };
}

function proyeksikan(
  koordinat: readonly KoordinatPeta[],
  batas: Batas,
  lebar: number,
  tinggi: number,
  padding: number,
): TitikPeta[] {
  const { skala } = skalaKanvas(batas, lebar, tinggi, padding);

  return koordinat.map((titik) => ({
    x: Math.round((padding + (titik.lon - batas.minLon) * skala) * 100) / 100,
    y: Math.round((padding + (batas.maxLat - titik.lat) * skala) * 100) / 100,
  }));
}

/**
 * Proyeksikan beberapa kelompok ring ke satu kanvas dengan skala bersama.
 *
 * Dipakai peta publik yang menggambar beberapa area sekaligus: semua bentuk
 * harus memakai skala yang sama agar posisi relatifnya benar. Hasil disusun
 * mengikuti urutan kelompok dan ring masukan.
 */
export function proyeksikanKelompokRings(
  kelompok: readonly (readonly KoordinatPeta[][])[],
  opsi: OpsiPetaCetak = {},
): TitikPeta[][][] {
  const lebar = opsi.lebar ?? 1000;
  const tinggi = opsi.tinggi ?? 600;
  const padding = opsi.padding ?? 32;
  const batas = hitungBatas(kelompok.flat(2));
  if (!batas) return [];

  const { lebarIsi, tinggiIsi, skala, lebarKonten, tinggiKonten } = skalaKanvas(
    batas,
    lebar,
    tinggi,
    padding,
  );
  const offsetX = padding + (lebarIsi - lebarKonten) / 2;
  const offsetY = padding + (tinggiIsi - tinggiKonten) / 2;

  return kelompok.map((grup) =>
    grup.map((ring) =>
      ring.map((titik) => ({
        x: Math.round((offsetX + (titik.lon - batas.minLon) * skala) * 100) / 100,
        y: Math.round((offsetY + (batas.maxLat - titik.lat) * skala) * 100) / 100,
      })),
    ),
  );
}

/**
 * Bangun peta cetak dari layer publik.
 *
 * Area diwarnai mengikuti polygon rujukannya; garis dan titik memakai warna
 * tetap agar legenda mudah dibaca. Layer tanpa path valid dilewati.
 */
export function bangunPetaCetak(
  input: {
    areas: readonly AreaDTO[];
    garises: readonly GarisDTO[];
    points: readonly PointDTO[];
    polygons: readonly PolygonDTO[];
  },
  opsi: OpsiPetaCetak = {},
): PetaCetak {
  const lebar = opsi.lebar ?? 800;
  const tinggi = opsi.tinggi ?? 560;
  const padding = opsi.padding ?? 32;
  const polygonById = new Map(input.polygons.map((polygon) => [polygon.id, polygon]));

  const layers: Array<Omit<LayerCetak, "titik"> & { koordinat: KoordinatPeta[] }> = [];
  const legenda: LegendaCetak[] = [];
  const legendaTerpakai = new Set<string>();

  function tambahLegenda(nama: string, warna: string, jenis: JenisLayerCetak) {
    const kunci = `${jenis}:${nama}:${warna}`;
    if (legendaTerpakai.has(kunci)) return;
    legendaTerpakai.add(kunci);
    legenda.push({ nama, warna, jenis });
  }

  for (const area of input.areas) {
    const koordinat = parseGeoJsonKoordinat(area.path, "Polygon");
    if (koordinat.length < 3) continue;

    const polygon = area.refPolygon ? polygonById.get(area.refPolygon) : undefined;
    const warna = polygon?.color ?? "#10b981";
    const namaLegenda = polygon?.nama ?? "Area Lainnya";

    layers.push({
      id: `area-${area.id}`,
      nama: area.nama,
      warna,
      jenis: "area",
      koordinat,
    });
    tambahLegenda(namaLegenda, warna, "area");
  }

  for (const garis of input.garises) {
    const koordinat = parseGeoJsonKoordinat(garis.path, "LineString");
    if (koordinat.length < 2) continue;

    layers.push({
      id: `garis-${garis.id}`,
      nama: garis.nama,
      warna: "#f59e0b",
      jenis: "garis",
      koordinat,
    });
    tambahLegenda("Garis / Jalan", "#f59e0b", "garis");
  }

  for (const point of input.points) {
    const koordinat = parseGeoJsonKoordinat(point.path, "Point");
    if (koordinat.length === 0) continue;

    layers.push({
      id: `titik-${point.id}`,
      nama: point.nama,
      warna: "#dc2626",
      jenis: "titik",
      koordinat,
    });
    tambahLegenda("Titik Lokasi", "#dc2626", "titik");
  }

  const batas = hitungBatas(layers.flatMap((layer) => layer.koordinat));
  if (!batas) {
    return { lebar, tinggi, kosong: true, layers: [], legenda: [] };
  }

  return {
    lebar,
    tinggi,
    kosong: false,
    layers: layers.map((layer) => ({
      id: layer.id,
      nama: layer.nama,
      warna: layer.warna,
      jenis: layer.jenis,
      titik: proyeksikan(layer.koordinat, batas, lebar, tinggi, padding),
    })),
    legenda,
  };
}

/** Representasi SVG untuk satu layer (polygon, polyline, atau lingkaran). */
export function pathSvg(layer: LayerCetak): {
  elemen: "polygon" | "polyline" | "circle";
  points?: string;
} {
  if (layer.jenis === "area") {
    return { elemen: "polygon", points: layer.titik.map((t) => `${t.x},${t.y}`).join(" ") };
  }
  if (layer.jenis === "garis") {
    return { elemen: "polyline", points: layer.titik.map((t) => `${t.x},${t.y}`).join(" ") };
  }
  return { elemen: "circle" };
}
