# Audit Konsistensi & Kerapian — 12 November 2026

Dokumen ini mencatat hasil audit read-only terhadap konsistensi migrasi, berkas, folder, dan kode fungsi. Audit tidak mengubah kode apa pun. Dokumen terpisah dari `AUDIT-2026-11-12.md` dan `AUDIT-2026-11-12-pasca-cleanup.md` agar kedua snapshot lama tetap utuh.

## 1. Ringkasan

**Verdict: struktur fitur sehat, tetapi rantai migrasi belum aman dijalankan ulang dan produk belum punya lapisan halaman.**

Yang paling mendesak:

1. Snapshot Drizzle terakhir (`0096`) tidak mencerminkan satu titik waktu mana pun, sehingga `db:generate` berikutnya akan membuat indeks yang sudah dibuat `0099` dan migrasi gagal.
2. Ekspor rekap kehadiran menghasilkan data tahun lain dan kolom rusak, tanpa peringatan.
3. Kunci API dapat dibuat tetapi tidak dapat dicabut; kunci tanpa `expiresAt` berlaku selamanya.
4. Kontrak OpenAPI menyatakan hal yang berbeda dari perilaku empat route eksternal.
5. Aplikasi berisi 80 route handler dan 0 halaman, sementara proxy dan daftar berkas publik masih menunjuk halaman/berkas yang tidak ada.

Beberapa temuan pada audit sebelumnya sudah tidak berlaku dan tidak dimasukkan lagi: `expiresAt` kini diperiksa (`api-eksternal/domain/auth.ts:23`), `rateLimit` per kunci dipakai ketiga route, indeks unik `hashed_key` sudah ada, jalur pembuatan kunci sudah tersedia di `/api/pengaturan/api-key`, dan duplikasi `inventaris-publik.ts` sudah dibersihkan (dijaga `src/db/audit-register.test.ts:79`).

## 2. Lingkup dan metode

- **Lingkup:** 52 folder fitur, 100 berkas migrasi SQL, 47 snapshot, 80 `route.ts`, lapisan aplikasi/domain/infrastruktur fitur yang disebut di bawah, serta `src/proxy.ts`, `src/lib/public-paths.ts`, `src/lib/dal.ts`.
- **Metode:** pembacaan kode dan pelacakan pemanggil (termasuk pencarian seluruh repo untuk mendeteksi kode mati), pembacaan snapshot dan journal Drizzle, serta penghitungan berkas.
- **Tidak dijalankan:** tes, build, lint, dan koneksi database. Temuan tidak bersandar pada perilaku runtime.
- **Beban yang diasumsikan:** satu desa aktif per domain, puluhan staf, beberapa mitra API.

## 3. Tabel temuan

