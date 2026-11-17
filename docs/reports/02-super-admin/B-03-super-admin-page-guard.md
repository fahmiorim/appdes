# B-03 — Guard `requireSuperAdmin` di halaman /super-admin

- **Task:** B-03 (temuan audit 17 November 2026) — halaman `/super-admin` belum punya guard eksplisit; otorisasi hanya bergantung pada use case data.
- **Tanggal:** 17 November 2026
- **Branch:** `task/AUD-034-b3-super-admin-guard-2026-11-17`
- **Base commit:** `07b13ab6260e8c2d30ac067727e3ce84b2473711` (`main`)
- **Commit pekerjaan:** `c3eb3185b1daccd037a8b13676415b4c353b7aad`
- **Tujuan:** halaman menolak pengguna non-super-admin sebelum data tenant dimuat, tanpa bergantung pada satu lapisan use case.

## 1. Kondisi awal

`SuperAdminPage` langsung memanggil `daftarDesaSuperAdmin()`:

```tsx
export default async function SuperAdminPage() {
  const desa = await daftarDesaSuperAdmin();
  ...
}
```

`daftarDesaSuperAdmin()` memang memanggil `requireSuperAdmin()`, sehingga **tidak ada kebocoran data**. Namun:

- guard hanya ada di satu lapisan (use case); perubahan pemanggilan di halaman dapat membuka akses tanpa terdeteksi;
- Admin Desa yang mengetik URL melewati layout admin (layout hanya menolak akun tanpa desa yang bukan platform admin) lalu menerima error boundary dari `AppError` `FORBIDDEN`, bukan penolakan yang jelas;
- tidak ada test halaman yang memastikan guard dijalankan sebelum pengambilan data.

## 2. File yang diperiksa

- `src/app/(admin)/super-admin/page.tsx` — sumber temuan.
- `src/app/(admin)/layout.tsx` — hanya mengalihkan akun `villageId === null` yang bukan platform admin; Admin Desa lolos ke area admin.
- `src/features/multi-desa/application/provisioning-use-cases.ts` — `isSuperAdminUser`, `requireSuperAdmin`, `daftarDesaSuperAdmin`.
- `src/lib/dal.ts` — `requireUser`, `verifySession`.
- `src/lib/errors.ts` — `forbidden()` dan `AppError`.
- `src/features/multi-desa/presentation/tenant-table.tsx`, `src/components/ui/card.tsx` — komponen yang dirender halaman.
- Test guard sejenis: `src/features/multi-desa/application/provisioning-use-cases.test.ts`, route restore database.

## 3. File yang diubah

| File | Alasan |
| --- | --- |
| `src/app/(admin)/super-admin/page.tsx` | Menambahkan `await requireSuperAdmin();` sebelum `daftarDesaSuperAdmin()`. |
| `src/app/(admin)/super-admin/page.test.ts` | Test baru: negatif (non-super-admin, data tidak dimuat) dan positif (guard lolos, data dimuat). |

Tidak ada perubahan pada `requireSuperAdmin`, use case, layout, route, UI, schema, atau dependency.

## 4. Perubahan

```tsx
export default async function SuperAdminPage() {
  // Guard di level halaman, bukan hanya di use case, agar halaman ini tidak
  // pernah merender data tenant bila suatu saat pemanggilan use case berubah.
  await requireSuperAdmin();

  const desa = await daftarDesaSuperAdmin();
  ...
}
```

- `requireSuperAdmin()` memakai `requireUser()` lalu `isSuperAdminUser()`: pengguna harus login, `villageId === null`, dan role platform `super-admin`. Role `administrator` desa tetap ditolak.
- Penolakan terjadi **sebelum** `daftarDesaSuperAdmin()` dipanggil, sehingga tidak ada query data tenant untuk pengguna yang tidak berhak.
- `daftarDesaSuperAdmin()` tetap mempertahankan guard-nya sendiri (pertahanan berlapis).

## 5. Test

Perintah dan hasil sebenarnya (Windows, Node v26.2.0, tanpa database):

| Perintah | Hasil |
| --- | --- |
| `npx vitest run "src/app/(admin)/super-admin/page.test.ts"` | **PASS** — 2 test |
| Test yang sama tanpa guard (stash sementara) | **FAIL** — 2/2 gagal, membuktikan test menangkap regresi |
| `npm run test:unit` | **PASS** — 201 file, 1.777 test |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | **PASS** — exit 0 |
| `npm run lint` (`eslint .`) | **PASS dengan warning** — 0 error; 7 warning lama `@next/next/no-img-element` di `src/app/(auth)/masuk/page.tsx` |
| `npm run test:integration` | **SKIPPED** — membutuhkan MySQL disposable; tidak ada perubahan database |
| `npm run build` | **SKIPPED** — typecheck dan unit test mencakup perubahan |
| Uji browser | **SKIPPED** — tidak diminta |

Test memakai mock `requireSuperAdmin` dan `daftarDesaSuperAdmin`; test negatif memastikan `daftarDesaSuperAdmin` **tidak** dipanggil saat guard menolak.

## 6. Risiko dan keterbatasan

1. **Pengalaman non-super-admin masih error boundary.** `AppError` `FORBIDDEN` dilempar dari Server Component, dan repository belum punya `forbidden.tsx`. Guard menutup akses dan ketergantungan satu lapisan, tetapi tidak mengubahnya menjadi halaman 403/redirect. Perbaikan UX tersebut memerlukan halaman error khusus atau `redirect("/beranda")`, di luar scope task ini.
2. **Role lookup ganda.** Halaman memanggil `requireSuperAdmin()` lalu `daftarDesaSuperAdmin()` yang memanggilnya lagi, sehingga `getRoleById` berjalan dua kali per render. Biaya kecil dan sengaja diterima demi pertahanan berlapis.
3. **Tidak ada pengujian runtime browser.** Test memverifikasi urutan guard dan pemanggilan use case, bukan render HTML akhir.
4. **Tidak ada pengujian integration/DB**, sesuai scope dan aturan AGENTS.md.

## 7. Kesimpulan

B-03 selesai pada tingkat guard: halaman `/super-admin` sekarang menolak non-super-admin secara eksplisit sebelum data tenant dimuat, dengan test negatif yang gagal tanpa guard.

**Status: siap review.** Commit hanya lokal; belum di-push, belum di-merge, dan tidak ada perubahan database atau deployment.
