# Laporan: Halaman Layanan Mandiri Warga

- **Task:** melengkapi rute layanan mandiri warga yang selama ini dituju redirect tetapi belum ada.
- **Tanggal:** 16 November 2026
- **Branch:** `task/warga-layanan-mandiri`
- **Base commit:** `6c662de` (`main`)
- **Commit pekerjaan:** `95afa93` (halaman), `2359a4d` (edge case PIN), laporan ini

## Kondisi awal

Tiga jalur redirect warga mengarah ke rute yang tidak ada, sehingga warga berakhir di 404:

| Pemanggil | Tujuan |
| --- | --- |
| `verifyWargaPage()` saat `mustChangePin` aktif | `/layanan-mandiri/ubah-pin` |
| `verifyWargaPage()` untuk warga normal | `/layanan-mandiri/beranda` |
| `AdminLayout` untuk akun warga | `/layanan-mandiri` |

Selain itu tidak ada halaman yang menampilkan profil, permohonan, dan dokumen warga, padahal use case-nya sudah tersedia di `src/features/layanan-mandiri/application/warga-use-cases.ts`.

## File yang diperiksa

- `src/lib/dal.ts` — `verifyWargaPage`, `verifyWargaSession`, `requireWarga`.
- `src/features/layanan-mandiri/application/warga-use-cases.ts` — daftar permohonan, dokumen, jenis surat.
- `src/features/desa/application/resolve-village.ts` — `getIdentitasFromRequest`, `resolveVillageId`.
- `src/features/warga/infrastructure/warga-repository.ts` — `getWargaProfile`, `clearMustChangePin`.
- `src/features/warga/domain/warga.ts` — `ubahPinSchema`.
- `src/lib/action-state.ts` — bentuk `ActionState` untuk form action.
- `src/features/publik/application/lapisan-publik.test.ts` — guard batas lapisan route → application.
- `src/components/ui/{alert,button,card,form-field}.tsx` — komponen yang dipakai ulang.

## File yang diubah

| File | Alasan |
| --- | --- |
| `src/app/(warga)/layanan-mandiri/page.tsx` | Halaman publik pengantar layanan + CTA masuk/beranda. |
| `src/app/(warga)/layanan-mandiri/beranda/page.tsx` | Ringkasan profil, permohonan, dokumen, dan jenis surat warga. |
| `src/app/(warga)/layanan-mandiri/ubah-pin/page.tsx` | Halaman ubah PIN dengan sesi warga terverifikasi. |
| `src/app/(warga)/layanan-mandiri/ubah-pin/ubah-pin-form.tsx` | Form `useActionState` dengan pesan error per field. |
| `src/app/(warga)/layanan-mandiri/ubah-pin/actions.ts` | Server Action; hanya memanggil use case. |
| `src/features/warga/application/ubah-pin-use-case.ts` | Verifikasi PIN lama via better-auth + bersihkan `mustChangePin`. |
| `src/features/layanan-mandiri/application/profil-warga-use-cases.ts` | Profil warga dari sesi (`residentId`, `villageId`). |
| `src/app/globals.css` | Kelas `.warga-page` untuk jarak dan daftar. |

## Perubahan

- `/layanan-mandiri` bersifat publik (tidak memerlukan sesi) karena warga perlu tahu layanan sebelum punya akun; CTA menyesuaikan status sesi.
- `/layanan-mandiri/beranda` memanggil `verifyWargaPage()`, lalu empat use case secara paralel. Permohonan yang punya `letterId` menaut ke rute unduh PDF yang sudah ada; dokumen menaut ke rute berkas yang sudah ada.
- `/layanan-mandiri/ubah-pin` memakai `verifyWargaSession()`. PIN lama diverifikasi oleh `auth.api.changePassword` dengan `revokeOtherSessions: true`, bukan dibandingkan manual. Setelah berhasil, `mustChangePin` dibersihkan dan warga diarahkan ke beranda.
- Logika PIN diletakkan di `features/warga/application` karena test batas lapisan menolak route yang mengimpor infrastructure secara langsung. Versi pertama yang mengimpor repository dari `actions.ts` memang gagal pada `lapisan-publik.test.ts`.
- Beranda ditandai `robots: noindex, nofollow` karena memuat data pribadi warga.

### Perbaikan edge case PIN (commit `2359a4d`)

Penggantian PIN dan pembersihan `mustChangePin` berada di dua operasi tulis terpisah: hash password dikelola better-auth, penanda berada di tabel `users`. Bila langkah kedua gagal (gangguan koneksi, lock, dsb.), PIN sudah berganti tetapi warga tetap ditandai "PIN sementara", sehingga percobaan ulang selalu ditolak dengan "PIN lama tidak sesuai" — pesan yang menyesatkan dan membuat warga tidak bisa keluar dari halaman ubah PIN.

