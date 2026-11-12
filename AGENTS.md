# AGENTS.md — Appdes SID

Instruksi wajib untuk semua coding agent, AI agent, dan developer yang mengerjakan repository ini.

## 1. Konteks proyek

Appdes adalah platform Sistem Informasi Desa (SID) multi-tenant. Satu aplikasi/server melayani banyak desa (tenant) dengan isolasi data yang ketat.

Stack yang harus dipertahankan:
- Next.js App Router
- React dan TypeScript
- MySQL
- Drizzle ORM
- Better Auth
- Zod
- Vitest

Jangan mengganti stack, ORM, database, atau pola arsitektur utama tanpa keputusan eksplisit dari maintainer.

Dokumen acuan:
- `docs/TECHNICAL_AUDIT.md` — temuan dan kontrol positif audit.
- `docs/SID_FEATURE_MAP.md` — peta fitur dan cakupan modul.
- `docs/MASTER_ROADMAP.md` — urutan fase, prioritas, dependensi, dan Definition of Done.

Jika instruksi task bertentangan dengan dokumen tersebut, berhenti dan jelaskan konflik sebelum mengubah kode.

## 2. Aturan kerja yang tidak boleh dilanggar

1. Kerjakan hanya task yang diberikan. Jangan memperluas scope atau melakukan refactor massal tanpa persetujuan.
2. Satu task/temuan audit dalam satu perubahan terfokus. Jangan sekaligus memperbaiki banyak AUD tanpa diminta.
3. Sebelum mengedit, baca file terkait, alur pemanggil, schema, permission, dan test yang relevan.
4. Jangan mengubah atau menghapus file hanya karena terlihat tidak terpakai. Buktikan dampaknya terlebih dahulu.
5. Jangan mengubah source code, schema, migration, konfigurasi deployment, atau data database saat task hanya meminta audit/baseline.
6. Jangan menjalankan perintah destruktif, reset database, drop table, truncate, force push, atau menghapus data tanpa persetujuan eksplisit.
7. Jangan pernah menjalankan test/migration terhadap database production. Integration test hanya boleh menggunakan database test disposable yang identitasnya sudah diverifikasi.
8. Jangan menonaktifkan test, menghapus assertion, menurunkan strictness TypeScript/lint, menambahkan `any` secara tidak perlu, atau menyamarkan error untuk membuat pemeriksaan terlihat lulus.
9. Jangan menambahkan dependency baru jika kemampuan yang sama sudah tersedia. Jelaskan alasan dan dampaknya sebelum menambah dependency besar.
10. Jangan commit langsung ke `main`. Gunakan branch khusus task dan buat perubahan mudah direview.
11. Jangan mengklaim build, lint, typecheck, atau test berhasil jika perintahnya belum benar-benar dijalankan.
12. Jangan mencetak, menyalin ke log, atau memasukkan secret, token, password, private key, NIK, dan data pribadi ke output, test fixture, atau commit.

## 3. Aturan multi-tenant — prioritas keamanan tertinggi

- Tenant context harus berasal dari sesi/identitas yang telah diverifikasi dan mekanisme resolusi tenant server-side.
- Jangan menjadikan `villageId` dari body, query, header, form, atau parameter klien sebagai bukti otorisasi.
- Untuk operasi Admin Desa, pastikan user aktif, desa aktif, permission benar, dan `user.villageId` sesuai dengan data yang diakses.
- Setiap role desa harus dimiliki tenant yang sama dengan user. Jangan menerima `roleId` lintas tenant.
- Platform Super Admin adalah pengecualian eksplisit: user platform menggunakan `villageId === null` dan role platform yang sah. Jangan menyamakan role `administrator` desa dengan `super-admin` platform.
- Semua foreign reference tenant-scoped (misalnya resident, family, region, letter type, KIA, bantuan, inventaris) wajib diverifikasi berada di tenant yang sama sebelum create/update/import.
- Semua query, join, agregasi, update, delete, export, dan bulk operation harus dibatasi tenant. Jangan mengandalkan filter UI.
- Bila memungkinkan, tegakkan isolasi dengan composite unique key dan composite foreign key yang menyertakan `village_id`, selain validasi di application layer.
- Jangan mengembalikan data tenant lain melalui error message, autocomplete, count, export, atau metadata.
- Tambahkan negative test yang mencoba memakai ID milik tenant lain. Test positif saja tidak cukup.

## 4. Autentikasi, otorisasi, dan data sensitif

- Gunakan pola autentikasi dan DAL yang sudah ada; jangan membuat jalur bypass baru.
- Periksa permission pada server-side use case/action/route, bukan hanya menyembunyikan tombol atau menu.
- Reset password atau perubahan keamanan akun harus mengikuti kebijakan invalidasi sesi yang berlaku.
- Data kesehatan/KIA, NIK, dokumen kependudukan, dan data pribadi harus mengikuti least privilege; hindari data asli pada fixture dan log.
- Untuk upload, validasi ukuran, tipe, signature/magic bytes, nama/path, kepemilikan tenant, dan lokasi penyimpanan. Jangan percaya MIME dari browser.
- Untuk output HTML, gunakan sanitasi yang sudah tersedia; jangan merender HTML mentah dari input pengguna.

## 5. Integrasi eksternal dan jaringan

