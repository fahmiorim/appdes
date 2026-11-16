# AUD-017 — Validasi isi berkas unggahan dengan magic bytes

- **Tanggal:** 16 November 2026
- **Branch:** `task/AUD-017-media-magic-bytes`
- **Base commit:** `30b81de4be06a39298ec23d2b319cb14740840a8` (`main` setelah PR #80)
- **Tujuan:** menutup celah AUD-017 (`docs/TECHNICAL_AUDIT.md`) — unggahan hanya divalidasi dari MIME kiriman klien, tanpa memeriksa isi berkas.

## 1. Kondisi awal

`validasiMedia` pada `src/features/publik/domain/media.ts` memeriksa MIME terhadap allowlist, ukuran, dan nama berkas. Isi berkas tidak diperiksa. Ekstensi di disk diturunkan dari MIME, sehingga berkas `shell.php` tidak pernah tersimpan sebagai `.php`, tetapi berkas teks/HTML/PHP yang diberi label `image/png` tetap tersimpan sebagai `.png` dan disajikan dengan `Content-Type: image/png`.

Titik simpan terpusat:

- `simpanBerkasMedia` (`application`) → `simpanUnggahanMedia` (`infrastructure`) dipakai konten, pembangunan, desa, layanan mandiri, dan TTE.
- `simpanUnggahanMedia` juga dipakai langsung oleh lampiran DTKS dan dokumen pelanggan.

## 2. Perubahan

### `src/features/publik/domain/media.ts`

- `deteksiTipeIsi(isi)` — mengenali `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`, dan `image/svg+xml` dari signature isi:
  - JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, GIF `GIF87a`/`GIF89a`,
  - WEBP `RIFF....WEBP`, PDF `%PDF-` dalam 1024 byte pertama (sesuai spesifikasi PDF),
  - SVG hanya bila isi diawali `<svg` atau deklarasi `<?xml` yang memuat `<svg`.
- `validasiIsiMedia(mime, isi)` — menolak isi kosong, isi tak dikenali, dan isi yang tidak cocok dengan MIME yang diklaim.

Fungsi murni tanpa I/O sehingga dapat diuji cepat dan tidak menambah dependency baru.

### `src/features/publik/infrastructure/media-storage.ts`

`simpanUnggahanMedia` menjalankan `validasiIsiMedia` setelah validasi MIME/ukuran dan **sebelum** cek kuota maupun penulisan disk. Semua jalur unggah media yang memakai fungsi ini otomatis ikut terlindungi (konten publik, pembangunan, desa, layanan mandiri/syarat surat, TTE, lampiran DTKS, dokumen pelanggan).

Pesan error memakai bahasa Indonesia dan tidak membocorkan isi berkas.

### Test

- `src/features/publik/domain/media.test.ts` — 11 tes baru: deteksi signature enam format, penolakan isi tak dikenali, penolakan MIME tidak cocok (termasuk kasus tertukar PNG vs JPEG), isi kosong, MIME kosong.
- `src/features/publik/infrastructure/media-storage.test.ts` (baru) — 3 tes: penolakan isi tidak cocok tanpa menyentuh disk, penolakan isi non-media meski MIME diizinkan, penyimpanan berkas sah dengan ekstensi dari MIME tervalidasi (`logo.php` → `logo.png`).

## 3. Security review

- **Tenant:** tidak ada perubahan pada resolusi `villageId`; jalur simpan tetap memakai parameter tenant dari pemanggil yang sudah memverifikasi sesi/permission.
- **Bypass:** validasi ditempatkan di satu titik simpan bersama, bukan di komponen UI. Pemanggil tidak dapat melewati pemeriksaan isi tanpa memanggil `simpanMedia` langsung (fungsi internal infrastruktur, tidak diekspor ke route).
- **Path:** nama berkas tetap disanitasi dan ekstensi tetap diturunkan dari MIME; tidak ada perubahan pada `jalurAbsolutMedia` (proteksi path traversal).
- **Penyajian:** SVG tetap memakai CSP sandbox yang sudah ada; pemeriksaan ini menambah lapisan, bukan menggantikannya.
- **Batasan yang tersisa:** SVG masih diterima untuk media publik sesuai allowlist yang ada. Sanitasi SVG (mis. DOMPurify/`svg-sanitize`) dan decode ulang gambar belum dilakukan pada task ini; lihat bagian risiko.

## 4. Validasi

| Perintah | Hasil |
| --- | --- |
| `npx vitest run --config vitest.config.mts src/features/publik/domain/media.test.ts src/features/publik/infrastructure/media-storage.test.ts` | **PASS** 2 berkas / 21 tes |
| `npx vitest run --config vitest.config.mts src/features/publik src/features/layanan-mandiri src/features/konten src/features/pembangunan src/features/desa src/features/pelanggan src/features/penduduk` | **PASS** 41 berkas / 359 tes |
| `npm run typecheck` | **PASS** |
| `npx eslint` pada 4 berkas berubah | **PASS** (tanpa temuan) |
| `npx prettier --check` pada 4 berkas berubah | **PASS** |
| Integration test MySQL | **SKIPPED** — tidak ada `TEST_DATABASE_URL`/`TEST_DATABASE_ACK` lokal; perubahan tidak menyentuh schema/query, bukti integrasi akan datang dari CI |

## 5. Risiko dan batasan

- Perubahan ini **menolak** unggahan lama yang isinya tidak sesuai label MIME. Berkas lama di disk tidak divalidasi ulang dan tetap dapat diunduh.
- Deteksi PDF memakai pencarian `%PDF-` dalam 1024 byte pertama, sehingga berkas polyglot yang mengawali dengan header PDF tetap lolos pemeriksaan ini (tidak berbahaya karena disajikan sebagai `application/pdf`).
- SVG belum disanitasi; hanya diverifikasi sebagai teks SVG dan disajikan dengan CSP sandbox.
- Decode ulang gambar (re-encode) untuk membuang payload tersembunyi belum dilakukan; butuh dependency pengolah gambar dan keputusan produk.
- CI integration test menyentuh jalur unggah di beberapa suite; hasilnya menunggu pipeline pada PR ini.

## 6. Rekomendasi berikutnya

1. Sanitasi atau tolak SVG untuk kategori media publik (`AUD-017` lanjutan).
2. Pertimbangkan `sharp` untuk decode/re-encode gambar bila polyglot menjadi risiko nyata.
3. Audit berkas lama di `storage/media/**` dan tandai yang tidak cocok signature-nya.
