# Filter status tenant lewat query param

- **Task:** AUD/UX — tautan status di Ringkasan Platform langsung memfilter konsol tenant.
- **Tanggal:** 18 November 2026.
- **Branch:** `task/tenant-status-query-filter`.
- **Base commit:** `12028cca1b62d03e623b6a63d31517576d7eb14a` (`main`, redesign konsol platform #125).

## 1. Tujuan

Panel “Perlu perhatian” di Ringkasan Platform menampilkan jumlah desa nonaktif dan siap purge, tetapi tautannya membuka daftar tenant tanpa filter (dan tautan “Lihat audit” malah membuka halaman audit). Operator harus memilih filter status secara manual setiap kali menindaklanjuti temuan tersebut.

Tujuan task: status filter pada konsol tenant dibaca dari query param, sehingga tautan dapat membuka daftar yang sudah terfilter, bisa dibagikan, dan tahan refresh.

## 2. Kondisi awal

- `TenantConsole` menyimpan filter status di `useState("semua")` saja; tidak ada kaitan dengan URL.
- Halaman `/super-admin/tenant` tidak menerima `searchParams`.
- Tautan “Tinjau tenant” pada Ringkasan menuju `/super-admin/tenant` tanpa parameter; tautan “desa siap purge” menuju `/super-admin/audit`.

## 3. Perubahan

Nilai query param memakai nilai yang sama dengan `<option>`: `semua`, `aktif`, `nonaktif`, `siap-purge`.

| File | Alasan |
|---|---|
| `src/features/multi-desa/domain/status-tenant-filter.ts` (baru) | Sumber tunggal daftar filter, parsing query param, dan aturan pencocokan status. Nilai asing/kosong jatuh ke `semua`, bukan daftar kosong. |
| `src/features/multi-desa/domain/status-tenant-filter.test.ts` (baru) | Test parsing (nilai dikenal, kosong, asing, parameter berulang) dan pencocokan tiap filter. |
| `src/features/multi-desa/presentation/tenant-console.tsx` | Filter awal dari prop `statusAwal`; memilih status memperbarui URL lewat `router.replace` (tanpa menambah riwayat); aturan pencocokan memakai fungsi domain, bukan salinan logika di komponen. |
| `src/app/(admin)/super-admin/tenant/page.tsx` | Menerima `searchParams`, mem-parse `status`, meneruskan `statusAwal`, dan memberi `key={statusAwal}` agar URL menjadi sumber kebenaran saat parameter berubah. |
| `src/app/(admin)/super-admin/tenant/page.test.ts` | Test `?status=siap-purge` menampilkan 1 dari 2 desa, dan status tak dikenal menampilkan semua; test lama disesuaikan dengan props halaman. |
| `src/app/(admin)/super-admin/page.tsx` | Tautan nonaktif → `?status=nonaktif`; tautan siap purge → `?status=siap-purge` (sebelumnya ke halaman audit) dengan label “Buka konsol tenant”. |
| `src/app/(admin)/super-admin/page.test.ts` | Test bahwa kedua tautan membawa query param yang benar. |

Tidak ada perubahan schema, migration, dependency, atau CSS.

## 4. Security/tenant

- Tidak ada data atau akses baru: filter hanya menyaring daftar yang sudah dimuat lewat guard `pastikanSuperAdmin()` dan `daftarDesaSuperAdmin()` yang tenant-scoped.
- Query param hanya memengaruhi tampilan; ia tidak dipakai untuk memilih desa, otorisasi, atau query database. Nilai divalidasi terhadap allowlist sehingga nilai asing tidak diteruskan ke mana pun.
- Tidak ada ID desa yang diterima dari klien pada task ini.

## 5. Test

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Test terfokus (domain filter + halaman tenant + Ringkasan) sebelum implementasi | `node node_modules/vitest/vitest.mjs run --config vitest.config.mts src/features/multi-desa/domain/status-tenant-filter.test.ts "src/app/(admin)/super-admin/tenant/page.test.ts" "src/app/(admin)/super-admin/page.test.ts"` | FAIL sesuai harapan — modul filter belum ada, halaman mengabaikan `?status=`, tautan belum membawa parameter |
| Test terfokus setelah implementasi | perintah yang sama | PASS — 3 file, 15 test |
| Typecheck, lint, format, seluruh unit test | `npm run check` | PASS — 216 file, 1897 test |
| Integration test | — | SKIPPED — tidak relevan (tidak ada perubahan query/repository); MySQL lokal tidak berjalan |
| Pemeriksaan interaksi (`router.replace` saat memilih status) | — | SKIPPED — tidak ada sesi aplikasi berjalan; logikanya satu baris dan tidak diuji di browser |

## 6. Risiko dan batasan

- Perilaku mengganti pilihan filter lalu memperbarui URL belum diuji lewat browser; yang diuji adalah pembacaan query param di server dan pemfilteran daftar.
- Filter hanya mencakup status; kata kunci pencarian tetap lokal dan tidak ikut tersimpan di URL.
- Tautan “Kelola” pada tabel “Tenant terbaru” masih menuju daftar tanpa filter karena bukan bagian task ini.
- `key={statusAwal}` me-remount konsol saat parameter berubah; konsekuensinya panel yang sedang terbuka (Kelola) tertutup setelah navigasi filter. Ini disengaja agar URL menang atas state lama.

## 7. Kesimpulan

Tautan desa nonaktif dan siap purge kini membuka konsol tenant yang sudah terfilter, dan pilihan filter di konsol tercermin di URL sehingga bisa dibagikan. Menunggu review maintainer; tidak ada merge atau deploy.
