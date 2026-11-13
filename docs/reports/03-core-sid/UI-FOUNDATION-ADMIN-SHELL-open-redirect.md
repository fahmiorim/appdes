# UI-FOUNDATION-ADMIN-SHELL — Perbaikan Open Redirect Setelah Login

- **Task:** audit dan perbaikan branch `feat/ui-foundation-admin-shell`
- **Tanggal:** 2026-11-14
- **Branch:** `feat/ui-foundation-admin-shell`
- **Base commit:** `3338364a45e4c8e0c4d6f1cf78c4b5286f3321a4` (merge-base dengan `origin/main`)
- **Tip sebelum perbaikan:** `3fb1827` — `style(ui): align admin layout with prettier config`
- **Commit perbaikan:** `713c926` — `fix(auth): tutup open redirect pada parameter next setelah login`
- **Status:** siap review (belum merge/deploy)

## Tujuan

Memeriksa branch fondasi UI/admin shell (16 file baru, 1.215 baris terhadap `origin/main`) dan
memperbaiki cacat yang terkonfirmasi tanpa mengubah desain atau memperluas scope.

## Ringkasan kondisi awal

Branch menambahkan halaman masuk, layout admin (sidebar + topbar), halaman beranda, komponen UI
dasar, dan CSS design system. Pemeriksaan menemukan satu cacat keamanan terkonfirmasi pada alur
redirect setelah login.

`safeNextPath` di `src/app/(auth)/masuk/page.tsx` hanya memeriksa prefiks string:

```ts
if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/masuk")) {
  return "/beranda";
}
return value;
```

`LoginForm` meneruskan hasilnya ke `window.location.assign(nextPath)`. Pemeriksaan prefiks tidak
sejalan dengan cara parser URL browser menormalkan path, sehingga nilai berikut lolos validasi
tetapi berakhir sebagai origin eksternal:

| Input `next`          | Hasil parse browser              |
| --------------------- | -------------------------------- |
| `/\evil.test`         | `https://evil.test/`             |
| `/\\evil.test`        | `https://evil.test/`             |
| `/\t/evil.test`       | `https://evil.test/` (tab dibuang parser) |
| `/\n/evil.test`       | `https://evil.test/` (newline dibuang parser) |

Dampak: penyerang dapat mengirim tautan `https://<desa>/masuk?next=/\evil.test`; setelah korban
login dengan kredensial sah, browser diarahkan ke situs penyerang (open redirect, phishing
setelah autentikasi).

## Analisis dan pendekatan

Validasi berbasis teks mentah rapuh karena parser URL melakukan normalisasi (backslash dianggap
slash, karakter kontrol dibuang) sebelum menentukan host. Perbaikan memindahkan logika ke modul
murni `src/lib/safe-next-path.ts` dan menilai **origin hasil parse**, bukan bentuk string:

1. Nilai wajib string dan diawali `/`.
2. Nilai di-parse dengan `new URL(value, "http://app.local")`.
3. Jika `url.origin` berbeda dari origin acuan, kembalikan `/beranda`.
4. Path `/masuk` dan turunannya ditolak agar tidak terjadi loop redirect.
5. Nilai yang lolos dikembalikan sebagai `pathname + search + hash` (bentuk same-origin
   ternormalisasi).

Pendekatan ini menutup seluruh kelas bypass parser (backslash, tab, newline, protocol-relative)
tanpa daftar hitam karakter yang harus terus diperbarui.

## File yang diperiksa

- `src/app/(auth)/masuk/page.tsx`, `login-form.tsx`
- `src/app/(admin)/layout.tsx`, `src/app/(admin)/beranda/page.tsx`
- `src/components/shell/admin-sidebar.tsx`, `admin-topbar.tsx`
- `src/components/ui/{alert,button,card,form-field}.tsx`
- `src/features/dashboard/application/dashboard-use-cases.ts`,
  `src/features/dashboard/infrastructure/dashboard-repository.ts`
- `src/features/desa/application/use-cases.ts`
- `src/features/rbac/application/authorization.ts`
- `src/lib/dal.ts`, `src/lib/auth-client.ts`, `src/app/layout.tsx`, `src/app/globals.css`
- `docs/reports/03-core-sid/UI-FOUNDATION-ADMIN-SHELL.md`

## File yang diubah

