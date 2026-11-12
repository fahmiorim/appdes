# AUD-021 — Audit Server Actions dan Route Handlers

> **Repository:** `fahmiorim/appdes`  
> **Tanggal:** 13 November 2026  
> **Branch:** `task/AUD-021-route-action-security-audit`  
> **Base:** `main` — `e565f18baf78291724fed79fb8e8f19b90cf1de4`  
> **Metode:** pemeriksaan statis source code dan alur use case; tidak ada akses database, deployment, atau perubahan source aplikasi.

## 1. Ringkasan eksekutif

Pemeriksaan tree menemukan **80 Route Handler**:
- 49 route pada group `(admin)`
- 6 route pada group `(public)`
- 3 route pada group `(warga)`
- 22 route pada `api`

Tidak ditemukan file `page.tsx`, `actions.ts`, atau file `.tsx` pada tree yang diperiksa. Karena itu tidak ada entrypoint Server Action eksplisit (`"use server"`) yang dapat diinventarisasi dari source tree saat ini. Audit ini menilai 80 Route Handler dan application use case yang menjadi gerbang otorisasi bagi route tersebut; hasilnya **tidak boleh ditafsirkan sebagai sertifikasi terhadap Server Action yang tidak ada/ tidak terdeteksi pada tree**.

**Kesimpulan:** tidak ditemukan bukti statis bahwa route Admin dapat diakses tanpa autentikasi/otorisasi. Pola utama sudah cukup konsisten: pemeriksaan langsung melalui DAL/RBAC atau delegasi ke application use case yang menjalankan `requirePermission`; route platform menggunakan `requireSuperAdmin`; API mitra menggunakan API key; API publik menentukan tenant melalui host resolver.

Namun ditemukan beberapa hardening gap yang perlu ditutup sebelum audit keamanan dinyatakan selesai: CSV formula injection/escaping pada ekspor bantuan, cache-control yang tidak eksplisit pada beberapa respons privat, dan rate limiting yang tidak konsisten pada endpoint baca publik.

## 2. Kontrol positif yang diverifikasi

### 2.1 Route Admin

Pemeriksaan menemukan dua pola yang dipakai:
1. Route memanggil `getCurrentUser()` / `penggunaRoute()` dan memeriksa permission melalui `hasPermission()`.
2. Route mendelegasikan ke application use case yang menjalankan `requirePermission(resource, action)` dan mengambil `villageId` melalui `resolveVillageId(user)`.

Contoh yang ditelusuri:
- `src/features/penduduk/application/use-cases.ts`: `listPenduduk` dan `cariPendudukByNikData` memerlukan permission penduduk dan tenant dari sesi.
- `src/features/kelompok/application/use-cases.ts`: operasi baca, tulis, dan ekspor memakai `requirePermission` serta `resolveVillageId`.
- `src/features/survey/application/use-cases.ts`: ekspor dan laporan skor memastikan permission dan kepemilikan survei oleh tenant.
- `src/features/kesehatan/application/kia-use-cases.ts`: ekspor KIA memakai permission kesehatan dan tenant dari sesi.
- `src/features/database/application/database-use-cases.ts`: backup dan restore memerlukan `requireSuperAdmin`.
- `src/features/api-eksternal/application/api-key-use-cases.ts`: pengelolaan API key memerlukan permission pengaturan dan tenant dari sesi.

Route yang tampak tidak memiliki guard langsung tidak otomatis dianggap terbuka; beberapa memang memanggil use case yang memegang guard. Tidak ditemukan route Admin yang terbukti melewati kedua lapisan tersebut pada sampel alur yang ditelusuri.

### 2.2 API publik dan integrasi

- API mitra mengautentikasi API key, membatasi permintaan berdasarkan key, dan memakai `apiKey.villageId` sebagai tenant.
- API publik generik memakai `jalankanApiPublik`, yang menentukan tenant melalui host resolver, menerapkan rate limit, dan mengirim respons `no-store`.
- Media publik membatasi kategori/path dan memeriksa segmen tenant terhadap desa dari host.
- Webhook email memverifikasi token dengan perbandingan timing-safe dan membatasi ukuran body.
- Route restore memeriksa Super Admin sebelum membaca body unggahan, mewajibkan Content-Length, dan membatasi ukuran unggahan.

### 2.3 Data warga

