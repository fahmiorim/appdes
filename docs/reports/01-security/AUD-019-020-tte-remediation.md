# Remediation AUD-019/020 — TTE Provider Security (R-11 & R-12)

- **Task:** Remediation temuan R-11 (trusted provider allowlist) dan R-12 (DNS deadline) pada integrasi TTE/BSrE, plus F-01 s.d. F-08.
- **Tanggal:** 2026-11-12
- **Branch:** `task/AUD-019-020-tte-remediation`
- **Base commit:** `08798621143a1ac8a7df1dece7bdd51fb42cfe98` (branch `task/AUD-019-020-tte-security`)
- **Commit implementasi:** `ff2ea04aa7787f5f786561cd5d1bd1fac248b8aa`
- **Commit laporan:** commit yang memuat file ini (lihat `git log -1` pada branch).
- **Lingkungan uji:** Windows, Node.js v26.2.0, database tidak dipakai.

## 1. Kondisi awal dan analisis

Independent review sebelumnya (`docs/reports/01-security/AUD-019-020-independent-review.md`,
masih untracked dan tidak di-commit pada task ini) menemukan:

- **R-11:** `validasiUrlProvider()` hanya memeriksa HTTPS dan alamat publik. `gabungKonfigTte()` membuat `api` milik tenant menang atas environment, sedangkan `TTE_PASSWORD` bersifat platform-wide. Tidak ada allowlist provider.
- **R-12:** `validasiUrlProvider()` (termasuk DNS) dipanggil **sebelum** `AbortSignal.timeout()` dibuat. Resolver `dns.lookup` tidak dapat dibatalkan; probe menunjukkan operasi 100 ms masih menggantung 615 ms.
- **F-02:** retry dilakukan untuk semua kegagalan transport, termasuk kegagalan TLS permanen (kredensial terkirim ulang).
- **F-03:** error `aborted` mentah dari pembacaan body dapat muncul di `HasilTte.alasan`.
- **F-05:** komentar `src/lib/env.ts`, `.env.example`, dan komentar use case menyebut halaman `/persuratan/tte` yang tidak ada.
- **F-01, F-04, F-06, F-07, F-08:** lihat bagian status.

Pendekatan remediation: menegakkan kebijakan platform di choke point runtime (bukan UI), memakai
`dns.Resolver` (c-ares) yang menyediakan `cancel()` agar deadline benar-benar menghentikan query,
dan membatasi konkurensi resolusi.

## 2. File yang diperiksa

- `src/features/surat/domain/tte.ts`, `tte-jaringan.ts`, `tte-alamat.ts`
- `src/features/surat/infrastructure/tte-https.ts`, `tte-repository.ts`
- `src/features/surat/application/tte-use-cases.ts`, `surat-use-cases.ts`
- `src/app/api/eksternal/tte/tanda-tangan/route.ts`
- `src/lib/env.ts`, `src/lib/dal.ts`, `src/lib/errors.ts`
- `src/features/desa/application/resolve-village.ts`, `src/features/rbac/application/authorization.ts`
- `.env.example`
- Test: `tte.test.ts`, `tte-jaringan.test.ts`, `tte-server.test.ts`, `tte-alamat.test.ts`

## 3. File yang diubah

| File | Alasan |
| --- | --- |
| `src/features/surat/domain/tte-jaringan.ts` | Parser allowlist, pencocokan exact host+port, penegakan di `validasiUrlProvider` sebelum DNS, sinyal untuk resolver. |
| `src/features/surat/domain/tte.ts` | Deadline dibuat sebelum validasi/DNS, retry hanya untuk error transien, pesan body yang dihentikan digeneralisasi, `masalahKonfigTte` sadar allowlist, komentar failover F-01. |
| `src/features/surat/infrastructure/tte-https.ts` | Resolver `dns.Resolver` yang dapat dibatalkan, penjaga konkurensi, pembersihan listener/query, `buatKlienBsreNode` wajib allowlist. |
| `src/features/surat/application/tte-use-cases.ts` | Meneruskan allowlist ke validasi runtime, menolak simpan konfigurasi di luar allowlist, memperbaiki komentar F-05. |
| `src/lib/env.ts`, `.env.example` | Dokumentasi `TTE_ALLOWED_HOSTS` dan koreksi referensi `/persuratan/tte`. |
| `src/features/surat/domain/tte-jaringan.test.ts` | Regression test R-11 (parser, exact match, port, trailing dot, fail-closed, sebelum DNS). |
| `src/features/surat/domain/tte.test.ts` | Regression test R-11/R-12/F-02/F-03 pada klien dan `testKoneksi`. |
| `src/features/surat/domain/tte-server.test.ts` | Menyesuaikan dependensi wajib `allowedHosts` (uji TLS lokal). |
| `src/features/surat/infrastructure/tte-https.test.ts` | Test terisolasi penjaga konkurensi dan resolver dengan sinyal sudah aktif. |

