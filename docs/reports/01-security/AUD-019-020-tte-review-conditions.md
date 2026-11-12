# AUD-019-020 — Penutupan Kondisi Review TTE

## Status

C-1, C-2, dan C-3 telah diimplementasikan dan divalidasi lokal pada branch `task/AUD-019-020-tte-close-review-conditions`. Seluruh quality gate lokal **PASS**. Belum siap merge atau deploy; menunggu review maintainer. Pengujian ke BSrE asli dan eksekusi workflow GitHub Actions belum dilakukan.

## Keputusan maintainer

- **C-1 — Runtime dan CI:** Appdes menetapkan minimum runtime Node.js **22.12.0**. CI quality dan integration menggunakan Node.js 22.12.0 secara eksplisit. Keputusan ini mengakhiri dukungan runtime Node.js 20.9.
- **C-2 — ECANCELLED:** Tambahkan regresi pada fake resolver untuk mensimulasikan perilaku c-ares ketika `Resolver.cancel()` menolak query aktif dengan error berkode `ECANCELLED`. Tes abort harus memastikan operasi berakhir sebagai timeout yang terkendali dan kedua rejection query ditangani oleh `Promise.allSettled`.
- **C-3 — Type definitions:** Gunakan `@types/node` major 22, dipatok melalui range `^22.20.5`, agar deklarasi TypeScript selaras dengan runtime major Node.js 22.

## Perubahan

- `package.json` — `engines.node` menjadi `>=22.12.0`; `@types/node` menjadi `^22.20.5` (commit `41419b0`).
- `.github/workflows/ci.yml` — kedua job menggunakan Node.js `22.12.0` secara eksplisit (commit `a92e08f`).
- `src/features/surat/infrastructure/tte-https.test.ts` — fake resolver menolak query aktif dengan `ECANCELLED` saat `cancel()`, dan tes abort memverifikasi kedua rejection ditangani (commit `532e03a`), dengan perbaikan fake pada commit validasi ini (lihat di bawah).
- `package-lock.json` — diregenerasi melalui `npm install` (bukan edit manual) sehingga `@types/node` 22.20.5 dan `undici-types` 6.21.0 terkunci; diff hanya 9 baris berubah, tanpa churn dependency lain.

### Perbaikan yang ditemukan saat validasi

Test `membatalkan query yang sedang berjalan saat abort` awalnya gagal (`expected 1 to be 2` untuk `ecancelled`). Akar masalah ada pada fake test, bukan kode produksi: mode `menggantung` hanya mendaftarkan `resolve4` sebagai query in-flight, sedangkan `resolve6` mengembalikan promise yang tidak pernah settle dan tidak terdaftar untuk ditolak. Fake diperbaiki agar `resolve6` juga mendaftarkan rejection ke `state.pending`, sehingga `cancel()` menolak **dua** query seperti perilaku c-ares sebenarnya. Tidak ada perubahan pada `tte-https.ts` atau logika produksi.

## Lingkungan validasi

| Komponen | Nilai |
| --- | --- |
| Node.js (gates utama) | `v26.2.0` (memenuhi `>=22.12.0`) |
| Node.js (uji runtime minimum) | `v22.12.0` — test ECANCELLED PASS |
| npm | `11.13.0` |
| `@types/node` terpasang | `22.20.5` (major 22, sesuai C-3) |
| Database integration | MySQL Community Server `8.0.30`, database disposable `desa_test_aud019` @ `127.0.0.1` |

## Hasil validasi

| Perintah | Hasil |
| --- | --- |
| `npm install` (regenerasi lockfile, Node 26.2.0) | **PASS** — lockfile berubah hanya untuk `@types/node` + `undici-types` |
| `npm ci` (reproducible install dari lockfile) | **PASS** — `@types/node` 22.20.5 terpasang |
| `npm run format:check` | **PASS** |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | **PASS** |
| `npm run lint` (`eslint .`) | **PASS** |
| `npm run test:unit` | **PASS** — 187 berkas, 1701 test |
| `npm run build` (`next build`) | **PASS** |
| `npm run test:integration` (MySQL 8.0.30 disposable) | **PASS** — 9 berkas, 34 test; guard mencatat target `desa_test_aud019 @ 127.0.0.1` |
| Test ECANCELLED dengan reporter verbose | **PASS** — 10/10, termasuk "membatalkan query yang sedang berjalan saat abort"; exit 0, tidak ada unhandled rejection |
| Test ECANCELLED pada Node `v22.12.0` | **PASS** — 10/10 |
| Workflow GitHub Actions | **SKIPPED** — belum dieksekusi; perubahan `ci.yml` akan diverifikasi pada run CI branch ini |
| Pengujian ke BSrE/provider nyata | **SKIPPED** — menunggu akses/staging resmi |

Tidak ada peringatan `UnhandledPromiseRejection` pada log unit maupun test ECANCELLED; vitest akan menggagalkan run bila terjadi unhandled rejection.

## Batas perubahan

Tidak ada perubahan pada implementasi protokol TTE, schema/database, fitur di luar C-1 sampai C-3, PR, merge, atau deploy. Diff terhadap commit dasar `ee0a117` hanya:

- `package-lock.json` (regenerasi dependency sesuai `package.json`)
- `src/features/surat/infrastructure/tte-https.test.ts` (satu baris fake resolver)
- laporan ini

## Risiko dan keterbatasan tersisa

- Gates utama dijalankan pada Node 26.2.0 (memenuhi minimum), sedangkan CI memakai 22.12.0; test ECANCELLED sudah diverifikasi pada 22.12.0, tetapi seluruh suite belum dijalankan ulang pada versi tersebut.
- Workflow CI belum dieksekusi; hasil sebenarnya akan terlihat pada run GitHub Actions.
- Integration test memakai MySQL lokal disposable; tidak ada koneksi ke database pengembangan/produksi.
- `npm install` melaporkan advisory dependency dari `npm audit`; audit dependency tidak termasuk scope task ini dan belum ditindaklanjuti.