- Untuk TTE/provider: gunakan origin allowlist yang eksplisit; validasi URL hasil provider; blok tujuan private, loopback, link-local, dan metadata endpoint; kontrol redirect; jangan meneruskan Authorization ke origin lain; wajibkan TLS dengan verifikasi sertifikat.
- Jangan menonaktifkan validasi TLS (`rejectUnauthorized: false`, `ssl: false`, atau padanannya) untuk mengatasi error koneksi.
- Untuk webhook/tenant dari host: percayai forwarded host hanya bila reverse proxy tepercaya menimpa header tersebut. Jangan mengasumsikan header dari internet aman.
- Timeout, batas ukuran, rate limit, retry, dan penanganan error harus dipertimbangkan untuk setiap integrasi.
- Jangan mengirim data pribadi/dokumen ke layanan eksternal selain yang diperlukan dan disetujui alur bisnis.

## 6. Database dan migration

- Periksa schema Drizzle dan migration yang ada sebelum mengubah model data.
- Migration harus kompatibel dengan data lama dan deployment bertahap bila memungkinkan.
- Jangan mengedit migration yang sudah pernah diterapkan; buat migration baru kecuali maintainer secara eksplisit memerintahkan hal lain.
- Jelaskan dampak migration, urutan deploy, backfill, rollback, lock/downtime, dan kebutuhan backup.
- Jangan menjalankan migration pada production. Untuk test, gunakan database test terpisah yang disposable.
- Operasi read-modify-write yang rawan race condition harus memakai transaksi, constraint, atau strategi concurrency yang sesuai.

## 7. Gaya implementasi

- Ikuti struktur feature/layer yang sudah digunakan: domain, application, infrastructure, presentation, dan route sesuai pola modul terkait.
- Utamakan perubahan kecil, mudah dibaca, dan konsisten dengan kode di sekitarnya.
- Pertahankan validasi Zod dan aturan domain; jangan memindahkan business rule ke komponen UI.
- Gunakan tipe eksplisit dan hindari duplikasi business logic.
- Jangan membuat abstraksi/generic framework baru untuk satu kasus sederhana.
- Jangan mengubah UI/UX, desain, atau mockup kecuali termasuk scope task.
- Pertahankan modul IDM sebagai fitur inti; jangan menghapus atau menyederhanakan indikator, klasifikasi, SDGs, laporan, atau alur IDM tanpa persetujuan.

## 8. Prosedur setiap task

### Sebelum implementasi
1. Pastikan branch dan working tree; jangan menimpa perubahan lokal yang bukan milik task.
2. Baca task, dokumen audit/roadmap terkait, file implementasi, schema, dan test.
3. Tulis rencana singkat: akar masalah, file yang akan disentuh, risiko, dan test yang akan ditambahkan.
4. Jika scope ambigu, berisiko menghapus data, memerlukan keputusan arsitektur, atau bertentangan dengan dokumen, berhenti dan minta arahan.

### Saat implementasi
1. Buat perubahan sekecil mungkin untuk menyelesaikan task.
2. Tambahkan atau perbarui test untuk jalur berhasil, gagal, permission, dan lintas tenant yang relevan.
3. Jangan mengubah perilaku modul lain tanpa alasan yang tercatat.
4. Perbarui dokumentasi bila kontrak, konfigurasi, prosedur operasi, atau perilaku publik berubah.

### Setelah implementasi
1. Jalankan pemeriksaan yang relevan dan aman: typecheck, lint, format check, unit test, serta integration test hanya pada database test disposable.
2. Tampilkan perintah yang dijalankan dan hasil sebenarnya. Pisahkan PASS, FAIL, dan SKIPPED.
3. Periksa `git diff` dan `git status`; pastikan tidak ada file/secret/perubahan tak terkait.
4. Jangan merge atau deploy. Serahkan branch/diff untuk review maintainer.

## 9. Definition of Done

Task belum selesai sebelum:
- Perubahan sesuai scope dan tidak merusak kontrak modul yang ada.
- Otorisasi dan tenant ownership diperiksa di server-side.
- Foreign reference dan query tenant-scoped aman.
- Test mencakup jalur sukses, penolakan akses, dan lintas tenant bila relevan.
- Typecheck/lint/format/test yang relevan dilaporkan dengan status sebenarnya.
- Tidak ada secret, data pribadi, file generated, atau perubahan tak terkait dalam diff.
- Dokumentasi diperbarui jika memang diperlukan.
- Ringkasan perubahan, risiko tersisa, dan bukti validasi diserahkan untuk review.

## 10. Format laporan coding agent

Gunakan format berikut setiap selesai task:

- **Task:** ID/nama task dan tujuan.
- **Branch:** nama branch dan base commit.
- **Analisis:** akar masalah dan pendekatan.
- **File berubah:** daftar file beserta alasan.
- **Perubahan:** ringkasan implementasi.
- **Security/tenant:** validasi ownership, permission, dan risiko yang diperiksa.
- **Test:** perintah dan hasil PASS/FAIL/SKIPPED.
- **Diff:** ringkasan perubahan dan statistik bila tersedia.
- **Risiko tersisa:** hal yang belum dapat diverifikasi.
- **Status:** siap review / terhambat — jangan menyatakan siap merge atau production tanpa persetujuan.

Prinsip utama: **lebih baik berhenti dan melaporkan ketidakpastian daripada menebak, melewati kontrol keamanan, atau membuat perubahan di luar scope.**
