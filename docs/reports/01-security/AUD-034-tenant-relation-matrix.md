# AUD-034 — Inventaris relasi tenant-bound di luar composite FK inti

| Item | Nilai |
| --- | --- |
| Task | Issue #34 — audit lanjutan relasi tenant-bound (tahap inventaris) |
| Branch | `task/AUD-034-tenant-relation-audit` |
| Base commit | `343ef35a7858303eb82afc69c8caca7848a1a8e7` (`origin/main`) |
| Tanggal | 14 November 2026 |
| Sifat | Read-only: tidak ada perubahan kode, schema, migration, atau data |

## 1. Ringkasan

- **124 tabel tenant-scoped** memiliki `village_id`; **23 tabel** tidak memilikinya.
- **11 tabel** sudah memiliki `UNIQUE (village_id, id)` sehingga bisa menjadi parent composite FK.
- **122 dari 124** tabel tenant sudah memiliki minimal satu composite FK.
- **52 relasi** child→parent yang keduanya tenant-scoped masih memakai FK single-column:
  - **13 relasi** parent-nya sudah siap (unique key tersedia),
  - **39 relasi** memerlukan unique key parent baru, dan **16 di antaranya** menunjuk `users` (`created_by`/`actor_id`) yang bukan relasi tenant-bound.
- **23 tabel non-tenant** diklasifikasikan: 10 tabel referensi global/platform, 6 tabel auth, 3 tabel preferensi per-user, dan 4 tabel anak tenant yang tidak membawa `village_id`.
- Dua tabel tenant tanpa composite FK sama sekali: `keuangan_jurnal`, `keuangan_saldo_bank` (hanya berelasi ke `villages`).

Kesimpulan tahap ini: enforcement database sudah jauh lebih luas daripada laporan integrasi lama (angka "44 relasi deferred" tidak lagi akurat). Sisa pekerjaan terkonsentrasi pada 23 relasi nyata yang parent-nya belum punya unique key, ditambah keputusan desain untuk relasi ber-`ON DELETE SET NULL`.

## 2. Metode dan sumber bukti

Inventaris dibangkitkan dari seluruh migrasi yang sudah merged:

- `src/db/migrations/0000_baseline.sql`
- `src/db/migrations/0001_aud002_composite_tenant_fk.sql`
- `src/db/migrations/0002_b2_dtks_suplemen_composite_fk.sql`
- `src/db/migrations/0003_b2_bantuan_composite_fk.sql`

Cara kerja:

1. Ambil setiap `CREATE TABLE` dan tandai tabel yang memiliki `village_id`, termasuk kolom yang ditambahkan lewat `ALTER TABLE ... ADD village_id` (mis. `dtks_ref_lampiran` pada `0002`).
2. Kumpulkan `FOREIGN KEY` dari definisi inline maupun `ALTER TABLE ... ADD CONSTRAINT`.
3. Buang constraint yang sudah di-`DROP FOREIGN KEY` oleh migrasi berikutnya, agar relasi yang telah diganti composite FK tidak terhitung dua kali.
4. Cocokkan setiap FK single-column dengan kemampuan parent menghasilkan `UNIQUE (village_id, id)`.
5. Verifikasi layer aplikasi dilakukan dengan membaca repository dan use case terkait (bukan asumsi).

Analisis bersifat statis; tidak ada query yang dijalankan ke database.

## 3. Parent yang sudah siap untuk composite FK

`UNIQUE (village_id, id)` tersedia pada 11 tabel:

```
dtks, dtks_lampiran, families, kia, letter_types, letters,
posyandu, regions, residents, rtm, suplemen
```

Tabel lain yang menerima composite FK saat ini hanya menunjuk ke salah satu dari 11 parent tersebut.

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

## 5. Matriks B1 — 13 relasi siap composite FK

Parent sudah memiliki `UNIQUE (village_id, id)`, sehingga hanya perlu migrasi pada tabel child.

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
| `bumindes_buku` | `bumindes_item.buku_id` | 1 |
| `bumindes_tanah_kas` | `bumindes_tanah_kas_mutasi.tanah_kas_id` | 1 |
| `galeri_album` | `galeri_foto.album_id` | 1 |
| `incoming_letters` | `incoming_letter_dispositions.incoming_letter_id` | 1 |
| `letter_classifications` | `incoming_letters`, `letter_dinas`, `letter_types`, `outgoing_letters` | 4 |
| `inventaris_kategori` | `inventaris.kategori_id` | 1 |
| `inventaris` | `inventaris_mutasi.inventaris_id` | 1 |
| `kelompok_master` | `kelompok.category_id` | 1 |
| `kelompok` | `kelompok_anggota.kelompok_id` | 1 |
| `lapak` | `lapak_produk.lapak_id` | 1 |
| `outgoing_letters` | `outgoing_letter_shipments.outgoing_letter_id` | 1 |
| `pemilihan` | `pemilihan_kandidat.pemilihan_id` | 1 |
| `jabatan_perangkat` | `perangkat_desa.jabatan_id` | 1 |
| `roles` | `users.role_id` | 1 |

Total 23 relasi. Sisanya (16 relasi) menunjuk `users` melalui `created_by`/`actor_id` dan **bukan** relasi tenant-bound: aktor bisa berupa platform user dengan `village_id = null`.

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
| `addAnggotaGrupUseCase` menerima `kontakId` dari input tanpa memverifikasi desa kontak | `src/features/kontak/application/use-cases.ts:104-113`, `src/features/kontak/infrastructure/kontak-repository.ts:72-76` | **belum aman** — kontak desa lain bisa ditautkan |
| `createKontakUseCase` menerima `residentId` dari input | `src/features/kontak/application/use-cases.ts:73`, `src/db/schema/kontak.ts:22` | **belum aman** — perlu lookup resident per `villageId` |
| Rekap kehadiran melakukan join `residents` tanpa predikat desa | `src/features/kehadiran/infrastructure/kehadiran-repository.ts:119-120` | **belum aman** — NIK desa lain bisa muncul bila data silang ada |
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

Setiap batch memakai migration baru; tidak ada migrasi merged yang diubah.

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

1. **`ON DELETE SET NULL` vs composite FK** — perlu keputusan untuk `kontak`, `lapak`, `pendapat`, `family_member_logs`, `users`, `letter_number_archive`, `notifikasi_terkirim`.
2. **Platform user** — `users.village_id` nullable; composite FK `users.resident_id` hanya bisa diberlakukan bila baris platform dikecualikan, yang tidak didukung MySQL partial index.
3. **Tabel anak survey/pembangunan** — perlu penambahan `village_id` + backfill. Issue melarang backfill otomatis, sehingga butuh persetujuan eksplisit.
4. **Data legacy invalid** — belum diukur; preflight read-only harus dijalankan pada database uji berisi salinan data sebelum migration dinyatakan aman.

## 13. Keterbatasan

- Inventaris berbasis pembacaan migrasi dan kode, bukan eksekusi query.
- Modul yang belum punya route aktif (mis. `lapak`) diverifikasi sebatas repository.
- Angka relasi dapat berubah bila ada migration baru; laporan ini terikat pada `343ef35`.
- Tidak ada perubahan kode/schema pada tahap ini; implementasi menunggu review matriks dan keputusan blocker.
