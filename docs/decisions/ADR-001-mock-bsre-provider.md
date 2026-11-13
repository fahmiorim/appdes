# ADR-001 — Mock BSrE Provider untuk Pengujian TTE

- **Status:** Diterima untuk implementasi lingkungan development/test
- **Tanggal:** 12 November 2026
- **Konteks:** Appdes belum memiliki akses/credential integrasi resmi BSrE. Modul TTE perlu tetap dapat diuji sebelum pengajuan integrasi disetujui.
- **Keputusan:** Sediakan mock provider BSrE sebagai standalone service di repository yang sama, terpisah dari aplikasi produksi.

## 1. Konteks dan masalah

Adapter TTE Appdes berkomunikasi dengan provider melalui HTTP API. Saat ini akses resmi BSrE belum tersedia, sehingga pengujian end-to-end terhadap provider pemerintah belum dapat dilakukan. Menunggu akses resmi untuk menguji seluruh alur akan membuat kontrak adapter, penanganan error, dan regression test sulit diverifikasi lebih awal.

Mock provider diperlukan hanya untuk simulasi kontrak API dan perilaku jaringan. Mock bukan pengganti layanan BSrE, bukan penyedia sertifikat elektronik, dan tidak menghasilkan tanda tangan elektronik yang sah.

## 2. Keputusan arsitektur

Mock ditempatkan dalam repository Appdes sebagai service terpisah:

```text
appdes/
├── src/
│   └── features/
│       └── surat/
│           └── domain/
│               └── tte.ts
├── tools/
│   └── mock-bsre/
│       ├── src/
│       ├── package.json
│       └── README.md
└── docs/
    └── decisions/
        └── ADR-001-mock-bsre-provider.md
```

Batas arsitektur:

- Mock berjalan sebagai proses/service lokal tersendiri; tidak menjadi bagian dari runtime aplikasi Appdes.
- Mock hanya untuk development, unit/integration test, dan validasi kontrak adapter.
- Mock tidak boleh menjadi pilihan provider produksi atau fallback otomatis ketika BSrE resmi gagal.
- Implementasi tidak boleh mengubah kontrak domain TTE tanpa alasan dan review terpisah.
- Implementasi mengikuti stack repository dan menghindari dependency baru jika kemampuan yang ada sudah cukup.

## 3. Kontrak simulasi minimum

Mock mensimulasikan endpoint yang digunakan adapter saat ini:

| Endpoint | Tujuan |
|---|---|
| `POST /api/sign/pdf` | Menerima PDF, NIK dummy, dan passphrase dummy; mengembalikan PDF fixture atau respons JSON sesuai skenario. |
| `GET /api/sign/status` | Simulasi status provider. |
| `GET /api/version` | Simulasi versi provider. |
| `GET /api/health` | Health check lokal. |

Skenario deterministik minimum:

- Sukses dengan PDF fixture yang diberi penanda jelas sebagai hasil simulasi.
- Sukses dengan respons JSON berisi Base64 PDF fixture.
- Kredensial salah (401) dan akses ditolak (403).
- Kesalahan provider (5xx), timeout, dan respons tidak valid.
- Redirect untuk memastikan adapter menolaknya.
- URL unduhan lintas-origin untuk memastikan adapter menolak tujuan dan tidak membocorkan Authorization.

Fixture tidak boleh memakai dokumen desa, NIK nyata, kredensial nyata, atau materi tanda tangan elektronik resmi.

## 4. Pengujian SSRF dan jaringan

Mock provider membantu menguji kontrak HTTP, tetapi tidak cukup untuk membuktikan mitigasi SSRF. Pengujian keamanan SSRF harus dilakukan secara terisolasi dengan resolver/transport yang dapat diinjeksi atau fake fetch, tanpa mengirim permintaan ke jaringan internal/metadata sungguhan.

Cakupan wajib:

- Menolak URL non-HTTPS, kredensial di URL, dan origin yang tidak disetujui.
- Menolak IP literal loopback, private, link-local, multicast, dan alamat khusus/metadata.
- Menolak hostname yang hasil resolusi A/AAAA-nya memuat alamat terlarang; jika ada hasil campuran publik dan terlarang, seluruh tujuan ditolak.
- Menguji DNS rebinding/re-resolution. Validasi DNS sebelum request saja tidak cukup; alamat tujuan koneksi harus tetap terikat pada hasil validasi atau kontrol egress yang setara.
- Menolak redirect yang tidak diizinkan dan memastikan Authorization tidak diteruskan ke origin lain.
- Memastikan TLS certificate verification tetap aktif.

Jika runtime transport yang digunakan tidak memungkinkan pengikatan alamat tujuan yang aman, implementasi harus memilih kontrol egress/network allowlist yang eksplisit atau berhenti dan mendokumentasikan keterbatasan. Jangan mengklaim SSRF tertutup hanya karena hostname telah di-resolve sekali.

## 5. Guardrail keamanan mock

- Bind hanya ke loopback (misalnya `127.0.0.1`), bukan `0.0.0.0` atau interface publik.
- Startup harus membutuhkan mode/environment development atau test yang eksplisit; startup ditolak pada `NODE_ENV=production`.
- Tidak ada credential BSrE asli; gunakan nilai dummy yang didokumentasikan.
- Tidak mencatat isi PDF, NIK, passphrase, Authorization, atau data sensitif.
- Tidak melakukan proxy/forward request ke internet atau host lain.
- Tidak memakai database produksi atau menyimpan data permanen.
- Tidak menyediakan endpoint untuk menandatangani dokumen nyata.
- README harus memberi peringatan bahwa output mock bukan TTE sah.

## 6. Kriteria penerimaan implementasi

- Mock dapat dijalankan lokal secara terpisah dan dihentikan tanpa memengaruhi Appdes.
- Adapter dapat diuji terhadap skenario sukses dan kegagalan yang deterministik.
- Test keamanan URL, redirect, kredensial, IP, DNS, dan TLS tetap dapat dijalankan tanpa akun BSrE.
- Ada test yang membuktikan mock menolak mode production dan hanya bind loopback.
- Tidak ada secret atau data pribadi nyata pada fixture, log, maupun dokumentasi.
- Unit test, integration test yang relevan, typecheck, lint, format check, dan build dilaporkan berdasarkan hasil aktual.
- Tidak ada klaim integrasi resmi BSrE atau tanda tangan elektronik sah dari hasil mock.

## 7. Hal yang tetap menunggu BSrE resmi

Setelah akses resmi diberikan, lakukan validasi terpisah terhadap endpoint, autentikasi, format payload/respons, sertifikat/TLS, batas ukuran PDF, timeout, dan alur operasional sesuai dokumentasi serta persetujuan BSrE. Hanya pengujian dengan provider resmi yang dapat menjadi bukti integrasi resmi.

## 8. Konsekuensi

**Positif:** pengembangan dan regression test adapter dapat berjalan tanpa menunggu akses resmi; skenario error menjadi konsisten dan dapat diulang.

**Batasan:** mock hanya membuktikan kesesuaian terhadap kontrak simulasi yang kita definisikan. Mock tidak membuktikan kompatibilitas penuh dengan BSrE, keabsahan tanda tangan, atau persetujuan integrasi.
