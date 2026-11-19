# Halaman Login Admin Desa Terpisah

- **Task:** memisahkan pintu masuk Admin Desa dari login warga. Tujuan: staf desa mendapat halaman login dengan identitas ruang kerja administrasi, sementara `/masuk` tetap menjadi login layanan warga.
- **Tanggal:** 19 November 2026
- **Branch:** `feat/admin-desa-login-ui`
- **Base commit:** `4ef94cf572b39b34a7b70c887ea845dfef4dbe32` (`main`, PR #154)
- **Commit hasil:** lihat commit teratas branch ini.

## 1. Kondisi awal

Sebelum perubahan, seluruh pengguna tanpa sesi diarahkan ke `/masuk`. Halaman itu memakai bahasa dan visual layanan warga: hero "Layanan Digital Warga Desa", foto kantor desa, dan ajakan masuk ke layanan mandiri. Admin Desa memakai halaman yang sama, sehingga konteks ruang kerja administrasi tidak terlihat sejak awal.

Halaman `/super-admin-login` sudah memakai pola split-screen. Pola tersebut menjadi acuan, tetapi login Admin Desa perlu identitas sendiri dan tidak boleh mengarahkan warga atau pengelola platform ke alur yang salah.

## 2. Ruang lingkup

Perubahan mencakup presentasi halaman login, pengarahan rute tanpa sesi, dan tautan silang antar-login. Mekanisme autentikasi tetap memakai `LoginForm` dan `authClient.signIn.username` yang sudah ada. Tidak ada perubahan schema, migration, query data, permission, atau use case.

## 3. File yang diperiksa

- `src/app/(auth)/masuk/page.tsx` dan `src/app/(auth)/masuk/login-form.tsx`
- `src/app/(auth)/super-admin-login/page.tsx` dan `super-admin-login.module.css`
- `src/app/(admin)/layout.tsx`
- `src/components/shell/admin-topbar.tsx`
- `src/proxy.ts`
- `src/lib/public-paths.ts`, `src/lib/safe-next-path.ts`, dan test terkait
- `src/lib/dal.ts` (jalur `getCurrentUser`/`verifySession`)
- `src/features/desa/application/platform-host.ts` dan `src/features/desa/domain/host.ts`
- `src/features/multi-desa/application/provisioning-use-cases.ts` (pemeriksaan `isSuperAdminUser`)
- `docs/design/ADMIN-PLATFORM-DESIGN.md` dan `docs/design/DESIGN-SYSTEM.md`

## 4. File yang diubah

| File | Alasan |
|---|---|
| `src/app/(auth)/masuk-admin/page.tsx` | Halaman baru login Admin Desa; memakai ulang `LoginForm`, memeriksa host platform, warga, dan pengelola platform. |
| `src/app/(auth)/masuk-admin/masuk-admin.module.css` | Styling split-screen desktop, tablet, dan mobile dengan token desain yang ada. |
| `src/app/(auth)/masuk-admin/page.test.ts` | Test render dan redirect halaman baru. |
| `src/app/(auth)/masuk/page.tsx` | Menambah tautan "Administrator desa? Masuk ke ruang kerja". |
| `src/app/globals.css` | Gaya tautan silang pada kartu login warga. |
| `src/app/(admin)/layout.tsx` | Sesi admin tidak valid diarahkan ke `/masuk-admin`; warga tetap ke layanan mandiri. |
| `src/components/shell/admin-topbar.tsx` | Sign-out Admin Desa ke `/masuk-admin`; pengelola platform ke `/super-admin-login`. |
| `src/proxy.ts` | Rute terlindungi non-warga diarahkan ke `/masuk-admin`; `/layanan-mandiri/*` tetap ke `/masuk`. |
| `src/lib/public-paths.ts` | `/masuk-admin` dapat dibuka tanpa sesi. |
| `src/lib/public-paths.test.ts` | Memastikan `/masuk` dan `/masuk-admin` termasuk rute publik. |
| `src/lib/safe-next-path.ts` | Menolak `/masuk-admin` sebagai tujuan `next` agar tidak terjadi loop. |
| `src/lib/safe-next-path.test.ts` | Negative test untuk `/masuk-admin` dan turunannya. |

## 5. Perubahan

- **Halaman baru `/masuk-admin`:** split-screen biru–teal dengan brand FlexiDesa, ringkasan fungsi administrasi (kependudukan, persuratan, keuangan), kartu login putih, catatan akses terbatas, dan tautan ke layanan warga.
- **Form:** memakai `LoginForm` yang sama, sehingga validasi, pesan error, tombol lihat kata sandi, dan pemanggilan autentikasi tidak diduplikasi.
- **Foto kantor:** foto statis yang menampilkan nama desa contoh dibuat blur dan transparan agar tidak memberi kesan tenant tertentu. Latarutama tetap gradien dan pola titik.
- **Responsif:** desktop 1440 px memakai dua kolom; tablet 1024 px tetap dua kolom dengan kartu lebih rapat; pada 860 px ke bawah panel ditumpuk, fitur dekoratif disembunyikan, dan kartu menjadi selebar layar.
- **Pengarahan:**
  - `/beranda`, `/penduduk`, dan rute admin lain tanpa cookie → `/masuk-admin?next=...`.
  - `/layanan-mandiri/*` tanpa cookie → `/masuk?next=...`.
  - `/super-admin/*` tanpa cookie → `/super-admin-login?next=...`.
  - Host platform yang membuka `/masuk-admin` → `/super-admin-login`.
- **Sesi yang sudah ada:** warga diarahkan ke `/layanan-mandiri`; pengelola platform ke `/super-admin`; staf desa ke `next` yang sudah disanitasi.
- **Sign-out:** Admin Desa kembali ke halaman login admin, bukan login warga.

## 6. Security/tenant

- Halaman baru tetap memakai `getCurrentUser()` server-side dan `LoginForm` yang sudah ada; tidak ada jalur autentikasi baru.
- `villageId` tidak pernah dibaca dari body, query, atau header untuk menentukan tenant. Pemeriksaan `residentId`, `villageId`, dan `isSuperAdminUser` dilakukan server-side.
- `AdminLayout` tetap memeriksa `residentId`, status pengelola platform, dan permission dashboard. Hanya tujuan redirect yang berubah.
- `safeNextPath` tetap membatasi tujuan ke origin internal, menolak URL eksternal/protokol ganda, dan sekarang juga menolak `/masuk` serta `/masuk-admin` untuk mencegah loop.
- `/masuk-admin` ditambahkan sebagai rute publik hanya agar formulir dapat dirender tanpa sesi. Halaman tetap mengalihkan pengguna yang sudah masuk sesuai perannya.
- Foto tenant contoh tidak lagi terbaca jelas; tidak ada data desa nyata yang ditampilkan.

## 7. Validasi

| Perintah | Status | Catatan |
|---|---|---|
| `npm run test:unit -- "src/app/(auth)/masuk-admin/page.test.ts" "src/lib/safe-next-path.test.ts" "src/lib/public-paths.test.ts"` | PASS | 3 file, 19 test lulus. |
| `npm run typecheck` | PASS | `next typegen` dan `tsc --noEmit` tanpa error. |
| `npm run lint` | PASS | 0 error; 2 warning `no-console` yang sudah ada di `scripts/wilayah/generate-wilayah.mjs`. |
| `npx prettier --check` pada seluruh file yang diubah | PASS | Semua file sesuai format. |
| `git diff --check` | PASS | Tidak ada whitespace error. |
| Redirect proxy via `curl` | PASS | `/beranda` → `/masuk-admin?next=%2Fberanda`; `/layanan-mandiri/beranda` → `/masuk?next=...`; host platform `/super-admin` → `/super-admin-login?next=...`; `/masuk-admin` host platform → `/super-admin-login`. |
| Pemeriksaan visual browser | PASS | Desktop 1440×1000, tablet 1024×900, mobile 390×844. Halaman merender 200, dua kolom/tumpukan sesuai breakpoint, tidak ada overflow yang terlihat. |
| Login end-to-end dengan akun nyata | SKIPPED | Tidak ada kredensial test; alur submit belum diuji di browser. |
| `npm run build` | SKIPPED | Tidak dijalankan pada task ini; kompilasi dev dan typecheck lulus. |

## 8. Risiko dan keterbatasan

- Test halaman memakai mock `LoginForm`, sehingga tampilan form nyata diverifikasi lewat screenshot, bukan interaksi submit.
- Sign-out belum diuji di browser dengan sesi nyata; perubahan hanya memilih tujuan redirect berdasarkan properti `isPlatformAdmin` yang sudah ada.
- Staf terautentikasi tanpa permission dashboard masih dapat mengalami loop redirect karena halaman login mengarahkan staf ke `next`/`/beranda`, lalu layout menolak. Perilaku ini sudah ada pada alur `/masuk` sebelumnya dan tidak diubah pada task ini.
- Inventaris modul belum diperbarui karena generator membaca tree `origin/main`; rute baru akan masuk setelah branch di-merge.
- Screenshot validasi berada di direktori `artifacts/` yang diabaikan Git dan tidak disertakan dalam commit.

## 9. Kesimpulan

Admin Desa kini memiliki halaman login terpisah dengan konteks ruang kerja yang jelas, sementara warga tetap memakai `/masuk`. Redirect, sanitasi `next`, dan pemeriksaan sesi tetap dilakukan server-side. Perubahan siap direview; merge menunggu persetujuan maintainer.
