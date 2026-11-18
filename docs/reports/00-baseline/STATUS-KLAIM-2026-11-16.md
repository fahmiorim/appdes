# Rekonsiliasi Klaim Status Laporan — 16 November 2026

| Item | Nilai |
| --- | --- |
| Task | Merapikan klaim status usang pada laporan dan dokumen audit |
| Tanggal | 16 November 2026 |
| Branch | `docs/status-reconciliation-2026-11-16` |
| Base commit | `6c662de58be07b7a6486ad6da9cc888f11f877db` (`main`, sama dengan `origin/main`) |
| Sifat | Dokumentasi saja; tidak ada perubahan kode, schema, migration, atau konfigurasi |
| Status | Siap review; belum di-merge dan belum di-deploy |

## 1. Tujuan

Banyak laporan menyimpan baris status seperti "belum di-merge" atau "Issue #34 tetap terbuka"
yang ditulis saat pekerjaannya belum digabung. Setelah pekerjaan tersebut masuk `main`, baris itu
terbaca sebagai backlog aktif padahal sudah selesai. Task ini menyelaraskan klaim status tersebut
dengan keadaan repository dan GitHub per 16 November 2026, tanpa menghapus isi snapshot aslinya.

## 2. Metode dan bukti

1. `git ls-remote origin refs/heads/main` dan `git rev-parse HEAD` → `6c662de58be07b7a6486ad6da9cc888f11f877db`.
2. GitHub REST API untuk seluruh pull request tertutup (62 PR) dan Issue #34: state, `merged_at`,
   `merge_commit_sha`.
3. Pemeriksaan kode pada `main` untuk memastikan isi perbaikan benar-benar ada, bukan hanya
   klaim laporan: `safe-next-path.ts` (dipakai halaman login), `csvCell`, `batasiPermintaan` pada
   dua route kontak publik, `kiaResidentReferencesOwned`, `head.villageId` di repository keluarga,
   `families.villageId` di repository penduduk, `TTE_ALLOWED_HOSTS` dan `tte-https.ts`.
4. `git merge-base --is-ancestor` untuk commit yang dikutip laporan: `713c926`, `91a4b24`,
   `41419b0`, `0bb98c2`, `9e77298` **bukan** ancestor `main`. Kelima commit berasal dari branch
   yang di-squash-merge, sehingga SHA lamanya tidak ada di riwayat `main` walaupun isinya ada.

## 3. Status pull request yang dirujuk laporan

| PR | Judul ringkas | Status | Merge |
| --- | --- | --- | --- |
| #1 | CI quality dan integration | MERGED | 12 Nov 2026 |
| #2 | Tutup review condition TTE AUD-019/020 | MERGED | 12 Nov 2026, `5a3f750` |
| #3 | AUD-003 hardening referensi penduduk | MERGED | 12 Nov 2026 |
| #5 | AUD-007 isolasi riwayat mutasi | MERGED | 12 Nov 2026 |
| #7 | AUD-002 integritas tenant di database | MERGED | 12 Nov 2026, `e9b44d1` |
| #8 | AUD-002 inverse migration dan runbook rollback | **CLOSED tanpa merge** | — |
| #9 | Integrasi AUD-002/003/007 | MERGED | 12 Nov 2026 |
| #11 | Isolasi query DTKS dan Suplemen | MERGED | 12 Nov 2026 |
| #12 | Composite tenant FK DTKS dan Suplemen | MERGED | 12 Nov 2026 |
| #20 | CSV export Bantuan | MERGED | 12 Nov 2026 |
| #21 | Cache-Control private/no-store | MERGED | 12 Nov 2026 |
| #22 | Rate limit endpoint kontak publik | MERGED | 12 Nov 2026 |
| #29 | Kepemilikan wilayah pada KK | MERGED | 13 Nov 2026, `7dfe882` |
| #30 | Kepemilikan wilayah pada rumah tangga | MERGED | 13 Nov 2026, `8f1065d` |
| #32 | Referensi ibu/anak KIA | MERGED | 13 Nov 2026, `b56eb83` |
| #33 | Kepemilikan role lintas tenant (RBAC) | MERGED | 13 Nov 2026, `a80be9f` |
| #36 | AUD-034 Batch 1 composite FK `resident_id` | MERGED | 13 Nov 2026, `94534b6` |
| #37 | AUD-034 Batch 2 isolasi application layer | MERGED | 13 Nov 2026, `de1bf1b` |
| #38 | AUD-034 Batch 3 inventaris | MERGED | 13 Nov 2026, `3338364` |
| #39 | Fondasi UI login dan admin shell | MERGED | 13 Nov 2026 |
| #40 | AUD-034 Batch 4A composite tenant FK | MERGED | 13 Nov 2026, `ec38340` |
| #41 | Cabut sesi admin saat reset platform | MERGED | 13 Nov 2026, `479ddc8` |
| #42 | Composite tenant FK item BUMDes | **CLOSED tanpa merge** | — |
| #43 | Scope join konten publik ke desa aktif | MERGED | 14 Nov 2026 |
| #49 | Halaman informasi publik | MERGED | 15 Nov 2026, `7b09691` |
| #52 | Catatan review visual website publik | **CLOSED tanpa merge** | — |
| #63 | Audit batas shell publik (F-09) | MERGED | 15 Nov 2026, `e4c3089` |
| #64 | Shell galeri (F-09 pilot) | MERGED | 15 Nov 2026, `942ed0f` |
| #65 | Shell sembilan route informasi publik (F-09) | MERGED | 15 Nov 2026, `6c662de` |

