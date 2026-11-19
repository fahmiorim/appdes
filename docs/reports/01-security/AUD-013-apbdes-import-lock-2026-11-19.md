# AUD-013 lanjutan — Serialisasi impor APBDes dengan kunci (desa, tahun)

- **Tanggal:** 2026-11-19
- **Branch:** `task/AUD-013-apbdes-import-lock`
- **Base commit:** `34c8cc5` (`origin/main`)
- **Task:** menutup sisa AUD-013 pada jalur impor APBDes. Impor harus memakai kunci `(desa, tahun)` yang sama dengan penyimpanan manual, sehingga induk selalu sama dengan jumlah anaknya.

## 1. Kondisi awal dan analisis

`saveKeuanganNilai` (penyimpanan manual) sudah diserialkan lewat `denganKunciMysql('keuangan:<desa>:<tahun>')` pada AUD-034/PR #86, lalu mengagregasi ulang seluruh induk dari nilai tersimpan.

`upsertKeuanganBatch` (impor APBDes) berbeda:

| Aspek | Simpan manual | Impor (sebelum) |
| --- | --- | --- |
| Serialisasi | kunci `(desa, tahun)` + transaksi | transaksi saja, tanpa kunci |
| Nilai induk | dihitung dari jumlah anak | ditulis apa adanya dari berkas impor |
| Nilai realisasi | dari input | selalu `0.00`, menimpa realisasi tersimpan |

Akibatnya dua hal:

1. Impor yang berjalan bersamaan dengan penyimpanan manual dapat saling menimpa: keduanya membaca agregasi lama lalu menulis hasil yang berbeda, sehingga induk tertinggal dari jumlah anaknya.
2. Berkas APBDes umumnya membawa baris induk dengan pagu `0`, sehingga setelah impor induk bisa bernilai nol meski anak-anaknya berisi pagu.

Menambah kunci saja tidak menyelesaikan (2). Karena itu impor dialihkan ke jalur simpan yang sama: kunci yang sama, transaksi yang sama, dan agregasi induk yang sama. Ini pilihan yang lebih kecil daripada menduplikasi logika agregasi di dua tempat.

## 2. File yang diperiksa

- `src/features/keuangan/infrastructure/keuangan-repository.ts`
- `src/features/keuangan/application/apbdes-import-use-cases.ts`
- `src/features/keuangan/domain/apbdes-import.ts`
- `src/features/keuangan/domain/keuangan.ts`
- `src/db/kunci-mysql.ts`
- `src/db/schema/keuangan.ts`
- `src/features/keuangan/infrastructure/keuangan-concurrency.integration.test.ts`
- `src/testing/migrasi-uji.ts`, `src/testing/db-test-guard.ts`
- `docs/reports/01-security/AUD-034-race-conditions.md`

## 3. File yang diubah

| File | Alasan |
| --- | --- |
| `src/features/keuangan/infrastructure/keuangan-repository.ts` | `upsertKeuanganBatch` memakai jalur `saveKeuanganNilai`; penulisan induk nol untuk seluruh chart dihentikan |
| `src/features/keuangan/application/apbdes-import-use-cases.ts` | pemanggilan menyesuaikan signature `(villageId, tahun, createdBy, rows)` |
| `src/features/keuangan/infrastructure/apbdes-import-concurrency.integration.test.ts` | test baru: kunci, agregasi induk, kode tak tersentuh, impor + simpan paralel |
| `vitest.integration.config.mts` | mendaftarkan file test baru |

## 4. Perubahan

### 4.1 Impor memakai jalur simpan yang sama

`upsertKeuanganBatch(villageId, tahun, createdBy, rows)` sekarang mendelegasikan ke `saveKeuanganNilai(...)`. Tidak ada logika agregasi baru; impor otomatis mendapat kunci `(desa, tahun)`, satu transaksi, dan agregasi ulang induk.

Konsekuensi yang disengaja: baris induk dari berkas tidak lagi dipercaya. Pagu induk dihitung dari anak-anaknya, persis seperti penyimpanan manual.

### 4.2 Penulisan induk nol untuk seluruh chart dihentikan

Saat menelusuri kegagalan test, ditemukan perilaku lama di agregasi: untuk **setiap** induk pada chart global, aplikasi menulis baris `0.00` meski tidak ada data desa pada subtree tersebut.

```ts
// sebelum
if (sumA === 0n && sumR === 0n && agg.has(item.uuid)) continue;

// sesudah
if (sumA === 0n && sumR === 0n) continue;
```

Perubahan ini mempertahankan maksud komentar lama (nilai eksplisit pada baris yang boleh diisi langsung tidak ditimpa nol saat anaknya kosong) dan menambah: kode tanpa nilai tidak perlu baris baru, karena pembaca sudah memperlakukan baris yang tidak ada sebagai `0.00`.

Dampak yang terukur: simpan untuk satu desa tidak lagi menyentuh kode template milik desa/cabang lain. Selain mengurangi tulisan, ini menghilangkan gangguan antar-fixture yang membuat dua integration test saling menjatuhkan saat dijalankan paralel (lihat 5.2).

## 5. Test dan bukti

### 5.1 Test baru — 4 kasus

`src/features/keuangan/infrastructure/apbdes-import-concurrency.integration.test.ts`

