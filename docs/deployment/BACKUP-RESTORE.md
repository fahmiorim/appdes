# Backup dan Restore

Dokumen ini membedakan **backup database yang tersedia di aplikasi**, **backup
manual yang aman**, dan **backup media**. Jangan menganggap backup database
sama dengan backup aplikasi: media dan konfigurasi disimpan di luar database.

## 1. Ruang lingkup dan siapa yang berwenang

| Aset | Lokasi | Backup tersedia di aplikasi? | Penanggung jawab |
|---|---|---|---|
| Database | MySQL `sid_production` | Ya, endpoint `/api/database/backup` | Platform Super Admin / operator DB |
| Media publik & privat | `storage/media/<villageId>/` | **Tidak** | Operator server |
| Sesi WhatsApp | `storage/whatsapp-auth/` (default) | **Tidak** | Operator server; dapat dipasangkan ulang |
| Konfigurasi/secret | `.env` | **Tidak** | Pengelola secret, terpisah dan terenkripsi |
| Log aplikasi | stdout/journal | Tidak | Operator monitoring |

### Hak akses aplikasi

- Backup dan restore database hanya untuk **Platform Super Admin**, yaitu user
  dengan `villageId === null` dan role platform `super-admin`.
- Administrator desa **tidak** boleh menjalankan backup/restore seluruh
  database. Endpoint akan menolak dengan 403.
- Backup mencakup seluruh database, termasuk semua tenant. Jangan memberikan
  akses ke administrator desa.
- Restore adalah operasi sangat berbahaya. Wajib ada persetujuan, backup
  pre-restore, dan jendela pemeliharaan.
- Operator server yang memiliki akses OS/MySQL dapat melakukan backup/restore
  manual. Ini adalah akses infrastruktur, bukan fitur aplikasi, dan harus
  dibatasi dengan least privilege serta audit akses.

## 2. Format dan batasan

### Backup dari aplikasi

- Nama file: `backup-sid-<database>-<timestamp>.sql.gz` (default) atau `.sql`
  bila memakai `?format=sql`.
- Format: SQL dump MySQL dari `mysqldump`.
- Opsi yang dipakai implementasi:
  `--single-transaction --routines --triggers --events --hex-blob`.
- Respons dikirim sebagai lampiran dengan `Cache-Control: private, no-store`.
- Seluruh isi dump ditampung di memori Node sebelum dikirim. Tidak ada batas
  ukuran backup di endpoint; database besar dapat menghabiskan RAM.
- Backup **tidak** mencakup `storage/media`, sesi WhatsApp, atau `.env`.

### Restore yang diterima aplikasi

| Ketentuan | Nilai |
|---|---|
| Metode | `POST /api/database/restore` |
| Content-Type | `multipart/form-data` |
| `Content-Length` | **Wajib**; tanpa header → 411 |
| Ukuran maksimum permintaan | **200 MB** (termasuk overhead multipart); lebih besar → 413 |
| Field konfirmasi | `konfirmasi=1`, harus terbaca sebelum bagian berkas |
| Field berkas | `berkas` |
| Jumlah berkas | 1 |
| Ekstensi | `.sql` atau `.sql.gz` (case-insensitive) |
| Format lain | `.zip`, `.tar`, `.rar` ditolak |
| Validasi isi | Ekstensi dan alur SQL; **bukan** checksum/signature |
| Setelah sukses | Redirect 303 ke `/pengaturan/database?restored=1` |

Catatan:

- Handler membaca body sebagai stream dan mengalirkannya ke proses `mysql`;
  isi tidak ditampung utuh di memori.
- Handler tidak membuat backup otomatis sebelum restore.
- Handler tidak membungkus restore dalam transaksi. Jika SQL gagal di tengah,
  database dapat parsial.
- Handler tidak memulihkan media. Referensi media di database dapat menunjuk
  berkas yang hilang bila media tidak dipulihkan dari snapshot yang sama.
- `verifikasiPascaRestore` hanya memeriksa keberadaan tabel wajib:
  `users`, `villages`, `roles`, `sessions`, `audit_logs`, `pengaturan_desa`,
  `pengguna_shortcut`. Ini bukan verifikasi integritas menyeluruh.
- Restore menjalankan SQL apa adanya. Hanya gunakan dump dari sumber yang
  dipercaya dan sudah diverifikasi checksum-nya. Dump berbahaya dapat
  menjalankan pernyataan SQL sewenang-wenang.
