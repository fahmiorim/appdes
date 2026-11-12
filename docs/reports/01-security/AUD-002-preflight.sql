-- AUD-002 preflight — read-only.
--
-- Jalankan SEBELUM migration 0001 pada salinan database (bukan production):
--   mysql --default-character-set=utf8mb4 < AUD-002-preflight.sql
--
-- Mencakup seluruh relasi tenant-bound yang diaudit: 19 relasi yang ditegakkan
-- composite FK pada migration 0001 dan 44 relasi lain yang masih deferred.
-- Setiap baris hasil adalah referensi yang akan ditolak bila composite FK diterapkan:
--   * jenis = 'orphan'       -> parent_id tidak ada sama sekali
--   * jenis = 'cross-tenant' -> parent_id ada, tetapi village_id parent berbeda
--
-- Hasil kosong = aman untuk migration. Query tidak menulis data dan tidak
-- mengembalikan NIK/nama/alamat; hanya ID internal dan village_id.

START TRANSACTION READ ONLY;

SELECT 'families.region_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM regions px WHERE px.id = c.region_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.region_id AS parent_id,
       (SELECT px.village_id FROM regions px WHERE px.id = c.region_id) AS parent_village_id
FROM families c
LEFT JOIN regions p ON p.village_id = c.village_id AND p.id = c.region_id
WHERE c.region_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'residents.family_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM families px WHERE px.id = c.family_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.family_id AS parent_id,
       (SELECT px.village_id FROM families px WHERE px.id = c.family_id) AS parent_village_id
FROM residents c
LEFT JOIN families p ON p.village_id = c.village_id AND p.id = c.family_id
WHERE c.family_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'residents.rtm_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM rtm px WHERE px.id = c.rtm_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.rtm_id AS parent_id,
       (SELECT px.village_id FROM rtm px WHERE px.id = c.rtm_id) AS parent_village_id
FROM residents c
LEFT JOIN rtm p ON p.village_id = c.village_id AND p.id = c.rtm_id
WHERE c.rtm_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'residents.region_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM regions px WHERE px.id = c.region_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.region_id AS parent_id,
       (SELECT px.village_id FROM regions px WHERE px.id = c.region_id) AS parent_village_id
FROM residents c
LEFT JOIN regions p ON p.village_id = c.village_id AND p.id = c.region_id
WHERE c.region_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'rtm.region_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM regions px WHERE px.id = c.region_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.region_id AS parent_id,
       (SELECT px.village_id FROM regions px WHERE px.id = c.region_id) AS parent_village_id
FROM rtm c
LEFT JOIN regions p ON p.village_id = c.village_id AND p.id = c.region_id
WHERE c.region_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'resident_mutations.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM resident_mutations c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'resident_mutations.from_region_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM regions px WHERE px.id = c.from_region_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.from_region_id AS parent_id,
       (SELECT px.village_id FROM regions px WHERE px.id = c.from_region_id) AS parent_village_id
FROM resident_mutations c
LEFT JOIN regions p ON p.village_id = c.village_id AND p.id = c.from_region_id
WHERE c.from_region_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'resident_mutations.to_region_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM regions px WHERE px.id = c.to_region_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.to_region_id AS parent_id,
       (SELECT px.village_id FROM regions px WHERE px.id = c.to_region_id) AS parent_village_id
FROM resident_mutations c
LEFT JOIN regions p ON p.village_id = c.village_id AND p.id = c.to_region_id
WHERE c.to_region_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'letters.type_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM letter_types px WHERE px.id = c.type_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.type_id AS parent_id,
       (SELECT px.village_id FROM letter_types px WHERE px.id = c.type_id) AS parent_village_id
