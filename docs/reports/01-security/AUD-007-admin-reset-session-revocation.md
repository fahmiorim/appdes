# AUD-007 — Cabut sesi saat reset Admin Desa oleh Super Admin

- **Task:** AUD-007, melengkapi pencabutan sesi pada reset akses admin desa oleh Super Admin.
- **Tanggal:** 14 November 2026.
- **Branch:** `task/AUD-007-admin-reset-session-revocation`.
- **Base commit:** `3338364a45e4c8e0c4d6f1cf78c4b5286f3321a4` (`main`).
- **Commit hasil:** lihat hash commit task yang dicantumkan pada penyerahan branch.
- **Tujuan:** memastikan sandi sementara yang dibuat melalui konsol Super Admin membatalkan sesi Admin Desa lama.

## Kondisi awal dan analisis

`src/lib/auth.ts` sudah menetapkan `revokeSessionsOnPasswordReset: true` untuk alur reset password Better Auth. Namun, `resetAksesAdminDesa()` membuat hash sandi lalu memanggil repository `resetAdminDesa()`, yang mengubah akun credential secara langsung. Jalur langsung tersebut mengaktifkan user kembali tetapi tidak menghapus baris sesi.

Akibatnya, sesi Admin Desa yang sudah aktif berpotensi tetap dipakai setelah Super Admin mereset password. Perubahan ini dibatasi pada jalur reset khusus tersebut.

## File diperiksa

- `src/features/multi-desa/infrastructure/kelola-desa-repository.ts`
- `src/features/multi-desa/application/kelola-desa-use-cases.ts`
- `src/features/multi-desa/application/kelola-desa-use-cases.test.ts`
- `src/db/schema/auth.ts`
- `src/lib/auth.ts`, `src/lib/auth-config.test.ts`
- `docs/MASTER_ROADMAP.md`
- `docs/reports/01-security/AUD-007-revoke-sessions-password-reset.md`

## File diubah

- `src/features/multi-desa/infrastructure/kelola-desa-repository.ts` — pembaruan credential, penghapusan seluruh sesi user admin, dan aktivasi akun kini memakai satu transaksi database.
- `src/features/multi-desa/infrastructure/kelola-desa-repository.test.ts` — regression test memverifikasi urutan operasi, scope penghapusan sesi ke ID admin desa sasaran, transaksi tunggal, dan perilaku saat credential tidak ditemukan.
- `docs/reports/01-security/AUD-007-admin-reset-session-revocation.md` — laporan pekerjaan dan validasi.

## Perubahan

`resetAdminDesa()` sekarang:

1. mencari administrator desa dengan `villageId` yang diberikan;
2. dalam satu transaksi memperbarui hash credential;
3. jika credential tidak ada, melempar conflict sehingga transaksi rollback;
4. menghapus seluruh `sessions` untuk `admin.id` tersebut saja;
5. mengaktifkan kembali akun admin.

Tidak ada perubahan schema, migration, API publik, atau dependency. Sesi milik user lain tidak menjadi target penghapusan.

## Security/tenant

- Pemanggil tetap melewati `requireSuperAdmin()` sebelum mencapai repository.
- User sasaran tetap ditemukan menggunakan `villageId` yang tervalidasi di use case dan query role administrator.
- Delete sesi dibatasi ke `sessions.userId = admin.id`; tidak menerima user ID dari input klien.
- Operasi reset terkait atomik: bila pembaruan password gagal/tidak menemukan credential, penghapusan sesi dan aktivasi tidak berjalan; error dalam transaksi membatalkan perubahan.
- Tidak ada data sensitif atau credential yang dimasukkan ke laporan.

## Validasi

| Perintah | Hasil |
|---|---|
| `npx vitest run --config vitest.config.mts src/features/multi-desa/infrastructure/kelola-desa-repository.test.ts` sebelum implementasi | **FAIL sesuai harapan** setelah mock diperbaiki: test sukses reset gagal karena `db.transaction` tidak dipanggil. Test jalur credential tidak ditemukan lulus. |
| Perintah Vitest yang sama setelah implementasi | **PASS** — 1 file, 2 test. |
| `npx vitest run --config vitest.config.mts src/features/multi-desa/infrastructure/kelola-desa-repository.test.ts src/features/multi-desa/application/kelola-desa-use-cases.test.ts src/lib/auth-config.test.ts` | **PASS** — 3 file, 8 test. |
| `npm run typecheck` | **PASS** — `next typegen && tsc --noEmit`. |
| `npx eslint src/features/multi-desa/infrastructure/kelola-desa-repository.ts src/features/multi-desa/infrastructure/kelola-desa-repository.test.ts` | **PASS**. |
| `npx prettier --check src/features/multi-desa/infrastructure/kelola-desa-repository.ts src/features/multi-desa/infrastructure/kelola-desa-repository.test.ts` (setelah `npx prettier --write` pada test) | **PASS**. |
| `git diff --check` | **PASS**. |
| Integration test / database | **SKIPPED** — perubahan tidak membutuhkan schema dan test unit memeriksa kontrak query; tidak ada koneksi database dijalankan. |
| GitHub Actions / CI branch | **SKIPPED** — tidak ada run CI yang tersedia pada saat laporan dibuat. |

## Risiko dan keterbatasan

- Test repository memakai mock Drizzle; belum menjalankan reset terhadap MySQL nyata.
- Alur Better Auth biasa dan pengaturan cookie cache tidak diubah. Integrasi operasional dan pencabutan sesi lintas instance tidak diuji pada database runtime dalam task ini.
- Full unit suite dan build tidak dijalankan; pemeriksaan dibatasi pada test terkait, typecheck, lint, format, dan diff check.
- Perubahan belum di-push; tidak ada URL GitHub/PR. SHA commit dicantumkan pada penyerahan branch lokal.

## Kesimpulan dan rekomendasi

Perubahan lokal menutup celah reset Admin Desa oleh Super Admin dengan pencabutan sesi yang dibatasi ke akun sasaran dan berada dalam transaksi bersama reset password. Siap untuk review lokal setelah perubahan dan laporan diperiksa. Langkah berikutnya adalah review maintainer, lalu CI pada branch sebelum merge; tidak ada merge atau deploy yang dilakukan.