Tidak ada perubahan skema, migration, route, UI, atau dependency.

## 4. R-11 — Trusted provider allowlist

### Penyebab

Tidak ada allowlist. URL provider berasal dari konfigurasi tenant (menang atas env) dan kredensial
Basic Auth + passphrase berlaku untuk semua desa, sehingga host HTTPS publik mana pun yang lolos
pemeriksaan "alamat publik" dapat menerima kredensial, NIK, dan PDF surat.

### Perubahan

- `parseAllowlistProvider()` (`tte-jaringan.ts:94`) mengurai `TTE_ALLOWED_HOSTS`:
  - daftar dipisah koma/whitespace; entri `host` berarti port 443, atau `host:port`;
  - hostname dinormalisasi (lowercase, trailing dot dibuang), IPv6 literal `[...]` didukung;
  - menolak wildcard, path, query, fragment, userinfo, port 0, dan skema selain HTTPS;
  - **satu entri tidak sah menggagalkan seluruh allowlist** (fail-closed) dan pesan tidak memuat
    nilai mentah (aman bila operator keliru menempel kredensial).
- `urlDiizinkan()` mencocokkan `${hostname}:${port}` secara exact — bukan suffix/substring.
- `validasiUrlProvider()` (`tte-jaringan.ts:225`) memeriksa allowlist **sebelum** resolusi DNS dan
  sebelum alamat dipakai; allowlist kosong berarti semua provider ditolak.
- `DependensiTte.allowedHosts` wajib, sehingga pemanggil tidak dapat "lupa" mengaktifkan kebijakan.
- Jalur simpan `simpanKonfigurasiTteData()` (`tte-use-cases.ts:94-114`) menolak (HTTP 422) host di
  luar allowlist atau allowlist yang belum diatur, selain validasi runtime.
- `masalahKonfigTte(..., { allowedHosts })` memberi umpan balik admin tanpa mengubah aturan runtime.
- Tenant tidak memiliki jalur untuk menambah host: allowlist hanya dibaca dari `process.env`.

### Bukti regression test

`src/features/surat/domain/tte-jaringan.test.ts`:

1. Host tepat terdaftar diterima.
2. Host HTTPS publik tidak terdaftar ditolak.
3. Suffix/host mirip (`tte.example.go.id.evil.com`, `evil-tte.example.go.id`, `sub.tte.example.go.id`, `tteexample.go.id`) ditolak.
4. Trailing dot pada URL dan entri dinormalisasi (diterima).
5. Port tidak diizinkan ditolak; port nonstandar diterima hanya bila tercantum eksplisit.
6. Allowlist kosong menolak semua provider.
7. Allowlist tidak sah (path/userinfo/wildcard/port 0/skema salah) menolak semua provider.
8. Host dari konfigurasi tenant tidak menambah allowlist.
9. Host ditolak sebelum resolver dipanggil (`hitung.n === 0`).
10. Kredensial tidak dikirim: `tte.test.ts` membuktikan resolver dan transport tidak dipanggil saat host di luar allowlist.

Test parser juga memastikan pesan masalah tidak memuat nilai mentah yang mungkin berisi kredensial.

## 5. R-12 — DNS resolution deadline

### Penyebab

`AbortSignal.timeout()` dibuat setelah `validasiUrlProvider()` selesai, sehingga fase DNS berada di
luar deadline. `dns.lookup` tidak dapat dibatalkan; resolver yang menggantung memperpanjang operasi
jauh melewati batas (615 ms pada probe dengan timeout 100 ms).

### Perubahan

