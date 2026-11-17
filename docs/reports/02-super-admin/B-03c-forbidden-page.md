# B-03c — Halaman 403 berisi penjelasan

- **Task:** lanjutan B-03/B-03b — penolakan akses `/super-admin` harus menampilkan halaman forbidden yang menjelaskan, bukan hanya redirect.
- **Tanggal:** 17 November 2026
- **Branch:** `task/AUD-034-b3c-forbidden-page-2026-11-17`
- **Base commit:** `6d0bb41` (ujung branch B-03b)
- **Commit pekerjaan:** `66445b8e37c803308e08c36254d92cc068e1579c`
- **Tujuan:** pengguna yang sudah login tetapi tidak berhak melihat penjelasan 403 dan jalan keluar, tanpa data tenant termuat dan tanpa error boundary generik.

## 1. Kondisi awal

B-03b mengarahkan `FORBIDDEN` ke `/beranda`. Redirect itu menutup kebocoran error boundary, tetapi pengguna tidak mendapat penjelasan mengapa akses ditolak. Repository belum memiliki `forbidden.tsx`, dan `next.config.ts` belum mengaktifkan `experimental.authInterrupts`.

## 2. Keputusan implementasi

| Opsi | Pertimbangan |
| --- | --- |
| Route `/forbidden` biasa + redirect | Tidak perlu flag eksperimental, tetapi respons tetap `200`/redirect dan bukan semantik 403. |
| **`forbidden()` + `src/app/forbidden.tsx`** | **Dipilih** — Next merespons `403` sebelum streaming, menyisipkan `noindex`, dan merender UI penjelasan di boundary terdekat. |

Konsekuensi: `experimental.authInterrupts: true` harus diaktifkan di `next.config.ts`. Flag ini hanya membuka API `forbidden()`/`unauthorized()`; tidak mengubah rute yang tidak memanggilnya.

## 3. File yang diperiksa

- `src/app/(admin)/super-admin/page.tsx` — guard halaman dan pemuatan data.
- `src/app/(admin)/super-admin/page.test.ts` — test B-03b.
- `src/features/multi-desa/application/provisioning-use-cases.ts` — `requireSuperAdmin` dan `daftarDesaSuperAdmin`.
- `src/lib/errors.ts` — `AppError`, `forbidden`, `unauthenticated`.
- `next.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`.
- Dokumentasi Next 16 lokal: `forbidden.md` (fungsi dan file convention).
- `src/components/ui/card.tsx`, `src/features/multi-desa/presentation/tenant-table.tsx` — dipakai halaman, dimock di test.

## 4. File yang diubah

| File | Alasan |
| --- | --- |
| `next.config.ts` | Mengaktifkan `experimental.authInterrupts` agar `forbidden()` tersedia. |
| `src/app/forbidden.tsx` | Halaman 403: judul, penjelasan, dan tautan ke `/beranda` serta `/masuk`; `noindex`. |
| `src/app/(admin)/super-admin/page.tsx` | `FORBIDDEN` → `forbidden()`; `UNAUTHENTICATED` tetap redirect `/masuk`. |
| `src/app/(admin)/super-admin/page.test.ts` | Mock `forbidden`, assertion 403 + tidak memuat data tenant, dan assertion `forbidden` tidak dipanggil untuk jalur lain. |
| `src/app/globals.css` | Style `.forbidden-page` memakai token dan komponen visual yang ada. |

Tidak ada perubahan schema, migration, dependency, use case, atau data. Diff kode: 86 baris ditambah, 11 dihapus.

## 5. Perilaku baru

| Kondisi | Perilaku |
| --- | --- |
| Super admin platform | Halaman dashboard dimuat seperti sebelumnya. |
| Login, bukan super admin (`FORBIDDEN`) | `forbidden()` → HTTP 403 + `src/app/forbidden.tsx`; `daftarDesaSuperAdmin()` tidak dipanggil. |
| Tanpa sesi (`UNAUTHENTICATED`) | Redirect `/masuk` seperti B-03b. |
| Error lain | Dilempar kembali, tidak disamarkan. |

Halaman 403 tidak menampilkan peran, permission, atau data tenant; hanya menjelaskan bahwa halaman khusus pengelola platform dan memberi dua jalan keluar.

## 6. Security/tenant

- Guard tetap dievaluasi server-side melalui `requireSuperAdmin()` sebelum data dimuat.
- `forbidden()` dipanggil di dalam `catch`, di luar `try`, sehingga interrupt tidak tertangkap sendiri; tidak ada `try/catch` luar yang menelannya.
- Tidak ada data tenant yang dikirim ke pengguna yang ditolak.
- `noindex` pada halaman 403 mencegah pengindeksan.
- Tidak ada `villageId` dari klien yang dipakai sebagai bukti otorisasi.

## 7. Test dan validasi

Perintah dan hasil sebenarnya (Windows, Node v26.2.0, tanpa database):

| Perintah | Hasil |
| --- | --- |
| `npx vitest run "src/app/(admin)/super-admin/page.test.ts"` | **PASS** — 3 test |
| Test yang sama dengan guard lama (redirect) dipasang kembali via `git stash` | **GAGAL sesuai harapan** — 1 failed / 2 passed; `expected NEXT_HTTP_ERROR_FALLBACK;403 but got NEXT_REDIRECT` |
| `npm run test:unit` | **PASS** — 201 file, 1.778 test |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | **PASS** — exit 0 |
| `npm run lint` | **PASS dengan warning** — 0 error; 7 warning lama `@next/next/no-img-element` di `src/app/(auth)/masuk/page.tsx` |
| `npm run build` | **PASS** — exit 0; route `/super-admin` tetap dinamis (`ƒ`) |
| `npm run test:integration` | **SKIPPED** — tidak ada perubahan database |
| Uji browser/status 403 nyata | **SKIPPED** — tidak diminta dan tidak ada browser automation dalam scope |

Test regresi membuktikan tiga hal: jalur `FORBIDDEN` memanggil `forbidden()` dan tidak memuat data, jalur tanpa sesi tetap redirect, dan jalur super admin tetap memuat data.

## 8. Risiko dan keterbatasan

1. **Flag eksperimental.** `authInterrupts` masih ditandai eksperimental oleh Next 16; perilakunya dapat berubah pada upgrade. Build dan typecheck lulus pada versi saat ini.
2. **Status 403 belum diuji end-to-end.** Semantik 403 sebelum streaming berasal dari dokumentasi Next dan build; belum diverifikasi lewat HTTP nyata karena tidak ada pengujian browser/server dalam scope.
3. **Penempatan boundary.** `forbidden.tsx` berada di root, sehingga UI dirender di dalam layout segmen yang memanggilnya (layout admin). Ini sengaja agar tetap konsisten, tetapi belum diperiksa secara visual.
4. **Tumpukan branch.** B-03c dibangun di atas B-03b. Bila B-03b diubah, branch ini perlu di-rebase.
5. **Tidak ada perubahan integration/DB**, sesuai scope.

## 9. Kesimpulan

Penolakan akses ke `/super-admin` kini menghasilkan halaman 403 yang menjelaskan kondisi dan menyediakan jalan keluar, sementara pengguna tanpa sesi tetap diarahkan ke halaman masuk. Guard server-side dan pemisahan data tenant tidak berubah.

**Status: siap review.** Commit hanya lokal; belum di-push, belum di-merge, tidak ada deployment.