FROM letters c
LEFT JOIN letter_types p ON p.village_id = c.village_id AND p.id = c.type_id
WHERE c.type_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'letters.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM letters c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'permohonan_surat.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM permohonan_surat c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'permohonan_surat.letter_type_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM letter_types px WHERE px.id = c.letter_type_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.letter_type_id AS parent_id,
       (SELECT px.village_id FROM letter_types px WHERE px.id = c.letter_type_id) AS parent_village_id
FROM permohonan_surat c
LEFT JOIN letter_types p ON p.village_id = c.village_id AND p.id = c.letter_type_id
WHERE c.letter_type_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'permohonan_surat.letter_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM letters px WHERE px.id = c.letter_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.letter_id AS parent_id,
       (SELECT px.village_id FROM letters px WHERE px.id = c.letter_id) AS parent_village_id
FROM permohonan_surat c
LEFT JOIN letters p ON p.village_id = c.village_id AND p.id = c.letter_id
WHERE c.letter_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'kia.ibu_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.ibu_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.ibu_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.ibu_id) AS parent_village_id
FROM kia c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.ibu_id
WHERE c.ibu_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'kia.anak_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.anak_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.anak_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.anak_id) AS parent_village_id
FROM kia c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.anak_id
WHERE c.anak_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'ibu_hamil.posyandu_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM posyandu px WHERE px.id = c.posyandu_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.posyandu_id AS parent_id,
       (SELECT px.village_id FROM posyandu px WHERE px.id = c.posyandu_id) AS parent_village_id
FROM ibu_hamil c
LEFT JOIN posyandu p ON p.village_id = c.village_id AND p.id = c.posyandu_id
WHERE c.posyandu_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'ibu_hamil.kia_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM kia px WHERE px.id = c.kia_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.kia_id AS parent_id,
       (SELECT px.village_id FROM kia px WHERE px.id = c.kia_id) AS parent_village_id
FROM ibu_hamil c
LEFT JOIN kia p ON p.village_id = c.village_id AND p.id = c.kia_id
WHERE c.kia_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'bulanan_anak.posyandu_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM posyandu px WHERE px.id = c.posyandu_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.posyandu_id AS parent_id,
       (SELECT px.village_id FROM posyandu px WHERE px.id = c.posyandu_id) AS parent_village_id
FROM bulanan_anak c
LEFT JOIN posyandu p ON p.village_id = c.village_id AND p.id = c.posyandu_id
WHERE c.posyandu_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'bulanan_anak.kia_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM kia px WHERE px.id = c.kia_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.kia_id AS parent_id,
       (SELECT px.village_id FROM kia px WHERE px.id = c.kia_id) AS parent_village_id
FROM bulanan_anak c
LEFT JOIN kia p ON p.village_id = c.village_id AND p.id = c.kia_id
WHERE c.kia_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'analisis_indikator.kategori_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM analisis_kategori px WHERE px.id = c.kategori_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.kategori_id AS parent_id,
       (SELECT px.village_id FROM analisis_kategori px WHERE px.id = c.kategori_id) AS parent_village_id
FROM analisis_indikator c
LEFT JOIN analisis_kategori p ON p.village_id = c.village_id AND p.id = c.kategori_id
WHERE c.kategori_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'bantuan_peserta.program_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM bantuan_program px WHERE px.id = c.program_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.program_id AS parent_id,
       (SELECT px.village_id FROM bantuan_program px WHERE px.id = c.program_id) AS parent_village_id
FROM bantuan_peserta c
LEFT JOIN bantuan_program p ON p.village_id = c.village_id AND p.id = c.program_id
WHERE c.program_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'bantuan_peserta.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM bantuan_peserta c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'bantuan_peserta.family_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM families px WHERE px.id = c.family_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.family_id AS parent_id,
       (SELECT px.village_id FROM families px WHERE px.id = c.family_id) AS parent_village_id
FROM bantuan_peserta c
LEFT JOIN families p ON p.village_id = c.village_id AND p.id = c.family_id
WHERE c.family_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'bantuan_peserta.rtm_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM rtm px WHERE px.id = c.rtm_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.rtm_id AS parent_id,
       (SELECT px.village_id FROM rtm px WHERE px.id = c.rtm_id) AS parent_village_id
