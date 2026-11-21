import Link from "next/link";

type Point = { id: number; judul: string; latitude: number; longitude: number };

function project(latitude: number, longitude: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const lat = Math.max(-85.05112878, Math.min(85.05112878, latitude)) * Math.PI / 180;
  return {
    x: ((longitude + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + Math.sin(lat)) / (1 - Math.sin(lat))) / (4 * Math.PI)) * scale,
  };
}

/** Peta tile OpenStreetMap dengan seluruh pin proyek dalam satu tampilan. */
export function PetaPersebaran({ points }: { points: Point[] }) {
  if (points.length === 0) return null;
  let zoom = 16;
  let projected = points.map((point) => project(point.latitude, point.longitude, zoom));
  let minX = Math.min(...projected.map((point) => point.x));
  let maxX = Math.max(...projected.map((point) => point.x));
  let minY = Math.min(...projected.map((point) => point.y));
  let maxY = Math.max(...projected.map((point) => point.y));
  while (zoom > 5 && (maxX - minX > 980 || maxY - minY > 270)) {
    zoom -= 1;
    projected = points.map((point) => project(point.latitude, point.longitude, zoom));
    minX = Math.min(...projected.map((point) => point.x));
    maxX = Math.max(...projected.map((point) => point.x));
    minY = Math.min(...projected.map((point) => point.y));
    maxY = Math.max(...projected.map((point) => point.y));
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerTileX = Math.floor(centerX / 256);
  const centerTileY = Math.floor(centerY / 256);
  const tileCount = 2 ** zoom;
  const tiles = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const x = centerTileX + dx;
      const y = centerTileY + dy;
      if (y < 0 || y >= tileCount) continue;
      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: zoom + "-" + x + "-" + y,
        src: "https://basemaps.cartocdn.com/light_all/" + zoom + "/" + wrappedX + "/" + y + ".png",
        left: x * 256 - centerX,
        top: y * 256 - centerY,
      });
    }
  }
  return <section className="finance-map" aria-label="Peta persebaran proyek pembangunan">
    <div className="finance-map__viewport">
      {tiles.map((tile) => <img key={tile.key} className="finance-map__tile" src={tile.src} alt="" aria-hidden="true" style={{ left: "calc(50% + " + tile.left + "px)", top: "calc(50% + " + tile.top + "px)" }} />)}
      {points.map((point, index) => {
        const position = project(point.latitude, point.longitude, zoom);
        return <Link key={point.id} className="finance-map__pin" href={"/keuangan/kegiatan/" + point.id} title={point.judul} aria-label={"Buka kegiatan " + point.judul} style={{ left: "calc(50% + " + (position.x - centerX) + "px)", top: "calc(50% + " + (position.y - centerY) + "px)" }}><span>{index + 1}</span></Link>;
      })}
    </div>
    <div className="finance-map__attribution">Peta © OpenStreetMap · © CARTO · Pilih nomor pin untuk membuka detail kegiatan</div>
  </section>;
}
