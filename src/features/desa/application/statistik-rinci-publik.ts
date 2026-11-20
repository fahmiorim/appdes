import "server-only";

import { queryRincianStatistik } from "@/features/desa/infrastructure/statistik-rinci-repository";

type Coordinate = [number, number];
function outerRing(raw: string | null): Coordinate[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as {
      type?: string;
      coordinates?: unknown;
      geometry?: { type?: string; coordinates?: unknown };
    };
    const geometry = parsed.type === "Feature" ? parsed.geometry : parsed;
    const coordinates = geometry?.coordinates;
    if (!Array.isArray(coordinates)) return [];
    const polygon = geometry?.type === "MultiPolygon" ? coordinates[0] : coordinates;
    const ring = Array.isArray(polygon) ? polygon[0] : null;
    if (!Array.isArray(ring) || ring.length < 3 || ring.length > 5000) return [];
    return ring.filter(
      (point): point is Coordinate =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1]),
    );
  } catch {
    return [];
  }
}

function projectAreas(rows: { nama: string; deskripsi: string | null; path: string | null }[]) {
  const rings = rows.map((row) => outerRing(row.path));
  const all = rings.flat();
  if (!all.length)
    return rows.map((row) => ({
      nama: row.nama,
      deskripsi: row.deskripsi,
      tersediaPeta: false,
      pathD: null,
    }));
  const xs = all.map((point) => point[0]),
    ys = all.map((point) => point[1]);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const width = Math.max(maxX - minX, 0.000001),
    height = Math.max(maxY - minY, 0.000001);
  const scale = Math.min(360 / width, 220 / height);
  const offsetX = (400 - width * scale) / 2,
    offsetY = (260 - height * scale) / 2;
  return rows.map((row, index) => {
    const ring = rings[index] ?? [];
    const points = ring.map(
      ([x, y]) => [offsetX + (x - minX) * scale, 240 - offsetY - (y - minY) * scale] as const,
    );
    const pathD =
      points.length >= 3
        ? points.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2)).join(" ") +
          " Z"
        : null;
    return { nama: row.nama, deskripsi: row.deskripsi, tersediaPeta: Boolean(pathD), pathD };
  });
}

export async function getRincianStatistikPublik(villageId: number) {
  const rincian = await queryRincianStatistik(villageId);

  const ageOrder = [
    "0–4",
    "5–9",
    "10–14",
    "15–19",
    "20–24",
    "25–29",
    "30–34",
    "35–39",
    "40–44",
    "45–49",
    "50–54",
    "55–59",
    "≥ 60",
  ];
  const ageMap = new Map(rincian.kelompokUsia.map((row) => [row.label, Number(row.total)]));
  return {
    kelompokUsia: ageOrder.map((label) => ({ label, total: ageMap.get(label) ?? 0 })),
    pendidikan: rincian.pendidikan.map((row) => ({
      label: row.label,
      total: Number(row.total),
    })),
    pekerjaan: rincian.pekerjaan.map((row) => ({ label: row.label, total: Number(row.total) })),
    perDusun: rincian.perDusun.map((row) => ({
      label: row.label,
      total: Number(row.total),
      lakiLaki: Number(row.lakiLaki ?? 0),
      perempuan: Number(row.perempuan ?? 0),
      keluarga: Number(row.keluarga ?? 0),
    })),
    wilayah: projectAreas(rincian.wilayah),
  };
}