- Deadline dibuat **sebelum** validasi URL/DNS di `buatKlienBsre` (`tte.ts:500-502`) dan
  `testKoneksi` (`tte.ts:620`), lalu diteruskan sebagai `signal` ke `validasiUrlProvider` dan resolver.
- `ResolverDns` menerima `signal`; implementasi produksi (`tte-https.ts:158`) memakai
  `dns.Resolver` (c-ares) dan memanggil `resolver.cancel()` saat abort (`:173`, `:190`) sehingga
  query benar-benar dihentikan, bukan hanya ditinggalkan (`Promise.race` tanpa pembatalan).
- `buatPenjagaKonkurensi()` (`tte-https.ts:128`) membatasi resolusi bersamaan (default 8) dan
  melepas slot di `finally`; permintaan berlebih ditolak cepat, bukan menumpuk antrean.
- Listener abort dilepas dan query dibatalkan di `finally` untuk semua jalur (sukses/gagal/timeout).
- Domain memetakan kegagalan resolver setelah abort menjadi "batas waktu", bukan
  "tidak dapat diresolusi" (`tte-jaringan.ts:236-242`), dan tidak memulai request HTTP setelah itu.
- Tidak ada timeout baru setelah fase DNS; retry, jeda backoff, unduhan, dan pembacaan body memakai
  sinyal yang sama.

### Bukti regression test

- Resolver yang menggantung dengan timeout 100 ms → ditolak "batas waktu" < 1 detik, transport 0 panggilan.
- Satu deadline mencakup DNS (80 ms) dan request HTTP yang menggantung (timeout 120 ms).
- Timeout tidak diperpanjang retry (test lama 5xx tetap 1 percobaan; test baru memastikan total < 1 detik).
- `testKoneksi` dengan resolver menggantung mengembalikan `{ ok: false, pesan: "Koneksi timeout." }`.
- Body respons yang menggantung tetap dihentikan (test lama 194 ms) dan pesan mentah diganti.
- Resolver normal tetap berhasil (test lama `tte.test.ts`, `tte-server.test.ts`).
- Penjaga konkurensi: batas tercapai → ditolak; slot dilepas setelah sukses/gagal; batas tidak sah ditolak.
- Resolver dengan sinyal sudah aktif langsung berhenti tanpa query DNS.

## 6. Status temuan tambahan

| ID | Status | Keterangan |
| --- | --- | --- |
| F-01 DNS failover | **DEFERRED** | Hanya alamat pertama dipakai; seluruh alamat tetap divalidasi publik, tidak ada fallback ke alamat tak tervalidasi. Didokumentasikan di `tte.ts` (`alamatTujuan`). |
| F-02 Retry TLS | **FIXED** | Retry hanya untuk `ECONNRESET`, `ECONNABORTED`, `ETIMEDOUT`, `EPIPE`, `EAI_AGAIN`; kegagalan TLS/sertifikat tidak diulang. Test: TLS 1 panggilan, `ECONNRESET` diulang. |
| F-03 Error aborted | **FIXED** | `bacaBody()` mengganti `aborted`/sinyal aktif dengan "Permintaan TTE melewati batas waktu." |
| F-04 Port bebas | **FIXED** | Kebijakan port menyatu dengan allowlist: default 443, port lain hanya bila tercantum `host:port`. |
| F-05 Dokumentasi/dead code | **FIXED (dokumentasi)** | Komentar `/persuratan/tte` di `env.ts`, `.env.example`, dan use case dikoreksi; dead code tidak dihapus/diaktifkan karena UI di luar scope. |
| F-06 Multipart memory | **DEFERRED** | Multipart masih dibangun penuh di memori. Tidak diubah agar tidak memperluas desain streaming; perlu diukur ulang bila ukuran PDF maksimum naik. |
| F-07 IP non-kanonik | **NOT APPLICABLE** | URL menkanonikalisasi bentuk seperti `2130706433`/`0177.0.0.1` menjadi `127.0.0.1` sebelum klasifikasi; test lama membuktikannya. |
| F-08 testKoneksi | **NOT APPLICABLE / termitigasi** | Empat endpoint tetap dicoba, tetapi hanya pada provider yang sudah lolos allowlist, origin sama, alamat ter-pin, dan kredensial yang sama. Tidak ada endpoint di luar allowlist. |

