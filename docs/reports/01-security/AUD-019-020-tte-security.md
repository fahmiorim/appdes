# AUD-019/AUD-020 — Remediasi SSRF dan hardening klien TTE

- **Task:** Menutup SSRF pada base URL TTE, memperbaiki R-02 s/d R-09, dan memperbarui test.
- **Tanggal:** 2026-11-12
- **Branch:** `task/AUD-019-020-tte-security`
- **Base commit:** `d6f2a615d6a471b427ad35393250ba87f2aa3e05`
- **Commit implementasi:** `5db38556362a8fcc0fc5e7710a30d6760cf842ce`
- **Status:** Siap review — belum di-merge, belum di-deploy. Risiko tersisa dicatat di bawah.

## Kondisi awal

Implementasi sebelumnya (`cfaf1e9`, `3608b03`, `ed1fb93`) sudah menolak URL unduhan lintas
origin, tidak mengikuti redirect, dan tidak lagi menerima `TTE_SSL=false`. Namun:

1. Base URL TTE masih dapat menunjuk `127.0.0.1`, `10/8`, `169.254.169.254`, atau hostname yang
   resolve ke alamat internal — SSRF ke jaringan internal/metadata cloud masih terbuka.
2. Origin check saja tidak mencegah DNS rebinding: `fetch` melakukan resolusi sendiri setelah
   validasi, sehingga alamat yang dihubungi bisa berbeda dari alamat yang diperiksa.
3. Pesan galat provider (status HTTP, kode jaringan, host internal) dikembalikan ke pemanggil API.
4. Tidak ada batas ukuran respons, tidak ada batas waktu total (retry dan unduhan tidak dibatasi),
   validasi form berbeda dari validasi runtime, dan path prefix base URL terbuang.
5. Field `ssl` masih ada di tipe/form/env, timer `testKoneksi` per-endpoint tidak dibersihkan,
   dan `Promise.withResolvers` menuntut Node lebih baru daripada `engines >=20.9.0`.

Baseline terukur sebelum perubahan: `format:check` gagal pada 2 file, `test:unit` gagal 2 test
(`tte-server.test.ts` memakai `http://127.0.0.1`), typecheck/lint/build lulus.

## Analisis dan pendekatan

- **Pinning nyata, bukan solusi semu.** `fetch`/undici tidak menyediakan cara aman memakai alamat
  hasil validasi tanpa dependency baru. Transport karena itu memakai `node:https` dengan
  `lookup` kustom dan `autoSelectFamily: false`, sehingga koneksi menuju alamat yang sudah
  divalidasi, sementara SNI dan verifikasi sertifikat tetap memakai hostname provider.
  Perilaku ini diverifikasi probe terisolasi sebelum implementasi: `lookup` tanpa
  `autoSelectFamily: false` menghasilkan `ERR_INVALID_IP_ADDRESS`, dan hostname yang tidak cocok
  tetap gagal dengan `ERR_TLS_CERT_ALTNAME_INVALID`.
- **Satu resolusi per operasi.** Alamat hasil `validasiUrlProvider` dipakai ulang untuk unduhan
  berkas; URL berkas hanya divalidasi origin/protokol, tanpa resolusi DNS kedua.
- **Batas waktu total.** `config.timeout` kini berarti batas waktu satu operasi (default 30s,
  maksimum 5 menit) yang juga membatalkan jeda retry dan unduhan.
- **Lapisan domain tetap murni.** Domain tidak mengimpor modul Node I/O; transport dan resolver
  disuntikkan, implementasi Node berada di `infrastructure/`.

## File yang diperiksa

- `src/features/surat/domain/tte.ts`, `tte.test.ts`, `tte-server.test.ts`
- `src/features/surat/application/tte-use-cases.ts` dan seluruh pemanggilnya
- `src/app/api/eksternal/tte/tanda-tangan/route.ts` + test
- `src/features/surat/infrastructure/tte-repository.ts` (skema tersimpan)
- `src/lib/env.ts`, `.env.example`, `package.json` (`engines`), `next.config.ts`
- Dokumen: `AGENTS.md`, `docs/TECHNICAL_AUDIT.md`, laporan validasi pra-remediasi

## File yang diubah

