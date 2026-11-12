# Validasi Lokal — AUD-019 / AUD-020 Keamanan Integrasi TTE

> **Repository:** `fahmiorim/appdes`
> **Tanggal pemeriksaan:** 12 November 2026
> **Jenis pekerjaan:** validasi lokal + audit keamanan statis (tanpa perubahan kode)
> **Status:** **TIDAK siap merge** — quality gate gagal dan risiko SSRF inti belum ditutup
> **Catatan:** laporan ini adalah snapshot pra-remediasi pada HEAD `ed1fb93`. Temuan R-01 s/d R-10
> sudah ditindaklanjuti di commit `5db3855` dan hasilnya ada di `AUD-019-020-tte-security.md`.

## 1. Task dan tujuan

Validasi lokal branch `task/AUD-019-020-tte-security`: periksa perubahan `tte.ts`, `tte.test.ts`, dan laporan `AUD-019-020-tte-security.md`; jalankan `typecheck`, `lint`, `format:check`, `test:unit`, `build`; audit SSRF, IP privat/loopback/link-local/metadata, DNS rebinding, redirect & kebocoran `Authorization`, TLS, serta timeout/`AbortController`.

Batasan yang dipatuhi: endpoint BSrE resmi tidak diakses; tidak ada request ke IP internal atau metadata cloud; tidak ada perubahan kode; tidak commit/push/merge.

**Revisi laporan:** versi awal laporan ini menyatakan branch target tidak ditemukan. Branch tersebut ternyata belum di-fetch pada saat itu; setelah `git fetch --all --prune`, `origin/task/AUD-019-020-tte-security` tersedia dan validasi dijalankan ulang di atasnya. Isi di bawah menggantikan versi awal.

## 2. Branch, base, dan commit

| Item | Nilai |
|---|---|
| Branch lokal | `task/AUD-019-020-tte-security` (tracking `origin/task/AUD-019-020-tte-security`) |
| Base commit | `d6f2a61` (`origin/main`) |
| HEAD branch | `ed1fb93` — `docs(security): record TTE hardening work in progress` |
| Commit pekerjaan | `cfaf1e9` fix origin, `3608b03` test, `ed1fb93` laporan |
| Diff vs `origin/main` | 3 file, 144 insertions(+), 12 deletions(-) |
| Working tree | bersih sebelum validasi; satu file laporan validasi ini ditambahkan tanpa commit |

Catatan: branch berbasis `origin/main` (`d6f2a61`) dan **belum** memuat commit dokumentasi deployment (`17f0615`, `284b106`, `cad9e06`).

## 3. Hasil pemeriksaan (dijalankan nyata)

Lingkungan: Windows (Git Bash), Node `v26.2.0`, npm `11.13.0`.

| # | Perintah | Status | Bukti |
|---|---|---|---|
| 1 | `npm run typecheck` | **PASS** | `✓ Types generated successfully`; `tsc --noEmit` tanpa error |
| 2 | `npm run lint` | **PASS** | `eslint .` tanpa temuan |
| 3 | `npm run format:check` | **FAIL** (exit 1) | `[warn] src/features/surat/domain/tte.test.ts`, `[warn] src/features/surat/domain/tte.ts` — `Code style issues found in 2 files` |
| 4 | `npm run test:unit` | **FAIL** (exit 1) | `Test Files 1 failed \| 183 passed (184)`, `Tests 2 failed \| 1538 passed (1540)` |
| 5 | `npm run build` | **PASS** | build produksi selesai, exit 0 |

Keduanya FAIL berasal dari perubahan pada branch ini, bukan kegagalan lama:

**FAIL #3 — format.** Dua file yang diubah belum diformat Prettier (mis. string panjang pada pesan galat dan baris `expect(...)` di test).

**FAIL #4 — test lama patah.** `src/features/surat/domain/tte-server.test.ts` tidak ikut diperbarui, sementara domain sekarang menolak base URL non-HTTPS:

```
FAIL  src/features/surat/domain/tte-server.test.ts > ... > mengirim PDF ke endpoint provider dan mengembalikan PDF bertanda tangan
Error: URL API TTE wajib menggunakan HTTPS dan tidak boleh memuat kredensial, query, atau fragment.
 ❯ src/features/surat/domain/tte.ts:325:13
 ❯ src/features/surat/domain/tte-server.test.ts:85:25

FAIL  src/features/surat/domain/tte-server.test.ts > ... > mengunduh berkas hasil dari URL pada respons JSON
Error: URL API TTE wajib menggunakan HTTPS dan tidak boleh memuat kredensial, query, atau fragment.
 ❯ src/features/surat/domain/tte.ts:325:13
 ❯ src/features/surat/domain/tte-server.test.ts:101:25
```

Penyebab: test tersebut memakai `api: http://127.0.0.1:${port}` (`tte-server.test.ts:28`) sebagai transport loopback, sedangkan validasi baru berlaku tanpa pengecualian. Test ini **tidak** termasuk file yang diubah pada branch.

## 4. Apa yang sudah benar-benar diperbaiki

| # | Perbaikan | Bukti |
|---|---|---|
| FIX-01 | **TLS dipaksa aktif.** `TTE_SSL=false` dan `ssl` tersimpan tenant diabaikan. | `tte.ts:140-141` (`ssl: true`), `tte.ts:195-196` (`ssl: true`); test `tte.test.ts` diperbarui untuk mengharapkan `true`. |
| FIX-02 | **Origin unduhan dibatasi.** URL berkas dari respons provider wajib HTTPS dan `origin` sama dengan provider. Ini menutup kebocoran `Authorization` lintas origin. | `tte.ts:432-443`; test `menolak URL unduhan absolut dari origin lain` memastikan fetch hanya dipanggil sekali. |
| FIX-03 | **Redirect tidak diikuti.** `redirect: "manual"` + penolakan status 3xx pada sign, unduh, dan `testKoneksi`. | `tte.ts:354-361`, `tte.ts:512-514`, `tte.ts:551`; test memverifikasi `init.redirect === "manual"`. |
| FIX-04 | **Base URL divalidasi:** wajib `https:`, tanpa username/password/query/fragment. | `tte.ts:311-326`; test `menolak endpoint TTE non-HTTPS`. |

**Verifikasi runtime redirect (probe loopback, tanpa trafik eksternal):**

```
manual_status=302
manual_type=basic
manual_ok=false
location=https://attacker.example/
```

Artinya di Node 26.2.0 `redirect: "manual"` mengembalikan respons 3xx asli (bukan opaque status 0), sehingga pemeriksaan `status >= 300 && status < 400` di kode benar-benar berfungsi. Sebelumnya (tanpa `manual`) probe yang sama menunjukkan redirect diikuti dan `Authorization` dihapus lintas origin — kini jalur itu ditutup lebih awal.

## 5. Temuan yang masih terbuka

### R-01 — SSRF ke host internal/metadata lewat base URL belum ditutup — **Tinggi (terkonfirmasi statis)**

`tte.ts:311-326` hanya memeriksa skema dan kredensial URL. `https://127.0.0.1`, `https://169.254.169.254`, `https://[::1]`, atau hostname internal tetap lolos. Tidak ada validasi IP hasil resolusi, tidak ada pinning, dan tidak ada daftar CIDR terlarang di seluruh `src`. Laporan branch sendiri mengakui ini sebagai risiko #1.

Dampak: admin/operator yang dapat menulis konfigurasi TTE dapat membuat server multi-tenant menghubungi layanan internal (blind SSRF), dengan header `Authorization` berisi kredensial provider. Capaiannya bergantung pada siapa yang boleh menulis `TTE_API`/`tte_config`; saat ini belum ada route/UI pemanggil `simpanKonfigurasiTteData` sehingga jalur tulis via aplikasi belum aktif.

### R-02 — Masih ada oracle status internal di respons API — **Menengah**

`src/app/api/eksternal/tte/tanda-tangan/route.ts` tetap mengembalikan `hasil.alasan` mentah (mis. `Gagal mengunduh berkas TTE (HTTP 404)` vs pesan koneksi gagal) ke pemegang API key. Bersama R-01, ini mengubah SSRF buta menjadi pemindaian internal yang terukur. Tidak diubah pada branch.

### R-03 — Tidak ada batas ukuran respons — **Menengah**

