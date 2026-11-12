# Final Hardening AUD-019/020 — R-13 DNS Abort Race Condition

- **Task:** Menutup race condition pemasangan listener abort pada resolver DNS TTE dan memverifikasi kompatibilitas Node.js minimum.
- **Tanggal:** 2026-11-12
- **Branch:** `task/AUD-019-020-tte-final-hardening`
- **Base commit:** `4971ef6bbfb8d2c7fb0405726e8a3209c8009a1e` (`task/AUD-019-020-tte-remediation`)
- **Commit implementasi:** `9e21fd6890e6af43f33828637c786ad91ac62e17`
- **Commit laporan:** commit yang memuat file ini (lihat `git log -1` pada branch).
- **Lingkungan uji utama:** Windows, Node.js v26.2.0.

## 1. Kondisi awal dan analisis

`buatResolverDns()` sebelumnya menjalankan urutan:

1. periksa `signal.aborted` (lalu langsung `throw` bila aktif);
2. buat `dns.Resolver`;
3. **mulai** `resolve4()` dan `resolve6()`;
4. baru memasang listener `abort`.

Dua masalah nyata:

- **Sinyal yang sudah abort di awal** melewati jalur `throw` sebelum `Resolver` dibuat, sehingga
  `resolver.cancel()` tidak pernah dipanggil. Tidak ada query yang dimulai pada jalur ini, tetapi
  kontrak "cancel selalu dipanggil" tidak terpenuhi.
- **Abort setelah query dimulai tetapi sebelum listener terpasang** tidak pernah menjalankan
  `cancel()`. `Promise.race` tetap menyelesaikan promise dengan error batas waktu, tetapi query
  c-ares terus berjalan sampai timeout internalnya (5 detik) — resource tidak dilepas segera.
  Urutan ini juga rapuh terhadap perubahan kode di masa depan (mis. `await` yang tidak sengaja
  disisipkan antara pemeriksaan dan pemasangan listener).
- Secara struktural, `dibatalkan` dapat menolak sebelum `Promise.race` terpasang (mis. abort
  sinkron saat listener dipasang). Saat itu belum ada handler, sehingga berpotensi menjadi
  unhandled rejection.

Perbaikan: listener dipasang **sebelum** query, sinyal diperiksa **ulang** setelah pemasangan,
`cancel()` dijalankan pada kedua jalur abort, dan rejection pembatalan ditandai tertangani.

## 2. File yang diperiksa

- `src/features/surat/infrastructure/tte-https.ts` (`buatResolverDns`, `buatPenjagaKonkurensi`)
- `src/features/surat/infrastructure/tte-https.test.ts`
- `src/features/surat/domain/tte-jaringan.ts` (`ResolverDns`, `validasiUrlProvider`)
- `src/features/surat/domain/tte.ts` (`buatKlienBsre`, `testKoneksi`, deadline)
- `src/features/surat/application/tte-use-cases.ts` (akses `TTE_ALLOWED_HOSTS`)
- `src/lib/env.ts`, `package.json` (`engines.node`)

## 3. File yang diubah

| File | Alasan |
| --- | --- |
| `src/features/surat/infrastructure/tte-https.ts` | Listener abort dipasang sebelum query, pemeriksaan ulang, `cancel()` pada jalur sudah-abort, rejection pembatalan ditandai tertangani. |
| `src/features/surat/infrastructure/tte-https.test.ts` | Regression test deterministik R-13 dengan `dns.Resolver` palsu (tanpa jaringan). |
| `src/features/surat/application/tte-use-cases.ts` | `TTE_ALLOWED_HOSTS` dibaca lewat `env` dari `src/lib/env.ts`, bukan `process.env` langsung. |

Tidak ada perubahan skema, migration, route, UI, dependency, atau perilaku modul lain.

## 4. Perubahan R-13

Urutan baru di `buatResolverDns()`:

1. buat `dns.Resolver`;
2. buat promise pembatalan dan tandai rejection-nya tertangani (`dibatalkan.catch(() => {})`);
3. pasang listener `abort` (`{ once: true }`);
4. **periksa ulang** `signal.aborted`; bila sudah aktif: `resolver.cancel()` lalu `throw` error
   batas waktu yang konsisten — query tidak pernah dimulai;
5. mulai `resolve4()`/`resolve6()` dan `Promise.race` dengan promise pembatalan;
6. `finally`: lepas listener dan `resolver.cancel()` pada semua jalur.

Sifat yang dijaga:

- `Resolver.cancel()` idempoten; aman dipanggil dari listener, jalur sudah-abort, dan `finally`.
- Tidak ada double settlement: `Promise.race` hanya menang sekali; `allSettled` tidak pernah reject.
- Tidak ada unhandled rejection: rejection pembatalan selalu memiliki handler, termasuk jalur yang
  selesai sebelum race dipasang.
- Slot konkurensi dilepas di `finally` penjaga, termasuk saat abort.

## 5. Regression test (deterministik, tanpa jaringan)

`node:dns/promises` di-mock dengan `dns.Resolver` palsu yang mencatat `resolve4`, `resolve6`,
`cancel`, dan dapat dibuat menggantung sampai `cancel()` dipanggil. Tidak ada timer acak.

| Skenario wajib | Test |
| --- | --- |
| 1. Sinyal sudah abort sebelum resolver dipanggil | `langsung berhenti tanpa query DNS bila sinyal sudah aktif` — menolak "batas waktu", `resolve4/6` = 0, `cancel()` dipanggil. |
| 2. Abort tepat ketika listener dipasang | `membatalkan tanpa memulai query saat abort terjadi tepat ketika listener dipasang` — listener memicu `abort()` secara sinkron; query tidak dimulai, `cancel()` dipanggil. |
| 3. Abort setelah query berjalan | `membatalkan query yang sedang berjalan saat abort` — `resolve4` sudah dipanggil, lalu abort; promise menolak "batas waktu" dan `cancel()` dipanggil. |
| 4. Resolver selesai normal | `menyelesaikan resolusi normal dan memetakan family A/AAAA` — hasil `family` 4 dan 6 benar. |
| 5. Tidak ada kebocoran listener/resource | `membersihkan listener abort pada jalur sukses dan timeout` — `addEventListener`/`removeEventListener` masing-masing 1×. |
| 6. Slot konkurensi tidak bocor setelah abort | `melepas slot konkurensi setelah abort sehingga resolusi berikutnya berjalan` — panggilan kedua saat slot penuh ditolak, setelah abort panggilan berikutnya berhasil. |
| Tambahan | `tidak menghasilkan unhandled rejection saat abort sebelum race dipasang` — memantau `process.on("unhandledRejection")` dan memastikan kosong. |

Bukti red-green: sebelum perbaikan, test berjalan `2 failed | 8 passed` — tepat pada
`cancel()` untuk sinyal sudah-abort dan pada query yang sudah dimulai saat abort tepat di pemasangan
listener. Setelah perbaikan: `10 passed (10)`.

## 6. Kompatibilitas Node.js

Repository menetapkan `engines.node: ">=20.9.0"` (`package.json:6-8`).

| Pemeriksaan | Hasil | Bukti |
| --- | --- | --- |
| `node:dns/promises` `Resolver` tersedia di Node 20.9.0 | **PASS** | `npx -y node@20.9.0 -e "..."` → `{"resolve4":"function","resolve6":"function","cancel":"function","instance":true}` |
| Opsi konstruktor `{ timeout, tries }` diterima di Node 20.9.0 | **PASS** | Instansiasi `new Resolver({ timeout: 5000, tries: 1 })` berhasil |
| `Resolver.cancel()` dapat dipanggil di Node 20.9.0 | **PASS** | Pemanggilan `cancel()` selesai tanpa error |
| Test terfokus dijalankan di Node 20.9.0 | **SKIPPED** | `npx node@20.9.0 node_modules/vitest/vitest.mjs ...` gagal start: `SyntaxError: The requested module 'node:util' does not provide an export named 'styleText'` (tooling vitest 5). Bukan kegagalan kode aplikasi. |
| TypeScript/@types/node | **PASS (versi terpasang)** | `npm run typecheck` lulus dengan `@types/node ^26.6.5`; tipe opsi `Resolver` tersedia. Tidak diuji dengan `@types/node` 20. |

