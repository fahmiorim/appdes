# Database: MySQL, Migrasi, dan Pemulihan

Dokumen ini membahas database aplikasi: persiapan MySQL, user dan hak akses,
migrasi, perbedaan environment, serta risiko kehilangan data. Prosedur backup
dan restore yang lebih rinci ada di [BACKUP-RESTORE.md](./BACKUP-RESTORE.md).

## 1. Lingkungan database

Gunakan database terpisah untuk setiap tujuan. Jangan pernah mencampur data
production dengan pengujian.

| Environment | Contoh nama | Karakteristik | Aturan |
|---|---|---|---|
| Development | `desa_dev` | Data lokal, boleh dihapus | Jangan pakai credential production |
| Testing | `desa_test`, `desa_test_<suffix>` | Disposable; dibuat oleh integration test | Hanya host loopback; `TEST_DATABASE_ACK=1`; jangan berisi data nyata |
| Staging | `sid_staging` | Salinan/anonimisasi production | Digunakan untuk restore drill dan uji migrasi |
| Production | `sid_production` | Data nyata, akses terbatas | Backup sebelum perubahan; change approval; tidak untuk test |

Integration test di repository **membuat database**, menjalankan migrasi, dan
menulis fixture. Jangan mengarahkan `TEST_DATABASE_URL` ke database staging atau
production. Panduan guard ada di [ENVIRONMENT.md](./ENVIRONMENT.md#6-variabel-khusus-pengujian).

## 2. Versi dan persiapan MySQL

Versi yang diuji di CI adalah **MySQL 8.0**. `mysql2` juga menyebut dukungan
MariaDB, tetapi repository belum memiliki bukti pengujian terhadap MariaDB.
Gunakan MySQL 8.0 untuk mengurangi variabel yang belum diverifikasi.

Pasang server dan client:

```bash
sudo apt-get update
sudo apt-get install -y mysql-server mysql-client
sudo systemctl enable --now mysql
mysql --version
mysqldump --version
```

Pastikan:

- MySQL mendengarkan di loopback/private network, bukan internet;
- timezone dan jam server stabil (gunakan NTP);
- kapasitas disk cukup untuk data, index, binary log (jika diaktifkan), dan
  backup;
- `max_connections` cukup untuk jumlah proses aplikasi × 10 koneksi pool,
  ditambah operasi backup/migrasi.

Aplikasi memakai connection pool 10 koneksi per proses (`src/db/index.ts`).
Menjalankan beberapa instance berarti setiap instance membuka pool sendiri.

## 3. Membuat database dan user

Masuk sebagai administrator MySQL:

```bash
sudo mysql
```

Gunakan nama dan password fiktif berikut sebagai pola. Ganti semuanya sebelum
menjalankan.

```sql
CREATE DATABASE sid_production
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- User runtime aplikasi.
CREATE USER 'sid_app'@'127.0.0.1'
  IDENTIFIED BY 'GANTI_PASSWORD_APP_YANG_KUAT';

GRANT SELECT, INSERT, UPDATE, DELETE,
      SHOW VIEW, TRIGGER, EVENT, LOCK TABLES
  ON sid_production.*
  TO 'sid_app'@'127.0.0.1';

-- User migrasi; hanya dipakai saat menerapkan migration.
CREATE USER 'sid_migrator'@'127.0.0.1'
  IDENTIFIED BY 'GANTI_PASSWORD_MIGRATOR_YANG_KUAT';

GRANT ALL PRIVILEGES ON sid_production.* TO 'sid_migrator'@'127.0.0.1';
```

Catatan:

- Host `127.0.0.1` harus cocok dengan cara koneksi. Koneksi lewat socket
  `localhost` memakai account host `localhost`, bukan `127.0.0.1`.
- `sid_app` diberi hak dump (`SHOW VIEW`, `TRIGGER`, `EVENT`, `LOCK TABLES`)
  karena endpoint backup memakai `DATABASE_URL` yang sama. Jika `mysqldump`
  meminta privilege tambahan, tambahkan seperlunya dan catat alasannya.
- `sid_migrator` sebaiknya dinonaktifkan atau password-nya dirotasi setelah
  migrasi selesai. Jangan memakai `root` untuk aplikasi.
- Jangan menjalankan `FLUSH PRIVILEGES` hanya karena `GRANT`; perintah itu tidak
  diperlukan untuk perubahan grant normal.

Uji koneksi user aplikasi:

```bash
mysql --protocol=TCP -h 127.0.0.1 -P 3306 -u sid_app -p sid_production -e "SELECT 1;"
```

Masukkan password saat diminta. Jangan menulis password pada baris perintah
karena dapat tersimpan di shell history dan terlihat di daftar proses.

## 4. Konfigurasi koneksi aplikasi

`DATABASE_URL` harus berbentuk:

```text
mysql://USER:PASSWORD@HOST:PORT/DATABASE
```

Contoh:

```dotenv
DATABASE_URL=mysql://sid_app:GANTI_PASSWORD_APP@127.0.0.1:3306/sid_production
```

- Password dengan karakter khusus harus di-URL-encode.
- Gunakan `127.0.0.1` atau hostname private, bukan nama host yang dapat berubah
  tanpa kontrol.
- Jangan menambahkan query string yang tidak didokumentasikan; fitur backup
  mem-parsing DSN dengan `URL` dan mengambil host, port, user, password, serta
  nama database.
- Koneksi aplikasi memakai `timezone: "Z"`. Pastikan data waktu diolah dengan
  pemahaman bahwa driver mengirim/menerima waktu dalam UTC.

## 5. Prosedur migrasi

### 5.1 Perintah yang tersedia

| Perintah | Fungsi | Boleh di production? |
|---|---|---|
| `npm run db:generate` | Membuat file migration dari perubahan schema Drizzle | Tidak untuk deployment; hanya pengembangan |
| `npm run db:migrate` | Menerapkan migration yang ada | Ya, dengan backup dan persetujuan |
| `npm run db:push` | Menyamakan schema langsung ke database | **Tidak** |
| `npm run db:studio` | GUI database | Jangan diekspos ke production |

Repository saat ini memiliki satu migration baseline:
`src/db/migrations/0000_baseline.sql`. Tidak ada mekanisme down/rollback
otomatis; rollback aplikasi harus disertai pemulihan backup yang sesuai.

### 5.2 Sebelum migrasi

1. Pastikan Anda menunjuk database yang benar:
   ```bash
   mysql --protocol=TCP -h 127.0.0.1 -u sid_app -p sid_production \
     -e "SELECT DATABASE(), @@hostname, @@version;"
   ```
2. Buat backup database dan media. Lihat [BACKUP-RESTORE.md](./BACKUP-RESTORE.md).
3. Uji migration di staging dengan salinan data.
4. Hentikan aplikasi agar tidak ada request yang menulis saat schema berubah:
   ```bash
   sudo systemctl stop appdes
   ```
5. Siapkan `.env` dengan `DATABASE_URL` user migrasi. Jangan menaruh password
   migrator di unit systemd atau command line.

### 5.3 Menerapkan migration

```bash
cd /opt/appdes/app
sudo -u appdes npm run db:migrate
```

Drizzle membaca `.env` dari direktori kerja. Jika `DATABASE_URL` masih memakai
user runtime yang tidak memiliki hak DDL, migrasi akan gagal. Untuk deployment
yang memisahkan user:

1. ubah sementara `.env` agar `DATABASE_URL` memakai `sid_migrator`;
2. jalankan migrasi;
3. kembalikan `.env` ke `sid_app`;
4. restart aplikasi dan lanjutkan checklist.

Jangan menjalankan migrasi berulang tanpa memeriksa status. Drizzle mencatat
migration yang sudah diterapkan pada tabel journal; jangan menghapus atau
mengedit tabel tersebut secara manual.

### 5.4 Setelah migrasi

```bash
mysql --protocol=TCP -h 127.0.0.1 -u sid_app -p sid_production \
  -e "SELECT COUNT(*) AS jumlah_tabel FROM information_schema.tables
      WHERE table_schema = DATABASE();"
```

Verifikasi tabel inti:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'users', 'villages', 'roles', 'sessions',
    'audit_logs', 'pengaturan_desa', 'pengguna_shortcut'
  )
