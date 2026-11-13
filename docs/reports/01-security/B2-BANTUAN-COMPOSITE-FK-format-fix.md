# B2 Bantuan — Perbaikan Format Check CI (PR #25)

- **Tanggal:** 14 November 2026
- **Branch:** `task/B2-BANTUAN-COMPOSITE-FK`
- **Base PR:** `main` — `3aad86bb224801424dc62bc4f40faebe3f220d18`
- **HEAD sebelum perbaikan:** `07a5d0d5be6ce9b54a6b9c91703c8cd7ad52b727`
- **Commit perbaikan:** `5b1e7c4`
- **Tujuan:** Menuntaskan kegagalan CI pada PR #25, yaitu step **Format check**
  (`prettier --check .`), tanpa mengubah perilaku test.

## Kondisi awal dan analisis

Run CI [`43471296684`](https://github.com/fahmiorim/appdes/actions/runs/43471296684)
pada `07a5d0d` gagal pada job **Unit test dan quality check**:

- Typecheck: PASS
- Lint: PASS
- Format check: FAIL
- Unit test: SKIPPED (tidak dijalankan karena step sebelumnya gagal)
- Integration test (MySQL 8): PASS

Log Prettier menyebut satu berkas:

```text
[warn] src/db/b2-bantuan-composite-fk.integration.test.ts
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
```

Penyebabnya satu ekspresi `db.insert(bantuanPeserta).values(...)` pada test
penolakan RTM lintas desa yang masih dipecah menjadi tiga baris. Dengan
`printWidth` repo, Prettier menggabungkannya menjadi satu baris. Commit
`07a5d0d` ("style: format B2 bantuan integration test") tidak memuat perubahan
yang diminta Prettier, sehingga kegagalan berulang.

## File yang diperiksa

- `.github/workflows/ci.yml` (definisi step dan environment CI)
- `package.json` (skrip `format:check`, `typecheck`, `lint`, `test`,
  `test:integration`)
- `src/db/b2-bantuan-composite-fk.integration.test.ts`
- Log job CI format check run `43471296684`

## File yang diubah

1. `src/db/b2-bantuan-composite-fk.integration.test.ts` — hasil
   `npx prettier --write` (1 insertion, 3 deletions). Tidak ada perubahan
   assertion, fixture, atau logika test.
2. `docs/reports/01-security/B2-BANTUAN-COMPOSITE-FK-format-fix.md` — laporan
   ini.

## Validasi yang dijalankan

Integration test memakai instance MySQL 8.0.30 disposable buatan sendiri di
`127.0.0.1:3309` (datadir `node_modules/.cache/b2-mysql`, database
`desa_test_bantuan_local`), bukan database dev atau produksi.

| Perintah | Hasil |
|---|---|
| `npm run format:check` | PASS — `All matched files use Prettier code style!` |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:unit` | PASS — 190 file, 1711 test |
| `TEST_DATABASE_URL='mysql://root@127.0.0.1:3309/desa_test_bantuan_local' TEST_DATABASE_ACK=1 NODE_ENV=test npm run test:integration` | PASS — 23 file, 127 test |
| CI GitHub Actions setelah push | dilihat pada komentar PR #25 |

Sebelum perbaikan, `npx prettier --check src/db/b2-bantuan-composite-fk.integration.test.ts`
gagal secara lokal dengan pesan yang sama seperti CI.

## Risiko dan batasan

- Perubahan hanya format; tidak ada perilaku test yang berubah.
- Suite integrasi lokal memakai MySQL 8.0.30, sedangkan CI memakai image
  `mysql:8.0`; hasil CI tetap menjadi acuan akhir.
- PR #25 tidak di-merge dan tidak di-deploy; keputusan merge menunggu reviewer.

## Kesimpulan

Penyebab kegagalan Format check adalah satu ekspresi multi-baris yang belum
diformat Prettier. Setelah `prettier --write`, seluruh pemeriksaan lokal
(format, typecheck, lint, unit test, integration test MySQL 8) PASS. Perbaikan
di-push ke branch PR yang sama untuk memicu CI ulang.