| ID   | Tingkat | Temuan                                                                 | Lokasi utama                                                                     |
| ---- | ------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| K-01 | Tinggi  | Snapshot migrasi tidak sinkron; `db:generate` akan menduplikasi indeks | `src/db/migrations/meta/0096_snapshot.json:295-384,15522`, `0099_...sql:1`        |
| K-02 | Tinggi  | Ekspor rekap kehadiran: filter tanggal salah, CSV rusak, jabatan angka  | `src/app/(admin)/kehadiran/rekap/ekspor/route.ts:12-40`                           |
| K-03 | Tinggi  | Kunci API tidak dapat dicabut; kunci tanpa masa berlaku permanen       | `src/app/api/pengaturan/api-key/route.ts`, `api-key-use-cases.ts:35-85`            |
| K-04 | Sedang  | Kontrak OpenAPI berbeda dari perilaku route eksternal                  | `src/features/api-eksternal/domain/openapi.ts:4-6,31-49`                          |
| K-05 | Tinggi  | 0 halaman; redirect dan daftar berkas publik menunjuk yang tidak ada   | `src/proxy.ts:24-27`, `src/lib/public-paths.ts:27-37`, `src/lib/dal.ts:108-155`    |
| K-06 | Sedang  | Query N+1 pada pemuatan pengikut surat                                 | `src/features/penduduk/infrastructure/penduduk-repository.ts:440-484`             |
| K-07 | Sedang  | Tes paritas migrasi hanya memeriksa `CREATE TABLE`                     | `src/db/migrasi-paritas.test.ts:33-44,60-68`                                      |
| K-08 | Sedang  | Guard lapisan hanya memindai `src/app`; 8 use case mengimpor `@/db`    | `src/features/publik/application/lapisan-publik.test.ts:11-12`                    |
| K-09 | Sedang  | Modul kehadiran hampir seluruhnya tidak terjangkau (428 baris)         | `src/features/kehadiran/**`, `src/app/(admin)/kehadiran/rekap/ekspor/route.ts`    |
| K-10 | Rendah  | Route handler memakai gerbang halaman `verifySession` (13 tempat)      | `src/app/(admin)/**/ekspor/route.ts`                                              |
| K-11 | Rendah  | Dokumen audit basi (A-06) dan tidak ada README                         | `docs/AUDIT-2026-11-12-pasca-cleanup.md:38,182-193`                               |
| K-12 | Rendah  | Proyek bukan repositori Git                                            | `/d/laragon/www/desa` (tidak ada `.git`)                                          |
| K-13 | Rendah  | Helper error API eksternal digandakan, dua bentuk envelope             | `eksternal/surat/route.ts:18-23`, `eksternal/tte/tanda-tangan/route.ts:15-20`      |
| K-14 | Rendah  | Gaya `insertId` tidak seragam                                          | `src/features/api-eksternal/application/api-key-use-cases.ts:56`                  |
| K-15 | Rendah  | Dua fungsi `daftarPerangkatDesa` berbentuk berbeda                     | `kehadiran/application/kehadiran-use-cases.ts:47`, `publik/application/konten-publik.ts:63` |

Tingkat **Tinggi** berarti memblokir rilis atau merusak data/keamanan. **Sedang** berarti perlu diperbaiki sebelum produksi tetapi butuh kondisi tambahan. **Rendah** adalah hardening, konsistensi, atau perawatan.

## 4. Temuan rinci

### K-01. Snapshot migrasi tidak sinkron; migrasi berikutnya akan gagal — **SELESAI**

**Lokasi:** `src/db/migrations/meta/0096_snapshot.json:295-384, 15522`; `src/db/migrations/0099_api_keys_hashed_key_uq.sql:1`; `src/db/migrations/meta/_journal.json`.

**Bukti:**

- Terdapat 100 berkas migrasi SQL dan 100 entri journal berurutan (`idx` 0–99), tetapi hanya 47 snapshot; yang terakhir `0096`. Tidak ada snapshot `0097`–`0099`.
- Snapshot `0096` sudah memuat kolom `lampiran` pada `incoming_letter_dispositions`, padahal kolom itu baru ditambahkan lewat `0097_add_lampiran_surat_agenda.sql`.
- Pada snapshot yang sama, `api_keys.indexes` masih `{}`, padahal `src/db/schema/api-keys.ts:38` mendeklarasikan `uniqueIndex("api_keys_hashed_key_uq")` dan `0099` sudah membuatnya.
- Karena `db:generate` membandingkan skema dengan snapshot terakhir, indeks tersebut akan dianggap belum ada dan dibuat ulang pada migrasi `0100`.

**Dampak:** Penerapan migrasi pada database baru berhenti dengan `Duplicate key name 'api_keys_hashed_key_uq'`. Developer berikutnya juga menerima diff yang tidak mencerminkan keadaan sebenarnya, sehingga perubahan kolom bisa "hilang" dari migrasi.

**Perbaikan:** Selaraskan rantai snapshot: buat `0097`–`0099` yang benar (atau regenerasi dari `0096`), lalu jalankan `npx drizzle-kit generate` dan pastikan jawabannya "No schema changes in your schema". Tambahkan langkah itu ke CI agar tidak terulang.

