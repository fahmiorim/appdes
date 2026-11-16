# Review Tiga PR dan Rencana Merge (PR #73, #74, #75)

- **Tanggal:** 16 November 2026
- **Base:** `origin/main` @ `cb2026f`
- **Branch laporan:** `task/merge-plan-three-prs`
- **Jenis task:** review + perencanaan merge. Tidak ada merge, deploy, atau perubahan kode aplikasi yang dilakukan.

## 1. Ringkasan PR

| PR                                                       | Branch                     | Commit terakhir | File | Diff           | Status check |
| -------------------------------------------------------- | -------------------------- | --------------- | ---- | -------------- | ------------ |
| [#75](https://github.com/fahmiorim/appdes/pull/75)       | `task/ci-pipeline-dedup`   | `a7f91dd`       | 2    | +98 / −108     | success      |
| [#74](https://github.com/fahmiorim/appdes/pull/74)       | `task/admin-menu-rbac`     | `5ca76cd`       | 6    | +294 / −3      | success      |
| [#73](https://github.com/fahmiorim/appdes/pull/73)       | `task/warga-layanan-mandiri` | `8f4a248`     | 10   | +758 / −0      | success      |

Ketiganya berbasis `6c662de`; `main` sejak itu hanya maju satu commit migration (`cb2026f`) yang tidak menyentuh file ketiga PR.

## 2. Hasil review

### 2.1 PR #75 — dedup pipeline CI

- `push` dipersempit ke `main` (sebelumnya `branches-ignore: [main]`), `pull_request` diberi `paths-ignore` untuk dokumentasi, `concurrency` dikunci per nomor PR, dan seed visual diganti `npm run visual:qa:seed` yang memakai guard database disposable.
- Nama job tidak berubah (`Unit test dan quality check`, `Integration test (MySQL 8)`, `Visual QA login (desktop/mobile)`, `Ringkasan CI`), sehingga required check context di branch protection tetap cocok.
- Temuan (rendah, confirmed): `paths-ignore` pada `pull_request` membuat PR dokumentasi tidak pernah melaporkan check. Bila branch protection mewajibkan check tersebut, PR dokumentasi akan tertahan pada status "Expected". Sudah dicatat sebagai komentar di workflow; keputusan ada di maintainer.
- Temuan (rendah): fallback `|| test -s` pada tiga perintah screenshot dihapus bersamaan dengan `if-no-files-found: error`. Perilaku baru lebih ketat dan konsisten; tidak ada job lain yang bergantung pada fallback lama.

### 2.2 PR #74 — menu admin berbasis RBAC

- `getMenuForUser` menyusun menu dari `listModules(villageId)` + izin efektif; `ratakanMenu` menandai rute yang belum punya halaman sebagai "Segera" dan tidak menautkannya, sehingga tidak ada tautan 404.
- Verifikasi klaim: seluruh direktori di `src/app/(admin)` hanya memiliki route handler ekspor, bukan `page.tsx`; satu-satunya halaman admin adalah `/beranda` dan `/super-admin`. Jadi `RUTE_ADMIN_TERSEDIA` memang akurat hari ini, bukan allowlist yang terlalu sempit.
- Tidak ada kebocoran lintas tenant: `listModules` memfilter `village_id`, dan `findRoleById` menerima role global (`village_id IS NULL`) atau milik desa sendiri.
- Temuan (rendah, plausible): untuk super admin (`villageId === null`), `listModules(null)` hanya mengembalikan modul platform, sedangkan tidak ada kode yang membuat modul dengan `village_id IS NULL` (provisioning menyalin modul dari desa sumber ke desa baru). Akibatnya sidebar platform hanya berisi tautan beranda. Konfirmasi: hitung `modules WHERE village_id IS NULL` setelah provisioning; bila nol, menu platform memang kosong.
- Catatan aksesibilitas (info): item "Segera" dirender sebagai `span` dengan `aria-disabled`, bukan kontrol fokus, dan alasan ketersediaan hanya badge. Dapat diterima untuk label non-interaktif.

### 2.3 PR #73 — halaman layanan mandiri warga

- Semua data diambil lewat use case yang memakai `requireWarga()` dan `resolveVillageId(user)`; `residentId`/`villageId` tidak pernah berasal dari body, query, atau URL.
- `verifyWargaSession` dipakai di halaman ubah PIN untuk menghindari loop redirect; `verifyWargaPage` dipakai di beranda.
- Penggantian PIN memakai `auth.api.changePassword` dengan `revokeOtherSessions: true`, lalu membersihkan `mustChangePin` dengan retry 3× dan pesan khusus bila pembersihan gagal permanen.
- Temuan (sedang, confirmed): `ubah-pin-use-case.ts:88` menangkap **semua** kegagalan `changePassword` dan memetakannya ke "PIN lama tidak sesuai". Better-auth juga melempar `CREDENTIAL_ACCOUNT_NOT_FOUND`, `FAILED_TO_GET_SESSION`, dan error adapter di dalam transaksi. Pada kegagalan tersebut warga diberi tahu PIN-nya salah, mengulang percobaan, dan tidak menghubungi admin. Perbaikan murah: periksa `status`/`body.code` dari `APIError`, petakan hanya `INVALID_PASSWORD` (dan `CREDENTIAL_ACCOUNT_NOT_FOUND`) ke `validationError`, selain itu lempar `AppError("INTERNAL")`. Tidak menghalangi merge; disarankan masuk PR lanjutan.
- Temuan (rendah, confirmed): `beranda/page.tsx:41` memanggil empat use case yang masing-masing memanggil `requireWarga()`, sehingga sesi diresolusi empat kali per render. Dapat diperbaiki dengan satu `requireWarga()` di page atau pembungkusan `cache()`.
- Risiko yang sudah tercatat di laporan PR dan tetap berlaku: dua operasi tulis PIN belum atomik, dan halaman warga belum pernah dirender dengan data nyata di browser.

## 3. Simulasi merge

Dua urutan diuji pada checkout lokal, tanpa menyentuh `main` atau remote:

| Urutan                                 | Hasil                                                                 |
| -------------------------------------- | --------------------------------------------------------------------- |
| #73 → #74 → #75                        | konflik tunggal di `src/app/globals.css`; sisanya bersih              |
| #75 → #74 → #73                        | konflik tunggal pada file yang sama; sisanya bersih                   |

Setelah resolusi, `git diff` antara hasil kedua urutan kosong: **urutan tidak mengubah konten akhir**. Hasil gabungan diuji dan lulus `format:check`, `typecheck`, `lint` (0 error, 7 warning lama `no-img-element`), `test:unit` (199 file / 1.766 test), dan `build`.

Integration test tidak dijalankan pada tree gabungan karena ketiga PR tidak mengubah schema, migration, atau query tenant (SKIPPED, alasan tercatat); CI menjalankannya per PR dan sudah success.

## 4. Urutan merge yang direkomendasikan

### Langkah 1 — merge #75 (CI dedup)

Alasan: satu-satunya PR yang menyentuh `.github/workflows/ci.yml`, tidak bersinggungan dengan kode aplikasi, dan langsung berlaku untuk semua PR berikutnya (satu run per commit, `concurrency` per PR, push ke `main` tetap diverifikasi). Nama job tidak berubah sehingga required check tidak perlu disesuaikan.

Efek samping yang diharapkan: setelah merge, push ke branch fitur tidak lagi memicu run; sinyal untuk PR #74/#73 hanya datang dari event `pull_request`.

### Langkah 2 — merge #74 (menu admin)

Alasan: diff kecil dan mandiri; merge setelah #75 bersih tanpa konflik. Menyelesaikan lebih dulu membuat branch warga yang lebih besar yang menanggung resolusi CSS.

### Langkah 3 — merge #73 (halaman warga)

Sebelum merge, branch harus mengambil `main` terbaru, lalu satu konflik CSS diselesaikan (bagian 5). Setelah push, tunggu check PR hijau sebelum merge.

Alternatif: tukar langkah 2 dan 3. Hasil akhir identik; hanya pihak yang menyelesaikan konflik CSS yang berbeda.

## 5. Penanganan konflik `src/app/globals.css`

**Penyebab.** Kedua branch menambahkan blok baru pada titik sisip yang sama: tepat setelah blok media query `.login-*`, sebelum `@media (prefers-reduced-motion: reduce)`. Git tidak punya konteks pembeda sehingga menghasilkan satu hunk konflik; tidak ada baris yang diubah atau dihapus di kedua sisi.

**Resolusi.** Pertahankan kedua blok. Selector-nya terpisah (`.warga-page *` vs `.admin-nav-*`), jadi urutan tidak memengaruhi hasil. Teks final:

```css
/* Halaman layanan mandiri warga */
.warga-page {
  padding-block: 44px 64px;
}

.warga-page .dashboard-section {
  margin-top: 18px;
}

.warga-page .dashboard-section ul {
  margin: 10px 0 0;
  padding-left: 20px;
  color: var(--color-text-muted);
}

.warga-page .dashboard-section li + li {
  margin-top: 6px;
}

.admin-nav-pending {
  cursor: not-allowed;
  opacity: 0.72;
}

.admin-nav-badge {
  margin-left: auto;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
```

**Perintah di branch warga.**

```bash
git switch task/warga-layanan-mandiri
git fetch origin
git merge origin/main            # konflik hanya di src/app/globals.css
# selesaikan seperti cuplikan di atas (pertahankan kedua blok)
npx prettier --write src/app/globals.css
git add src/app/globals.css
git commit                       # merge commit, pesan bawaan dapat dipertahankan
npm run format:check && npm run typecheck && npm run lint && npm run test:unit && npm run build
git push origin task/warga-layanan-mandiri
```

Jangan memakai `git checkout --ours/--theirs` pada file ini: keduanya membuang salah satu blok dan membuat menu admin atau halaman warga kehilangan gayanya.

## 6. Verifikasi setelah tiap merge

1. Setelah #75: pastikan run `push` ke `main` muncul dan hijau, lalu cek PR #74/#73 hanya menghasilkan satu run per commit.
2. Setelah #74: buka `/beranda` sebagai admin desa dan pastikan sidebar menampilkan grup dan item "Segera" tanpa tautan mati, serta item aktif memakai `aria-current="page"`.
3. Setelah #73: buka `/layanan-mandiri/beranda` dengan akun warga hasil seed, lalu `/layanan-mandiri/ubah-pin`; pastikan tidak ada loop redirect dan pesan PIN tampil benar. Ini menutup risiko "belum pernah dirender dengan data nyata".

## 7. Rollback

- Setiap PR di-merge sebagai squash commit mengikuti gaya riwayat `main` (`(#67)`), sehingga rollback cukup `git revert <sha>` per PR.
- Blok CSS bersifat aditif dan selectornya terpisah, jadi me-revert salah satu PR tidak merusak gaya PR lain.
- #75 tidak mengubah nama job, sehingga me-revert-nya tidak meninggalkan required check yang menggantung.

## 8. Validasi

| Pemeriksaan                        | Perintah                                                             | Hasil                                                         |
| ---------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| Format (tree gabungan)             | `npm run format:check`                                               | PASS — "All matched files use Prettier code style!"           |
| Typecheck (tree gabungan)          | `npm run typecheck`                                                  | PASS                                                          |
| Lint (tree gabungan)               | `npm run lint`                                                       | PASS — 0 error, 7 warning lama                                |
| Unit test (tree gabungan)          | `npm run test:unit`                                                  | PASS — 199 file, 1.766 test                                   |
| Build (tree gabungan)              | `npm run build`                                                      | PASS                                                          |
| Kesetaraan dua urutan merge        | `git diff <hasil-urutan-A> <hasil-urutan-B>`                         | PASS — tidak ada perbedaan                                    |
| Integration test (tree gabungan)   | `TEST_DATABASE_URL=... npm run test:integration`                     | SKIPPED — tidak ada perubahan schema/query tenant pada ketiga PR; CI per PR sudah success |
| Check GitHub Actions ketiga PR     | GitHub API `actions/runs`                                            | PASS — semua job success untuk `8f4a248`, `5ca76cd`, `a7f91dd` |

## 9. Risiko tersisa

1. Konflik hanya terverifikasi terhadap `main` saat ini (`cb2026f`). Bila ada PR lain yang menyentuh `globals.css` lebih dulu, jumlah konflik dapat bertambah.
2. `paths-ignore` pada `pull_request` berpotensi menahan PR dokumentasi bila check diwajibkan branch protection.
3. Temuan catch-all error pada ubah PIN belum diperbaiki di PR #73; pesan "PIN lama tidak sesuai" masih dapat muncul untuk kegagalan non-PIN.
4. Menu super admin kemungkinan kosong karena tidak ada modul platform di database.
5. Halaman warga dan sidebar belum diverifikasi lewat render nyata; langkah 6.2 dan 6.3 adalah verifikasi manual yang disarankan sebelum atau segera setelah merge.

## 10. Kesimpulan

Ketiga PR layak di-merge. Urutan yang disarankan: **#75 → #74 → #73**, dengan #73 mengambil `main` terbaru dan menyelesaikan satu konflik aditif di `globals.css`. Tidak ada konflik lain, dan hasil gabungan sudah lulus seluruh pemeriksaan lokal. Merge tetap menunggu keputusan reviewer; laporan ini tidak melakukan merge, deploy, atau perubahan branch protection.