- **Endpoint ini belum memiliki halaman UI** pada commit ini
  (`/pengaturan/database` tidak tersedia sebagai halaman). Jangan mengklaim
  prosedur restore dapat dilakukan lewat browser sampai halaman tersebut ada.
- User database pada `DATABASE_URL` harus memiliki hak DDL/restore (misalnya
  `DROP`, `CREATE`, `ALTER`, `INSERT`) agar dump dapat diterapkan. User runtime
  yang hanya memiliki SELECT/INSERT/UPDATE/DELETE tidak cukup. Untuk produksi
  dengan user terpisah, gunakan restore CLI dengan user migrator/administrator
  yang disetujui, bukan menaikkan hak user runtime secara permanen.

## 3. Backup database lewat aplikasi

Jika antarmuka atau klien API tersedia dan Anda adalah Platform Super Admin:

```text
GET /api/database/backup
GET /api/database/backup?format=sql
```

- Tanpa `format=sql`, respons berupa `.sql.gz`.
- Dengan `format=sql`, respons berupa `.sql`.
- Simpan file di direktori backup dengan permission ketat, lalu buat checksum.

Operasi ini mencatat audit `database.backup` **setelah** backup berhasil.
Kegagalan tidak menghasilkan audit sukses. Implementasi saat ini mengisi
`ipAddress`/`userAgent` audit dengan `null` untuk backup/restore; jangan
mengandalkan audit aplikasi sebagai satu-satunya catatan akses operator.

Karena tidak ada UI dan endpoint menampung dump di memori, untuk production
lebih aman memakai backup CLI di bawah, kecuali database kecil dan kebutuhan
audit aplikasi eksplisit.

## 4. Backup CLI database

### 4.1 Siapkan file kredensial

Jangan menaruh password di command line. Buat file khusus root:

```bash
sudo install -d -m 700 /etc/appdes
sudo install -m 600 /dev/null /etc/appdes/mysql-backup.cnf
sudoedit /etc/appdes/mysql-backup.cnf
```

Isi (placeholder, ganti dengan credential nyata):

```ini
[client]
user=sid_app
password=GANTI_PASSWORD_APP
host=127.0.0.1
port=3306
```

Contoh memakai `sid_app` karena user tersebut diberi hak dump pada [DATABASE.md](./DATABASE.md). Jika Anda membuat user backup terpisah, berikan hanya hak yang dibutuhkan dan sesuaikan nama user. File ini harus hanya dapat dibaca root.

### 4.2 Buat backup

```bash
set -o pipefail
umask 077

BACKUP_DIR=/var/backups/appdes
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DB=sid_production

sudo install -d -m 700 -o root -g root "$BACKUP_DIR"

mysqldump \
  --defaults-extra-file=/etc/appdes/mysql-backup.cnf \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --hex-blob \
  "$DB" | gzip -9 > "$BACKUP_DIR/db-$STAMP.sql.gz"

gzip -t "$BACKUP_DIR/db-$STAMP.sql.gz"
sha256sum "$BACKUP_DIR/db-$STAMP.sql.gz" \
  > "$BACKUP_DIR/db-$STAMP.sql.gz.sha256"
```

Periksa exit code setiap tahap. `set -o pipefail` penting agar kegagalan
`mysqldump` tidak tersembunyi oleh `gzip`.

`mysqldump` secara default dapat menyertakan `DROP TABLE` sebelum membuat ulang
tabel. Perlakukan dump sebagai operasi yang **menimpa** objek, bukan menambah
data. Uji di staging.

### 4.3 Apa yang harus dibackup bersamaan

Backup database saja tidak cukup untuk pemulihan penuh. Buat paket:

1. `db-<stamp>.sql.gz` + checksum;
2. `media-<stamp>.tar.gz` + checksum;
3. manifest yang mencatat commit aplikasi, waktu, ukuran, dan checksum;
4. konfigurasi `.env` di penyimpanan secret terenkripsi **terpisah**;
5. sesi WhatsApp di penyimpanan terenkripsi terpisah, atau catat bahwa sesi
   akan dipasangkan ulang.

Jangan menggabungkan `.env` ke arsip media yang disimpan di lokasi kurang aman.

## 5. Backup media