FROM bantuan_peserta c
LEFT JOIN rtm p ON p.village_id = c.village_id AND p.id = c.rtm_id
WHERE c.rtm_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'bantuan_peserta.kelompok_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM kelompok px WHERE px.id = c.kelompok_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.kelompok_id AS parent_id,
       (SELECT px.village_id FROM kelompok px WHERE px.id = c.kelompok_id) AS parent_village_id
FROM bantuan_peserta c
LEFT JOIN kelompok p ON p.village_id = c.village_id AND p.id = c.kelompok_id
WHERE c.kelompok_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'bukti_pengiriman_notifikasi.pengaduan_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM pengaduan px WHERE px.id = c.pengaduan_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.pengaduan_id AS parent_id,
       (SELECT px.village_id FROM pengaduan px WHERE px.id = c.pengaduan_id) AS parent_village_id
FROM bukti_pengiriman_notifikasi c
LEFT JOIN pengaduan p ON p.village_id = c.village_id AND p.id = c.pengaduan_id
WHERE c.pengaduan_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'bumindes_tanah_kas_mutasi.tanah_kas_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM bumindes_tanah_kas px WHERE px.id = c.tanah_kas_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.tanah_kas_id AS parent_id,
       (SELECT px.village_id FROM bumindes_tanah_kas px WHERE px.id = c.tanah_kas_id) AS parent_village_id
FROM bumindes_tanah_kas_mutasi c
LEFT JOIN bumindes_tanah_kas p ON p.village_id = c.village_id AND p.id = c.tanah_kas_id
WHERE c.tanah_kas_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'bumindes_item.buku_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM bumindes_buku px WHERE px.id = c.buku_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.buku_id AS parent_id,
       (SELECT px.village_id FROM bumindes_buku px WHERE px.id = c.buku_id) AS parent_village_id
FROM bumindes_item c
LEFT JOIN bumindes_buku p ON p.village_id = c.village_id AND p.id = c.buku_id
WHERE c.buku_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'perangkat_desa.jabatan_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM jabatan_perangkat px WHERE px.id = c.jabatan_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.jabatan_id AS parent_id,
       (SELECT px.village_id FROM jabatan_perangkat px WHERE px.id = c.jabatan_id) AS parent_village_id
FROM perangkat_desa c
LEFT JOIN jabatan_perangkat p ON p.village_id = c.village_id AND p.id = c.jabatan_id
WHERE c.jabatan_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'berita.kategori_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM berita_kategori px WHERE px.id = c.kategori_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.kategori_id AS parent_id,
       (SELECT px.village_id FROM berita_kategori px WHERE px.id = c.kategori_id) AS parent_village_id
FROM berita c
LEFT JOIN berita_kategori p ON p.village_id = c.village_id AND p.id = c.kategori_id
WHERE c.kategori_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'galeri_foto.album_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM galeri_album px WHERE px.id = c.album_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.album_id AS parent_id,
       (SELECT px.village_id FROM galeri_album px WHERE px.id = c.album_id) AS parent_village_id
FROM galeri_foto c
LEFT JOIN galeri_album p ON p.village_id = c.village_id AND p.id = c.album_id
WHERE c.album_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'dokumen_warga.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM dokumen_warga c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'dtks.rtm_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM rtm px WHERE px.id = c.rtm_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.rtm_id AS parent_id,
       (SELECT px.village_id FROM rtm px WHERE px.id = c.rtm_id) AS parent_village_id