| File | Alasan |
| --- | --- |
| `src/features/surat/domain/tte-alamat.ts` (baru) | Klasifikasi IPv4/IPv6 murni: loopback, private, link-local, CGNAT, multicast, reserved, dokumentasi, benchmark, metadata, IPv4-mapped/NAT64, serta hostname internal. |
| `src/features/surat/domain/tte-jaringan.ts` (baru) | Kebijakan URL provider (statis + DNS), validasi URL berkas same-origin, tipe transport/resolver. |
| `src/features/surat/infrastructure/tte-https.ts` (baru) | Transport HTTPS ter-pin (`lookup` + `autoSelectFamily:false`, SNI, verifikasi aktif, batas byte), resolver `dns.lookup(all:true)`, `buatKlienBsreNode`. |
| `src/features/surat/domain/tte.ts` | `ssl` dihapus, deadline total, batas respons PDF 20 MB / JSON 1 MB, path prefix dipertahankan, `masalahKonfigTte` memakai aturan URL bersama, `testKoneksi` memakai satu sinyal, `Promise.withResolvers` dihapus. |
| `src/features/surat/application/tte-use-cases.ts` | Berhenti meneruskan `ssl`; memakai `buatKlienBsreNode`. |
| `src/app/api/eksternal/tte/tanda-tangan/route.ts` | 422 generik; detail hanya ke log server; audit tetap dicatat. |
| `src/lib/env.ts` | `TTE_SSL` dihapus dari skema env (tidak lagi dibaca; skema tidak strict sehingga aman untuk deployment lama). |
| `.env.example` | Baris `TTE_SSL=true` diganti catatan bahwa verifikasi TLS selalu aktif. |
| `.gitignore` | Pengecualian `!src/testing/fixtures/tte-lokal/*.pem` untuk sertifikat uji (bukan secret). |
| `src/testing/fixtures/tte-lokal/` (baru) | Sertifikat self-signed `provider.test`/`127.0.0.1` + README; hanya dipakai lewat opsi `ca` pada test. |
| `src/features/surat/domain/tte-alamat.test.ts`, `tte-jaringan.test.ts` (baru), `tte.test.ts`, `tte-server.test.ts`, route test | Cakupan test baru sesuai daftar di bawah. |

## Perubahan (pemetaan temuan)

- **R-01 / SSRF:** IP literal divalidasi sebelum request; seluruh record A/AAAA harus publik, satu
  alamat internal menggagalkan operasi; koneksi memakai alamat tervalidasi (pin) sehingga tidak ada
  resolusi kedua; transport menolak tujuan yang bukan IP.
- **R-02:** API eksternal hanya menerima `422 "Tanda tangan elektronik tidak dapat diproses."`;
  detail (`HTTP n`, `ECONNREFUSED`, alamat internal) dicatat ke log server bersama `villageId`.
- **R-03:** body PDF dibatasi `BATAS_RESPONS_PDF` (20 MB), metadata JSON `BATAS_RESPONS_JSON` (1 MB);
  transport menghentikan stream dan melempar saat melewati batas.
- **R-04:** `AbortSignal.timeout(batasWaktuOperasi(config))` membatalkan retry, jeda backoff, dan
  unduhan; timeout tidak wajar jatuh ke default 30s dan dibatasi 5 menit.
- **R-05:** `periksaUrlProviderStatis` dipakai bersama oleh `masalahKonfigTte`, `konfigTteFormSchema`,
  dan runtime, sehingga form menolak HTTP, kredensial, query/fragment, IP/host internal yang sama.
- **R-06:** base URL dinormalisasi dengan trailing slash; `api = https://host/bsre` menghasilkan
  `https://host/bsre/api/sign/pdf` dan unduhan relatif `https://host/bsre/unduh/...`.
- **R-07:** `ssl` hilang dari `KonfigTte`, form, env, dan serialisasi; baris `tte_config` lama yang
  masih memuat `ssl` tetap terbaca (opsional di `konfigTteTersimpanSchema`) dan nilainya diabaikan.
- **R-08:** `testKoneksi` memakai satu `AbortSignal.timeout` untuk seluruh endpoint dan fallback;
  tidak ada timer per-endpoint yang tertinggal, dan abort langsung menghasilkan `Koneksi timeout.`.
- **R-09:** tidak ada lagi `Promise.withResolvers`; `AbortSignal.timeout` dan `autoSelectFamily`
  tersedia pada Node `>=20.9.0`. `autoSelectFamily` belum dideklarasikan `@types/node` proyek,
  sehingga ditipekan lewat antarmuka lokal di infrastructure (opsi runtime tetap dipakai).

## Security/tenant

- Tidak ada input klien baru yang dipakai sebagai bukti otorisasi; `villageId` tetap dari API key
  dan konfigurasi desa tetap dibaca dari `tte_config` milik tenant.
- Kredensial provider hanya dikirim ke endpoint origin provider; URL unduhan lintas origin ditolak
  sebelum permintaan kedua, sehingga Authorization tidak pernah dikirim ke origin lain.
- Redirect tidak diikuti (`3xx` langsung gagal), mencegah pivot ke host lain.
- Verifikasi sertifikat TLS tidak dapat dimatikan lewat env, konfigurasi desa, maupun kode
  transport; SNI memakai hostname provider.
- Detail kegagalan tidak lagi keluar lewat API; audit `externalTteSign` tetap mencatat hasil.
- Fixture TLS adalah sertifikat uji yang didokumentasikan sebagai bukan secret dan tidak memberi
  akses ke sistem/akun mana pun.
