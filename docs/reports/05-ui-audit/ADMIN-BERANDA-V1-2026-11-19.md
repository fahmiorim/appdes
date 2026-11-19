# Beranda Admin Desa v1 — data nyata tanpa placeholder

- **Task:** menyelesaikan beranda Admin Desa sesuai mockup `docs/mockups/village/Modern Village Admin Dashboard.png`; tren 6 bulan dan feed aktivitas tidak ditunda dan memakai query baru.
- **Tanggal:** 19 November 2026
- **Branch:** `task/admin-desa-beranda`
- **Base commit:** `0b00767` (di atas `97f00e5` shell Admin Desa)
- **Commit pekerjaan:** `fa31376`
- **Status:** siap review, belum di-push

## 1. Kondisi awal

`src/app/(admin)/beranda/page.tsx` hanya memuat tiga kartu statistik dan dua section teks. Mockup menuntut empat KPI, donut komposisi penduduk, tren permohonan enam bulan, daftar permohonan terbaru, dan feed aktivitas.

Data mentah sebenarnya sudah ada, tetapi tiga kebutuhan belum punya jalur baca:

| Kebutuhan | Kondisi awal |
|---|---|
| Tren 6 bulan | Tidak ada query agregat per bulan. |
| Permohonan terbaru | Tidak ada query join permohonan → penduduk → jenis surat. |
| Feed aktivitas | `audit_logs` ada dan halaman audit bisa membacanya, tetapi aksi pengguna/grup akses tidak pernah menulis event; `AUDIT_EVENTS` hanya berisi event platform. |

Karena itu pekerjaan dibagi menjadi tiga bagian yang semuanya diselesaikan pada commit ini, bukan ditunda: query agregat, event audit baru, dan halaman.

## 2. File yang diperiksa

- `src/app/(admin)/beranda/page.tsx`
- `src/app/globals.css` (token warna, `.stat-card`, `.stat-icon`, `.sr-only`, blok shell desa)
- `src/features/dashboard/**`
- `src/features/desa/application/statistik-desa.ts`
- `src/features/layanan-mandiri/domain/layanan-mandiri.ts`
- `src/features/audit/domain/audit.ts`, `src/features/audit/application/audit-use-cases.ts`, `src/db/schema/audit.ts`
- `src/features/pengguna/application/pengguna-use-cases.ts` beserta test
- `src/features/rbac/application/grup-use-cases.ts` beserta test
- `src/db/schema/{permohonan-surat,pengaduan,auth}.ts`
- `docs/design/DESIGN-SYSTEM.md`, `docs/mockups/village/Modern Village Admin Dashboard.png`

## 3. File yang diubah

| File | Alasan |
|---|---|
| `src/features/dashboard/domain/tren-bulanan.ts` + test (baru) | Mengisi bulan tanpa data dengan nol, mengurutkan tertua → terbaru, menjumlahkan kunci ganda, dan menghormati pergantian tahun. Fungsi murni agar bisa diuji tanpa database. |
| `src/features/dashboard/domain/aktivitas.ts` + test (baru) | Label event audit berbahasa Indonesia dengan fallback netral dan tone visual; event mentah tidak pernah ditampilkan ke pengguna. |
| `src/features/dashboard/infrastructure/dashboard-repository.ts` | Menambah `getTrenPermohonan`, `listPermohonanTerbaru`, `listAktivitasTerbaru`, serta memperluas `DashboardStats` dengan `complaintsBaru`, `permohonanMenunggu`, dan `complaints`. |
| `src/features/dashboard/application/dashboard-use-cases.ts` | Empat use case beranda: statistik, tren, permohonan terbaru, aktivitas terbaru. |
| `src/features/audit/domain/audit.ts` | Tujuh event baru: `pengguna.create/update/delete` dan `grup-akses.create/update/delete/permission` beserta labelnya. |
| `src/features/pengguna/application/pengguna-use-cases.ts` + test | Mencatat audit setelah create/update/delete. Detail hanya `roleId`, `active`, `roleBerubah`, `kataSandiDireset`; kata sandi tidak pernah masuk audit. |
| `src/features/rbac/application/grup-use-cases.ts` + test | Mencatat audit create/update/delete role dan perubahan izin (`jumlahModul`). |
| `src/app/(admin)/beranda/page.tsx` | Halaman ditulis ulang: 4 KPI, donut gender, grafik tren 6 bulan, tabel permohonan terbaru dengan chip status, feed aktivitas, empty state jujur. |
| `src/app/globals.css` | Token `--color-action*` ungu dan seluruh kelas `.beranda-*`, termasuk responsif 1180 px dan 620 px serta aksesibilitas grafik. |
| `docs/design/DESIGN-SYSTEM.md` | Mencatat token aksi ungu khusus persona Admin Desa dan batasnya terhadap konsol platform. |