Issue #34 ("Audit lanjutan relasi tenant-bound di luar composite FK inti") berstatus **closed** sejak
14 November 2026. Penutupan issue menandai selesainya audit yang disepakati, bukan bukti bahwa
seluruh relasi tenant sudah enforced di database.

## 4. Klaim yang dikoreksi

Semua baris di bawah hanya mengubah status; analisis, angka, dan bukti pada laporan aslinya tidak
diubah.

| Dokumen | Klaim lama | Status per 16 November 2026 |
| --- | --- | --- |
| `01-security/AUD-001-role-tenant-ownership.md` | "Belum di-merge dan belum di-deploy" | Merged via PR #33 |
| `01-security/AUD-002-database-tenant-integrity.md` | "PR #3 dan #5 belum merge"; "belum siap merge" | PR #3/#5/#7 merged; PR #8 (rollback) ditutup tanpa merge |
| `01-security/AUD-003-penduduk-tenant-references.md` | "siap review, belum merge" | Merged via PR #3 |
| `01-security/AUD-004-keluarga-region-ownership.md` | "Belum di-merge" | Merged via PR #29 |
| `01-security/AUD-005-rtm-region-ownership.md` | "Belum di-merge" | Merged via PR #30 |
| `01-security/AUD-007-riwayat-mutasi-tenant-isolation.md` | "belum merge/deploy" | Merged via PR #5 |
| `01-security/AUD-007-admin-reset-session-revocation.md` | "belum di-push; tidak ada PR" | Merged via PR #41 |
| `01-security/AUD-011-family-join-tenant-scope.md` | Base "AUD-004 belum di-merge"; validasi runtime menunggu | Kode ada di `main`; AUD-004 merged |
| `01-security/AUD-012-resident-list-join-tenant-scope.md` | Base "AUD-003 belum di-merge" | Kode ada di `main`; AUD-003 merged |
| `01-security/AUD-019-020-tte-security.md` | "belum di-merge, belum di-deploy" | Merged via PR #2; belum deploy |
| `01-security/AUD-019-020-tte-remediation.md` | "Tidak ada PR, merge, atau deploy" | Merged via PR #2 |
| `01-security/AUD-019-020-tte-final-hardening.md` | "Tidak ada PR, merge, atau deploy" | Merged via PR #2 |
| `01-security/AUD-019-020-tte-review-conditions.md` | "Belum siap merge; CI belum dieksekusi" | Merged via PR #2 |
| `01-security/AUD-021-02-private-no-store.md` | "Draft PR #21" | Merged |
| `01-security/AUD-021-03-public-contact-rate-limit.md` | "Draft PR and CI pending" | Merged via PR #22 |
| `01-security/AUD-025-kia-tenant-references.md` | "Belum di-merge" | Merged via PR #32 |
| `01-security/AUD-034-batch-1-resident-composite-fk.md` | "PR #36 dibuat; belum merge" | Merged |
| `01-security/AUD-034-batch-3-application-isolation.md` | "Issue #34 belum selesai/terbuka" | PR #38 merged; Issue #34 ditutup 14 Nov 2026 |
| `01-security/AUD-034-batch-4a-cascade-composite-fk.md` | "CI lulus; siap review, belum merge" | Merged via PR #40 |
| `01-security/AUD-034-tenant-relation-matrix.md` | "awaiting review and merge"; "Issue #34 tetap terbuka" | PR #40 merged; Issue #34 ditutup |
| `01-security/B2-DTKS-SUPLEMEN-COMPOSITE-FK.md` | "Tidak ada merge"; "keduanya belum di-merge" | PR #11 dan #12 merged |
| `03-core-sid/UI-FOUNDATION-ADMIN-SHELL-open-redirect.md` | "belum merge/deploy" | `safeNextPath` ada dan dipakai di `main`; branch asal tidak di-merge apa adanya |
| `design/PR-49-VISUAL-AUDIT.md` | "PR tetap terbuka dan belum di-merge" | PR #49 merged 15 Nov 2026; visual acceptance tetap pending |
| `02-public-website/F-09-gallery-shell-pilot-2026-11-16.md` | "belum di-merge atau deploy" | Merged via PR #64 |
| `02-public-website/F-09-public-information-shell-2026-11-16.md` | "belum di-merge atau deploy" | Merged via PR #65 |