Media berada di `storage/media/<villageId>/<kategori>/`. Direktori ini harus
persisten. Backup harus konsisten dengan database: file yang tercatat di DB
harus berasal dari titik waktu yang sama atau cukup dekat.

Pilihan konsistensi:

- hentikan aplikasi saat backup (paling sederhana untuk instalasi kecil);
- gunakan snapshot filesystem/volume yang mendukung konsistensi;
- koordinasikan backup DB dan media dalam jendela pemeliharaan.

Contoh backup media (aplikasi sebaiknya dihentikan atau dalam mode baca):

```bash
set -o pipefail
umask 077

APP_DIR=/opt/appdes/app
BACKUP_DIR=/var/backups/appdes
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

tar -C "$APP_DIR" -czf "$BACKUP_DIR/media-$STAMP.tar.gz" storage/media
sha256sum "$BACKUP_DIR/media-$STAMP.tar.gz" \
  > "$BACKUP_DIR/media-$STAMP.tar.gz.sha256"
```

Periksa isi arsip sebelum menganggap backup sah:

```bash
tar -tzf "$BACKUP_DIR/media-$STAMP.tar.gz" | head -30
```

Jangan memakai `--absolute-names`; arsip harus berisi jalur relatif agar dapat
dipulihkan ke direktori aplikasi.

## 6. Prosedur restore

### 6.1 Pra-pemeriksaan wajib

- [ ] Sudah ada persetujuan restore dan jendela pemeliharaan.
- [ ] Target host dan nama database sudah diverifikasi, bukan database lain.
- [ ] Backup pre-restore database dan media sudah dibuat.
- [ ] Checksum dump diverifikasi.
- [ ] `gzip -t` berhasil untuk dump terkompresi.
- [ ] Dump diuji di staging dengan skema/versi aplikasi yang sesuai.
- [ ] Aplikasi dihentikan atau dalam maintenance mode.
- [ ] Lokasi media yang akan dipulihkan sudah disiapkan.
- [ ] Rencana rollback tersedia.

### 6.2 Restore database via CLI

Siapkan file kredensial restore terpisah dari file backup. Gunakan user dengan
hak DDL/restore, dan hapus file ini setelah operasi selesai.

```bash
sudo install -d -m 700 /etc/appdes
sudo install -m 600 /dev/null /etc/appdes/mysql-restore.cnf
sudoedit /etc/appdes/mysql-restore.cnf
```

```ini
[client]
user=sid_migrator
password=GANTI_PASSWORD_MIGRATOR
host=127.0.0.1
port=3306
```

Contoh untuk dump `.sql.gz`. **Perintah ini menimpa objek di database target.**

```bash
set -o pipefail
sudo systemctl stop appdes

# 1. Backup keadaan sekarang sebelum menimpa.
mysqldump \
  --defaults-extra-file=/etc/appdes/mysql-backup.cnf \
  --single-transaction --routines --triggers --events --hex-blob \
  sid_production | gzip -9 > /var/backups/appdes/pre-restore-$(date -u +%Y%m%dT%H%M%SZ).sql.gz

# 2. Verifikasi dump yang akan dipulihkan.
gzip -t /var/backups/appdes/db-20260101T000000Z.sql.gz
sha256sum -c /var/backups/appdes/db-20260101T000000Z.sql.gz.sha256

# 3. Restore ke database target.
gunzip -c /var/backups/appdes/db-20260101T000000Z.sql.gz \
  | mysql --defaults-extra-file=/etc/appdes/mysql-restore.cnf sid_production
```

`mysql-restore.cnf` harus memakai user dengan hak DDL/restore, file `600`, dan
hanya tersedia selama operasi. Jangan memakai user runtime aplikasi untuk
restore manual jika user tersebut sengaja dibatasi.

Untuk dump `.sql` tidak terkompresi:

```bash
mysql --defaults-extra-file=/etc/appdes/mysql-restore.cnf \
  sid_production < /var/backups/appdes/db-20260101T000000Z.sql
```

### 6.3 Restore media

Restore media **setelah** database pada titik waktu yang sama, atau sebelum
aplikasi menerima traffic:

```bash
sudo systemctl stop appdes
sudo tar -C /opt/appdes/app -xzf /var/backups/appdes/media-20260101T000000Z.tar.gz
sudo chown -R appdes:appdes /opt/appdes/app/storage/media
sudo chmod -R u=rwX,g=,o= /opt/appdes/app/storage/media
```

