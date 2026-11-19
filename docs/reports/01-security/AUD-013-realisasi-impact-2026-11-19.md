# AUD-013 — Dampak impor APBDes yang diduga mengosongkan realisasi

- **Tanggal:** 19 November 2026
- **Jenis task:** audit read-only (tanpa perubahan kode, schema, atau data)
- **Branch:** `task/AUD-013-realisasi-impact-audit`
- **Base commit:** `34c8cc5` (`main`)
- **Commit laporan:** diisi pada bagian penyerahan

## 1. Tujuan

Menjawab pertanyaan: _apakah impor APBDes yang sudah berjalan mengosongkan realisasi yang sudah tersimpan, dan bila ya, seberapa luas dampaknya?_

## 2. Kesimpulan

**Kode impor APBDes yang ada di `main` tidak pernah mengosongkan realisasi baris yang sudah ada.** Pada konflik unique key, impor hanya menulis `anggaran` dan `updated_at`; kolom `realisasi` hanya terisi saat baris baru dibuat (INSERT), dengan nilai `0.00` dari berkas.

Pengosongan realisasi hanya ada pada commit `86be91f` di branch `task/AUD-013-apbdes-import-lock`, yang **belum dan tidak pernah masuk `main`**, lalu diperbaiki di `48e7222` pada branch `task/AUD-013-apbdes-realisasi-policy`. Jadi dampak terhadap data hasil deployment dari `main` adalah **tidak ada**.

## 3. Timeline kode

| Commit | Lokasi | Perilaku impor terhadap `realisasi` |
| --- | --- | --- |
| `e57ecdd` | `main` (commit awal) | `onDuplicateKeyUpdate` hanya `anggaran` + `updatedAt`; baris baru dibuat `0.00` |
| `90e6b35` | `main` | Menambah kunci + agregasi pada `saveKeuanganNilai`; `upsertKeuanganBatch` **tidak diubah** |
| `86be91f` | branch AUD-013 (tidak di `main`) | Impor dialihkan ke `saveKeuanganNilai` dengan `realisasi: "0.00"` → realisasi tersimpan tertimpa nol saat update |
| `48e7222` | branch kebijakan realisasi | Opsi `pertahankanRealisasi`; realisasi tersimpan dipertahankan, baris baru `0.00` |

Riwayat `src/features/keuangan/infrastructure/keuangan-repository.ts` di `main` hanya berisi dua commit di atas (`e57ecdd`, `90e6b35`), sehingga tidak ada varian lain yang pernah menulis realisasi pada jalur update.

## 4. Bukti

### 4.1 Kode impor di `main`

```ts
export async function upsertKeuanganBatch(rows: (typeof keuangan.$inferInsert)[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const data of rows) {
      await tx
        .insert(keuangan)
        .values(data)
        .onDuplicateKeyUpdate({
          set: { anggaran: data.anggaran, updatedAt: new Date() },
        });
    }
  });
}
```

`set` tidak memuat `realisasi`, sehingga nilai lama pada baris `(village_id, tahun, template_uuid)` yang sudah ada tetap utuh. Nilai `realisasi: "0.00"` dari `transformToUpsert` hanya dipakai cabang INSERT, yaitu rekening yang belum pernah ada pada tahun tersebut.

### 4.2 Regresi tidak pernah masuk `main`

```text
$ git merge-base --is-ancestor 86be91f main
TIDAK ancestor (exit 1)
```

`git log --oneline main -- src/features/keuangan/application/apbdes-import-use-cases.ts` juga hanya menampilkan `e57ecdd`, jadi pemanggilan impor di `main` masih memakai `upsertKeuanganBatch` versi lama.

### 4.3 Data lokal

Pemeriksaan read-only (`SELECT` agregat, tanpa menulis apa pun) pada MySQL lokal `127.0.0.1:3306`:

| Database | Baris `keuangan` | Desa | Tahun | Baris `realisasi = 0` | Baris `keuangan_transaksi` |
| --- | --- | --- | --- | --- | --- |
| `desa_dev` | 0 | 0 | 0 | 0 | 0 |
| `sid_staging_local` | 0 | 0 | 0 | 0 | 0 |

Tidak ada data keuangan pada kedua database, sehingga tidak ada bukti pengosongan realisasi di lingkungan lokal. Database production tidak diakses.

## 5. Apakah dampak bisa dideteksi setelah kejadian?

Tidak sepenuhnya. Aplikasi tidak menyimpan riwayat nilai realisasi per baris:

- `recordAuditEvent` untuk simpan keuangan hanya mencatat `{ jenis, baris }`, bukan nilai sebelum/sesudah.
- Kolom `realisasi` tidak diturunkan ulang dari tabel lain. `keuangan_transaksi` hanya didefinisikan di schema (`src/db/schema/keuangan.ts`) dan tidak dipakai kode aplikasi; `keuangan_triwulan` disimpan terpisah dan tidak menulis balik ke `keuangan.realisasi`.

Karena itu, bila ada lingkungan yang sempat menjalankan branch `86be91f`, satu-satunya bukti pasti adalah perbandingan dengan backup.

### 5.1 Query pembanding backup (paling akurat)

Jalankan pada salinan database, dengan `backup_keuangan` adalah tabel hasil restore backup terakhir sebelum kejadian:

```sql
SELECT k.village_id, k.tahun, k.template_uuid,
       b.realisasi AS realisasi_backup, k.realisasi AS realisasi_sekarang
FROM keuangan k
JOIN backup_keuangan b
  ON b.village_id = k.village_id
 AND b.tahun = k.tahun
 AND b.template_uuid = k.template_uuid
WHERE b.realisasi <> 0 AND k.realisasi = 0;
```

### 5.2 Query indikasi tanpa backup (heuristik, bukan bukti)

Baris dengan realisasi nol tetapi memiliki realisasi triwulan pada tahun yang sama patut diperiksa—kondisi ini juga bisa berasal dari salah input manual, jadi konfirmasi ke operator desa tetap diperlukan:

```sql
SELECT k.village_id, k.tahun, COUNT(*) AS rekening_mencurigakan
FROM keuangan k
JOIN keuangan_triwulan t
  ON t.village_id = k.village_id
 AND t.tahun = k.tahun
 AND t.template_uuid = k.template_uuid
WHERE k.realisasi = 0
  AND (t.tw1 + t.tw2 + t.tw3 + t.tw4) > 0
GROUP BY k.village_id, k.tahun;
```

Bila waktu deploy branch yang bermasalah diketahui, jendela `updated_at` dapat mempersempit kandidat:

```sql
SELECT village_id, tahun, template_uuid, anggaran, realisasi, updated_at
FROM keuangan
WHERE realisasi = 0
  AND updated_at BETWEEN :deploy_mulai AND :deploy_selesai
ORDER BY village_id, tahun, template_uuid;
```

## 6. Pemulihan bila ditemukan baris terdampak

1. Identifikasi baris lewat query 5.1 (atau 5.2 + konfirmasi operator).
2. Pulihkan nilai `realisasi` dari backup, atau minta operator desa mengisi ulang realisasi berdasarkan laporan triwulan/SPJ.
3. Jangan menyalin `realisasi` dari baris induk ke anak atau sebaliknya; nilai per rekening tetap berasal dari input resmi desa.

Tidak ada skrip perbaikan otomatis yang disediakan dalam task ini, karena penetapan nilai realisasi adalah keputusan data, bukan kode.

## 7. Koreksi laporan sebelumnya

Laporan `docs/reports/01-security/AUD-013-apbdes-import-lock-2026-11-19.md` memuat baris tabel "Nilai realisasi impor: selalu `0.00`, menimpa realisasi tersimpan". Untuk kode yang ada di `main`, pernyataan itu tidak akurat: penimpaan hanya terjadi pada commit `86be91f` di branch tersebut dan sudah diperbaiki. Baris tabel tersebut dikoreksi pada branch `task/AUD-013-apbdes-realisasi-policy` (commit terpisah) agar laporan sesuai kode.

## 8. File yang diperiksa

- `src/features/keuangan/infrastructure/keuangan-repository.ts` (`main` dan branch)
- `src/features/keuangan/application/apbdes-import-use-cases.ts`
- `src/features/keuangan/domain/apbdes-import.ts`
- `src/features/keuangan/application/keuangan-use-cases.ts`
- `src/db/schema/keuangan.ts`
- Riwayat git: `e57ecdd`, `90e6b35`, `86be91f`, `48e7222`
- Database lokal `desa_dev`, `sid_staging_local` (read-only, agregat)

## 9. File yang diubah

Hanya laporan ini. Tidak ada perubahan source code, schema, migration, atau data.

## 10. Validasi

| Pemeriksaan | Perintah | Hasil |
| --- | --- | --- |
| Riwayat file di `main` | `git log --oneline main -- src/features/keuangan/infrastructure/keuangan-repository.ts` | PASS — 2 commit |
| Regresi bukan ancestor `main` | `git merge-base --is-ancestor 86be91f main` | PASS — exit 1 (bukan ancestor) |
| Isi upsert di `main` | `git show main:src/features/keuangan/infrastructure/keuangan-repository.ts` | PASS — `set` hanya `anggaran`, `updatedAt` |
| Pemakaian `keuangan_transaksi` | `code_search` seluruh repo | PASS — hanya definisi schema |
| Data lokal | `SELECT` agregat via `mysql2` ke `desa_dev`, `sid_staging_local` | PASS — 0 baris keuangan |
| Prettier | `npx prettier --check docs/reports/01-security/AUD-013-realisasi-impact-2026-11-19.md` | lihat bagian penyerahan |
| Typecheck/lint/test | — | SKIPPED — hanya dokumentasi |

## 11. Risiko dan keterbatasan

- Tidak ada akses ke database production; kesimpulan "tidak ada dampak" berlaku untuk deployment yang dibangun dari `main`.
- Apakah branch `86be91f` pernah dijalankan terhadap database berisi data nyata (mis. staging) tidak dapat diverifikasi dari repository. Bila pernah, gunakan prosedur bagian 5–6.
- Deteksi tanpa backup bersifat heuristik dan dapat menghasilkan positif palsu.
- Realisasi yang diisi manual tanpa data triwulan tidak dapat direkonstruksi dari database.

## 12. Rekomendasi

1. Tidak perlu tindakan data untuk deployment dari `main`.
2. Bila ada lingkungan staging yang memakai branch tersebut, jalankan query 5.1/5.2 sebelum membersihkan lingkungan.
3. Merge PR kebijakan realisasi (#165) agar perilaku "impor hanya mengganti pagu" terkunci oleh test, sehingga regresi serupa tidak lolos lagi.
