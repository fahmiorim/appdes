# Perbaikan FK `potensi_desa_village_fk` Ganda

- **Task:** Membersihkan deklarasi foreign key ganda pada tabel `potensi_desa` yang masuk ke `main` melalui PR #213.
- **Tanggal:** 2026-11-21
- **Branch:** `fix/potensi-fk-duplikat`
- **Base commit:** `d61e454b` (squash merge PR #213 di `main`)

## Kondisi awal

`src/db/schema/potensi.ts` mendeklarasikan dua `foreignKey` identik dengan nama
`potensi_desa_village_fk` pada tabel `potensi_desa`:

```ts
foreignKey({
  name: "potensi_desa_village_fk",
  columns: [t.villageId],
  foreignColumns: [villages.id],
}).onDelete("cascade"),
```

Deklarasi pertama berada di awal daftar, deklarasi kedua berada setelah index
`potensi_desa_village_category_active_idx`. Duplikat ini adalah sisa penggabungan
saat PR #213 memberi nama eksplisit pada FK untuk mencegah churn generator
migrasi; satu salinan seharusnya dihapus.

Dampak: definisi indeks tabel menjadi tidak konsisten, `drizzle-kit generate`
berpotensi menghasilkan DDL constraint duplikat, dan daftar nama constraint pada
`src/db/tenant-composite-fk.integration.test.ts` menjadi ambigu.

## Perubahan

- `src/db/schema/potensi.ts`: menghapus satu dari dua deklarasi
  `potensi_desa_village_fk` yang identik. FK tenant tunggal `villageId → villages.id`
  dengan `onDelete("cascade")` tetap ada, demikian pula FK komposit
  `potensi_desa_tenant_fk`, `potensi_indikator_village_fk`, dan
  `potensi_indikator_tenant_fk`.
- Tidak ada perubahan migrasi: migrasi `0033_absensi_kepegawaian.sql` sudah hanya
  memuat satu constraint tersebut, sehingga perilaku database tidak berubah.

## Pemeriksaan

| Pemeriksaan | Hasil |
| ----------- | ----- |
| `npm run typecheck` | **PASS** |
| `npx vitest run src/db/migrasi-paritas.test.ts` | **PASS** (9 test) |
| `npx prettier --check src/db/schema/potensi.ts` | **PASS** (file tidak berubah setelah format) |

Integration test MySQL (`tenant-composite-fk`) tidak dapat dijalankan di lokal
karena tidak tersedia Docker/MySQL; verifikasi dilakukan pada job CI.

## Risiko tersisa

- Perubahan hanya menyentuh deklarasi skema TypeScript; tidak ada DDL baru. Namun
  perlu dipastikan job integration test MySQL tetap melihat 88 nama constraint
  yang sama setelah duplikat dihapus.

## Status

Siap review.
