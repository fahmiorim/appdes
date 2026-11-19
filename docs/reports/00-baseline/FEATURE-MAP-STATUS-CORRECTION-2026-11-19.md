# Koreksi Status Peta Fitur dan Roadmap — 19 November 2026

- **Task:** meluruskan catatan status yang usang pada `docs/SID_FEATURE_MAP.md` dan `docs/MASTER_ROADMAP.md` setelah remediasi RBAC, pencabutan sesi, dan race condition keuangan selesai di kode.
- **Tanggal:** 19 November 2026.
- **Branch:** `task/docs-feature-map-status-2026-11-19`.
- **Base commit:** `34c8cc5355fcc8d00425f7cd0d368ed8ab0b1011` (`main`, merge PR #162).
- **Commit hasil:** lihat hash commit task yang dicantumkan pada penyerahan branch.
- **Jenis perubahan:** dokumentasi saja. Tidak ada perubahan source code, schema, migration, data, atau aset mockup.

## 1. Ringkasan

Peta fitur tetap dipertahankan sebagai ringkasan tingkat modul, bukan digabung atau dihapus. Tiga catatan status dan satu rujukan angka diperbaiki karena bertentangan dengan kode dan laporan penutupan:

1. `Auth & RBAC` masih mencantumkan validasi role ownership dan invalidasi sesi sebagai pekerjaan lanjutan, padahal keduanya sudah merged.
2. `Keuangan / APBDes` masih meminta perbaikan race condition agregasi, padahal jalur simpan nilai sudah diserialkan; yang tersisa adalah batas impor batch.
3. Roadmap menyebut "24 modul" padahal angka itu menghitung layar mockup, bukan modul.
4. Cakupan peta dinyatakan eksplisit: peta merangkum modul, bukan memetakan 126 aset satu per satu.

## 2. Kondisi awal dan analisis

Klaim yang diperiksa dan dibuktikan langsung pada `main` `34c8cc5`:

| Klaim lama | Bukti aktual | Kesimpulan |
|---|---|---|
| "Validasi role ownership dan invalidasi sesi" sebagai pekerjaan lanjutan | `src/features/rbac/application/authorization.ts:40-49` memuat role lewat `findRoleById(roleId, villageId)` dan hanya memberi `isSuperadmin` untuk role sistem `administrator` dengan `villageId === null`; `src/lib/auth.ts:69` menetapkan `revokeSessionsOnPasswordReset: true`; reset Admin Desa oleh Super Admin menghapus sesi sasaran dalam transaksi (AUD-007, PR #41) | Selesai di kode; catatan lama menyesatkan |
| "Perbaiki race condition agregasi" pada keuangan | `src/features/keuangan/infrastructure/keuangan-repository.ts:118` membungkus `saveKeuanganNilai` dengan `denganKunciMysql('keuangan:<village>:<tahun>')` | Sudah ditutup untuk jalur simpan nilai |
| Impor APBDes ikut aman | `keuangan-repository.ts:260` `upsertKeuanganBatch` hanya memakai `db.transaction` tanpa kunci yang sama; AUD-034 §5 mencatat batas ini | Masih terbuka; harus disebut terpisah, bukan dihapus |
| "24 modul siap pakai" | Audit 39 layar Super Admin: 15 sebagian, 23 belum, plus layar Laporan & Analitik ke-39 belum punya model data | Angka 24 menghitung layar, bukan modul |
| Peta fitur dipakai sebagai pemetaan lengkap | Audit memetakan 126 aset per area; peta hanya 23 baris modul | Batas cakupan perlu dinyatakan |

Sisa risiko yang tetap dicatat setelah koreksi:

- `users.role_id` tidak dijadikan composite FK karena role platform sah memiliki `village_id IS NULL`; enforcement berada di application layer (`docs/decisions/ADR-002-users-role-id-app-enforced.md`).
- Empat tabel anak tanpa `village_id` (`survey_soal`, `survey_responden`, `survey_jawaban`, `pembangunan_dokumentasi`) mengandalkan parent dan application layer.
- Validasi runtime MySQL/staging untuk reset password dan pencabutan sesi lintas instance belum menjadi bukti tersendiri.
- Impor APBDes yang berjalan bersamaan dengan simpan manual belum diserialkan dengan kunci yang sama.

## 3. File yang diperiksa

- `docs/SID_FEATURE_MAP.md`
- `docs/MASTER_ROADMAP.md`
- `docs/TECHNICAL_AUDIT.md` (bagian AUD-013/AUD-014/AUD-016 dan tabel status; tidak diubah)
- `docs/reports/00-baseline/DOKUMEN-KLAIM-AUDIT-2026-11-18.md`
- `docs/reports/01-security/PHASE-1-CLOSURE-2026-11-17.md`
- `docs/reports/01-security/AUD-007-admin-reset-session-revocation.md`
- `docs/reports/01-security/AUD-034-race-conditions.md`
- `docs/reports/05-ui-audit/MOCKUP-DAN-DOKUMEN-AUDIT-2026-11-19.md`
- Kode: `src/features/keuangan/infrastructure/keuangan-repository.ts`, `src/features/rbac/application/authorization.ts`, `src/lib/auth.ts`.

## 4. File yang diubah

| File | Alasan |
|---|---|
| `docs/SID_FEATURE_MAP.md` | Status Auth & RBAC dan keuangan diperbarui; cakupan peta dinyatakan eksplisit; catatan tanggal diverifikasi ulang |
| `docs/MASTER_ROADMAP.md` | "24 modul" dikoreksi menjadi 24 layar; butir race condition Fase 5 menandai selesai di kode beserta batas impor batch |
| `docs/reports/00-baseline/FEATURE-MAP-STATUS-CORRECTION-2026-11-19.md` | Laporan ini |

Tidak ada perubahan pada source code, schema, migration, konfigurasi deployment, data, atau aset PNG.

## 5. Perubahan

### 5.1 `docs/SID_FEATURE_MAP.md`

- **Header:** status tindak lanjut dinyatakan diverifikasi ulang 19 November 2026, bukan hanya status UI.
- **§1 cakupan mockup:** ditambahkan pernyataan bahwa peta merangkum modul dan status bukti, bukan pemetaan satu baris per layar; rincian 126 aset ada di laporan audit per area.
- **Baris Auth & RBAC:** status bukti menjadi "use case tersedia; validasi role ownership dan pencabutan sesi saat reset sandi sudah ada di kode (PR #33, #41)". Catatan lanjutan diganti dengan sisa yang benar: validasi runtime MySQL/staging, `users.role_id` app-enforced, dan empat tabel anak tanpa `village_id`.
- **Baris Keuangan / APBDes:** status bukti menyebut simpan nilai diserialkan per (desa, tahun). Catatan lanjutan menyebut AUD-034/PR #86 menutup race agregasi dan menyisakan `upsertKeuanganBatch` serta validasi file impor.

### 5.2 `docs/MASTER_ROADMAP.md`

- **§2B kesimpulan:** "tidak menciptakan 24 modul siap pakai" diganti menjadi pernyataan bahwa 15 layar sebagian + 23 belum + layar ke-39 = **24 layar** belum siap.
- **§3 Fase 5:** butir race condition ditandai **selesai di kode** untuk tiga jalur utama dengan pranala ke AUD-034, dan batas impor APBDes (`upsertKeuanganBatch`) serta validasi beban nyata dicatat eksplisit.

Dokumen baseline `docs/TECHNICAL_AUDIT.md` sengaja tidak diubah: dokumen itu mempertahankan teks temuan asli dan sudah memiliki tabel status per temuan yang menyatakan AUD-013/AUD-014/AUD-016 "Diperbaiki".

## 6. Security dan tenant

- Tidak ada jalur autentikasi, otorisasi, atau resolusi tenant yang diubah.
- Koreksi justru menghapus kesan bahwa kontrol keamanan belum dikerjakan, tanpa menurunkan status validasi operasional yang memang belum terbukti.
- Pengecualian platform (`administrator` dengan `villageId === null`) tetap dibedakan dari administrator desa pada catatan RBAC.
- Tidak ada secret, kredensial, NIK, atau data pribadi yang ditulis ke dokumen atau laporan ini.

## 7. Validasi

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Format dokumen yang diubah | `npx prettier --check docs/SID_FEATURE_MAP.md docs/MASTER_ROADMAP.md` | **PASS** — "All matched files use Prettier code style!" |
| Format laporan | `npx prettier --check docs/reports/00-baseline/FEATURE-MAP-STATUS-CORRECTION-2026-11-19.md` | **PASS** |
| Whitespace diff | `git diff --check` | **PASS** — exit 0, tanpa output |
| Sisa frasa "24 modul" | `grep -rn "24 modul" docs/SID_FEATURE_MAP.md docs/MASTER_ROADMAP.md` | **PASS** — tidak ada hasil |
| Klaim kunci keuangan | `grep -n "denganKunciMysql\|upsertKeuanganBatch" src/features/keuangan/infrastructure/keuangan-repository.ts` | **PASS** — kunci di baris 118, `upsertKeuanganBatch` di baris 260 tanpa kunci yang sama |
| Klaim RBAC dan sesi | `grep -n "findRoleById\|villageId === null" src/features/rbac/application/authorization.ts`; `grep -n "revokeSessionsOnPasswordReset" src/lib/auth.ts` | **PASS** — `authorization.ts:41,48`; `auth.ts:69` |
| Typecheck/lint/unit/integration test | — | **SKIPPED** — hanya dokumentasi; tidak ada source code berubah |
| Build | — | **SKIPPED** — tidak ada perubahan yang memengaruhi build |

## 8. Risiko dan keterbatasan

- Koreksi berbasis pemeriksaan statis kode `main` dan laporan yang ada; tidak ada uji runtime, staging, atau MySQL nyata pada task ini.
- "Selesai di kode" tetap bukan bukti perilaku produksi. Blocker operasional Fase 1 pada `PHASE-1-CLOSURE-2026-11-17.md` masih berlaku.
- Angka 39/46 layar dan 15/24 status layar berasal dari audit 19 November 2026; bila mockup berubah lagi, angka ini perlu diperbarui.
- Batas impor APBDes dicatat dari komentar kode dan AUD-034 §5, bukan dari pengujian konkurensi impor baru.

## 9. Kesimpulan dan rekomendasi

Peta fitur tetap layak dipertahankan sebagai ringkasan modul dan status bukti. Setelah koreksi ini, dokumen tidak lagi meminta pekerjaan yang sudah selesai, tidak lagi menyebut jumlah modul untuk angka yang sebenarnya menghitung layar, dan tetap mencatat risiko yang belum tertutup.

Rekomendasi berikutnya:

1. Bila ingin menutup batas impor APBDes, buat task terpisah untuk menyerialkan `upsertKeuanganBatch` dengan kunci (desa, tahun) yang sama, beserta test konkurensi impor + simpan manual.
2. Gunakan audit mockup per area sebagai crosswalk rinci; jangan menambah baris layar ke peta fitur.
3. Perbarui angka layar pada peta hanya setelah katalog mockup berubah.

## 10. Status penyerahan

**Siap review.** Branch `task/docs-feature-map-status-2026-11-19` berisi dua dokumen aktif yang dikoreksi dan laporan ini. Tidak ada merge, deploy, atau perubahan pada `main`.