Route dokumen dan PDF warga memerlukan sesi dan use case membatasi dokumen berdasarkan `residentId` sesi. Lampiran pengaduan memerlukan permission, menolak tenant ID yang tidak sama dengan sesi, serta mengirim `private, no-store`.

## 3. Temuan yang perlu ditindaklanjuti

### AUD-021-01 — Ekspor bantuan rentan CSV formula injection dan escaping tidak lengkap

**Prioritas:** P2 — Menengah  
**Status:** Terlihat langsung pada source.

**Lokasi:** `src/app/(admin)/bantuan/ekspor/route.ts`

Fungsi `buildBantuanCsv` membungkus setiap nilai dengan tanda kutip, tetapi tidak menggandakan tanda kutip di dalam nilai dan tidak menetralkan awalan formula spreadsheet (`=`, `+`, `-`, `@`). Baris ekspor berisi nama sasaran, identitas sasaran, dan nomor kartu. Nilai teks yang berasal dari data penduduk/peserta dapat merusak struktur CSV atau ditafsirkan sebagai formula ketika dibuka di spreadsheet.

**Kontrol yang sudah tersedia:** `src/lib/csv.ts` menyediakan `csvCell` dan `toCsv`, termasuk escaping kutip dan perlindungan formula injection.

**Rekomendasi:** ganti pembentukan CSV khusus tersebut dengan helper bersama `toCsv(rows, ",")` (atau `csvCell` untuk setiap sel), pertahankan urutan kolom/delimiter yang sekarang, dan tambahkan test untuk nilai yang berisi tanda kutip, koma, newline, serta awalan formula. Jangan menurunkan perlindungan helper bersama.

### AUD-021-02 — Beberapa respons privat tidak menetapkan Cache-Control no-store

**Prioritas:** P2 — Menengah  
**Status:** Header tidak ditemukan pada respons sukses yang diperiksa.

Endpoint berikut memerlukan autentikasi/permission, tetapi respons suksesnya tidak menetapkan `Cache-Control: private, no-store` secara eksplisit:

| Route | Data/risiko |
|---|---|
| `src/app/(admin)/bantuan/ekspor/route.ts` | Ekspor memuat identitas sasaran dan nomor kartu peserta bantuan. |
| `src/app/(admin)/kelompok/ekspor/route.ts` | Ekspor data anggota kelompok/lembaga. |
| `src/app/(admin)/pembangunan/buku/ekspor/route.ts` | Ekspor data administrasi pembangunan. |
| `src/app/api/penduduk/nik/route.ts` | Respons lookup memuat nama, NIK, dan ID penduduk. |

**Rekomendasi:** tetapkan `Cache-Control: private, no-store` pada seluruh respons sukses endpoint privat tersebut. Pertahankan perilaku status/error yang sudah ada. Tinjau juga seluruh route ekspor privat pada perubahan terpisah agar kebijakan ini konsisten.

### AUD-021-03 — Endpoint baca publik belum menerapkan rate limit

**Prioritas:** P2 — Menengah  
**Status:** Terlihat langsung pada source.

**Lokasi:**
- `src/app/api/publik/kontak/statistik/route.ts`
- `src/app/api/publik/kontak/komentar/route.ts` — handler GET.

`GET /api/publik/kontak/statistik` menyelesaikan tenant melalui host, tetapi tidak memanggil rate limiter. Setiap request menjalankan dua query agregasi ke tabel `pengunjungLog` untuk rentang 30 hari. Handler GET komentar juga tidak menerapkan rate limit, sementara POST komentar sudah dibatasi.

**Dampak:** endpoint publik dapat dipanggil berulang untuk membebani database. Ini merupakan risiko ketersediaan/abuse, bukan bukti kebocoran lintas tenant.

**Rekomendasi:** terapkan rate limit berbasis IP dan endpoint pada kedua handler GET, menggunakan utilitas `batasiPermintaan` yang sudah ada. Pertimbangkan cache singkat hanya untuk statistik agregat publik setelah kebijakan cache dan pemisahan host tenant diuji.

## 4. Pemeriksaan yang tidak menghasilkan temuan bypass