Perbaikan:

- Pembersihan penanda dicoba ulang hingga 3 kali dengan jeda 50 ms dan 100 ms; setiap kegagalan sementara dicatat sebagai `logger.warn` dengan `userId` dan nomor percobaan.
- Bila ketiga percobaan gagal, `logger.error` mencatat penyebab asli dan use case melempar `AppError("INTERNAL")` dengan pesan khusus (`PESAN_PIN_BERGANTI_STATUS_GAGAL`) yang menyatakan PIN baru **sudah tersimpan** dan mengarahkan warga memakai PIN baru sebagai "PIN lama" pada percobaan berikutnya. Pesan ini sampai ke form melalui `toErrorState`.
- Urutan tidak dibalik (membersihkan penanda lebih dulu) karena kegagalan penggantian PIN setelah penanda dibersihkan akan membiarkan PIN sementara tetap berlaku untuk layanan.
- `ubah-pin-use-case.test.ts` menambahkan 4 test: jalur sukses (termasuk `revokeOtherSessions`), penolakan PIN lama salah tanpa menyentuh penanda, kegagalan sementara yang pulih pada percobaan kedua, dan kegagalan tetap yang menghasilkan pesan khusus serta satu `logger.error`.

## Security dan tenant

- `residentId` dan `villageId` selalu berasal dari sesi terverifikasi (`requireWarga` + `resolveVillageId`), tidak pernah dari body, query, atau parameter URL. Tidak ada endpoint baru yang menerima ID penduduk dari klien.
- Halaman publik tidak menampilkan data pribadi; hanya identitas desa dari resolusi host.
- Unduhan surat dan dokumen memakai rute yang sudah ada dan sudah membatasi kepemilikan; laporan ini tidak mengubahnya.
- Kegagalan `changePassword` dipetakan ke pesan seragam sehingga tidak membocorkan status akun.
- Tidak ada secret atau data pribadi asli pada kode maupun laporan ini.

## Validasi

| Perintah | Hasil |
| --- | --- |
| `npm run format:check` | **PASS** |
| `npm run typecheck` | **PASS** (exit 0) |
| `npm run lint` | **PASS** — 0 error, 7 warning lama `@next/next/no-img-element` di `src/app/(auth)/masuk/page.tsx` |
| `npm run test:unit` | **PASS** — 198 file, 1.758 test (termasuk 4 test ubah PIN) |
| `npm run test:integration` | **PASS** — 34 file, 206 test, terhadap MySQL 8.0.30 disposable `desa_test` @ `127.0.0.1:3307` |
| `npm run build` | **PASS** — `next build` selesai, seluruh rute baru berstatus dynamic (`ƒ`) |
| GitHub Actions — PR #73 | **PASS** — [run 43821832097](https://github.com/fahmiorim/appdes/actions/runs/43821832097): quality check, integration MySQL 8, visual QA login, dan ringkasan semuanya `success` |
| Verifikasi tampilan halaman warga di browser | **SKIPPED** — job visual CI hanya menangkap halaman masuk; halaman baru belum pernah dirender dengan data nyata |
| Verifikasi di browser | **SKIPPED** — tidak diminta dan tidak ada database siap |

## Risiko dan keterbatasan

1. **Dua operasi tulis tetap tidak atomik.** Retry dan pesan khusus membuat kegagalan bisa dipulihkan, tetapi bila database menolak penulisan secara permanen, warga masih harus mengulang ubah PIN secara manual (dengan PIN baru sebagai "PIN lama"). Perbaikan penuh memerlukan penulisan penanda di dalam alur better-auth yang sama.
2. **Rate limit ubah PIN** bergantung pada konfigurasi better-auth; belum diuji pada sesi ini.
3. Integration test lulus baik pada MySQL disposable lokal (8.0.30) maupun pada job CI.
4. Tampilan hanya diverifikasi lewat build dan typecheck, belum dirender dengan data nyata.
5. Format NIK pada beranda hanya menampilkan nilai apa adanya; belum ada masking.

## Kesimpulan

Ketiga rute yang sebelumnya 404 kini tersedia, memakai use case dan sesi yang sudah ada tanpa jalur otorisasi baru. Integration suite, unit test, typecheck, lint, dan build produksi lulus; pemeriksaan visual di browser masih perlu dijalankan di lingkungan yang mendukung.