Catatan penting: vitest 5 mendeklarasikan `engines.node: "^22.12.0 || ^24.0.0 || >=26.0.0"`,
sedangkan runtime aplikasi `>=20.9.0`. Artinya test suite tidak dapat dijalankan pada Node 20.9,
meskipun API runtime yang dipakai kode tersedia. Ini keterbatasan tooling pengujian, bukan
ketidakcocokan kode produksi; perbedaan ini dicatat sebagai risiko di bawah.

## 7. Konsistensi environment

`TTE_ALLOWED_HOSTS` kini dibaca melalui `env` dari `src/lib/env.ts` (pola yang sama dengan modul
lain), bukan `process.env` langsung. Skema env sudah memuat `TTE_ALLOWED_HOSTS` dan validasinya
tetap dilakukan oleh `parseAllowlistProvider()` di domain. Tidak ada refactor environment lain.

## 8. Quality gates

| Perintah | Hasil | Bukti |
| --- | --- | --- |
| `npm run format:check` | **PASS** | "All matched files use Prettier code style!" |
| `npm run typecheck` | **PASS** | exit 0 |
| `npm run lint` | **PASS** | exit 0, tanpa output |
| `npm run test:unit` | **PASS** | 187 file, 1701 test lulus |
| `npx vitest run src/features/surat/infrastructure/tte-https.test.ts` | **PASS** | 10 test lulus |
| `npm run build` | **PASS** | `next build` exit 0 |
| `npm run test:integration` | **SKIPPED** | Tidak relevan: tidak ada perubahan DB/skema; butuh database uji disposable. |
| Test terfokus di Node 20.9.0 | **SKIPPED** | Vitest 5 tidak dapat start di Node 20.9 (lihat bagian 6). |

## 9. Risiko yang masih tersisa

1. Perilaku runtime (abort → `cancel()` → query berhenti) **tidak dieksekusi** pada Node 20.9,
   hanya keberadaan API yang diverifikasi. Verifikasi perilaku baru dilakukan di Node 26.2.0.
2. `Resolver.cancel()` diuji dengan resolver palsu yang mencatat pemanggilan; semantik c-ares
   (`ECANCELLED` pada query yang dibatalkan) tidak disimulasikan dan tidak diuji dengan DNS nyata.
3. `dns.Resolver` tetap tidak memakai hosts file/resolver sistem (konsekuensi desain sebelumnya).
4. Test suite tidak dapat dijalankan pada Node 20.9 karena vitest 5; bila CI memakai Node 20.9,
   test suite akan gagal start. Perlu keputusan maintainer (naikkan versi Node CI atau turunkan
   vitest) di luar scope task ini.
5. `@types/node` yang terpasang (v26) lebih baru daripada runtime minimum; tipe untuk API lama
   belum diverifikasi terhadap `@types/node` 20.
6. Tidak ada akses ke BSrE produksi; seluruh uji memakai resolver palsu/server TLS lokal.

## 10. Kesimpulan

R-13 ditutup: listener abort dipasang sebelum query, sinyal diperiksa ulang, `cancel()` dijalankan
pada semua jalur abort, error konsisten, listener dan slot konkurensi dibersihkan, serta tidak ada
unhandled rejection. Regression test deterministik mencakup enam skenario wajib. API yang dipakai
tersedia di Node 20.9, tetapi test suite tidak dapat dijalankan di versi tersebut karena batasan
vitest 5 — dicatat sebagai SKIPPED, bukan klaim kompatibilitas penuh.

**Status: siap review.** Tidak ada PR, merge, atau deploy.