## 4. Perubahan

- **KPI:** total penduduk (dengan rincian gender), kartu keluarga, permohonan menunggu (status 1 dan 2), pengaduan (dengan jumlah berstatus `baru`), seluruhnya dari `getDashboardStats` dan `getStatistikDesa`.
- **Tren 6 bulan:** `DATE_FORMAT(created_at, '%Y-%m')` + `GROUP BY` di database, lalu diisi bulan kosong di application layer. Grafik CSS tanpa dependency baru; setiap batang punya teks `sr-only` “<bulan>: <n> permohonan”.
- **Donut gender:** `conic-gradient` dari data statistik desa; pusat menampilkan total penduduk; `role="img"` dan `aria-label` memuat persentase. Bila tidak ada data, donut netral dan label menyatakan belum ada data.
- **Permohonan terbaru:** join `residents` dan `letterTypes` memakai pasangan `(id, villageId)` agar baris lintas tenant tidak terbaca; status memakai `labelPermohonanStatus` yang sudah ada, bukan label buatan halaman.
- **Feed aktivitas:** lima audit terbaru desa, kolom aktor lewat `leftJoin users`, fallback “Sistem” untuk `actorId` NULL. Event asing diberi label “Aktivitas sistem”.
- **Palet:** aksi ungu `#7A20F0` hanya untuk persona desa; tautan dan status informasi tetap biru. Tidak ada perubahan pada konsol Platform Super Admin.

## 5. Security dan tenant

- Semua query baru menerima `villageId` dari `verifySession()` dan memfilter `villageId` pada tabel utama; tidak ada `villageId` dari body/query/header.
- `listPermohonanTerbaru` memakai composite join `(id, villageId)` pada kedua relasi, sehingga relasi yang menunjuk desa lain tidak dapat lolos meski kolom id-nya keliru.
- `listAktivitasTerbaru` hanya membaca `audit_logs.village_id = villageId`; event tingkat platform tidak masuk feed desa.
- Event audit baru memakai `villageId` hasil `resolveVillageId(user)` dan `actorId` dari sesi, bukan input klien. Detail audit tidak memuat kata sandi; hal ini diuji dengan memastikan payload audit tidak mengandung `"rahasia123"`.
- Tidak ada secret, NIK, atau data pribadi pada test fixture maupun laporan.

## 6. Validasi

Perintah yang benar-benar dijalankan beserta hasilnya:

| Perintah | Hasil |
|---|---|
| `npm run typecheck` (`next typegen && tsc --noEmit`) | **PASS** — “Types generated successfully”, exit 0 |
| `npx eslint` pada page beranda, `src/features/dashboard`, audit, pengguna, dan grup akses | **PASS** — tanpa output, exit 0 |
| `npx vitest run --config vitest.config.mts src/features/dashboard/domain/tren-bulanan.test.ts src/features/dashboard/domain/aktivitas.test.ts src/features/pengguna/application/pengguna-use-cases.test.ts src/features/rbac/application/grup-use-cases.test.ts` | **PASS** — 4 file, 16 test |
| `npx prettier --check` pada seluruh file berubah | **PASS** — “All matched files use Prettier code style!” |
| Integration test database / `npm run build` / inspeksi browser | **SKIPPED** — tidak dijalankan untuk task ini |

Catatan kegagalan yang ditemukan dan diperbaiki: test `susunTrenBulanan` awalnya mengharapkan Januari 2026 bernilai 0 padahal bulan itu berada di dalam jendela tiga bulan. Implementasi benar; data uji dipindah ke Desember 2025 sehingga test kini benar-benar menguji pengecualian bulan di luar jendela. Tidak ada assertion yang dilemahkan.