## 7. Quality gates

| Perintah | Hasil | Bukti |
| --- | --- | --- |
| `npm run format:check` | **PASS** | "All matched files use Prettier code style!" (setelah `prettier --write` pada 5 file yang diubah) |
| `npm run typecheck` | **PASS** | `next typegen && tsc --noEmit`, exit 0 |
| `npm run lint` | **PASS** | `eslint .`, exit 0, tanpa output |
| `npm run test:unit` | **PASS** | 187 file, 1695 test lulus |
| `npx vitest run` (5 file TTE) | **PASS** | 185 test lulus |
| `npm run build` | **PASS** | `next build` selesai, exit 0 |
| `npm run test:integration` | **SKIPPED** | Tidak dijalankan: membutuhkan database uji disposable; tidak ada perubahan skema/DB pada task ini. |
| Uji ke provider BSrE nyata | **SKIPPED** | Dilarang oleh instruksi; seluruh uji memakai resolver palsu/server TLS lokal. |

## 8. Risiko yang masih tersisa

1. `dns.Resolver` (c-ares) tidak memakai resolver sistem/hosts file. Provider yang hanya dapat
   diresolusi lewat `/etc/hosts` akan gagal (fail-closed). Ini konsekuensi yang dipilih agar query
   dapat dibatalkan; perlu dicatat di runbook deployment.
2. F-01 (failover antar alamat) dan F-06 (multipart di memori) masih deferred.
3. Bila lebih dari 8 resolusi berjalan bersamaan, permintaan berikutnya ditolak dengan pesan domain
   generik "tidak dapat diresolusi"; tidak ada antrean.
4. Konfigurasi tenant lama yang tidak cocok dengan allowlist akan gagal sampai diperbaiki. Tidak ada
   migration data; pesan masalah tersedia lewat `getKonfigurasiTtePageData()`, tetapi UI-nya belum ada.
5. `Resolver.cancel()` diuji pada Node 26.2.0; perilaku pada versi minimum yang didukung repo belum
   dijalankan.
6. Tidak ada verifikasi terhadap perilaku BSrE produksi (sertifikat, endpoint, kontrak multipart).
7. Seluruh uji R-12 memakai resolver palsu; tidak ada uji integrasi DNS nyata yang menggantung.

## 9. Apakah jalur konfigurasi TTE aman diaktifkan?

Secara runtime: **ya, dengan syarat platform mengisi `TTE_ALLOWED_HOSTS`**. Tanpa allowlist, semua
provider ditolak (fail-closed), sehingga TTE tidak akan mengirim kredensial ke mana pun. Jalur simpan
konfigurasi juga menolak host di luar allowlist di server.

Namun jalur konfigurasi belum dapat diuji end-to-end karena route/halaman admin TTE belum ada di
repo. Sebelum mengaktifkan: isi `TTE_ALLOWED_HOSTS` dengan host provider resmi (jangan mengarang
hostname), periksa konfigurasi desa yang sudah tersimpan, dan lakukan uji `testKoneksi()` pada
lingkungan non-produksi.

## 10. Konfirmasi tidak ada akses BSrE produksi

Seluruh pengujian memakai:
- resolver palsu (tidak ada query DNS eksternal);
- server TLS lokal dengan sertifikat fixture `src/testing/fixtures/tte-lokal`;
- transport palsu untuk pengujian domain.

Tidak ada request ke endpoint BSrE, kredensial asli, IP internal, atau metadata cloud. Tidak ada
secret/NIK asli yang ditambahkan ke kode, test, laporan, atau log.

## 11. Kesimpulan

R-11 dan R-12 telah diperbaiki beserta regression test yang mencakup seluruh skenario wajib. F-02,
F-03, F-04, dan F-05 diperbaiki; F-01 dan F-06 didokumentasikan sebagai deferred; F-07 dan F-08
dinilai tidak memerlukan perubahan. Kontrol keamanan sebelumnya (DNS pinning, SNI/host, verifikasi
TLS, redirect ditolak, Authorization same-origin, batas ukuran, validasi IPv4/IPv6) tidak berubah
dan tetap diuji.

**Status: siap review.** Tidak ada PR, merge, atau deploy.
