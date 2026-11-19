# Laporan Task — Spesifikasi 12 Layar Admin Desa

- **Task:** menyusun spesifikasi UI per layar untuk 12 halaman Admin Desa yang sudah ada.
- **Tanggal:** 19 November 2026.
- **Branch:** `task/docs-implementation-audit`.
- **Base commit:** `36c595e`.
- **Commit implementasi:** `620e221`.
- **Commit laporan:** commit terakhir pada branch ini.
- **Laporan GitHub:** <https://github.com/fahmiorim/appdes/blob/task/docs-implementation-audit/docs/reports/05-ui-audit/ADMIN-DESA-SCREEN-SPEC-2026-11-19.md>.
- **Pull request:** dibuat setelah laporan di-push; URL dicantumkan pada penyerahan akhir.
- **Status:** siap review dokumen, bukan siap merge.

## Tujuan

Menyediakan satu acuan desain yang menghubungkan mockup, layout, data, permission, backend/schema, gap, dan test untuk 12 route Admin Desa. Dokumen ini tidak mengubah source code, schema, migration, data, atau aset mockup.

## File yang diperiksa

- 12 halaman pada `src/app/(admin)/`: beranda, penduduk (daftar/detail/baru/ubah), keuangan, konten berita, konten galeri, persuratan surat, pengaduan-admin, pengaturan pengguna, pengaturan grup-akses.
- Form penduduk, console/dialog pengguna, dialog/form role dan izin.
- Use case, repository, schema, permission, template tenant, dan route ekspor yang terkait.
- `docs/design/DESIGN-SYSTEM.md`, `docs/design/ADMIN-PLATFORM-DESIGN.md`, `docs/mockups/README.md`.
- 12 preview mockup 1200 x 800 yang diturunkan dari PNG asli.

## File yang diubah

| File | Alasan |
|---|---|
| `docs/design/ADMIN-DESA-SCREEN-SPEC.md` | Deliverable utama: spesifikasi 12 layar dan aturan lintas layar |
| `docs/design/README.md` | Menautkan spesifikasi baru pada indeks desain |
| `docs/reports/05-ui-audit/ADMIN-DESA-SCREEN-SPEC-2026-11-19.md` | Laporan task ini |

Tidak ada perubahan source code, schema, migration, data, atau aset mockup. Preview sementara `.tmp-spec/` sudah dihapus.

## Hasil

- Spesifikasi mencakup 12 route, termasuk 3 subhalaman penduduk yang tidak memiliki mockup khusus dan halaman Pengaduan yang tidak memiliki mockup khusus.
- Setiap layar memuat mockup acuan, layout, KPI/card/grafik, tabel/kolom, filter/aksi, state, warna/aset, permission/tenant, backend/schema, gap, dan test.
- Ringkasan lintas layar mencatat lima halaman baca-saja yang belum memiliki modul/grant pada template tenant: keuangan, berita, galeri, surat, dan pengaduan.
- Gap fungsional penting dicatat: halaman admin Berita memakai query publik sehingga draft/terjadwal tidak terlihat; Surat belum merender kontrol pagination/filter; Pengaduan belum memiliki detail/tanggapan.
- Klaim fidelity piksel tidak dibuat. Mockup ditinjau dari preview, bukan pixel diff.
- NIK pada daftar/detail tetap disamarkan; nomor KK pada detail masih ditampilkan penuh dan dicatat sebagai bahan evaluasi privasi terpisah.

## Validasi

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Format | `npx prettier --check docs/design/ADMIN-DESA-SCREEN-SPEC.md docs/design/README.md` | **PASS** — semua file sesuai Prettier |
| Tautan relatif | Pemeriksaan Node terhadap 41 tautan relatif pada kedua dokumen | **PASS** — 0 tautan rusak |
| Anchor internal | Pemeriksaan Node terhadap anchor `#mockup-*` | **PASS** — 12 referensi, 12 target |
| Whitespace diff | `git diff --check` | **PASS** — exit 0 |
| Build/typecheck/test | Tidak dijalankan | **SKIPPED** — task hanya dokumentasi; tidak ada perubahan runtime |

Tidak ada hasil **FAIL** pada pemeriksaan yang dijalankan.

## Risiko dan batasan

- Tidak ada bukti runtime, build, typecheck, unit test, atau integration test untuk 12 layar pada task ini.
- Lima halaman baca-saja belum dapat dipakai tenant baru sampai modul/grant ditambahkan; ini gap rilis, bukan sesuatu yang boleh diatasi dengan mematikan guard.
- Tiga layar penduduk dan halaman Pengaduan tidak memiliki mockup khusus; gap visualnya tidak dapat diukur terhadap mockup yang tidak ada.
- Working tree masih berisi perubahan dokumen dan aset mockup dari pekerjaan sebelumnya. Laporan ini tidak men-stage atau meng-commit perubahan tersebut.
- Spesifikasi dan laporan belum di-push pada saat laporan ini ditulis; push dan PR dilakukan setelah commit laporan.

## Rekomendasi berikutnya

1. Review isi dan prioritas gap pada spesifikasi.
2. Selesaikan modul/grant template untuk lima halaman baca-saja melalui task terpisah.
3. Perbaiki query admin Berita agar draft/terjadwal terlihat tanpa membocorkan tenant.
4. Lengkapi kontrol operasional Surat dan Pengaduan sebelum mengejar parity visual.