## 7. Risiko tersisa

1. Query baru belum dijalankan terhadap database sungguhan; validasi hanya unit test fungsi murni dan typecheck. `DATE_FORMAT` adalah fungsi MySQL dan sesuai stack, tetapi hasil grouping belum diverifikasi dengan data nyata.
2. Jendela tren memakai waktu lokal server untuk menghitung awal bulan, sedangkan `created_at` disimpan oleh database. Bila zona waktu server dan database berbeda, permohonan di pergantian bulan bisa masuk bulan yang bergeser.
3. Feed aktivitas baru terisi setelah event pengguna/grup akses terjadi; data audit lama tidak memiliki event tersebut sehingga feed desa lama bisa singkat atau kosong. Empty state sudah jujur.
4. Halaman belum diuji di browser; tata letak responsif hanya diverifikasi secara kode.
5. Perubahan belum di-push dan belum ada PR.

## 8. Kesimpulan

Beranda Admin Desa kini tidak memakai placeholder: empat KPI, donut gender, tren enam bulan, permohonan terbaru, dan feed aktivitas semuanya berasal dari data desa aktif. Tidak ada bagian yang ditunda ke task berikutnya.

Langkah berikutnya yang disarankan: verifikasi visual di browser dengan data desa uji, lalu integration test query dashboard pada database test disposable. Keputusan push/PR menunggu instruksi maintainer.

---

## 9. Revisi visual dan enam akses cepat (lanjutan)

- **Tanggal:** 19 November 2026
- **Branch:** `task/admin-desa-beranda`
- **Status:** siap review, belum di-push

### 9.1 Kondisi awal revisi

Beranda v1 masih berbeda jauh dari mockup: hanya tiga kartu, tidak ada 4 KPI berikon, donut, grafik garis-area, timeline aktivitas, kartu profil desa, dan enam akses cepat masih berlabel “Segera” tanpa tujuan. Pengguna meminta tampilan benar-benar mengikuti mockup dan tidak ada tile dummy.

### 9.2 Perubahan

| File | Perubahan |
|---|---|
| `src/app/(admin)/beranda/page.tsx` | Ditulis ulang mengikuti mockup: header “Dashboard Admin Desa” + tanggal, 4 KPI horizontal berikon dan chip, kartu statistik bertab, grafik tren 6 bulan, daftar permohonan berikon + waktu relatif, timeline aktivitas, akses cepat, kartu profil desa gradien ungu. |
| `src/app/(admin)/beranda/statistik-penduduk.tsx` (baru) | Tab gender/dusun/kelompok umur dengan donut `conic-gradient`; tidak menambah dependency chart. |
| `src/app/(admin)/beranda/tren-layanan-surat.tsx` (baru) | Grafik garis-area SVG murni dari data permohonan enam bulan. |
| `src/features/dashboard/domain/waktu-relatif.ts` + test (baru) | “baru saja”, “N menit lalu”, dan seterusnya; fungsi murni teruji. |
| `src/app/(admin)/layout.tsx` | `data-desa="true"` hanya pada shell persona desa. |
| `src/app/globals.css` | Kanvas `#F3F4FB`, seluruh kelas `.beranda-*`, token aksi ungu, dan kelas `.modul-*` untuk halaman daftar. |
| `src/app/(admin)/penduduk/page.tsx` (baru) | Daftar 25 penduduk pertama dari `listPenduduk`, NIK disamarkan, total desa, status kependudukan. |
| `src/app/(admin)/persuratan/surat/page.tsx` (baru) | Daftar surat dari `listSuratWithMeta` (nomor, jenis, pemohon, tanggal, status). |
| `src/app/(admin)/pengaduan-admin/page.tsx` (baru) | Daftar pengaduan dari `listPengaduanData` beserta jumlah yang belum ditangani. |
| `src/app/(admin)/keuangan/page.tsx` (baru) | Seluruh baris APBDes tahun berjalan dari `listKeuangan`, anggaran dan realisasi berformat rupiah. |
| `src/app/(admin)/konten/berita/page.tsx` (baru) | Daftar berita desa dari use case baru; judul, kategori, tanggal terbit. |
| `src/app/(admin)/konten/galeri/page.tsx` (baru) | Daftar album dan jumlah foto dari use case baru. |
| `src/features/publik/application/konten-admin.ts` (baru) | `listBeritaAdminData` dan `listGaleriAdminData`: cek izin baca `berita`/`galeri`, lalu batasi tenant dari sesi. |
| `src/features/navigation/domain/menu-tampil.ts` + test | Enam rute nyata didaftarkan; ekspektasi test diperbarui, bukan dilemahkan. |
| `src/features/dashboard/application/dashboard-use-cases.ts`, `infrastructure/dashboard-repository.ts`, `src/features/desa/application/use-cases.ts` | Query statistik umur, KPI tambahan, identitas desa. |

