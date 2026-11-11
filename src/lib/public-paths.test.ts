import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { isPublicPath } from "./public-paths";

/**
 * Penjaga rute publik.
 *
 * Halaman di route group `(public)` hanya benar-benar publik bila URL-nya
 * termasuk `isPublicPath`. Pernah terjadi halaman pemilihan publik diletakkan di
 * `/pemilihan` (di luar prefix `/desa`) sehingga proxy mengalihkannya ke
 * halaman masuk dan warga tidak bisa membukanya tanpa sesi.
 */

const APP_DIR = fileURLToPath(new URL("../app/", import.meta.url));
const PUBLIC_DIR = APP_DIR + "(public)";

function halamanStatis(dir: string): string[] {
  const hasil: string[] = [];
  for (const entri of fs.readdirSync(dir, { withFileTypes: true })) {
    const jalur = dir + "/" + entri.name;
    if (entri.isDirectory()) {
      hasil.push(...halamanStatis(jalur));
      continue;
    }
    if (entri.name !== "page.tsx") continue;
    const relatif = jalur.slice(PUBLIC_DIR.length, -"page.tsx".length).replaceAll("\\", "/");
    // Route group lain (mis. `(tema)`) tidak muncul pada URL.
    const segmen = relatif
      .split("/")
      .filter(Boolean)
      .filter((bagian) => !(bagian.startsWith("(") && bagian.endsWith(")")));
    // Halaman dinamis diuji lewat prefix sebelum segmen dinamis pertamanya.
    const dinamis = segmen.findIndex((bagian) => bagian.startsWith("["));
    const rute = "/" + (dinamis === -1 ? segmen : segmen.slice(0, dinamis)).join("/");
    hasil.push(rute === "//" ? "/" : rute.replace(/\/$/, "") || "/");
  }
  return hasil;
}

describe("rute publik", () => {
  it("setiap halaman di route group (public) dapat diakses tanpa sesi", () => {
    const tidakPublik = halamanStatis(PUBLIC_DIR)
      .filter((rute) => !isPublicPath(rute))
      .sort();

    expect(tidakPublik).toEqual([]);
  });

  it("area admin tetap terlindungi", () => {
    for (const rute of ["/penduduk", "/pengaturan/desa", "/pemerintahan/pemilihan"]) {
      expect(isPublicPath(rute), rute).toBe(false);
    }
  });
});