`tte.ts` masih memakai `await respons.arrayBuffer()` / `berkas.arrayBuffer()` tanpa batas byte. Batas 20 MB hanya untuk upload masuk di route. Provider jahat/terkompromi atau host internal dapat menghabiskan memori proses.

### R-04 — Anggaran waktu per permintaan ±127 detik — **Rendah–Menengah**

Retry 3× dengan timeout 30 detik per percobaan + backoff 1s/2s/4s; dua permintaan berurutan (sign lalu unduh) dapat menahan request sangat lama. Komentar menyebut retry pada "kesalahan jaringan", tetapi kode hanya me-retry `AbortError` — dokumentasi tidak sesuai perilaku.

### R-05 — `masalahKonfigTte` tidak selaras dengan aturan HTTPS baru — **Rendah (inkonsistensi)**

`tte.ts:206-208` masih menerima `http://` sebagai "tidak bermasalah", padahal `buatKlienBsre` kini menolaknya. `konfigTteFormSchema` (`tte.ts:76`) juga tidak memvalidasi skema/host, sehingga operator bisa menyimpan konfigurasi yang lolos validasi UI tetapi selalu gagal saat runtime.

### R-06 — Perubahan perilaku base URL dengan path prefix — **Rendah–Menengah (fungsional)**

Kode lama menambahkan `/api/sign/pdf` ke `config.api` apa adanya; kode baru memakai `new URL("/api/sign/pdf", baseUrl)` yang **membuang path** base. Jika provider dikonfigurasi sebagai `https://host/bsre`, endpoint menjadi `https://host/api/sign/pdf`, dan URL relatif pada respons provider juga kehilangan prefix tersebut. Perlu konfirmasi apakah deployment memakai path prefix.

### R-07 — `ssl` masih ada di tipe/DB dengan dokumentasi menyesatkan — **Rendah**

Nilai dipaksa `true` saat runtime, tetapi field tetap ada di `KonfigTte`, `KonfigTteTersimpan`, `konfigTteFormSchema`, dan komentar `tte.ts:31` masih berbunyi "`false` untuk melewatkan verifikasi sertifikat TLS". `.env.example:79` juga masih menyediakan `TTE_SSL=true`. Opsi yang tampak dapat mematikan TLS sebaiknya dihapus agar tidak menimbulkan regresi di masa depan.

### R-08 — `testKoneksi` masih dead code dengan timer salah — **Rendah**

Tidak ada pemanggil (`grep testKoneksi` hanya menemukan definisi di `tte.ts:472`). Satu `AbortController` dan satu `setTimeout` dipakai untuk hingga 4 request berurutan, tanpa `clearTimeout`, sehingga setelah satu abort seluruh probe berikutnya langsung gagal.

### R-09 — `Promise.withResolvers` vs `engines` — **Rendah**

`package.json` menyatakan `"node": ">=20.9.0"`, tetapi `tte.ts` memakai `Promise.withResolvers` (Node 22+) pada jalur retry. Tidak berubah pada branch; tidak terdeteksi karena validasi berjalan di Node 26.

### R-10 — DNS rebinding — **Perlu validasi**

Belum ada pinning IP hasil resolusi. Pembuktian memerlukan resolver/DNS terkontrol; tidak dijalankan agar tidak menghasilkan trafik jaringan nyata.

## 6. Cakupan test baru pada branch

Test yang ditambahkan sudah tepat sasaran untuk tiga perbaikan utama:

- `menolak URL unduhan absolut dari origin lain` (`attacker.example`) — memastikan tidak ada request kedua.
- `menolak endpoint TTE non-HTTPS` — memastikan fetch tidak dipanggil.
- `menolak redirect provider tanpa mengikuti tujuan redirect` — memastikan `redirect: "manual"` dipakai.
- Dua ekspektasi TLS diubah dari `false` menjadi `true`.

Belum ada test untuk: IP privat/loopback/link-local/metadata, IPv6, URL protocol-relative, base URL berisi kredensial/query/fragment, respons kebesaran, DNS multi-record, dan path prefix.

## 7. Berkas yang perlu diperbaiki