| Area | Hasil statis |
|---|---|
| Admin: autentikasi dan permission | Tidak ditemukan bypass yang terkonfirmasi pada route/use case yang ditelusuri. |
| Tenant context Admin | Pola dominan mengambil tenant dari sesi melalui `resolveVillageId`; bukan dari parameter klien. |
| Super Admin database | Backup/restore dijaga `requireSuperAdmin`. |
| API mitra | API key dan villageId dari credential menjadi konteks tenant. |
| API publik generik | Host resolver dan rate limit tersedia pada wrapper generik. |
| Media privat warga/pengaduan | Sesi/permission dan pemeriksaan kepemilikan terlihat. |
| Ekspor kesehatan pada route group `(public)` | Walau berada di group route publik, use case `konteksEksporKesehatan` tetap memerlukan permission kesehatan dan tenant dari sesi; tidak disimpulkan sebagai endpoint anonim. |

## 5. File yang diperiksa

- Seluruh 80 file `src/app/**/route.ts` pada tree `main` (screening inventaris dan pola guard).
- Route berisiko tinggi yang dibaca penuh, termasuk ekspor bantuan/kelompok/pembangunan/penduduk, backup/restore, lookup NIK, API mitra, API publik, media, dokumen warga, dan TTE.
- Application use case terkait: penduduk, bantuan, kelompok, pembangunan, survey, kesehatan/KIA, layanan mandiri, surat, database, API key, statistik pengunjung, dan resolusi tenant.
- Shared security helpers: `src/lib/dal.ts`, `src/lib/route-auth.ts`, `src/lib/csv.ts`, `src/features/rbac/application/authorization.ts`, `src/features/desa/application/resolve-village.ts`, dan `src/features/api-publik/application/public-api.ts`.

## 6. Validasi

| Pemeriksaan | Status | Catatan |
|---|---|---|
| Inventaris 80 Route Handler | **PASS** | Tree GitHub recursive menunjukkan 80 file `route.ts`. |
| Pemeriksaan statis guard/auth/tenant | **PASS dengan catatan** | Tidak ditemukan bypass terkonfirmasi; tiga temuan hardening dicatat di atas. |
| Pemeriksaan eksplisit Server Action | **LIMITED** | Tidak ada `actions.ts`, `.tsx`, atau `page.tsx` pada tree yang diperiksa; Server Action yang tidak berada pada tree tidak dapat dinilai. |
| Typecheck/lint/format | **SKIPPED** | Audit statis tanpa perubahan kode; perintah lokal tidak dijalankan. |
| Unit/integration test | **SKIPPED** | Tidak ada perubahan kode dan tidak ada database test yang dijalankan. |
| Runtime/DAST/penetration test | **NOT TESTED** | Tidak dilakukan pengujian terhadap aplikasi yang berjalan. |

## 7. Batasan dan risiko tersisa

1. Ini audit statis, bukan penetration test atau pembuktian runtime.
2. Tidak ada database staging yang diakses; perilaku query/permission saat runtime belum diuji.
3. Konfigurasi reverse proxy, trusted forwarded headers, WAF, cache/CDN, dan rate limiter backend belum diverifikasi.
4. Tidak ada Server Action eksplisit yang ditemukan pada source tree saat audit. Jika ada entrypoint yang dihasilkan atau disimpan di luar tree ini, audit terpisah diperlukan.
5. Belum dilakukan verifikasi menyeluruh setiap query repository terhadap database; audit ini fokus pada entrypoint dan application use case yang dipanggil.

## 8. Rekomendasi urutan remediation

1. Tutup AUD-021-01: CSV formula injection/escaping pada ekspor bantuan.
2. Tutup AUD-021-02: tambahkan `private, no-store` pada empat endpoint privat.
3. Tutup AUD-021-03: rate limit untuk statistik dan daftar komentar publik.
4. Tambahkan route-level regression tests untuk akses anonim, permission ditolak, tenant berbeda, header cache, dan abuse rate limit.
5. Lakukan review kedua setelah remediation, kemudian jalankan CI penuh dan uji runtime di staging.

## 9. Kesimpulan

**Status audit: temuan remediation diperlukan — belum siap dinyatakan final.**

Tidak ditemukan bukti statis bypass autentikasi/tenant pada 80 Route Handler yang diperiksa. Tiga kelompok hardening di atas tetap harus diselesaikan dan diuji sebelum security hardening Appdes dinyatakan tuntas.

Tidak ada source code, schema, migration, konfigurasi deployment, atau database yang diubah pada task audit ini. Laporan ini disiapkan pada branch task khusus untuk review; tidak ada merge atau deploy.