**Status:** Selesai 2026-11-12. Rantai 100 migrasi dan 47 snapshot diganti satu `0000_baseline.sql` yang digenerate ulang dari `src/db/schema`. Verifikasi: `drizzle-kit generate` menjawab "No schema changes"; `db:migrate` pada database kosong menghasilkan 147 tabel, 234 foreign key, `api_keys_hashed_key_uq` ada, dan 1 entri `__drizzle_migrations`. Saat regenerasi ditemukan dua nama foreign key otomatis melebihi 64 karakter MySQL; keduanya kini dinamai eksplisit sebagai `ild_incoming_letter_id_fk` dan `ols_outgoing_letter_id_fk` di `src/db/schema/letter-agenda.ts`.

---

### K-02. Ekspor rekap kehadiran menghasilkan data salah tanpa peringatan — **SELESAI**

**Lokasi:** `src/app/(admin)/kehadiran/rekap/ekspor/route.ts:12-40`; `src/features/kehadiran/infrastructure/kehadiran-repository.ts:168-200`; `src/features/kehadiran/application/kehadiran-use-cases.ts:41`.

**Bukti:**

1. `?tahun=abc` → `Number("abc")` menjadi `NaN`. Di `getRekapKehadiran`, `if (tahun)` bernilai salah, sehingga filter tanggal dilewati dan seluruh riwayat diekspor; nama berkas menjadi `rekap_kehadiran_NaN.csv`.
2. `?bulan=13` diterima apa adanya dan menggeser rentang ke Januari tahun berikutnya tanpa galat.
3. Sel CSV dirakit dengan interpolasi mentah tanpa pengutipan: nama perangkat yang mengandung koma (mis. "Budi, S.Pd") menggeser seluruh kolom, dan nilai berawalan `=`, `+`, `-`, atau `@` menjadi formula saat dibuka di Excel/LibreOffice.
4. Header menulis "Jabatan", tetapi nilainya `String(perangkat?.jabatanId)` — angka seperti `3` atau `-`. Nama jabatan berada di tabel `jabatan_perangkat` (`src/db/schema/content.ts:54`) dan tidak pernah di-join. Masalah yang sama muncul pada `perangkatJabatan` di use case.

**Dampak:** Laporan kehadiran yang dipakai untuk administrasi berisi data tahun lain, kolom bergeser, dan tampilan jabatan yang tidak bermakna.

**Perbaikan:** Validasi `tahun` 1900–9999 dan `bulan` 1–12 (tolak dengan 400), gunakan satu helper CSV yang mengutip sel dan menetralkan formula (pola sudah ada di `src/features/survey/domain/survey-csv.ts`), dan `leftJoin(jabatanPerangkat, eq(perangkatDesa.jabatanId, jabatanPerangkat.id))` untuk mengambil `nama`.

**Status:** Selesai 2026-11-12. Parameter dibaca lewat `bacaParameterRekapKehadiran` (`src/features/kehadiran/domain/rekap.ts`): tahun harus 4 digit dalam 1900–2100, bulan 1–12, selain itu 400. CSV disusun dengan `toCsv` dari `@/lib/csv` (kutip sel, netralkan formula, pemisah `;`, BOM). Jabatan kini diambil dari `leftJoin(jabatanPerangkat, …)` sehingga rekap dan daftar kehadiran menampilkan nama, bukan `jabatanId`. Diuji dengan 6 kasus parser (`rekap.test.ts`) dan 3 tes `csv.test.ts`; `tsc` bersih. Route belum diuji lewat permintaan HTTP karena memerlukan sesi.

---

### K-03. Kunci API bisa dibuat tetapi tidak bisa dicabut — **SELESAI**

**Lokasi:** `src/app/api/pengaturan/api-key/route.ts`; `src/features/api-eksternal/application/api-key-use-cases.ts:35-85`; `src/features/api-eksternal/domain/auth.ts:20-21`.

**Bukti:**

- Route hanya mengekspor `GET` (daftar) dan `POST` (buat).
- Tidak ada operasi di seluruh repo yang menulis `apiKeys.active = false`; pencarian `active: false`/`set({ active` tidak menemukan apa pun untuk tabel ini.
- `buatKunciSchema` membuat `expiresAt` opsional dengan default `null`, sehingga kunci tanpa masa berlaku sah dan berlaku selamanya.
- `authenticateApiKey` sudah memeriksa `active`, tetapi kemampuan menonaktifkannya tidak pernah dibuka.

