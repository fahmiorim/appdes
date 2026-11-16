# Laporan: Halaman Layanan Mandiri Warga

- **Task:** melengkapi rute layanan mandiri warga yang selama ini dituju redirect tetapi belum ada.
- **Tanggal:** 16 November 2026
- **Branch:** `task/warga-layanan-mandiri`
- **Base commit:** `6c662de` (`main`)
- **Commit pekerjaan:** `95afa93`

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
| `npm run test:unit` | **PASS** — 197 file, 1.754 test |
| `npm run test:integration` | **SKIPPED** — memerlukan database MySQL disposable; tidak dijalankan pada sesi ini |
| `npm run build` / visual QA | **SKIPPED** — memerlukan database dan Chromium |
| Verifikasi di browser | **SKIPPED** — tidak diminta dan tidak ada database siap |

## Risiko dan keterbatasan

1. **Batas PIN sementara.** Jika `clearMustChangePin` gagal setelah PIN berhasil diubah, warga tetap ditandai `mustChangePin` dan percobaan ulang akan gagal karena PIN lama sudah tidak berlaku. Perlu penanganan khusus bila kasus ini muncul di produksi.
2. **Rate limit ubah PIN** bergantung pada konfigurasi better-auth; belum diuji pada sesi ini.
3. Tampilan hanya diverifikasi lewat typecheck dan lint, belum dirender dengan data nyata.
4. Format NIK pada beranda hanya menampilkan nilai apa adanya; belum ada masking.

## Kesimpulan

Ketiga rute yang sebelumnya 404 kini tersedia, memakai use case dan sesi yang sudah ada tanpa jalur otorisasi baru. Perubahan siap direview; integrasi database dan pemeriksaan visual masih perlu dijalankan di lingkungan yang mendukung.