| Berkas | Alasan |
|---|---|
| `src/features/surat/domain/tte.ts` | Validasi IP/DNS (R-01), batas ukuran respons (R-03), total deadline (R-04), selaraskan `masalahKonfigTte` (R-05), keputusan path prefix (R-06), hapus/tegaskan `ssl` (R-07), `testKoneksi` (R-08). Juga perlu diformat Prettier. |
| `src/features/surat/domain/tte.test.ts` | Perlu diformat Prettier; tambah test IP privat/metadata, protocol-relative, respons kebesaran. |
| `src/features/surat/domain/tte-server.test.ts` | **Test patah**: base URL `http://127.0.0.1` kini ditolak. Ubah ke fake fetch/transport terisolasi, atau sediakan seam uji eksplisit — jangan melemahkan aturan HTTPS produksi. |
| `src/app/api/eksternal/tte/tanda-tangan/route.ts` | Jangan kembalikan detail jaringan internal ke pemanggil API (R-02). |
| `src/features/surat/application/tte-use-cases.ts` | Validasi URL di `konfigTteFormSchema` agar konsisten dengan aturan runtime (R-05). |
| `.env.example` | Baris `TTE_SSL=true` (`:79`) selaras dengan keputusan R-07. |
| `docs/TECHNICAL_AUDIT.md`, `docs/MASTER_ROADMAP.md` | AUD-020 perlu dikoreksi: flag `ssl` kini inert/ dipaksa `true`, bukan bypass TLS aktif. |

## 8. Rekomendasi perbaikan (belum diterapkan)

1. **Blokir tujuan internal di satu helper** yang dipakai `config.api` dan URL unduhan: resolusi DNS (`dns.lookup` untuk semua A/AAAA), tolak `127.0.0.0/8`, `::1`, RFC1918, `169.254/16`, `100.64/10`, `fc00::/7`, `0.0.0.0`, serta nama metadata cloud; lalu **pin** IP hasil resolusi lewat dispatcher/agent agar tidak terjadi TOCTOU/DNS rebinding.
2. **Batas byte unduhan** (streaming + abort) dan **satu total deadline** untuk seluruh operasi, bukan per percobaan.
3. **Pesan galat generik** untuk pemanggil API; detail hanya ke log server.
4. **Selaraskan validasi UI**: `masalahKonfigTte` dan `konfigTteFormSchema` menolak `http:` dan host internal sebelum data tersimpan.
5. **Putuskan path prefix**: pertahankan `config.api` sebagai base path (mis. `new URL("api/sign/pdf", baseUrlWithSlash)`) atau dokumentasikan bahwa path tidak didukung.
6. **Selesaikan dua gate yang gagal**: `npx prettier --write` pada dua file, dan perbaiki `tte-server.test.ts` tanpa melemahkan aturan HTTPS.
7. **Hapus `ssl`** dari tipe/DB/env setelah migrasi, atau nyatakan eksplisit sebagai field yang selalu `true`.
8. Setelah itu jalankan ulang kelima perintah + integration test pada database disposable, lalu perbarui laporan branch.

## 9. Risiko tersisa dan keterbatasan

- Provider BSrE nyata tidak diuji (sesuai instruksi); perilaku respons aktual, kebutuhan lintas-origin, dan path prefix belum terverifikasi.
- DNS rebinding hanya dianalisis statis.
- Integration test tidak dijalankan (tidak diminta, membutuhkan MySQL disposable).
- Validasi berjalan di Node 26.2.0, bukan versi minimum `engines`.
- Severity R-01 bergantung pada siapa yang dapat menulis konfigurasi TTE; jalur tulis via aplikasi belum aktif pada HEAD branch ini.

## 10. Kesimpulan

Branch ini memperbaiki tiga masalah nyata dan terverifikasi: TLS tidak lagi dapat dimatikan, unduhan lintas origin ditolak, dan redirect tidak diikuti (dikonfirmasi berfungsi di runtime Node 26). Namun branch **belum siap merge**: `format:check` dan `test:unit` gagal, dan risiko SSRF inti (tujuan IP privat/metadata) masih terbuka — sama seperti yang diakui laporan branch sendiri.

Tidak ada kode yang diubah, tidak ada commit/push/merge. Rekomendasi §7–§8 diserahkan untuk direview lebih dulu.