**Dampak:** Kunci yang bocor tidak dapat dihentikan lewat aplikasi; satu-satunya jalan adalah mengubah database manual. Tidak ada rotasi kunci.

**Perbaikan:** Tambahkan `PATCH`/`DELETE` pada route yang sama dengan `requirePermission(RESOURCES.pengaturan, "update")` + `resolveVillageId(user)`, set `active: false` dengan syarat `villageId`, dan catat audit event. Sekitar 25 baris tanpa dependensi baru.

**Status:** Selesai 2026-11-12. `cabutKunciApi` menonaktifkan (`active = false`) kunci milik desa pemanggil, idempoten, dan menulis audit `api-key.revoke`; `DELETE /api/pengaturan/api-key?id=…` membuka operasi ini dengan `requirePermission(RESOURCES.pengaturan, "update")`. Kunci tidak dihapus agar riwayat `lastUsedAt` dan audit tetap utuh. Verifikasi: `tsc` bersih, tes audit (termasuk label event baru) 2/2 lulus; alur belum diuji lewat HTTP karena butuh sesi.

---

### K-04. Kontrak OpenAPI tidak cocok dengan perilaku route — **SELESAI**

**Lokasi:** `src/features/api-eksternal/domain/openapi.ts:4-6, 31-49`; `src/app/api/eksternal/surat/[token]/route.ts:14-41`; `src/app/api/eksternal/surat/verifikasi/route.ts:12-55`; `src/app/api/eksternal/surat/route.ts`.

**Bukti:**

- Dokumen dan komentarnya menyatakan "Desa ditentukan dari header `Host`", tetapi keempat route memakai `auth.apiKey.villageId`. Mitra yang mengirim `Host` desa B dengan kunci desa A menerima data desa A.
- Skema `Galat` mewajibkan `{ok: false, error}`, sedangkan route `[token]` dan `verifikasi` mengembalikan `{message}`. Klien yang di-generate dari spesifikasi gagal membaca error 401/404.
- `POST /surat` didokumentasikan sebagai 201 tanpa skema body, padahal responsnya `{ok: true, data: {id, ...}}`.

**Dampak:** Integrasi mitra gagal pada jalur error, dan penentuan tenant disalahpahami — berpotensi kebocoran data antar desa bila mitra menembak host yang salah.

**Perbaikan:** Ganti deskripsi menjadi "desa ditentukan oleh kunci API", samakan envelope error memakai helper `galat()` yang sudah ada di dua route lain, dan tambahkan skema respons 201. Tes yang memastikan setiap respons error memuat `ok` dan `error` akan mengunci perilaku ini.

**Status:** Selesai 2026-11-12. Keempat route kini memakai `jsonGalat` dari `src/features/api-eksternal/presentation/respons.ts` sehingga galat selalu `{ ok: false, error, detail? }`; route baca juga menangkap kegagalan tak terduga sebagai 500 JSON. Spesifikasi diperbarui: `SuratRingkas` dan `PermohonanSuratDibuat` didefinisikan, status 400/404/413/500 yang benar-benar dikembalikan ikut didokumentasikan, `GET /api/eksternal/openapi` terdaftar dengan `security: []`, dan klaim tenant diganti menjadi "desa ditentukan kunci API". Dikunci oleh 4 tes statis di `openapi.test.ts`.

---

### K-05. Tidak ada halaman; rujukan halaman mengarah ke rute yang tidak ada

**Lokasi:** `src/proxy.ts:24-27`; `src/lib/public-paths.ts:27-37`; `src/lib/dal.ts:108-155`.

**Bukti:**