## 5. Klaim yang sengaja dipertahankan

Klaim berikut masih benar dan tidak diubah:

- **Visual acceptance publik belum lulus.** `docs/reports/05-ui-audit/archive/PUBLIC-VISUAL-AUDIT-2026-11-15.md` mencatat
  0 dari 14 referensi PASS. Merge PR #49–#65 tidak mengubah penilaian itu.
- **Migration belum dijalankan di lingkungan mana pun.** Migration `0005`/`0006` diuji pada database
  disposable; preflight dan backup untuk data nyata masih menjadi prasyarat deployment.
- **Sisa relasi tenant AUD-034 masih terbuka sebagai pekerjaan teknis:** 16 relasi Matriks B2, 7 relasi
  `SET NULL`, dan 4 tabel anak tanpa `village_id`, walaupun issue auditnya sudah ditutup.
- **Rollback migration AUD-002 belum tersedia di `main`.** PR #8 ditutup tanpa merge; catatan
  "inverse/rollback script belum dibuat dan belum diuji" tetap berlaku.
- **TTE belum diuji ke BSrE nyata** dan belum siap produksi; egress policy serta provider resmi masih
  risiko terbuka.
- **Temuan deployment baseline** (bootstrap tenant pertama, backup media, restore tidak atomik) belum
  terselesaikan dan tidak berubah oleh merge PR keamanan.

## 6. Validasi

| Pemeriksaan | Hasil |
| --- | --- |
| `git status --short --branch` sebelum edit | PASS — bersih pada `main` = `origin/main` |
| `git ls-remote origin refs/heads/main` vs `HEAD` | PASS — sama, `6c662de` |
| Pencarian ulang klaim "belum merge/tetap terbuka" pada dokumen yang disunting | PASS — tidak ada yang bertentangan dengan status GitHub |
| `git diff --check` | PASS — tanpa whitespace error |
| Typecheck/lint/unit/integration/build | SKIPPED — hanya Markdown; tidak ada kode yang berubah |
| Uji visual/browser | SKIPPED — tidak ada perubahan UI |

## 7. Risiko dan keterbatasan

1. Status merge diambil dari GitHub API pada 16 November 2026. Bila PR lama dibuka kembali atau
   riwayat ditulis ulang, tabel ini perlu diperbarui.
2. Laporan yang menyebut SHA commit pra-squash tidak dapat dilacak langsung di `main`; verifikasi
   dilakukan lewat keberadaan kode, bukan lewat SHA.
3. Untuk AUD-011/AUD-012, PR penggabung tidak tercatat pada laporan aslinya; statusnya disimpulkan
   dari kode yang ada di `main`, bukan dari nomor PR.
4. Dokumen audit lain di `docs/design/` dan `docs/reports/00-baseline/` yang tidak dirujuk tabel di
   atas tidak diperiksa menyeluruh; klaimnya mungkin juga sudah usang.
5. Tidak ada merge, deploy, atau perubahan database pada task ini.

## 8. Kesimpulan

Baris status pada 24 dokumen kini mencerminkan keadaan repository per 16 November 2026, sementara isi
snapshot dan angka audit aslinya dipertahankan. Pekerjaan yang masih terbuka—visual acceptance,
deployment migration, sisa relasi tenant, dan kesiapan operasi—tetap tercatat sebagai risiko, bukan
tertutup oleh status merge.
