# AUD-007 — Cabut Sesi saat Reset Password

- **Tanggal:** 14 November 2026
- **Branch:** `task/AUD-007-session-revocation-v2`
- **Base:** `main` — `1624f0675049722f08dc8aedb6d68986a1561afa`
- **Tujuan:** Memastikan reset password mencabut seluruh sesi lama dan sesi tidak
  dipercaya dari cookie cache stateless.

## Kondisi awal

`src/lib/auth.ts` pada `main`:

- `emailAndPassword` tidak menetapkan `revokeSessionsOnPasswordReset`, sehingga
  sesi perangkat yang sudah login tetap berlaku setelah password direset.
- `session.cookieCache` aktif (`enabled: true`, `maxAge: 300`). Cache ini
  menyimpan data sesi di cookie, sehingga sesi yang sudah dihapus di database
  masih dianggap sah hingga 5 menit.
- Adapter Drizzle tidak memakai `transaction: true`, sehingga penyimpanan
  password baru dan pencabutan sesi tidak dijamin atomik.

Dampak: penyerang yang memegang sesi lama tetap memiliki akses setelah korban
mengganti password, dan sesi yang dicabut admin masih diterima sementara waktu.

## Perubahan

- `src/lib/auth.ts`
  - `drizzleAdapter(..., { transaction: true })` agar reset password (token,
    password baru, pencabutan sesi) berjalan dalam satu transaksi.
  - `emailAndPassword.revokeSessionsOnPasswordReset: true`.
  - `session.cookieCache.enabled: false` sehingga setiap permintaan memverifikasi
    sesi ke database.
- `src/lib/auth-config.test.ts` (baru)
  - Regresi: `revokeSessionsOnPasswordReset` bernilai `true`.
  - Regresi: `cookieCache.enabled` bernilai `false`.

## Security/tenant

- Pencabutan sesi mengurangi jendela penyalahgunaan sesi curian setelah reset
  password, termasuk sesi lintas perangkat.
- Mematikan cookie cache juga membuat sesi yang dicabut admin langsung tidak
  berlaku, bukan menunggu cache 5 menit.
- Tidak ada perubahan pada resolusi tenant; `villageId` tetap dari sesi.

## Validasi

| Perintah | Hasil |
|---|---|
| `npx vitest run src/lib/auth-config.test.ts` | PASS — 2 test |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npx prettier --check src/lib` | PASS |

## Risiko tersisa

- Mematikan cookie cache menambah satu query sesi per permintaan terautentikasi.
  Ini trade-off yang disengaja untuk keamanan; bila beban jadi masalah, solusi
  berikutnya adalah cache server-side dengan invalidasi eksplisit, bukan cookie
  stateless.
- Alur reset password end-to-end (email, token, sesi perangkat nyata) belum
  diuji pada branch ini; hanya konfigurasi yang diuji.

## Status

Siap review. Belum di-merge dan belum di-deploy.