- `src/app` berisi 80 `route.ts`, 0 `page.tsx`/`layout.tsx`/`template.tsx`.
- Tidak ada `sitemap.ts`, `robots.ts`, `manifest.ts`, `icon.svg`, maupun `opengraph-image.tsx`; folder `public/` kosong.
- Proxy tetap mengalihkan pengguna tanpa cookie ke `/masuk`, yang tidak punya halaman (404). `dal.ts` mengarah ke `/masuk`, `/beranda`, dan `/layanan-mandiri/ubah-pin` dengan nasib sama.
- `PUBLIC_FILES` mencantumkan lima path metadata dan berkomentar "Semuanya benar-benar ada", padahal tidak satu pun ada.
- Temuan ini sama dengan A-01/A-10 pada audit sebelumnya dan masih berlaku.

**Dampak:** Tidak ada pengguna yang dapat login lewat browser atau memakai area administrasi; pengalihan berakhir di halaman error. Daftar berkas publik membuat proxy mengizinkan path yang tidak pernah ada.

**Perbaikan:** Tetapkan keputusan produk. Jika API-only: hapus redirect proxy ke halaman, buang `PUBLIC_PATHS`/`PUBLIC_FILES` yang menyesatkan, dan ganti tautan reset sandi dengan alur API. Jika akan ada UI: pulihkan halaman `/masuk`, `/reset-sandi`, dan beranda, lalu tambahkan smoke test yang memastikan status 200.

**Status:** Ditunda 2026-11-12. Keputusan produk: proyek **akan** punya UI, pengerjaannya menyusul. Karena itu jalur halaman di `src/proxy.ts` dan `src/lib/dal.ts` **dipertahankan**, bukan dihapus. Yang tetap harus dikerjakan saat UI dimulai: halaman `/masuk`, `/reset-sandi`, dan beranda; koreksi `PUBLIC_FILES` yang menyebut berkas tidak ada; serta smoke test status 200. Temuan ini tetap berlaku sampai itu selesai.

---

### K-06. Query N+1 saat memuat pengikut surat — **SELESAI**

**Lokasi:** `src/features/penduduk/infrastructure/penduduk-repository.ts:440-484`; dipakai `src/features/surat/application/surat-use-cases.ts:409`.

**Bukti:** Fungsi melakukan `for (const id of ids.slice(0, 10))` dan menjalankan satu query berurutan per ID, masing-masing dengan sembilan `leftJoin`. Nama dan bentuk select identik di setiap iterasi.

**Dampak:** Cetak/pratinjau surat dengan 10 pengikut menambah 10 round-trip database, dan fungsi ini juga berada di jalur penerbitan surat.

**Perbaikan:** Ganti loop dengan satu query `where(and(eq(residents.villageId, villageId), inArray(residents.id, ids.slice(0, 10))))`; blok select tidak perlu diubah.

**Status:** Selesai 2026-11-12. Loop diganti satu query `inArray` dengan `[...new Set(idsDiminta)]`; hasil dipetakan kembali per ID dan `flatMap` agar urutan masukan serta duplikat tetap sama seperti perilaku lama. Verifikasi: `tsc` bersih. Belum ada tes integrasi yang menyentuh fungsi ini, jadi penghematan round-trip belum diukur.

---

### K-07. Tes paritas migrasi tidak dapat menangkap migrasi `ALTER` — **SELESAI**

**Lokasi:** `src/db/migrasi-paritas.test.ts:33-44, 60-68`.

