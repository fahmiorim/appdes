/**
 * Pembuat slug orisinal untuk konten publik.
 *
 * Slug dipakai di URL publik (`/desa/berita/<slug>`), jadi harus stabil,
 * aman-URL, dan tidak kosong. Aturan:
 * - huruf kecil;
 * - diakritik dilucuti (mis. `é` → `e`);
 * - selain `[a-z0-9]` menjadi tanda hubung;
 * - tanda hubung beruntun dipadatkan dan dipangkas di ujung.
 *
 * Fungsi ini sengaja **murni** (tanpa I/O) agar mudah diuji dan dapat dipakai
 * lintas lapisan. Keunikan slug per desa ditegakkan di basis data (unique
 * index) dan diselesaikan oleh `slugUnik` pada lapisan repository.
 */

/** Panjang maksimum slug; menjaga slug tetap pendek dan aman untuk URL. */
export const PANJANG_SLUG_MAKS = 180;

/** Ubah teks bebas menjadi slug dasar (belum dijamin unik). */
export function buatSlug(teks: string, panjangMaks = PANJANG_SLUG_MAKS): string {
  // Buang tanda diakritik setelah normalisasi (mis. é -> e + ́).
  const dasar = teks
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (dasar.length <= panjangMaks) return dasar;
  return dasar.slice(0, panjangMaks).replace(/-$/, "");
}

/**
 * Susun slug unik dengan menambahkan akhiran angka bila sudah terpakai.
 *
 * @param dasar slug hasil `buatSlug`
 * @param sudahDipakai predikat: `true` bila kandidat sudah dipakai desa ini
 */
export function slugUnik(dasar: string, sudahDipakai: (kandidat: string) => boolean): string {
  const akar = dasar || "konten";

  if (!sudahDipakai(akar)) return akar;

  for (let urutan = 2; urutan < 1000; urutan += 1) {
    const kandidat = `${akar}-${urutan}`;
    if (!sudahDipakai(kandidat)) return kandidat;
  }

  // Praktis tak tercapai; jaga-jaga agar tidak menggantung.
  return `${akar}-${Date.now()}`;
}