ORDER BY table_name;
```

Hasil harus memuat ketujuh tabel tersebut. Tabel ini juga menjadi daftar wajib
yang diperiksa oleh fitur restore aplikasi.

## 6. Bootstrap data awal

**Tidak tersedia di repository ini.** Migrasi hanya membuat skema. Tidak ada
seed untuk:

- baris `villages`;
- role platform/desa dan permission;
- akun administrator;
- domain tenant;
- data master awal.

Use case provisioning membutuhkan Super Admin platform dan desa pertama sebagai
cetakan, tetapi belum ada halaman atau perintah untuk membuat Super Admin
pertama. Endpoint sign-up Better Auth bukan pengganti: akun hasil sign-up tidak
mendapat `villageId`, role, atau akses modul secara otomatis.

Pilihan yang dapat dipertanggungjawabkan:

1. **Dump baseline yang disetujui** dari instalasi yang sudah berjalan, dengan
   data tenant yang sudah dibersihkan/anonimisasi. Ikuti prosedur restore di
   [BACKUP-RESTORE.md](./BACKUP-RESTORE.md), lalu verifikasi.
2. **Tunggu implementasi bootstrap** dari maintainer. Jangan mengarang SQL
   insert untuk role, permission, atau password hash.
3. Untuk pengujian lokal, gunakan fixture integration test hanya pada database
   disposable; jangan memindahkan fixture ke production.

Jangan menyalin database development yang berisi data pribadi ke production.
Jangan membuat akun administrator dengan password default atau hash yang tidak
dibuat oleh mekanisme Better Auth.

## 7. Strategi backup database

Repository tidak menyediakan backup otomatis, penjadwalan, enkripsi, retensi,
atau pengiriman offsite. Backup harus dijalankan oleh operator.

Minimal:

- **Harian:** full logical backup database.
- **Sebelum perubahan berisiko:** backup tambahan (migrasi, restore, upgrade).
- **Retensi:** simpan beberapa generasi (misalnya 7 harian, 4 mingguan, 12
  bulanan) sesuai kebijakan organisasi. Angka ini contoh kebijakan, bukan fitur
  aplikasi.
- **Offsite:** simpan salinan terenkripsi di lokasi terpisah dari server.
- **Checksum:** catat SHA-256 dan uji berkala.
- **Media:** backup terpisah dan konsisten dengan database; lihat
  [BACKUP-RESTORE.md](./BACKUP-RESTORE.md).
- **Uji restore:** lakukan di staging, bukan production.

Endpoint backup aplikasi memakai `mysqldump` dan menampung seluruh dump di
memori. Untuk database besar, gunakan backup CLI langsung agar tidak membebani
proses Node.

## 8. Prosedur restore singkat

Detail ada di [BACKUP-RESTORE.md](./BACKUP-RESTORE.md). Ringkasnya:

1. Hentikan aplikasi.
2. Backup database dan media **saat ini** sebelum menimpa apa pun.
3. Pastikan target database benar dan bukan production yang salah.
4. Restore dump dengan user yang memiliki hak DDL.
5. Verifikasi tabel wajib dan hitungan data.
6. Restore media dari snapshot yang sesuai.
7. Jalankan aplikasi dan lakukan smoke test.

Restore SQL tidak berada dalam satu transaksi. Jika dump gagal di tengah jalan,
database dapat berada dalam keadaan parsial. Jangan mengulang restore secara
membabi buta; pulihkan backup pre-restore atau ikuti prosedur recovery di
dokumen backup.

## 9. Risiko kehilangan data

| Risiko | Penyebab | Mitigasi |
|---|---|---|
| Database tertimpa | Salah `DATABASE_URL`/host | Verifikasi `SELECT DATABASE()` dan identitas server sebelum restore |
| Restore parsial | SQL gagal di tengah; tidak ada transaksi | Backup pre-restore; uji dump di staging; siapkan rollback |
| Kehilangan media | Backup DB saja | Backup `storage/media` bersama DB; uji referensi file |
| Backup rusak | Disk/transfer gagal | Checksum, `gzip -t`, uji restore berkala |
| Backup tidak lengkap | `mysqldump` error diabaikan | Periksa exit code dan stderr; jangan menganggap file ada berarti sukses |
| Backup terlalu besar | Endpoint menampung dump di RAM | Gunakan CLI dan streaming untuk database besar |
| Migration tidak dapat dibatalkan | Tidak ada down migration | Backup sebelum migrasi; rollback dengan restore |
| `db:push` menghapus/mengubah objek | Schema disamakan langsung | Larang `db:push` di production |
| Data testing masuk production | DSN salah | Pisahkan credential, database, dan jaringan |
| Backup berisi secret | `.env`/WhatsApp auth ikut diarsipkan | Pisahkan dan enkripsi; jangan masukkan `.env` ke arsip umum |

## 10. Checklist database

- [ ] MySQL 8.0 berjalan dan hanya dapat diakses dari jaringan tepercaya.
- [ ] Database production memakai `utf8mb4`.
- [ ] User aplikasi bukan `root` dan password kuat.
- [ ] `DATABASE_URL` menunjuk database yang benar dan password ter-URL-encode.
- [ ] Migration diuji di staging dan backup dibuat sebelum production.
- [ ] `npm run db:push` tidak dipakai di production.
- [ ] Tabel inti ada setelah migrasi/restore.
- [ ] Backup database + media dibuat, diberi checksum, dan diuji restore.
- [ ] Bootstrap desa/admin tersedia sebelum pengguna diundang.