**Bukti:** `tabelMigrasi()` hanya membaca regex `/CREATE TABLE (?:IF NOT EXISTS )?`.../`. Migrasi `0097` (dua `ALTER TABLE ... ADD COLUMN`) dan `0099` (`CREATE UNIQUE INDEX`) tidak tercakup. Bila `0097` dihapus, tes tetap hijau sementara setiap insert disposisi/ekspedisi gagal dengan `Unknown column 'lampiran' in 'field list'`.

**Dampak:** CI memberi rasa aman pada bagian yang paling mudah rusak, dan kerusakan baru terlihat saat runtime.

**Perbaikan:** Tambahkan pemeriksaan bahwa setiap kolom yang dideklarasikan skema untuk tabel yang disentuh `ALTER` benar-benar ada pada rantai migrasi (atau bandingkan snapshot terakhir dengan skema). Satu tes tambahan, tetap tanpa koneksi database.

**Status:** Selesai 2026-11-12. `src/db/migrasi-paritas.test.ts` kini berisi 7 tes: tabel skema vs `CREATE TABLE`, berkas SQL vs journal (dua arah), kolom snapshot vs SQL, foreign key snapshot vs SQL, indeks snapshot vs SQL, dan snapshot untuk setiap entri journal. Tetap statis (tanpa koneksi DB). Guard diuji dengan menghapus satu kolom dari `0000_baseline.sql` secara sementara: tes gagal dan menyebut `api_keys.prefix`, lalu berkas dipulihkan (md5 identik).

---

### K-08. Aturan lapisan hanya ditegakkan untuk route — **SELESAI**

**Lokasi:** `src/features/publik/application/lapisan-publik.test.ts:11-12`; delapan berkas `application/*use-cases.ts`.

**Bukti:** Guard hanya memindai `src/app` dengan pola `@/features/*/infrastructure/` dan `@/db`. Di lapisan aplikasi, delapan berkas mengimpor `@/db` langsung: `api-eksternal`, `bumindes`, `kehadiran`, `keuangan/apbdes-import`, `penduduk/dpt`, `penduduk/dtks`, `penduduk/riwayat-penduduk`, dan `statistik/rentang-umur`. `kehadiran-use-cases.ts:116-119` bahkan menjalankan query tabel di tengah aturan bisnis.

**Dampak:** Aturan arsitektur yang dijaga ketat di route tidak berlaku di lapisan yang seharusnya paling murni; logika SQL baru mudah menumpuk di use case tanpa terdeteksi.

**Perbaikan:** Pindahkan query tersebut ke repository yang sesuai (mis. `findPerangkatById`, `api-key-repository.ts`), lalu perluas guard ke `src/features/*/application/**`.

**Status:** Selesai 2026-11-12. Tidak ada lagi `src/features/*/application/**` yang mengimpor `@/db`; query berpindah ke repository masing-masing (`api-key-repository.ts` baru, `bumindes`, `kehadiran`, `keuangan`, `dpt`, `dtks`, `riwayat-penduduk`, `rentang-umur`, `statistik-desa-repository.ts` baru, `notifikasi`). Transaksi pencatatan penduduk dipindah sebagai operasi repository (`simpanPendudukBaruDanMutasi`, `ubahStatusPendudukDanMutasi`) sehingga use case tidak lagi memegang `tx`. `lapisan-publik.test.ts` diperluas ke seluruh folder `application` fitur dan dibuktikan menangkap berkas sementara berisi impor `@/db`.

---

### K-09. Modul kehadiran hampir seluruhnya tidak terjangkau

**Lokasi:** `src/features/kehadiran/**` (428 baris); `src/app/(admin)/kehadiran/rekap/ekspor/route.ts`.

**Bukti:** Satu-satunya konsumen dari `src/app` adalah `getRekapKehadiranData` pada route ekspor. `daftarKehadiran`, `tambahKehadiran`, `ubahKehadiran`, `hapusKehadiran`, `daftarPerangkatDesa`, dan `statusPerangkatHariIni` tidak dipanggil di luar modul; tidak ada page/route untuk mengisi kehadiran, dan fitur tidak memiliki folder `presentation`.

**Dampak:** Fitur tidak dapat dipakai pengguna, tetapi tes dan kode perawatannya tetap berjalan dan dihitung sebagai cakupan.

**Perbaikan:** Pilih satu: sambungkan ke halaman/route, atau hapus fungsi tulis beserta domain izin yang tidak terpakai.

**Status:** Statis.

---

### K-10. Route handler memakai gerbang halaman yang melempar redirect — **SELESAI**

**Lokasi:** 13 berkas `src/app/(admin)/**/ekspor/route.ts` (contoh `kehadiran/rekap/ekspor/route.ts:18`).

**Bukti:** `verifySession()` dirancang untuk Server Component dan memanggil `redirect("/masuk")` yang melempar `NEXT_REDIRECT`. Di route handler, klien `fetch` yang sesinya habis menerima redirect HTML, bukan 401 JSON seperti pola `requireUser()`/`requirePermission()` pada route lain.

**Dampak:** Penanganan error ekspor tidak konsisten dan lebih sulit diuji.

**Perbaikan:** Ganti 13 pemakaian itu dengan `requireUser()` (atau biarkan use case memanggil `requirePermission`); cadangkan `verifySession` untuk halaman.

**Status:** Selesai 2026-11-12. Helper baru `src/lib/route-auth.ts` (`penggunaRoute`) memetakan sesi habis menjadi 401 JSON lewat `appErrorStatus`; seluruh 13 route ekspor memakainya dan pemeriksaan izin spesifik tetap di route/use case. `grep verifySession` pada `src/app/**/route.ts` menghasilkan 0; `verifySession` tetap dipakai halaman. `tsc` bersih.

---

### K-11. Dokumen audit basi dan tidak ada README — **SELESAI**

**Lokasi:** `docs/AUDIT-2026-11-12-pasca-cleanup.md:38, 182-193`.

**Bukti:** A-06 masih berstatus "Aktif" untuk lima masalah, padahal empat sudah diperbaiki: `expiresAt` diperiksa (`auth.ts:23`), `rateLimit` per kunci dipakai ketiga route, indeks unik ada (`0099`), dan jalur pembuatan kunci tersedia (`/api/pengaturan/api-key`). Yang tersisa hanya pencabutan kunci (K-03). Tidak ada README, meski `package.json` memiliki delapan skrip db/build/check yang urutannya tidak jelas bagi pendatang baru.

**Dampak:** Auditor dan developer berikutnya memperbaiki hal yang sudah beres dan melewatkan yang belum.

**Perbaikan:** Ubah baris A-06 menjadi "Sebagian" dengan sisa masalah, dan tambahkan README singkat (prasyarat, `db:migrate`, `npm run check`).

**Status:** Selesai 2026-11-12. Setelah K-03 (pencabutan kunci), kelima butir A-06 tertutup dan baris/bagian A-06 sempat diperbarui menjadi **Selesai**. Pemilik proyek kemudian mengeluarkan dua dokumen audit lama dari working tree agar tidak ikut commit, sehingga register A-06 tidak lagi ada di repo; `src/db/audit-register.test.ts` diarahkan ke dokumen konsistensi ini. `README.md` ditambahkan: prasyarat, langkah `cp .env.example .env` → `db:migrate` → `dev`, tabel skrip, peta struktur lapisan, dan aturan lapisan yang dijaga tes.

---

### K-12. Proyek ini bukan repositori Git — **SELESAI**

**Lokasi:** `/d/laragon/www/desa` — tidak ada `.git`.

**Bukti:** `git status` mengembalikan `fatal: not a git repository`.

**Dampak:** Tidak ada riwayat, diff, `bisect`, atau rollback; setiap perubahan hanya ada di working tree dan audit tidak dapat membandingkan perubahan.

**Perbaikan:** `git init` lalu commit awal (`.gitignore` sudah tersedia).

**Status:** Selesai 2026-11-12. `git init` dijalankan dan seluruh working tree dicatat sebagai commit awal pada branch `main`, sehingga perubahan audit ini dapat di-diff dan di-rollback.

---

### K-13. Helper error API eksternal digandakan dengan dua bentuk — **SELESAI**

**Lokasi:** `src/app/api/eksternal/surat/route.ts:18-23`; `src/app/api/eksternal/tte/tanda-tangan/route.ts:15-20`; `src/app/api/eksternal/surat/[token]/route.ts`; `src/app/api/eksternal/surat/verifikasi/route.ts`.

**Bukti:** Dua route memiliki `galat()` yang identik; dua route lain menulis `NextResponse.json({ message }, ...)` inline.

**Dampak:** Setiap perubahan format error harus disentuh di empat tempat, dan envelope yang berbeda sudah menimbulkan K-04.

**Perbaikan:** Satu helper di `features/api-eksternal/presentation/` yang dipakai keempat route.

**Status:** Selesai 2026-11-12. Keempat route memakai `jsonGalat` dari `presentation/respons.ts`; tidak ada lagi `function galat` lokal. Sisa helper error di `src/app/api/pengaturan/api-key/route.ts` adalah milik route admin, bukan API eksternal.

---

### K-14. Gaya pengambilan `insertId` tidak seragam — **SELESAI**

**Lokasi:** `src/features/api-eksternal/application/api-key-use-cases.ts:56`.

**Bukti:** Di sini dipakai cast manual `(result as { insertId: bigint | number }).insertId`, sementara repository lain memakai `.$returningId()`.

**Dampak:** Cast manual lolos typecheck walau bentuk hasil driver berubah.

**Perbaikan:** Gunakan `.$returningId()` seperti mayoritas kode.

**Status:** Selesai 2026-11-12. Insert kunci API pindah ke `api-key-repository.ts` (`buatKunciApiRecord`) dan memakai `.$returningId()`; tidak ada cast `insertId` tersisa di fitur ini. `tsc` bersih.

---

### K-15. Dua fungsi `daftarPerangkatDesa` dengan bentuk berbeda — **SELESAI**

**Lokasi:** `src/features/kehadiran/application/kehadiran-use-cases.ts:47`; `src/features/publik/application/konten-publik.ts:63`.

**Bukti:** Nama identik, tetapi yang satu memerlukan izin kehadiran dan mengembalikan `nik`, yang lain untuk situs publik.

**Dampak:** Salah impor tidak akan gagal compile; varian publik dapat dipakai pada alur admin atau sebaliknya.

**Perbaikan:** Ganti nama varian publik menjadi `daftarPerangkatPublik`, atau ekspor lewat modul yang jelas.

**Status:** Selesai 2026-11-12. Varian publik kini bernama `daftarPerangkatPublik` (`src/features/publik/application/konten-publik.ts`) dengan komentar pembeda; varian admin `daftarPerangkatDesa` tidak berubah. Pencarian seluruh repo memastikan tidak ada pemanggil lain yang perlu diperbarui. `tsc` bersih.

## 5. Yang sudah baik

- Seluruh route yang diperiksa meneruskan otorisasi ke use case; API eksternal memakai `requirePermission` + `resolveVillageId` dan tidak menerima `villageId` dari klien.
- API key disimpan sebagai hash SHA-256, dibandingkan dengan `timingSafeEqual`, dan `expiresAt`/`rateLimit`/`lastUsedAt` kini benar-benar dipakai.
- Journal migrasi berurutan tanpa duplikat, dan setiap berkas SQL terdaftar.
- `setujuiMutasiTahap` memakai transaksi dengan `WHERE` bertahap sehingga dua persetujuan paralel tidak dapat lolos.
- Duplikasi `inventaris-publik.ts` dan beberapa modul mati lain sudah dibersihkan serta dijaga tes.

## 6. Urutan perbaikan

1. **K-01** — satu langkah, mencegah migrasi gagal dan memulihkan kepercayaan pada `db:generate`.
2. **K-02** dan **K-03** — kecil, berdampak langsung pada data dan keamanan.
3. **K-04**, **K-07**, **K-08** — kontrak dan penjagaan.
4. **K-05** — ditunda: UI dikerjakan menyusul, jadi jangan hapus redirect/gerbang halaman lebih dulu.
5. Sisanya: perawatan dan konsistensi.

## 7. Batasan

- Tes, build, lint, dan `drizzle-kit` tidak dijalankan ulang; semua temuan berasal dari pembacaan kode dan berkas.
- Tidak ada database yang disentuh, sehingga perilaku runtime (mis. kegagalan migrasi) disimpulkan dari isi snapshot dan SQL, bukan direproduksi.
- 52 folder fitur tidak dibaca berkas per berkas; pemeriksaan mendalam terbatas pada jalur yang tercantum beserta pemanggilnya.
- Klaim pada dua dokumen audit sebelumnya tidak diverifikasi ulang, kecuali butir A-06.
- Tidak ada pemeriksaan HTTP/browser, dan metadata Git tidak tersedia.
