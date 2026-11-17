# B-04 — Jalur unggah dinamis tanpa validasi magic bytes

- **Task:** B-04 (temuan audit 17 November 2026) — hapus atau lengkapi `simpanUnggahanMediaDenganPengaturan` yang melewati validasi isi berkas.
- **Tanggal:** 17 November 2026
- **Branch:** `task/AUD-034-b4-dynamic-upload-validation-2026-11-17`
- **Base commit:** `07b13ab6260e8c2d30ac067727e3ce84b2473711` (`main`)
- **Commit pekerjaan:** `debea067de05dbe510543127abbc68d0e2f00896`
- **Tujuan:** tidak menyisakan jalur unggah yang dapat menyimpan berkas tanpa pemeriksaan magic bytes.

## 1. Kondisi awal

`simpanUnggahanMedia` (jalur aktif) menjalankan:

1. `validasiMedia` — MIME allowlist dan ukuran;
2. `validasiIsiMedia` — magic bytes harus cocok dengan MIME yang diklaim;
3. kunci desa → cek kuota → tulis berkas.

`simpanUnggahanMediaDenganPengaturan` menjalankan langkah 1 dan 3, tetapi **tidak** menjalankan langkah 2. Fungsi ini menerima `mimeAllowlist` dinamis dan `validasiMediaDenganPengaturan` memberikan fallback ekstensi `bin` untuk MIME di luar `JENIS_MEDIA`, sehingga berkas teks berlabel gambar tetap dapat tersimpan.

## 2. Bukti tidak ada pemanggil

Sebelum menghapus, seluruh repository diperiksa:

| Pemeriksaan | Hasil |
| --- | --- |
| `grep -rn "simpanUnggahanMediaDenganPengaturan"` di `src` | Hanya definisi di `media-storage.ts` |
| `grep -rn "validasiMediaDenganPengaturan"` di `src` | Sisa referensi berasal dari `@/features/kebijakan-berkas/domain/pengaturan-berkas` (fungsi berbeda dengan signature `(settings, mime, ukuran)`) |
| `git log -S "simpanUnggahanMediaDenganPengaturan" -- src` | Hanya commit awal proyek `e57ecdd` |
| Test yang menyebut fungsi tersebut | Tidak ada |

Tidak ada route, use case, test, atau script yang memanggil fungsi tersebut. Penghapusan tidak mengubah perilaku aplikasi.

## 3. Keputusan: hapus, bukan lengkapi

| Pendekatan | Pertimbangan |
| --- | --- |
| Melengkapi dengan `validasiIsiMedia` | Menjaga API hipotetis, tetapi menambah kode tanpa pemakai dan tetap menyisakan fallback ekstensi `bin` yang tidak terhubung dengan pengaturan kebijakan berkas. |
| **Menghapus** | **Dipilih** — jalur bypass hilang sepenuhnya, tidak ada kode mati yang bisa dipakai tanpa sengaja, dan tidak ada perubahan perilaku pada jalur aktif. |

## 4. File yang diperiksa

- `src/features/publik/infrastructure/media-storage.ts` — kedua fungsi simpan.
- `src/features/publik/domain/media.ts` — `validasiMedia`, `validasiIsiMedia`, `deteksiTipeIsi`, `validasiMediaDenganPengaturan`.
- `src/features/publik/domain/media.test.ts` — cakupan validasi isi.
- `src/features/kebijakan-berkas/domain/pengaturan-berkas.ts` — validator pengaturan yang benar-benar dipakai.
- `src/features/layanan-mandiri/application/{ajukan-surat,warga-use-cases,eksternal-use-cases}.ts` — pemakai validator kebijakan berkas.
- Pemanggil `simpanUnggahanMedia` di seluruh `src`.

## 5. File yang diubah

| File | Alasan |
| --- | --- |
| `src/features/publik/infrastructure/media-storage.ts` | Menghapus `simpanUnggahanMediaDenganPengaturan` dan import `validasiMediaDenganPengaturan`. |
| `src/features/publik/domain/media.ts` | Menghapus `validasiMediaDenganPengaturan` yang hanya dipakai fungsi tersebut, termasuk fallback ekstensi `bin`. |

Tidak ada perubahan pada `simpanUnggahanMedia`, route publik, penyajian media, schema, migration, atau dependency. Total diff: 1 baris ditambah, 74 dihapus.

## 6. Dampak keamanan

- Jalur unggah yang tersisa (`simpanUnggahanMedia`) tetap memvalidasi magic bytes sebelum menulis berkas, sehingga kontrol AUD-017 berlaku untuk seluruh pemanggil.
- Tidak ada lagi fungsi unggah yang menerima allowlist MIME arbitrer tanpa pemeriksaan isi.
- Validator kebijakan berkas untuk syarat permohonan/surat tetap tersedia dan tidak berubah; modul itu memakai fungsi dari `features/kebijakan-berkas`, bukan dari `publik/domain/media.ts`.

## 7. Test

Perintah dan hasil sebenarnya (Windows, Node v26.2.0, tanpa database):

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | **PASS** — exit 0 |
| `npm run lint` (`eslint .`) | **PASS dengan warning** — 0 error; 7 warning lama `@next/next/no-img-element` di `src/app/(auth)/masuk/page.tsx` |
| `npm run test:unit` | **PASS** — 200 file, 1.775 test |
| `grep` referensi fungsi yang dihapus | **PASS** — 0 referensi tersisa di modul publik |
| `npm run test:integration` | **SKIPPED** — tidak ada perubahan database |
| `npm run build` | **SKIPPED** — typecheck dan unit test mencakup perubahan |
| Uji browser | **SKIPPED** — tidak ada perubahan UI |

Tidak ada test baru karena perubahan hanya menghapus kode tanpa pemanggil; test validasi isi yang ada (`media.test.ts`) tetap lulus dan menjaga jalur aktif.

## 8. Risiko dan keterbatasan

1. **Kebutuhan masa depan.** Bila nanti diperlukan unggahan dengan allowlist dinamis, jalur tersebut harus dibangun di atas `simpanUnggahanMedia` (atau memanggil `validasiIsiMedia` secara eksplisit), bukan mengembalikan fungsi lama.
2. **API internal dihapus.** `simpanUnggahanMediaDenganPengaturan` diekspor dari modul internal ber-`server-only`; tidak ada konsumen di repository. Konsumen eksternal di luar repository tidak dapat diverifikasi.
3. **Tidak ada pengujian runtime unggah.** Perubahan tidak menyentuh jalur aktif, sehingga uji unggah browser/end-to-end tidak dijalankan.
4. **Tidak ada pengujian integration/DB**, sesuai scope dan aturan AGENTS.md.

## 9. Kesimpulan

B-04 selesai: satu-satunya jalur unggah dinamis yang melewati magic bytes telah dihapus setelah dipastikan tidak punya pemanggil. Jalur unggah aktif tetap terlindungi validasi isi.

**Status: siap review.** Commit hanya lokal; belum di-push, belum di-merge, dan tidak ada perubahan database atau deployment.