| File                                   | Alasan                                                              |
| -------------------------------------- | ------------------------------------------------------------------- |
| `src/lib/safe-next-path.ts`            | Modul baru berisi validasi redirect same-origin yang dapat diuji.   |
| `src/lib/safe-next-path.test.ts`       | Regresi untuk path lokal dan seluruh bentuk bypass parser.          |
| `src/app/(auth)/masuk/page.tsx`        | Menghapus helper lokal dan memakai modul validasi baru.             |

## Perubahan

- `safeNextPath` sekarang mem-parse nilai terhadap origin tetap dan menolak hasil yang berbeda
  origin, termasuk backslash, tab, newline, dan URL protocol-relative.
- Halaman masuk tetap mengarahkan pengguna yang sudah login sesuai perilaku sebelumnya
  (warga → `/layanan-mandiri`, selain itu `nextPath` tervalidasi).
- Tidak ada perubahan pada skema database, migration, RBAC, middleware, atau tampilan.

## Security/tenant

- **Open redirect:** ditutup pada sisi server sebelum nilai diteruskan ke komponen klien; klien
  tidak lagi menerima string mentah dari query.
- **Redirect loop:** `/masuk` dan `/masuk/*` tetap ditolak.
- **Tenant isolation:** query dashboard (`residents`, `families`, `letters`) seluruhnya difilter
  `villageId` dari sesi; nama desa diambil dari `user.villageId`. Tidak ditemukan kebocoran lintas
  tenant pada diff ini.
- **Otorisasi:** layout admin memakai `verifySession()` dan menolak pengguna dengan `residentId`.
  Catatan pada bagian risiko terkait `DEFAULT_RESOURCE`.

## Test

Perintah dan hasil sebenarnya:

| Perintah                                                                 | Hasil  |
| ------------------------------------------------------------------------ | ------ |
| `npm run test:unit -- src/lib/safe-next-path.test.ts` (sebelum perbaikan) | FAIL — 2 kasus backslash gagal (bukti RED) |
| `npm run test:unit -- src/lib/safe-next-path.test.ts` (guard backslash)   | FAIL — tab & newline lolos (bukti RED kedua) |
| `npm run test:unit -- src/lib/safe-next-path.test.ts` (setelah perbaikan) | PASS — 9/9 |
| `npm run test:unit`                                                       | PASS — 193 file, 1.729 test |
| `npm run typecheck`                                                       | PASS |
| `npx eslint <3 file berubah>`                                             | PASS |
| `npx prettier --check <3 file berubah>`                                   | PASS |
| `git diff --check`                                                        | PASS |

RED pertama: `expected '/\evil.test' to be '/beranda'`.
RED kedua: `expected '/\t/evil.test' to be '/beranda'` dan `'/\n/evil.test'`.

Tidak dijalankan: `npm run build` (perubahan hanya modul murni + import; typecheck sudah
memvalidasi batas server/klien), dan integration test MySQL (tidak ada perubahan schema/query).

## Risiko tersisa

1. Perilaku redirect belum diverifikasi di browser sungguhan; jaminan berasal dari semantik parser
   URL (`new URL`) yang sama dengan yang dipakai browser saat navigasi.
2. Temuan berikut **tidak** diperbaiki pada commit ini agar tetap satu temuan per perubahan:
   - Menu mobile: sidebar tertutup hanya digeser `translateX(-100%)` sehingga tautannya masih
     dapat difokus keyboard; belum ada scrim, `aria-controls`, atau penutupan via Escape.
   - `AdminLayout` memanggil `hasPermission(..., DEFAULT_RESOURCE, "read")` yang selalu `true`
     untuk semua pengguna login, sehingga redirect ke `/masuk` pada blok itu tidak pernah tercapai
     (bukan eskalasi izin, tetapi pemeriksaan menyesatkan).
   - `globals.css` mengimpor Google Fonts (DM Sans, Plus Jakarta Sans) tetapi `--font-sans` /
     `--font-display` memakai "Segoe UI", sehingga font eksternal tidak terpakai.
   - `AdminTopbar.handleSignOut` tidak menangani kegagalan `signOut` selain mereset state.
3. Branch belum di-merge dan belum di-deploy.

## Kesimpulan

Satu cacat keamanan terkonfirmasi (open redirect setelah login) sudah diperbaiki, diuji dengan
bukti RED→GREEN, dan seluruh unit test repo tetap lulus. Temuan UI/a11y di atas disarankan menjadi
task terpisah.