1. **impor menunggu kunci (desa, tahun) yang sama** — kunci `keuangan:<desa>:<tahun>` dipegang koneksi lain; selama 400 ms tidak boleh ada baris tertulis; setelah kunci dilepas baris muncul.
2. **mengagregasi induk dari baris impor** — berkas membawa induk `0.00`; setelah impor induk = jumlah anak (anggaran dan realisasi).
3. **hanya menulis kode yang tersentuh** — subtree template lain di chart tidak boleh mendapat baris nol.
4. **impor dan simpan manual bersamaan** — `Promise.all` pada tiga tahun berbeda, induk harus sama dengan jumlah anak di setiap tahun.

Fixture memakai kode acak per run, desa dan user sendiri, dan membersihkan baris di `afterAll`. Test memakai database uji disposable, bukan database pengembangan/produksi.

### 5.2 Bukti test menangkap regresi (red test)

| Regresi yang disuntikkan sementara | Hasil |
| --- | --- |
| Kunci dilepas dari jalur impor (kembali ke `db.transaction` saja) | **FAIL** — `expected [ Array(2) ] to have a length of +0 but got 2` pada pemeriksaan "belum ada baris selama kunci dipegang" |
| Penulisan induk nol dibiarkan seperti semula | **FAIL** — `expected [ '7369', '8369', '8369.01' ]` pada test kode tak tersentuh; `7369` adalah subtree fixture lain |

Setelah perubahan diterapkan, keduanya lulus. Ini menunjukkan test menguji perilaku, bukan sekadar mengeksekusi kode.

### 5.3 Perintah validasi dan hasil

Database uji: `desa_test_apbdes_20261119 @ 127.0.0.1` (MySQL 8.0.30, disposable, dibuat oleh `siapkanDatabaseUji`).

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | **PASS** |
| `npx eslint` (3 file berubah/baru) | **PASS** |
| `npx prettier --check` (4 file berubah/baru) | **PASS** |
| `npx vitest run --config vitest.config.mts src/features/keuangan` | **PASS** — 13 file, 165 test |
| `npx vitest run --config vitest.integration.config.mts src/features/keuangan/infrastructure/apbdes-import-concurrency.integration.test.ts src/features/keuangan/infrastructure/keuangan-concurrency.integration.test.ts` | **PASS** — 2 file, 5 test |
| `TEST_DATABASE_URL=…/desa_test_suite_apbdes_20261119 TEST_DATABASE_ACK=1 npm run test:integration:ci` (seluruh suite) | **PASS** — 54 file, 295 test, 0 gagal, 0 skip, 153,90 detik, exit 0 |
| `git diff --check` | **PASS** |

## 6. Keamanan dan multi-tenant

- Kunci tetap domain `(villageId, tahun)`, diambil dari argumen yang sudah divalidasi use case; tidak ada input klien baru.
- Tidak ada perubahan query lintas tenant. Penulisan tetap dibatasi `village_id` + `tahun` + `template_uuid` melalui unique key `keuangan_village_tahun_uuid_unique`.
- `template_uuid` tetap diverifikasi terhadap chart global oleh pemanggil (`listTemplateUuid`), dan foreign key `keuangan.template_uuid` tetap `RESTRICT`.
- Test bersifat positif; belum ada negative test lintas tenant untuk impor karena jalur ini tidak menerima `villageId` dari klien (berasal dari sesi).

## 7. Risiko dan keterbatasan

- Kunci memakai `GET_LOCK` dengan batas tunggu 10 detik dan gagal **fail-closed**: bila satu operasi macet, operasi lain pada desa/tahun yang sama ikut gagal dengan pesan jelas, bukan diam-diam menimpa.
- Impor kini menimpa pagu induk hasil agregasi, bukan nilai dari berkas. Bila operator mengharapkan pagu induk persis seperti di berkas, perilakunya berubah — tetapi nilai itu memang tidak konsisten dengan anak-anaknya.
- Realisasi pada impor tetap `0.00` (perilaku lama, tidak diubah task ini). Impor yang dijalankan setelah realisasi tercatat akan mengosongkan realisasi tahun tersebut. Ini perlu keputusan produk tersendiri dan belum ditangani.
- Perubahan "induk nol tidak ditulis" berlaku untuk semua pemanggil `saveKeuanganNilai`, bukan hanya impor. Pembaca yang mengandalkan adanya baris eksplisit bernilai nol (mis. ekspor yang menghitung baris) perlu diperiksa; pencarian kode tidak menemukan ketergantungan seperti itu, tetapi belum diuji end-to-end di UI.
- Penguncian hanya mengoordinasi proses yang memakai MySQL yang sama.
- Suite integration penuh lulus pada database disposable terpisah (`desa_test_suite_apbdes_20261119`), termasuk 4 test baru di berkas ini. Yang belum dicakup: pengujian runtime/UI dan perilaku penguncian pada lebih dari satu instance MySQL.

## 8. Kesimpulan

Impor APBDes sekarang diserialkan dengan penyimpanan manual memakai kunci `(desa, tahun)` yang sama, dan induk selalu diagregasi ulang dari nilai tersimpan. Perilaku menulis baris nol untuk seluruh chart juga dihentikan karena itu sumber gangguan antar-desa dan pemborosan tulisan.

## 9. Rekomendasi langkah berikutnya

1. Putuskan kebijakan realisasi pada impor APBDes (pertahankan nilai tersimpan atau nolkan) dan tambahkan test bila kebijakan berubah.
2. Jalankan `npm run test:integration` penuh di CI sebelum merge untuk memastikan perubahan agregasi tidak memengaruhi suite lain.
3. Pertimbangkan test negatif lintas tenant untuk endpoint impor bila nanti `villageId` dapat berasal dari input.
