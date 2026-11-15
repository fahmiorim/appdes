# PR #50 — Perbaikan path screenshot halaman publik

- **Task:** memperbaiki kegagalan job `Visual QA login (desktop/mobile)` pada PR #50.
- **Tanggal:** 16 November 2026.
- **Branch task:** `task/pr50-public-screenshot-paths` (perubahan ditujukan ke head branch PR `audit/public-visual-review-2026-11-15`).
- **Base branch PR:** `main`, base commit lokal saat pemeriksaan `7b09691c853a968ffddd8eb3a715f9443a1c3683`.
- **Head sebelum perbaikan:** `0f0e7bde569a960aa8d753ab7579532e2b3c69b2`.
- **Commit perbaikan:** `19d8049ff7525284f4cbc6eafb975754c66bcf0d` (`fix(ci): normalize public screenshot route paths`).

## Kondisi awal dan analisis

Run CI PR #50 gagal pada step `Capture public pages (reference desktop, wide desktop, and mobile)` dengan exit code 3 setelah screenshot mobile beranda tersimpan. Log CI menunjukkan loop `routes` berisi `/` dan `berita`, lalu membentuk URL langsung sebagai `http://127.0.0.1:3000$route` dan `http://sukamaju.localhost:3000$route`.

Untuk route `/`, URL sah. Untuk route `berita`, tanpa slash awal, URL menjadi `http://127.0.0.1:3000berita`. Curl menolak URL tersebut dan keluar dengan kode 3. Karena workflow memakai `set -e`, proses berhenti di route `berita` tanpa pesan curl yang tampak di log; hal ini sesuai dengan fakta bahwa artifact berisi tiga screenshot beranda dan tidak berisi screenshot berita.

Reproduksi terhadap loop workflow pada stub HTTP lokal mengonfirmasi perilaku: loop lama menghasilkan exit 3 setelah request `/`. Setelah normalisasi path, loop berakhir dengan exit 0, melakukan request pada 18 route dengan slash awal, dan menulis 54 file screenshot simulasi.

## File diperiksa

- `.github/workflows/ci.yml` pada head PR #50.
- Log job CI run `43727684854` / job `132853101033`.
- Artifact visual job: screenshot login, screenshot beranda, dan referensi desain.
- Route publik di `src/app` pada branch PR #50.

## File diubah

| File | Alasan |
|---|---|
| `.github/workflows/ci.yml` | Membentuk `path="/${route#/}"` lalu menggunakan path ternormalisasi untuk URL browser dan curl. Menangani `/` dan route yang tak memiliki slash awal secara konsisten. |

Tidak ada perubahan pada route aplikasi, data tenant, seed database, dependency, atau toleransi error Playwright.

## Validasi

| Perintah/pemeriksaan | Hasil |
|---|---|
| Reproduksi loop lama pada stub HTTP lokal | FAIL dengan exit 3 setelah hanya request `/`, sesuai gejala CI. |
| Simulasi loop setelah normalisasi path pada stub HTTP lokal | PASS; 18 route diminta dengan slash awal dan 54 screenshot simulasi dibuat, exit 0. |
| `npx prettier --check .github/workflows/ci.yml` | PASS — file sesuai format Prettier. |
| `git diff --check` | PASS — tidak ada whitespace error. |
| CI GitHub setelah perubahan, run `43744120798` | PASS — seluruh job `Unit test dan quality check`, `Visual QA login (desktop/mobile)`, `Integration test (MySQL 8)`, dan `Ringkasan CI` selesai dengan conclusion `success`. |

Simulasi memakai stub dan tidak menjalankan database maupun halaman Next.js; validasi akhir route dan screenshot sesungguhnya harus berasal dari CI.

## Risiko dan keterbatasan

- Run CI baru sukses pada semua job, termasuk Visual QA. Simulasi lokal menggunakan stub, sehingga bukti route dan screenshot sesungguhnya berasal dari CI.
- URL `url` menggunakan hostname tenant untuk Playwright sedangkan `request_url` memakai loopback plus Host header, mengikuti pola workflow sebelumnya.

## Kesimpulan dan langkah berikutnya

Akar kegagalan yang terlihat pada log adalah URL tanpa slash pada route `berita`, bukan kegagalan screenshot beranda. Normalisasi path memperbaiki pembentukan URL untuk seluruh entri route. Commit `19d8049` telah di-push ke head PR #50 dan run `43744120798` lulus pada semua job. Tidak ada merge atau deploy; tunggu persetujuan maintainer.