FROM dtks c
LEFT JOIN rtm p ON p.village_id = c.village_id AND p.id = c.rtm_id
WHERE c.rtm_id IS NOT NULL AND p.id IS NULL

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
WHERE c.dtks_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'dtks_anggota.penduduk_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.penduduk_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.penduduk_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.penduduk_id) AS parent_village_id
FROM dtks_anggota c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.penduduk_id
WHERE c.penduduk_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'family_member_logs.family_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM families px WHERE px.id = c.family_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.family_id AS parent_id,
       (SELECT px.village_id FROM families px WHERE px.id = c.family_id) AS parent_village_id
FROM family_member_logs c
LEFT JOIN families p ON p.village_id = c.village_id AND p.id = c.family_id
WHERE c.family_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'family_member_logs.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM family_member_logs c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'area.ref_polygon' AS relasi,
       CASE WHEN (SELECT px.village_id FROM polygon px WHERE px.id = c.ref_polygon) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.ref_polygon AS parent_id,
       (SELECT px.village_id FROM polygon px WHERE px.id = c.ref_polygon) AS parent_village_id
FROM area c
LEFT JOIN polygon p ON p.village_id = c.village_id AND p.id = c.ref_polygon
WHERE c.ref_polygon IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'incoming_letters.classification_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM letter_classifications px WHERE px.id = c.classification_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.classification_id AS parent_id,
       (SELECT px.village_id FROM letter_classifications px WHERE px.id = c.classification_id) AS parent_village_id
FROM incoming_letters c
LEFT JOIN letter_classifications p ON p.village_id = c.village_id AND p.id = c.classification_id
WHERE c.classification_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'inventaris.kategori_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM inventaris_kategori px WHERE px.id = c.kategori_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.kategori_id AS parent_id,
       (SELECT px.village_id FROM inventaris_kategori px WHERE px.id = c.kategori_id) AS parent_village_id
FROM inventaris c
LEFT JOIN inventaris_kategori p ON p.village_id = c.village_id AND p.id = c.kategori_id
WHERE c.kategori_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'inventaris_mutasi.inventaris_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM inventaris px WHERE px.id = c.inventaris_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.inventaris_id AS parent_id,
       (SELECT px.village_id FROM inventaris px WHERE px.id = c.inventaris_id) AS parent_village_id
FROM inventaris_mutasi c
LEFT JOIN inventaris p ON p.village_id = c.village_id AND p.id = c.inventaris_id
WHERE c.inventaris_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'kehadiran_izin.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM kehadiran_izin c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'kelompok.category_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM kelompok_master px WHERE px.id = c.category_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.category_id AS parent_id,
       (SELECT px.village_id FROM kelompok_master px WHERE px.id = c.category_id) AS parent_village_id
FROM kelompok c
LEFT JOIN kelompok_master p ON p.village_id = c.village_id AND p.id = c.category_id
WHERE c.category_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'kelompok_anggota.kelompok_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM kelompok px WHERE px.id = c.kelompok_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.kelompok_id AS parent_id,
       (SELECT px.village_id FROM kelompok px WHERE px.id = c.kelompok_id) AS parent_village_id
FROM kelompok_anggota c
LEFT JOIN kelompok p ON p.village_id = c.village_id AND p.id = c.kelompok_id
WHERE c.kelompok_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'kelompok_anggota.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM kelompok_anggota c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'kontak.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM kontak c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'anggota_grup_kontak.grup_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM kontak_grup px WHERE px.id = c.grup_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.grup_id AS parent_id,
       (SELECT px.village_id FROM kontak_grup px WHERE px.id = c.grup_id) AS parent_village_id
FROM anggota_grup_kontak c
LEFT JOIN kontak_grup p ON p.village_id = c.village_id AND p.id = c.grup_id
WHERE c.grup_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'anggota_grup_kontak.kontak_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM kontak px WHERE px.id = c.kontak_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.kontak_id AS parent_id,
       (SELECT px.village_id FROM kontak px WHERE px.id = c.kontak_id) AS parent_village_id
