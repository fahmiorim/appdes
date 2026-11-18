# UI Super Admin — audit kepadatan, perbaikan bentuk, dan pemangkasan informasi

- **Task:** audit UI konsol Super Admin (`/super-admin`), perbaiki bentuk komponen yang lemah, buang informasi yang tidak perlu, dan kurangi whitespace berlebih.
- **Tanggal:** 18 November 2026
- **Branch:** `task/super-admin-console-density`
- **Base commit:** `12028cc` (`main` setelah PR #125)
- **Status:** siap review

## 1. Kondisi awal

Konsol platform terdiri dari tujuh halaman (`ringkasan`, `tenant`, `domain`, `pengguna`, `audit`, `template`, `pengaturan`). Semua halaman memakai kerangka `platform-ui.tsx` dan gaya `.platform-*` di `src/app/globals.css`.

Dua masalah struktural ditemukan dari source:

1. **Dua lapis aturan CSS `.platform-*`.** Blok lama (mulai `src/app/globals.css:1818`) dan blok "Super Admin console refresh" (mulai `~:2295`) mendefinisikan selector yang sama. Karena blok refresh tidak mereset semua properti blok lama, beberapa elemen mendapat dekorasi ganda:
   - `.platform-attention-list > li` pada blok lama menggambar kotak `border: 1px solid` + `border-radius: 12px` + `padding: 14px 16px`; blok refresh menambahkan `padding: 14px 0` dan `border-bottom`. Hasilnya baris perhatian tampil sebagai kotak berbingkai yang juga bergaris bawah.
   - `.platform-split` blok lama memakai `margin-top: 20px`, sedangkan blok refresh menetapkan `.platform-split .platform-card { margin-top: 20px }`. Kartu kanan terdorong 20 px lebih jauh daripada kartu di atasnya, ditambah `gap: 18px`.
   - `.platform-toolbar` blok lama `margin-bottom: 14px` tidak pernah direset saat blok refresh menambahkan padding dan garis bawah, sehingga toolbar berjarak ganda dari tabel.
   - `.platform-pagination` blok lama `margin-top: 14px` tetap berlaku bersama `padding: 14–18px` pada blok refresh.
2. **Kartu statistik tidak seragam.** Ringkasan memakai `Card` + `StatIcon`, sedangkan Domain, Pengguna, Template, dan Pengaturan memakai `Card` tanpa ikon. Bentuk kartu jadi berbeda antarhalaman meski fungsinya sama.

Informasi yang berulang atau tidak membantu operator:

- `Ringkasan` menampilkan heading "Gambaran platform" yang mengulang judul dan deskripsi halaman tepat di bawahnya.
- Panel "Perlu perhatian" selalu merender tiga baris, termasuk saat hitungannya nol, sehingga operator melihat "0 desa tanpa domain" dan tombol yang tidak melakukan apa pun.
- Baris "desa siap purge" menautkan ke halaman **audit**, padahal tindakan purge ada di konsol tenant.
- Tabel "Tenant terbaru" punya kolom "Aksi" berisi tautan "Kelola" yang identik untuk semua baris dan menduplikasi tombol "Kelola semua tenant" di kepala kartu.
- `Domain` menampilkan empat kartu statistik untuk tiga angka (satu kartu, "Domain utama", hanya mengulang isi kolom "Jenis" pada tabel), plus kolom aksi yang tautannya sama untuk setiap baris.
- `Template tenant` menampilkan path source (`src/db/templates/tenant-template.ts`) dan perintah CLI `npm run platform:export-template` di antarmuka operator.
- Halaman Tenant desa membuka dengan formulir “Daftarkan desa baru” 8 kolom yang selalu terbuka, sehingga daftar tenant — isi utama halaman — terdorong ke bawah dan judul kartu “Daftar tenant” bertabrakan dengan isinya. Aksi sesekali ini memakan area paling menonjol.
- Topbar platform menampilkan dua baris konteks “Ruang kerja administrasi” + “Super Admin Platform”, lalu judul halaman muncul terpisah di bawahnya. Blok judul (eyebrow + judul + deskripsi) memakan satu layar penuh sebelum data pertama terlihat.
- Sidebar platform: brand ber-`margin-bottom: 28px` ditambah label menu ber-`margin-top: 22px`, sehingga jarak logo ke tulisan “Platform” ±50 px. Di bawah menu ada paragraf pengantar dan footer “Sistem Informasi Desa / Konsol Super Admin” yang mengulang subjudul brand di bagian atas sidebar.

## 2. File yang diperiksa

- `src/app/(admin)/super-admin/{page,tenant/page,domain/page,pengguna/page,audit/page,template/page,pengaturan/page}.tsx`
- `src/app/(admin)/super-admin/page.test.ts`, `src/app/(admin)/super-admin/guard.ts`
- `src/features/multi-desa/presentation/{platform-ui,tenant-console,pengguna-platform-console}.tsx`
- `src/features/navigation/domain/menu-platform.ts`
- `src/app/globals.css` (blok `.platform-*` dan pembungkus `.admin-main:has(.platform-page-head)`)
- `src/components/ui/card.tsx`, `src/components/ui/stat-icon.tsx`
- `docs/MASTER_ROADMAP.md`, `docs/SID_FEATURE_MAP.md`, `docs/TECHNICAL_AUDIT.md` (AUD-009)

## 3. File yang diubah

| File | Alasan |
|---|---|
| `src/features/multi-desa/presentation/platform-ui.tsx` | Menambah `PlatformStat` agar seluruh kartu statistik konsol punya bentuk sama (ikon, label, nilai, catatan). |
| `src/app/(admin)/super-admin/page.tsx` | Hapus heading duplikat, pakai `PlatformStat`, sembunyikan baris perhatian bernilai nol, arahkan aksi purge ke konsol tenant, hapus kolom "Aksi" yang berulang. |
| `src/app/(admin)/super-admin/domain/page.tsx` | Ringkas 4 kartu menjadi 3 (drop "Domain utama" yang terwakili kolom "Jenis"), pakai `PlatformStat`, hapus kolom aksi identik. |
| `src/app/(admin)/super-admin/pengguna/page.tsx` | Pakai `PlatformStat`; isi KPI tidak berubah. |
| `src/app/(admin)/super-admin/template/page.tsx` | Pakai `PlatformStat`; buang path source dan instruksi CLI dari antarmuka, ganti dengan satu kalimat status baca-saja. |
| `src/app/(admin)/super-admin/pengaturan/page.tsx` | Pakai `PlatformStat` untuk tiga kartu retensi. |
| `src/components/shell/admin-sidebar.tsx` | Hapus paragraf pengantar dan footer duplikat pada sidebar platform; sidebar desa tidak berubah. |
| `src/features/navigation/domain/header-platform.ts` | Sumber tunggal judul/deskripsi tiap halaman konsol, dipakai top bar. |
| `src/features/navigation/domain/header-platform.test.ts` | Test cakupan header terhadap `MENU_PLATFORM`, sub-rute, dan fallback. |
| `src/components/shell/platform-topbar-head.tsx` | Komponen top bar yang membaca rute aktif dan menampilkan identitas halaman. |
| `src/components/shell/admin-topbar.tsx` | Topbar platform menampilkan identitas halaman (bukan label “Ruang kerja administrasi”), tombol Keluar tetap. |
| `src/app/(admin)/layout.tsx` | Meneruskan `isPlatformAdmin` ke topbar dan menandai `.admin-main` dengan `data-konsol="platform"`. |
| Tujuh halaman `/super-admin/**` | Blok `PlatformPageHeader` dihapus; aksi header dipindah (Domain → top bar, Audit CSV → kepala kartu). |
| `src/features/multi-desa/presentation/platform-ui.tsx` | `PlatformPageHeader` dihapus karena judul kini di top bar. |
| `src/features/multi-desa/presentation/dialog-daftar-desa.tsx` | Tombol “Daftarkan desa” + dialog native `<dialog>` berisi form; memanggil Server Action yang sama dan me-refresh daftar setelah sukses. |
| `src/features/multi-desa/presentation/tenant-console.tsx` | `FormBuatDesa` dan `GalatField` dihapus; konsol hanya berisi filter, tabel, dan panel detail. |
| `src/app/(admin)/super-admin/tenant/page.tsx` | Tombol pendaftaran dipasang di aksi kepala kartu; action `buat` tidak lagi diteruskan ke konsol. |
| `src/app/globals.css` | Netralkan dekorasi ganda baris perhatian, perbaiki jarak ganda panel/toolbar/pagination, rapatkan padding halaman dan kartu, rapatkan jarak logo → label menu platform, lalu gabungkan dua lapis `.platform-*` menjadi satu blok (lihat bagian 4a). |
| `src/app/(admin)/super-admin/page.test.ts` | Test regresi: baris perhatian bernilai nol tidak dirender. |

## 4. Perubahan

- `PlatformStat` menjadi satu-satunya bentuk kartu statistik konsol; seluruh halaman memakai ikon `StatIcon` yang konsisten.
- Ringkasan: tiga tingkat pengantar (judul halaman + heading seksi) menjadi satu; panel "Perlu perhatian" hanya berisi kondisi nyata, dengan keadaan kosong "Tidak ada tindakan tertunda".
- Tindakan purge kini menautkan ke `/super-admin/tenant` (tempat aksinya), bukan halaman audit.
- Kolom aksi yang identik untuk semua baris dihapus dari tabel ringkasan dan domain; aksi tingkat halaman tetap ada di kepala kartu.
- Jarak vertikal: padding konten `34/64px` → `30/44px`, judul halaman `28px` → `22px`, grid statistik `22px` → `18px`, kepala kartu `20px 22px` → `16px 20px`, badan kartu `20px 22px` → `18px 20px`, panel kanan tidak lagi mendapat margin ganda.
- Pendaftaran desa tidak lagi menetap di halaman. Tombol **Daftarkan desa** di kepala kartu membuka dialog berisi form yang sama (nama, kode, domain, admin, sandi awal, kuota). Dialog memakai `<dialog>` native: fokus terkurung, Escape dan klik latar menutup, tombol Batal/Tutup tersedia. Setelah sukses dialog menutup dan daftar di belakangnya di-refresh lewat `router.refresh()`.
- Identitas halaman (eyebrow, judul, deskripsi) pindah ke top bar konsol: top bar membaca rute aktif lewat `usePathname()` dan memetakan header dari `headerPlatform()`. Konten halaman langsung dimulai dari kartu statistik/tabel. Topbar admin desa tetap memakai “Ruang kerja administrasi”.
- Skala tipografi judul top bar 19 px (16 px di bawah 860 px, deskripsi disembunyikan) agar tidak memakan tinggi layar.
- Aksi header yang tidak dinamis dipindah: “Buka konsol tenant” pada Domain kini di top bar; “Unduh CSV” pada Audit diletakkan di kepala kartu bersama penghitung peristiwa karena tautannya membawa filter aktif.
- Scoping CSS platform yang sebelumnya memakai `.admin-main:has(.platform-page-head)` diganti `[data-konsol="platform"]` karena elemen pemicu `:has()` sudah dihapus.
- Sidebar platform tidak lagi menampilkan catatan pengantar dan footer; menu, tautan, dan penanda halaman aktif tidak berubah. Sidebar desa tetap memakai catatan “Segera” dan footer seperti sebelumnya.
- Tidak ada perubahan otorisasi, query, use case, Server Action, atau skema data.

## 4a. Konsolidasi CSS `.platform-*`

Dua lapis `.platform-*` (blok lama mulai `:1866` dan blok “Super Admin console refresh” mulai `:2237`) digabung menjadi **satu blok** `/* --- Konsol platform Super Admin */` di akhir `globals.css`.

Hasil terukur pada blok itu:

| Ukuran | Sebelum | Sesudah |
|---|---|---|
| Rule (selector, termasuk yang digabung) | 171 | 132 |
| Deklarasi | 522 | 411 |
| Blok `@media` | 9 | 9 |
| Kelas yang tidak dipakai di `src/` | 2 (`platform-code`, `platform-stats-grid`) | 0 |
| Panjang file | 2.789 baris | 2.565 baris |

Cara kerja konsolidasi:

1. Selector gabungan dipecah; kelas yang tidak lagi ada di `src/` (`platform-code`, `platform-stats-grid`) dibuang.
2. Rule dengan selector + media yang sama digabung; untuk properti yang sama, deklarasi terakhir menang — persis hasil cascade sebelumnya.
3. Urutan rule mengikuti kemunculan terakhirnya, dan blok `@media` tetap di posisi cascade aslinya (tidak dipindah ke akhir), sehingga tidak ada deklarasi yang naik melewati aturan yang seharusnya menimpanya.
4. Header blok diberi catatan singkat bahwa ini satu-satunya sumber gaya konsol.

Sifat perubahan: **tanpa perubahan tampilan**. Tidak ada nilai properti yang diubah, hanya duplikasi yang dibuang.

## 4b. Dialog tambah pengguna platform

Penambahan pengguna platform sebelumnya memakai tombol "+ Tambah pengguna platform" yang membuka form inline di dalam kartu, sehingga form menetap dan mendorong tabel ke bawah. Sekarang polanya sama dengan pendaftaran desa:

- Tombol **Tambah pengguna platform** berada di kepala kartu "Akun pengelola platform".
- Form (nama, email, username, sandi awal) tampil di dialog `<dialog>` native dengan kelas `platform-dialog*`; Escape, tombol ✕, dan klik latar menutup dialog; setelah sukses dialog ditutup dan daftar di-refresh.
- `pengguna-platform-console.tsx` tidak lagi memuat form tambah; `buat` dihapus dari `AksiPengguna` sehingga Server Action hanya dipakai dialog di kepala kartu.
- CSS mati ikut dihapus: `.platform-create`, `.platform-create-form`, `.platform-create-form .form-input` (+`:focus`), dan `.platform-form-actions` (58 baris).
- Teks keadaan kosong disesuaikan: "...lewat tombol di atas."

## 4c. Hidrasi klien di host `flexidesa.test`

Tombol di konsol tidak bereaksi sama sekali saat aplikasi dibuka lewat `*.flexidesa.test`. Penyebabnya bukan komponen dialog, melainkan Next 16 yang menolak aset dev (HMR dan boot klien) dari origin selain origin server; akibatnya React tidak pernah hydrate dan seluruh tombol/form mati. Perbaikan: `allowedDevOrigins` di `next.config.ts` diisi dari `DESA_BASE_DOMAIN` beserta wildcard subdomainnya (hanya berlaku saat `next dev`).

Bukti di Chrome headless + CDP dengan klik mouse sungguhan pada `flexidesa.test:3000`, sesudah perbaikan dan restart dev server:

| Tombol | Hidrasi | Hasil klik |
|---|---|---|
| “Daftarkan desa” | ya | dialog “Daftarkan desa baru” terbuka sebagai modal |
| “Tambah pengguna platform” | ya | dialog “Tambah pengguna platform” terbuka sebagai modal |
| “Lihat” sandi di `/masuk` (kontrol, tanpa auth) | ya | input `password` → `text` |

## 5. Security/tenant

- Tidak ada perubahan pada guard `pastikanSuperAdmin()`, `requireSuperAdmin`, Server Action, maupun query tenant.
- Halaman tetap membaca data yang sama lewat use case yang sudah ada; pemangkasan hanya menghapus tampilan turunan (angka yang bisa dihitung dari data lain) dan tautan yang tidak spesifik.
- Tidak ada data tenant yang terbuka atau tertutup oleh perubahan ini; `villageId` tetap tidak dipakai sebagai bukti otorisasi.
- Tidak ada secret, token, NIK, atau data pribadi yang ditambahkan ke UI, test, atau laporan. Nilai environment pada halaman Pengaturan tetap hanya status aktif/nonaktif tanpa nilai rahasia.

## 6. Validasi

| Perintah | Hasil |
|---|---|
| `npx prettier --write` pada 8 file yang diubah | PASS |
| `npm run check` (typecheck + lint + format:check + unit test), dijalankan setelah seluruh perubahan termasuk pemindahan header ke top bar | PASS — 216 file test, 1893 test lulus |
| `node node_modules/vitest/vitest.mjs run "src/app/(admin)/super-admin/page.test.ts" --config vitest.config.mts` | PASS — 4 test |
| Verifikasi kesetaraan CSS statis (PostCSS): resolusi deklarasi tiap selector dibandingkan dengan `git show HEAD:src/app/globals.css` pada 11 breakpoint (1600, 1440, 1180, 1179, 1100, 860, 760, 700, 620, 560, 400) | PASS — 522 → 411 deklarasi, 0 perbedaan nilai, 0 selector hilang |
| Verifikasi render CSS di Chrome headless: fixture berisi seluruh kelas konsol (kartu, statistik, toolbar, tabel, dialog `open`, `details[open]`, sidebar, top bar), `getComputedStyle` 50 properti untuk setiap node, dibandingkan antara CSS sebelum dan sesudah konsolidasi pada 8 lebar (1440, 1180, 1100, 860, 760, 620, 560, 400) | PASS — 0 perbedaan computed style |
| Pemeriksaan visual halaman aplikasi sungguhan (desktop/mobile, dark mode) | SKIPPED — tidak ada sesi aplikasi berjalan; MySQL lokal nonaktif (`ECONNREFUSED 127.0.0.1:3306`) sehingga halaman `/super-admin` tidak dapat dirender. Verifikasi memakai fixture statis, bukan halaman asli |
| `npm run build` | SKIPPED — diverifikasi oleh job build di CI |
| Test halaman pengguna platform (guard 403 dan penempatan dialog) | PASS — 3 test |
| `npm run check` setelah dialog tambah pengguna | PASS — 217 file test, 1896 test lulus |
| Uji klik di browser (`flexidesa.test:3000`, Chrome headless + CDP) untuk kedua dialog | PASS — keduanya ter-hydrate dan membuka dialog modal |

## 7. Risiko dan keterbatasan

- Judul halaman kini berasal dari `header-platform.ts`, bukan dari JSX halaman. Bila judul/deskripsi halaman diubah, entri di file itu juga harus diperbarui; test hanya memastikan setiap menu punya entri dan nilainya terisi, bukan kesamaan teks dengan `metadata.title`.
- Top bar kini setinggi judul + deskripsi (±66 px di desktop, ±54 px di mobile karena deskripsi disembunyikan). Belum ada pengukuran render nyata.
- Dialog pendaftaran desa belum dijalankan di browser: pembukaan lewat `showModal()`, penutupan dengan Escape/klik latar, dan refresh daftar setelah sukses belum disaksikan. Elemen `<dialog>` membutuhkan browser modern, yang dipenuhi semua browser target proyek.
- `tenant-create`/`tenant-create-grid` CSS hanya dipakai form lama sehingga ikut dihapus; dialog memakai kelas `platform-dialog*` dan `platform-form-grid` yang baru.
- Kedua dialog terverifikasi di browser lewat halaman probe sementara (tanpa sesi), bukan halaman `/super-admin` yang sesungguhnya; alur kirim form ke Server Action dan refresh daftar setelah sukses belum diuji.
- `allowedDevOrigins` hanya berlaku saat `next dev`; build dan produksi tidak berubah. Perlu restart `npm run dev` setelah konfigurasi diubah.

- Verifikasi render memakai fixture statis, bukan halaman `/super-admin` sungguhan. Fixture menutup seluruh kelas blok platform, tetapi keadaan `:hover`, `:focus`, `:focus-visible`, `:active`, dan `::backdrop` tidak diuji karena tidak bisa dipicu lewat `getComputedStyle` tanpa interaksi; aturan untuk keadaan itu ikut terkonsolidasi tanpa perubahan nilai (terverifikasi statis).
- Ada dua blok `@media (max-width: 560px)` terpisah karena aturan aslinya berada di dua posisi cascade berbeda. Keduanya sengaja tidak disatukan: menggabungkannya akan memindahkan deklarasi melewati aturan lain dan berpotensi mengubah hasil.
- Kelas lama `platform-section-heading` dan `platform-tenant-section` (di luar blok yang dikonsolidasikan, sejak sebelum task ini) masih ada di CSS dan tidak dipakai di `src/`. Tidak dihapus agar perubahan tetap satu area; kandidat pembersihan berikutnya.
- `PlatformStat` memakai markup `Card` + `StatIcon` yang sudah ada, tanpa kelas baru, sehingga tidak perlu aturan CSS tambahan.
- Test regresi memakai `renderToStaticMarkup` pada pohon hasil resolve; `Card` dimock `null` di test, jadi isi kartu statistik tidak diuji, hanya struktur panel perhatian dan keadaan kosongnya.
- Pemangkasan kolom "Aksi" mengasumsikan operator memakai tombol tingkat halaman atau membuka konsol tenant; belum ada deep-link per baris sejak awal.

## 8. Rekomendasi berikutnya

1. Walkthrough browser di staging: bandingkan jarak antarseksi, bentuk kartu statistik, baris perhatian, dan jarak logo → menu sidebar pada 1440 px, 1024 px, dan 360 px.
2. Hapus sisa kelas mati di luar blok platform (`platform-section-heading`, `platform-tenant-section`) setelah dipastikan tidak dipakai halaman lain.
3. Pertimbangkan filter status pada konsol tenant lewat query param supaya tautan "desa nonaktif" / "siap purge" bisa langsung memfilter daftar.
