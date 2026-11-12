# AUD-019-020 — Penutupan Kondisi Review TTE

## Status

Implementasi awal C-1, C-2, dan keputusan C-3 telah dibuat pada branch kerja terpisah. Belum siap merge atau deploy. Validasi lokal dan regenerasi lockfile masih wajib dilakukan oleh Freebuff.

## Keputusan maintainer

- **C-1 — Runtime dan CI:** Appdes menetapkan minimum runtime Node.js **22.12.0**. CI quality dan integration menggunakan Node.js 22.12.0 secara eksplisit. Keputusan ini mengakhiri dukungan runtime Node.js 20.9.
- **C-2 — ECANCELLED:** Tambahkan regresi pada fake resolver untuk mensimulasikan perilaku c-ares ketika `Resolver.cancel()` menolak query aktif dengan error berkode `ECANCELLED`. Tes abort harus memastikan operasi berakhir sebagai timeout yang terkendali dan kedua rejection query ditangani oleh `Promise.allSettled`.
- **C-3 — Type definitions:** Gunakan `@types/node` major 22, dipatok melalui range `^22.20.5`, agar deklarasi TypeScript selaras dengan runtime major Node.js 22.

## Perubahan

- `package.json`: `engines.node` menjadi `>=22.12.0`; `@types/node` menjadi `^22.20.5`.
- `.github/workflows/ci.yml`: kedua job menggunakan Node.js `22.12.0`.
- `src/features/surat/infrastructure/tte-https.test.ts`: fake resolver sekarang menolak query aktif dengan kode `ECANCELLED` saat dibatalkan; tes abort memverifikasi dua rejection tersebut terjadi dan ditangani.

## Validasi yang masih wajib

- [ ] Jalankan `npm install --package-lock-only` atau `npm install` dengan Node.js 22.12+ untuk memperbarui `package-lock.json` sesuai package.json. Jangan edit lockfile secara manual.
- [ ] `npm ci`
- [ ] `npm run format:check`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test:unit`
- [ ] `npm run build`
- [ ] `npm run test:integration` pada disposable MySQL 8 sesuai guard proyek.
- [ ] Verifikasi workflow CI di branch ini.

Belum ada hasil PASS yang diklaim untuk validasi di atas karena perubahan GitHub belum dieksekusi pada runner lokal. Pengujian BSrE asli tetap terpisah dan menunggu akses/staging resmi.

## Batas perubahan

Tidak ada perubahan pada implementasi protokol TTE, tidak ada perubahan schema/database, tidak ada PR, merge, atau deploy. Branch ini hanya untuk menutup C-1 sampai C-3.