- Negative test lintas tenant tidak berubah karena route TTE eksternal memakai `villageId` dari API
  key; test route memverifikasi `villageId` tidak berasal dari body.

## Test dan pemeriksaan

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run format:check` | **PASS** (sebelumnya FAIL 2 file) |
| `npm run test:unit` | **PASS** — 186 file, 1657 test (sebelumnya 184 file, 1540 test, 2 FAIL) |
| `npm run build` | **PASS** |
| `npx vitest run src/features/surat/domain/tte*.test.ts src/app/api/eksternal/tte/tanda-tangan/route.test.ts` | **PASS** — 5 file, 152 test |
| `npm run test:integration` | **SKIPPED** — perubahan tidak menyentuh database/schema; butuh DB test disposable yang tidak disiapkan di sesi ini |
| Uji ke server BSrE resmi/staging | **SKIPPED** — dilarang oleh instruksi task |

Cakupan test yang diminta:

- IPv4 dan IPv6: 18 rentang IPv4 terlarang, rentang IPv6 (loopback, ULA, link-local, multicast,
  Teredo, 6to4, dokumentasi, ORCHID, NAT64), bentuk bertanda kurung, zone id.
- DNS multi-record: semua publik diterima; satu record privat/non-IP menggagalkan seluruh operasi;
  resolver gagal/kosong ditolak.
- DNS rebinding: resolver dipanggil tepat sekali; alamat untuk permintaan tanda tangan dan unduhan
  adalah objek hasil validasi yang sama; transport menerima alamat (bukan hostname).
- Redirect dan origin: `302` ditolak tanpa permintaan kedua; URL absolut/protokol-relatif/HTTP/
  berkredensial lintas origin ditolak; Authorization hanya dikirim ke origin provider.
- Batas ukuran respons: batas JSON dan PDF diperiksa berbeda, dan kegagalan batas diteruskan.
- Total deadline: operasi yang menggantung dan retry 5xx sama-sama berhenti oleh batas waktu total
  (tanpa jeda retry berlarut).
- Path prefix: base dengan dan tanpa trailing slash, endpoint dan unduhan relatif.
- HTTPS lokal: server HTTPS `127.0.0.1` dengan CA uji; SNI `provider.test` terkirim, pinning bekerja,
  hostname salah tetap ditolak (`ERR_TLS_CERT_ALTNAME_INVALID`), verifikasi tidak dimatikan global.
- R-02: respons 422 tidak memuat kode/alamat internal, tetapi log server memuatnya.

## Diff

17 file berubah pada commit implementasi: 1724 insertions(+), 407 deletions(-). Tidak ada file
generated, artefak build, atau data pribadi dalam diff.

## Risiko dan keterbatasan yang tersisa

1. **Belum diuji ke BSrE nyata/staging.** Kontrak field multipart (`file`, `nik`, `passphrase`)
   mengikuti perilaku OpenSID; varian respons provider di luar PDF/JSON-URL/base64 belum
   terverifikasi.
2. **Pinning memilih satu alamat.** Koneksi memakai alamat pertama hasil validasi; bila alamat itu
   tidak tersedia, operasi gagal (tidak ada failover ke record lain). Ini trade-off keamanan, bukan
   bug, tetapi memengaruhi ketersediaan.
3. **Egress policy belum diterapkan.** Lapisan tambahan yang disarankan: firewall/egress allowlist
   di level deployment agar host aplikasi tidak dapat menjangkau jaringan internal meskipun ada
   regresi kode.
4. **Transport hanya HTTP/1.1.** Bila provider mewajibkan HTTP/2, adaptasi diperlukan; tidak diubah
   dalam task ini.
5. **Validasi form bersifat statis.** Form tidak melakukan DNS; hostname yang lolos form masih dapat
   ditolak saat runtime bila resolve ke alamat internal (fail-closed, tetapi pesannya baru muncul
   saat tanda tangan).
6. **Log server** memuat `villageId` dan alasan kegagalan (tanpa kredensial/NIK); pastikan akses log
   mengikuti kebijakan operasional.
7. `docs/TECHNICAL_AUDIT.md` masih menyebut `ssl: false` diterima; dokumen audit belum diperbarui
   karena di luar scope commit ini dan perlu keputusan maintainer.

## Kesimpulan

SSRF melalui base URL TTE ditutup dengan validasi IP/DNS dan pinning alamat pada transport HTTPS
yang tetap memverifikasi sertifikat dan mengirim SNI. R-02 s/d R-09 diperbaiki dan seluruh pemeriksaan
wajib lulus. Rekomendasi berikutnya: verifikasi staging ke penyedia TTE desa, lalu tambahkan egress
policy sebagai lapisan pertahanan kedua.