Perintah `chmod` di atas adalah contoh pembatasan; sesuaikan dengan kebutuhan
penyajian media publik. Yang penting: proses aplikasi harus dapat membaca file,
dan direktori tidak boleh dapat ditulis oleh user lain.

### 6.4 Restore via endpoint aplikasi

Gunakan hanya bila:

- Anda benar-benar Platform Super Admin;
- user database pada `DATABASE_URL` memiliki hak restore;
- dump berasal dari sumber tepercaya;
- backup pre-restore sudah dibuat;
- media akan dipulihkan terpisah.

Kontrak permintaan:

```text
POST /api/database/restore
Content-Type: multipart/form-data; boundary=...
Content-Length: <wajib>

konfirmasi=1
berkas=@backup.sql.gz
```

Halaman UI untuk operasi ini belum tersedia. Jangan menganggap redirect
`/pengaturan/database?restored=1` sebagai bukti halaman ada; redirect hanya
menunjukkan handler selesai.

### 6.5 Verifikasi setelah restore

1. **Tabel wajib:**
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
   Harus ada tujuh baris.
2. **Jumlah data dasar:** bandingkan jumlah `villages`, `users`, dan tabel
   transaksi utama dengan manifest backup. Jangan hanya melihat "query berhasil".
3. **Tenant/domain:** pastikan `villages` dan `village_domains` sesuai; uji
   host tenant yang benar dan host asing.
4. **Media:** buka beberapa file contoh dari kategori publik dan privat; pastikan
   file ada dan ukurannya wajar.
5. **Aplikasi:** jalankan service, cek `/api/publik/openapi`, lalu uji login
   **hanya jika bootstrap/akun sudah tersedia**.
6. **Audit:** pastikan event restore tercatat jika memakai endpoint aplikasi.
7. **Log:** tidak ada error koneksi, migrasi, atau file hilang yang berulang.

## 7. Recovery jika restore gagal

Jangan langsung mengulang restore atau menjalankan `DROP DATABASE`.

1. Hentikan aplikasi dan hentikan semua penulisan.
2. Simpan dump yang gagal, log `mysql`, dan output error; jangan menimpanya.
3. Tentukan apakah kegagalan terjadi sebelum atau sesudah objek berubah.
4. Pulihkan backup **pre-restore** yang dibuat pada langkah 6.1.
5. Jika backup pre-restore juga bermasalah, gunakan backup terakhir yang sudah
   diverifikasi dan catat kehilangan data yang terjadi.
6. Pulihkan media dari snapshot yang cocok, bukan dari waktu yang berbeda tanpa
   pemeriksaan.
7. Jalankan verifikasi bagian 6.5 sebelum membuka akses.
8. Buat laporan insiden: waktu, operator, perintah, error, data yang hilang, dan
   tindakan pencegahan.

Jika database tidak dapat dipulihkan, hubungi pemilik data/maintainer. Jangan
mencoba memperbaiki data production secara manual tanpa backup dan persetujuan.

## 8. Audit dan retensi

- Audit aplikasi mencatat `database.backup` dan `database.restore` setelah
  operasi berhasil.
- Operasi backup/restore manual di luar aplikasi tidak otomatis masuk audit
  aplikasi. Catat di log operasi/change ticket.
- Audit aplikasi saat ini tidak mengisi IP/user agent untuk backup/restore;
  lengkapi dengan log akses server dan audit MySQL.
- Simpan backup terenkripsi dengan retensi yang disetujui. Jangan menyimpan
  backup berisi data pribadi tanpa kontrol akses dan masa retensi.
- Uji restore minimal berkala di staging. Repository belum menetapkan RPO/RTO;
  nilai tersebut harus ditetapkan dan diukur oleh operator.

## 9. Checklist backup/restore

- [ ] Backup database berhasil dan exit code 0.
- [ ] `gzip -t` dan checksum berhasil.
- [ ] Media ikut dibackup pada titik waktu yang konsisten.
- [ ] Backup disimpan offsite dan terenkripsi.
- [ ] Restore diuji di database disposable/staging.
- [ ] Tabel wajib, jumlah data, domain, media, dan login diverifikasi.
- [ ] Backup pre-restore dibuat sebelum restore production.
- [ ] Audit/change ticket mencatat operator dan hasil.
- [ ] Tidak ada secret di arsip backup umum atau laporan.