Enam pintasan kini berupa `Link` dan hanya dirender bila pengguna memiliki izin baca modulnya. Tidak ada lagi badge “Segera”, `aria-disabled`, atau tujuan 404.

### 9.3 Pemilihan rute

Rute publik sudah memakai `/berita`, `/galeri`, dan `/pengaduan`, sehingga halaman admin tidak boleh memakai path yang sama. Rute admin yang dipakai:

| Pintasan | Rute | Alasan |
|---|---|---|
| Data Penduduk | `/penduduk` | Belum dipakai halaman publik; konsisten dengan ekspor `/penduduk/*`. |
| Arsip Surat | `/persuratan/surat` | Mengikuti namespace `(admin)/persuratan/surat` yang sudah ada. |
| Pengaduan Warga | `/pengaduan-admin` | `/pengaduan` milik halaman publik. |
| Keuangan Desa | `/keuangan` | Konsisten dengan modul keuangan dan route ekspor. |
| Berita Desa | `/konten/berita` | `/berita` milik halaman publik. |
| Galeri Desa | `/konten/galeri` | `/galeri` milik halaman publik. |

### 9.4 Security dan tenant

- Setiap halaman memakai use case yang sudah ada (`requirePermission` + `resolveVillageId`); tidak ada `villageId` dari URL, query, atau body.
- Berita/galeri sebelumnya hanya dibaca lewat halaman publik; use case admin baru menambahkan pemeriksaan izin baca sebelum query, tetap dibatasi `village_id` sesi.
- Pintasan disembunyikan berdasarkan izin efektif pengguna, tetapi otorisasi tetap ditegakkan di server oleh masing-masing use case.
- NIK disamarkan pada daftar penduduk; laporan dan fixture tidak memuat data pribadi.
- Tidak ada perubahan pada konsol Platform Super Admin.

### 9.5 Validasi

| Perintah | Hasil |
|---|---|
| `npm run typecheck` (`next typegen && tsc --noEmit`) | **PASS** — exit 0 |
| `npx eslint "src/app/(admin)" src/features/publik/application/konten-admin.ts src/features/navigation/domain/menu-tampil.ts` | **PASS** — tanpa output, exit 0 |
| `npx vitest run --config vitest.config.mts src/features/navigation/domain/menu-tampil.test.ts src/features/multi-desa/domain/template-tenant.test.ts src/features/dashboard/domain` | **PASS** — 5 file, 33 test |
| `npm run build` | **PASS** — keenam rute muncul di `.next/routes-manifest.json`; tidak ada benturan dengan rute publik |
| Inspeksi browser | **SKIPPED** — tidak diminta dan tidak dijalankan |

### 9.6 Risiko tersisa

1. Halaman daftar baru menampilkan halaman pertama (penduduk 25 baris, surat 20 baris) tanpa kontrol paginasi; total desa tetap ditampilkan.
2. Halaman berita/galeri bersifat baca saja karena belum ada use case tulis berita/galeri; pintasan tidak menjanjikan tambah data.
3. Rute `pengaduan-admin`, `konten/berita`, dan `konten/galeri` belum tentu sama dengan `modules.url` di database, sehingga item sidebar untuk modul tersebut masih dapat tampil belum tersedia; pintasan beranda sudah menuju halaman nyata.
4. Tampilan belum diverifikasi di browser dengan data desa uji.
5. Perubahan belum di-push dan belum ada PR.
