# AUD-034 — Inventaris relasi tenant-bound di luar composite FK inti

| Item | Nilai |
| --- | --- |
| Task | Issue #34 — audit lanjutan relasi tenant-bound (tahap inventaris) |
| Branch | `task/AUD-034-tenant-relation-audit` (baseline) → `task/AUD-034-batch-3-tenant-hardening` (Batch 3) → `task/AUD-034-b4-bumindes-composite-fk` (Batch 4) |
| Base commit | `343ef35a7858303eb82afc69c8caca7848a1a8e7` (baseline) → `de1bf1be98abf664b01d01f00308b67f404c6997` (revisi Batch 3) → `3338364a45e4c8e0c4d6f1cf78c4b5286f3321a4` (Batch 4) |
| Tanggal | 14 November 2026 |
| Sifat | Baseline read-only; revisi status Batch 3 dan Batch 4 memperbarui relasi setelah migration `0005` dan `0006` |
| Migration terakhir tercakup | `0006_b4_bumindes_composite_fk.sql` |

## 1. Ringkasan

- **124 tabel tenant-scoped** memiliki `village_id`; **23 tabel** tidak memilikinya.
- **12 tabel** pada baseline branch ini sudah memiliki `UNIQUE (village_id, id)`; migration `0006` menambah satu kandidat parent, sehingga menjadi **13 setelah migration diterapkan**.
- Setelah migration `0006` diterapkan, relasi child→parent tenant-scoped single-column yang terbuka pada baseline berkurang satu lagi; hitungan tabel dengan minimal satu composite FK perlu dihitung ulang saat matriks diinventaris ulang.
- **52 relasi** child→parent yang keduanya tenant-scoped memakai FK single-column pada baseline `343ef35`. Batch 1 (PR #36) menutup 5 relasi `resident_id`, Batch 3 menutup 1 relasi inventaris, dan Batch 4 branch ini menambahkan migration untuk menutup 1 relasi BUMDes; setelah `0006` diterapkan, **45 relasi** masih terbuka:
  - **7 relasi** ber-`ON DELETE SET NULL` yang menunggu keputusan desain,
  - **1 relasi** `letter_number_archive.letter_id`,
  - **21 relasi** masih terbuka pada Matriks B2 setelah `bumindes_item.buku_id` ditutup oleh `0006`, dan
  - **16 relasi** menunjuk `users` (`created_by`/`actor_id`) yang bukan relasi tenant-bound.
- **23 tabel non-tenant** diklasifikasikan: 10 tabel referensi global/platform, 6 tabel auth, 3 tabel preferensi per-user, dan 4 tabel anak tenant yang tidak membawa `village_id`.
- Dua tabel tenant tanpa composite FK sama sekali: `keuangan_jurnal`, `keuangan_saldo_bank` (hanya berelasi ke `villages`).

Kesimpulan tahap ini: enforcement database sudah jauh lebih luas daripada laporan integrasi lama (angka "44 relasi deferred" tidak lagi akurat). Setelah Batch 4, sisa pekerjaan terkonsentrasi pada 21 relasi Matriks B2 yang belum ditutup, ditambah keputusan desain untuk relasi ber-`ON DELETE SET NULL`.

## 2. Metode dan sumber bukti

Inventaris baseline menggunakan migration yang sudah ada pada base Batch 3; status relasi dalam revisi ini juga mencatat migration `0005` dan kandidat `0006` pada branch Batch 4:

- `src/db/migrations/0000_baseline.sql`
- `src/db/migrations/0001_aud002_composite_tenant_fk.sql`
- `src/db/migrations/0002_b2_dtks_suplemen_composite_fk.sql`
- `src/db/migrations/0003_b2_bantuan_composite_fk.sql`
- `src/db/migrations/0004_b2_resident_composite_fk.sql`
- `src/db/migrations/0005_b3_inventaris_composite_fk.sql`
- `src/db/migrations/0006_b4_bumindes_composite_fk.sql` (kandidat pada branch task ini; belum merged)

Cara kerja:

1. Ambil setiap `CREATE TABLE` dan tandai tabel yang memiliki `village_id`, termasuk kolom yang ditambahkan lewat `ALTER TABLE ... ADD village_id` (mis. `dtks_ref_lampiran` pada `0002`).
2. Kumpulkan `FOREIGN KEY` dari definisi inline maupun `ALTER TABLE ... ADD CONSTRAINT`.
3. Buang constraint yang sudah di-`DROP FOREIGN KEY` oleh migrasi berikutnya, agar relasi yang telah diganti composite FK tidak terhitung dua kali; `0006` pada revisi branch ini dihitung sebagai kandidat, bukan migration merged.
4. Cocokkan setiap FK single-column dengan kemampuan parent menghasilkan `UNIQUE (village_id, id)`.
5. Verifikasi layer aplikasi dilakukan dengan membaca repository dan use case terkait (bukan asumsi).

Analisis bersifat statis; tidak ada query yang dijalankan ke database.

## 3. Parent yang sudah siap untuk composite FK

`UNIQUE (village_id, id)` tersedia pada 12 tabel base; ditambah `bumindes_buku` pada migration kandidat `0006` (13 setelah diterapkan):

```
dtks, dtks_lampiran, families, inventaris, kia, letter_types, letters,
posyandu, regions, residents, rtm, suplemen
```

`inventaris` ditambahkan oleh `0005`; kandidat migration `0006` menambahkan unique key `bumindes_buku`. Setelah `0006` diterapkan, ada 13 parent yang siap untuk composite FK.

## 4. Matriks A — relasi yang sudah DB-enforced

| Modul | Tabel | Bukti constraint |
| --- | --- | --- |
| Penduduk | `residents`, `families`, `rtm`, `regions`, `resident_mutations` | `0001`: unique parent + composite FK region/rtm/family |
| KIA & kesehatan | `kia`, `ibu_hamil`, `bulanan_anak`, `posyandu` | `0001`: composite FK ke `residents`, `posyandu`, `kia` |
| Surat | `letters`, `permohonan_surat`, `letter_types` | `0001`: composite FK ke `residents`, `letter_types`, `letters` |
| DTKS | `dtks`, `dtks_anggota`, `dtks_lampiran`, `dtks_ref_lampiran` | `0002`: composite FK ke `rtm`, `families`, `residents`, `dtks`, `dtks_lampiran` |
| Suplemen | `suplemen`, `suplemen_terdata` | `0002`: composite FK ke `suplemen`, `residents`, `families` |
| Bantuan | `bantuan_program`, `bantuan_peserta` | `0003`: composite FK ke `residents`, `families`, `rtm`, `kelompok` |
| Keluarga/RTM | `keluarga`, `rumah_tangga` | PR #29/#30: region guard + composite FK wilayah |
| Kelompok | `kelompok`, `kelompok_anggota` | PR #23: composite FK kelompok→desa |
| Inventaris | `inventaris`, `inventaris_mutasi` | `0005` (Batch 3): unique parent `inventaris (village_id, id)` + composite FK `inventaris_mutasi (village_id, inventaris_id)` cascade |
| BUMDes | `bumindes_buku`, `bumindes_item` | Kandidat `0006` (Batch 4, branch belum merged): unique parent `bumindes_buku (village_id, id)` + composite FK `bumindes_item (village_id, buku_id)` cascade |

## 5. Matriks B1 — 13 relasi siap composite FK

Parent sudah memiliki `UNIQUE (village_id, id)`, sehingga hanya perlu migrasi pada tabel child.

Status: lima relasi `ON DELETE cascade` di bawah (`dokumen_warga`, `kehadiran_izin`, `kelompok_anggota`, `verifikasi_kontak`, `warga_pesan`) **sudah** memakai composite FK sejak `0004` (Batch 1, PR #36). Delapan relasi `SET NULL` lainnya tetap single-column dan dijaga di application layer.

| Child | Kolom | Parent | `ON DELETE` saat ini | Catatan |
| --- | --- | --- | --- | --- |
| `dokumen_warga` | `resident_id` | `residents` | cascade | aman langsung |
| `kehadiran_izin` | `resident_id` | `residents` | cascade | aman langsung |
| `kelompok_anggota` | `resident_id` | `residents` | cascade | aman langsung |
| `verifikasi_kontak` | `resident_id` | `residents` | cascade | aman langsung |
| `warga_pesan` | `resident_id` | `residents` | cascade | aman langsung |
| `kontak` | `resident_id` | `residents` | set null | **blocker semantik** |
| `lapak` | `resident_id` | `residents` | set null | **blocker semantik** |
| `notifikasi_terkirim` | `resident_id` | `residents` | set null | **blocker semantik** |
| `pendapat` | `resident_id` | `residents` | set null | **blocker semantik** |
| `family_member_logs` | `family_id` | `families` | set null | **blocker semantik** |
| `family_member_logs` | `resident_id` | `residents` | set null | **blocker semantik** |
| `users` | `resident_id` | `residents` | set null | **blocker semantik + platform user** |
| `letter_number_archive` | `letter_id` | `letters` | set null | **blocker semantik** |

### Blocker semantik `ON DELETE SET NULL`

`village_id` pada seluruh tabel child bersifat `NOT NULL`. Pada composite FK, MySQL menerapkan `SET NULL` ke **semua** kolom FK, termasuk `village_id`, sehingga penghapusan parent akan gagal atau memaksa `village_id` menjadi nullable. Pilihannya:

1. ubah menjadi `ON DELETE restrict`/`no action` (perilaku berubah: hapus penduduk yang masih direferensikan akan ditolak), atau
2. pertahankan FK single-column + jaga di application layer, atau
3. jadikan `village_id` nullable pada tabel tersebut (tidak disarankan; melemahkan invariant tenant).

Rekomendasi: opsi 1 untuk `letter_number_archive` dan `notifikasi_terkirim`, sedangkan `kontak`, `lapak`, `pendapat`, dan `family_member_logs` perlu keputusan maintainer karena `SET NULL` adalah perilaku bisnis yang disengaja (kontak eksternal, lapak tanpa pemilik, log riwayat).

## 6. Matriks B2 — 23 relasi yang parent-nya butuh unique key

| Parent | Child yang menunjuk | Jumlah |
| --- | --- | --- |
| `kontak` | `anggota_grup_kontak.kontak_id` | 1 |
| `kontak_grup` | `anggota_grup_kontak.grup_id` | 1 |
| `analisis_kategori` | `analisis_indikator.kategori_id` | 1 |
| `polygon` | `area.ref_polygon` | 1 |
| `berita_kategori` | `berita.kategori_id` | 1 |
| `pengaduan` | `bukti_pengiriman_notifikasi.pengaduan_id` | 1 |
| `bumindes_buku` | `bumindes_item.buku_id` | 1 — **ditambahkan pada kandidat Batch 4** (`0006`, composite FK cascade; belum diterapkan) |
| `bumindes_tanah_kas` | `bumindes_tanah_kas_mutasi.tanah_kas_id` | 1 |
| `galeri_album` | `galeri_foto.album_id` | 1 |
| `incoming_letters` | `incoming_letter_dispositions.incoming_letter_id` | 1 |
| `letter_classifications` | `incoming_letters`, `letter_dinas`, `letter_types`, `outgoing_letters` | 4 |
| `inventaris_kategori` | `inventaris.kategori_id` | 1 — **blocker semantik** (`SET NULL`, `village_id` NOT NULL); Batch 3 menjaganya di application layer |
| `inventaris` | `inventaris_mutasi.inventaris_id` | 1 — **selesai** Batch 3 (`0005`, composite FK cascade) |
| `kelompok_master` | `kelompok.category_id` | 1 |
| `kelompok` | `kelompok_anggota.kelompok_id` | 1 |
| `lapak` | `lapak_produk.lapak_id` | 1 |
| `outgoing_letters` | `outgoing_letter_shipments.outgoing_letter_id` | 1 |
| `pemilihan` | `pemilihan_kandidat.pemilihan_id` | 1 |
| `jabatan_perangkat` | `perangkat_desa.jabatan_id` | 1 |
| `roles` | `users.role_id` | 1 |

Total 23 relasi pada baseline; 22 tersisa setelah `0005`, lalu **21 tersisa setelah kandidat `0006` diterapkan** untuk menutup `bumindes_item.buku_id`. Sisanya (16 relasi) menunjuk `users` melalui `created_by`/`actor_id` dan **bukan** relasi tenant-bound: aktor bisa berupa platform user dengan `village_id = null`.

## 7. Matriks C — 23 tabel tanpa `village_id`

| Klasifikasi | Tabel | Alasan |
| --- | --- | --- |
| Referensi global | `blood_types`, `citizenships`, `educations`, `family_relations`, `marital_statuses`, `occupations`, `religions`, `gis_simbol`, `keuangan_template`, `villages` | data baku lintas desa |
| Auth/platform | `accounts`, `sessions`, `verifications`, `login_otp`, `rate_limit_entries`, `role_permissions` | identitas platform, bukan data desa |
| Preferensi per user | `pengguna_menu_urutan`, `pengguna_shortcut`, `keranjang` | terikat ke user/sesi, bukan tenant langsung |
| Anak tenant tanpa `village_id` | `survey_soal`, `survey_responden`, `survey_jawaban`, `pembangunan_dokumentasi` | mengikuti parent (`survey`, `pembangunan_proyek`) |

Empat tabel anak pada baris terakhir tidak dapat diberi composite FK tanpa menambahkan `village_id` baru beserta backfill dari parent — melanggar batasan "tanpa backfill otomatis" pada issue, sehingga dicatat sebagai kandidat batch terpisah.

## 8. Temuan layer aplikasi (terverifikasi)

| Temuan | Bukti | Status |
| --- | --- | --- |
| `addAnggotaGrupUseCase` menerima `kontakId` dari input tanpa memverifikasi desa kontak | `src/features/kontak/application/use-cases.ts:104-113`, `src/features/kontak/infrastructure/kontak-repository.ts:72-76` | **diperbaiki Batch 2** (PR #37) + test lintas desa |
| `createKontakUseCase` menerima `residentId` dari input | `src/features/kontak/application/use-cases.ts:73`, `src/db/schema/kontak.ts:22` | **diperbaiki Batch 2** (PR #37) + test lintas desa |
| Rekap kehadiran melakukan join `residents` tanpa predikat desa | `src/features/kehadiran/infrastructure/kehadiran-repository.ts:119-120` | **diperbaiki Batch 2** (PR #37) — join dibatasi `village_id` |
| `listInventaris` join kategori & `listMutasi` join inventaris tanpa predikat desa | `src/features/inventaris/infrastructure/inventaris-repository.ts` | **diperbaiki Batch 3** — kedua join dibatasi desa |
| `saveInventaris` meneruskan `kategoriId` mentah | `src/features/inventaris/application/inventaris-use-cases.ts` | **diperbaiki Batch 3** — lookup kategori per desa + pesan seragam |
| `createLapak`/`updateLapak` menerima `residentId` mentah | `src/features/lapak/infrastructure/lapak-repository.ts:100-115` | belum diverifikasi lebih lanjut (modul belum punya route aktif) |
| Kepemilikan role lintas tenant | `src/features/rbac/application/authorization.ts:40-41`, `src/features/rbac/application/grup-use-cases.ts:119` | **app-enforced** |
| Unggah dokumen warga memakai `residentId` dari sesi | `src/features/layanan-mandiri/application/warga-use-cases.ts:162-170` | **app-enforced** |
| `users.resident_id` diisi saat pendaftaran warga | `src/features/warga/infrastructure/warga-repository.ts:145` | belum diverifikasi |

## 9. Rencana implementasi bertahap

| Batch | Isi | Risiko |
| --- | --- | --- |
| 1 | 5 relasi `ON DELETE cascade` di Matriks B1 (`dokumen_warga`, `kehadiran_izin`, `kelompok_anggota`, `verifikasi_kontak`, `warga_pesan`) | rendah; perilaku delete tidak berubah |
| 2 | Perbaikan application layer untuk temuan Bagian 8 + test negatif | rendah; tanpa migration |
| 3 | `letter_number_archive`, `notifikasi_terkirim` (ubah `SET NULL` → `RESTRICT`) | sedang; perilaku delete berubah |
| 4 | 20 parent pada Matriks B2: tambah `UNIQUE (village_id, id)` lalu composite FK per modul | sedang; butuh urutan migration dan preflight |
| 5 | `survey_soal`/`responden`/`jawaban`, `pembangunan_dokumentasi` | tinggi; butuh kolom baru + backfill, harus diputuskan maintainer |

Setiap batch memakai migration baru; tidak ada migrasi yang sudah diterapkan/merged yang diubah.

Status terbaru: Batch 1 (PR #36) dan Batch 2 (PR #37) sudah merged; Batch 3 menutup celah aplikasi inventaris + composite FK `inventaris_mutasi` (`0005`); branch Batch 4 ini menambahkan kandidat migration composite FK `bumindes_item.buku_id` (`0006`), belum merged/diterapkan. AUD-034 **belum selesai**. Perubahan `letter_number_archive`/`notifikasi_terkirim` dari `SET NULL` ke `RESTRICT` belum dikerjakan karena mengubah perilaku hapus dan memerlukan persetujuan maintainer; sisa relasi Matriks B2 juga dikerjakan per modul pada task terpisah.

## 10. Preflight read-only yang direncanakan

Untuk setiap relasi kandidat, hitung referensi invalid **tanpa** mengubah data:

```sql
SELECT COUNT(*) AS lintas_desa
FROM child c
JOIN parent p ON p.id = c.parent_id
WHERE c.village_id <> p.village_id;
```

Hasil preflight menentukan apakah migration `ADD CONSTRAINT` bisa langsung dijalankan atau harus diblokir. Tidak ada `UPDATE`/`DELETE`/backfill otomatis.

## 11. Rencana test integration (MySQL 8 disposable)

- composite FK menolak insert child dengan parent desa lain,
- composite FK menerima pasangan yang satu desa,
- perilaku `ON DELETE` sesuai keputusan batch (restrict/cascade),
- rollback transaksi saat constraint dilanggar,
- unique parent key menolak duplikasi `(village_id, id)`,
- negative test melalui repository/use case untuk jalur yang diperbaiki di Batch 2.

## 12. Blocker dan keputusan yang dibutuhkan

1. **`ON DELETE SET NULL` vs composite FK** — perlu keputusan untuk `kontak`, `lapak`, `pendapat`, `family_member_logs`, `users`, `letter_number_archive`, `notifikasi_terkirim`, dan `inventaris_kategori` (Batch 3 memilih mempertahankan FK single-column + validasi application layer untuk kategori inventaris).
2. **Platform user** — `users.village_id` nullable; composite FK `users.resident_id` hanya bisa diberlakukan bila baris platform dikecualikan, yang tidak didukung MySQL partial index.
3. **Tabel anak survey/pembangunan** — perlu penambahan `village_id` + backfill. Issue melarang backfill otomatis, sehingga butuh persetujuan eksplisit.
4. **Data legacy invalid** — belum diukur; preflight read-only harus dijalankan pada database uji berisi salinan data sebelum migration dinyatakan aman.

## 13. Keterbatasan

- Inventaris berbasis pembacaan migrasi dan kode, bukan eksekusi query.
- Modul yang belum punya route aktif (mis. `lapak`) diverifikasi sebatas repository.
- Angka relasi dapat berubah bila ada migration baru; revisi ini terikat pada `de1bf1be` + `0005`.
- Baseline tidak mengubah kode/schema. Batch 3 mengubah schema inventaris, repository, use case, dan menambah test; rinciannya ada di `AUD-034-batch-3-application-isolation.md`.
- Status "diperbaiki Batch 2" mengacu pada laporan `AUD-034-batch-2-application-isolation.md`, bukan verifikasi ulang menyeluruh di Batch 3.