FROM anggota_grup_kontak c
LEFT JOIN kontak p ON p.village_id = c.village_id AND p.id = c.kontak_id
WHERE c.kontak_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'lapak.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM lapak c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'lapak_produk.lapak_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM lapak px WHERE px.id = c.lapak_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.lapak_id AS parent_id,
       (SELECT px.village_id FROM lapak px WHERE px.id = c.lapak_id) AS parent_village_id
FROM lapak_produk c
LEFT JOIN lapak p ON p.village_id = c.village_id AND p.id = c.lapak_id
WHERE c.lapak_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'letter_dinas.classification_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM letter_classifications px WHERE px.id = c.classification_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.classification_id AS parent_id,
       (SELECT px.village_id FROM letter_classifications px WHERE px.id = c.classification_id) AS parent_village_id
FROM letter_dinas c
LEFT JOIN letter_classifications p ON p.village_id = c.village_id AND p.id = c.classification_id
WHERE c.classification_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'letter_number_archive.letter_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM letters px WHERE px.id = c.letter_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.letter_id AS parent_id,
       (SELECT px.village_id FROM letters px WHERE px.id = c.letter_id) AS parent_village_id
FROM letter_number_archive c
LEFT JOIN letters p ON p.village_id = c.village_id AND p.id = c.letter_id
WHERE c.letter_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'letter_types.classification_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM letter_classifications px WHERE px.id = c.classification_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.classification_id AS parent_id,
       (SELECT px.village_id FROM letter_classifications px WHERE px.id = c.classification_id) AS parent_village_id
FROM letter_types c
LEFT JOIN letter_classifications p ON p.village_id = c.village_id AND p.id = c.classification_id
WHERE c.classification_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'notifikasi_terkirim.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM notifikasi_terkirim c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'outgoing_letters.classification_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM letter_classifications px WHERE px.id = c.classification_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.classification_id AS parent_id,
       (SELECT px.village_id FROM letter_classifications px WHERE px.id = c.classification_id) AS parent_village_id
FROM outgoing_letters c
LEFT JOIN letter_classifications p ON p.village_id = c.village_id AND p.id = c.classification_id
WHERE c.classification_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'pendapat.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM pendapat c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'suplemen_terdata.id_suplemen' AS relasi,
       CASE WHEN (SELECT px.village_id FROM suplemen px WHERE px.id = c.id_suplemen) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.id_suplemen AS parent_id,
       (SELECT px.village_id FROM suplemen px WHERE px.id = c.id_suplemen) AS parent_village_id
FROM suplemen_terdata c
LEFT JOIN suplemen p ON p.village_id = c.village_id AND p.id = c.id_suplemen
WHERE c.id_suplemen IS NOT NULL AND p.id IS NULL

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

UNION ALL
SELECT 'verifikasi_kontak.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM verifikasi_kontak c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'warga_pesan.resident_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.resident_id AS parent_id,
       (SELECT px.village_id FROM residents px WHERE px.id = c.resident_id) AS parent_village_id
FROM warga_pesan c
LEFT JOIN residents p ON p.village_id = c.village_id AND p.id = c.resident_id
WHERE c.resident_id IS NOT NULL AND p.id IS NULL

UNION ALL
SELECT 'pemilihan_kandidat.pemilihan_id' AS relasi,
       CASE WHEN (SELECT px.village_id FROM pemilihan px WHERE px.id = c.pemilihan_id) IS NULL
            THEN 'orphan' ELSE 'cross-tenant' END AS jenis,
       c.id AS child_id, c.village_id AS child_village_id,
       c.pemilihan_id AS parent_id,
       (SELECT px.village_id FROM pemilihan px WHERE px.id = c.pemilihan_id) AS parent_village_id
FROM pemilihan_kandidat c
LEFT JOIN pemilihan p ON p.village_id = c.village_id AND p.id = c.pemilihan_id
WHERE c.pemilihan_id IS NOT NULL AND p.id IS NULL;

ROLLBACK;
