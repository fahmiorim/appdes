-- B2 preflight — read-only.
--
-- Jalankan SEBELUM migration 0002_b2_dtks_suplemen_composite_fk.sql pada
-- salinan database (bukan production):
--   mysql --default-character-set=utf8mb4 <nama_database_salinan> < B2-preflight.sql
--
-- `<nama_database_salinan>` wajib diisi: seluruh tabel di bawah dirujuk tanpa
-- kualifikasi database, sehingga tanpa nama database mysql menolak perintah
-- dengan `ERROR 1046 (3D000): No database selected`.
--
-- Mencakup seluruh relasi yang ditegakkan composite FK oleh migration 0002:
--   dtks.rtm_id, dtks.keluarga_id,
--   dtks_anggota.dtks_id, dtks_anggota.penduduk_id,
--   dtks_ref_lampiran.dtks_id, dtks_ref_lampiran.lampiran_id,
--   suplemen_terdata.suplemen_id, suplemen_terdata.penduduk_id,
--   suplemen_terdata.keluarga_id.
-- Relasi junction lampiran dilaporkan dua arah karena `dtks_ref_lampiran`
-- belum punya `village_id` sebelum migration; desa child diambil dari DTKS.
--
-- Setiap baris hasil adalah referensi yang akan ditolak bila composite FK
-- diterapkan:
--   * jenis = 'orphan'       -> parent_id tidak ada sama sekali
--   * jenis = 'cross-tenant' -> parent_id ada, tetapi village_id parent berbeda
--
-- Hasil kosong = aman untuk migration. Query tidak menulis data dan tidak
-- mengembalikan NIK/nama/alamat; hanya ID internal dan village_id.
--
-- Migration 0002 memiliki guard yang setara dan berhenti sendiri bila query ini
-- menghasilkan baris. Query ini dipakai untuk melihat detail sebelum/sesudah
-- percobaan migration; tidak ada data yang diperbaiki otomatis.

START TRANSACTION READ ONLY;

SELECT 'dtks.rtm_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM rtm px WHERE px.id = c.rtm_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.rtm_id AS parent_id,
       (SELECT px.village_id FROM rtm px WHERE px.id = c.rtm_id) AS parent_village_id
FROM dtks c
LEFT JOIN rtm p ON p.village_id = c.village_id AND p.id = c.rtm_id
WHERE p.id IS NULL

UNION ALL
SELECT 'dtks.keluarga_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM families px WHERE px.id = c.keluarga_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.keluarga_id AS parent_id,
       (SELECT px.village_id FROM families px WHERE px.id = c.keluarga_id) AS parent_village_id
FROM dtks c
LEFT JOIN families p ON p.village_id = c.village_id AND p.id = c.keluarga_id
WHERE c.keluarga_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'dtks_anggota.dtks_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM dtks px WHERE px.id = c.dtks_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.dtks_id AS parent_id,
       (SELECT px.village_id FROM dtks px WHERE px.id = c.dtks_id) AS parent_village_id
FROM dtks_anggota c
LEFT JOIN dtks p ON p.village_id = c.village_id AND p.id = c.dtks_id
WHERE p.id IS NULL

UNION ALL
SELECT 'dtks_anggota.penduduk_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.penduduk_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.penduduk_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.penduduk_id) AS parent_village_id
FROM dtks_anggota c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.penduduk_id
WHERE p.id IS NULL

UNION ALL
SELECT 'dtks_ref_lampiran.dtks_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM dtks px WHERE px.id = c.dtks_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, NULL AS child_village_id,
       c.dtks_id AS parent_id,
       (SELECT px.village_id FROM dtks px WHERE px.id = c.dtks_id) AS parent_village_id
FROM dtks_ref_lampiran c
LEFT JOIN dtks p ON p.id = c.dtks_id
WHERE p.id IS NULL

UNION ALL
SELECT 'dtks_ref_lampiran.lampiran_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM dtks_lampiran px WHERE px.id = c.lampiran_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, (SELECT dx.village_id FROM dtks dx WHERE dx.id = c.dtks_id) AS child_village_id,
       c.lampiran_id AS parent_id,
       (SELECT px.village_id FROM dtks_lampiran px WHERE px.id = c.lampiran_id) AS parent_village_id
FROM dtks_ref_lampiran c
LEFT JOIN dtks_lampiran p ON p.id = c.lampiran_id
WHERE p.id IS NULL
   OR EXISTS (
     SELECT 1
     FROM dtks d
     JOIN dtks_lampiran l ON l.id = c.lampiran_id
     WHERE d.id = c.dtks_id AND d.village_id <> l.village_id
   )

UNION ALL
SELECT 'suplemen_terdata.suplemen_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM suplemen px WHERE px.id = c.id_suplemen) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.id_suplemen AS parent_id,
       (SELECT px.village_id FROM suplemen px WHERE px.id = c.id_suplemen) AS parent_village_id
FROM suplemen_terdata c
LEFT JOIN suplemen p ON p.village_id = c.village_id AND p.id = c.id_suplemen
WHERE p.id IS NULL

UNION ALL
SELECT 'suplemen_terdata.penduduk_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.penduduk_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.penduduk_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.penduduk_id) AS parent_village_id
FROM suplemen_terdata c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.penduduk_id
WHERE c.penduduk_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'suplemen_terdata.keluarga_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM families px WHERE px.id = c.keluarga_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.keluarga_id AS parent_id,
       (SELECT px.village_id FROM families px WHERE px.id = c.keluarga_id) AS parent_village_id
FROM suplemen_terdata c
LEFT JOIN families p ON p.village_id = c.village_id AND p.id = c.keluarga_id
WHERE c.keluarga_id IS NOT NULL AND p.id IS NULL

ORDER BY relasi, jenis, child_id;

ROLLBACK;
