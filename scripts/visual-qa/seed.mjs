/**
 * Fixture sintetis untuk visual QA lokal.
 *
 * Membuat satu tenant contoh (`sukamaju.localhost`) berisi data sintetis:
 * profil desa, perangkat, wilayah/keluarga/warga, agenda (termasuk arsip bulan
 * lalu), galeri, dokumen, halaman potensi, pengaduan, keuangan, surat, dan
 * layer GIS (polygon/area/garis/point) supaya halaman `/wilayah` punya bentuk
 * yang bisa dinilai secara visual.
 *
 * Aturan:
 * - Target wajib lolos `validasiEnvVisual` (loopback + `desa_visual_qa*` + ack).
 * - Tidak ada data pribadi asli: semua nama, NIK keluarga, dan nomor telepon
 *   fiktif.
 * - Bila tenant contoh sudah ada, skrip berhenti dan meminta reset database,
 *   bukan menghapus data yang mungkin diubah manual saat QA.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

import { ringkasTarget, validasiEnvVisual } from "./guard.mjs";

const AKAR = new URL("../../", import.meta.url);
const MEDIA_SUMBER = fileURLToPath(new URL("public/images/login-village-office.jpg", AKAR));

/** Tanggal ISO (`YYYY-MM-DD`) relatif terhadap hari ini. */
function tanggalRelatif(hari) {
  const tanggal = new Date();
  tanggal.setUTCDate(tanggal.getUTCDate() + hari);
  return tanggal.toISOString().slice(0, 10);
}

function geoJson(geometry) {
  return JSON.stringify(geometry);
}

async function sisipkan(connection, sql, params = []) {
  const [hasil] = await connection.execute(sql, params);
  return hasil.insertId;
}

const konfigurasi = validasiEnvVisual();

process.stdout.write(`[visual-qa] Seed ke ${ringkasTarget(konfigurasi)}\n`);

const connection = await mysql.createConnection(konfigurasi.opsiKoneksi);

try {
  const [tenantAda] = await connection.query("SELECT id FROM villages WHERE slug = ? LIMIT 1", [
    "sukamaju",
  ]);
  if (tenantAda.length > 0) {
    throw new Error(
      "[visual-qa] Tenant contoh sudah ada. Reset database disposable lebih dulu: npm run visual:qa:db:down lalu npm run visual:qa:db:up.",
    );
  }

  const desaId = await sisipkan(
    connection,
    `INSERT INTO villages (name, code, slug, domain, active, district, regency, province, office_address, email, phone, website)
     VALUES (?, ?, ?, ?, true, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Desa Suka Maju",
      "1207012001",
      "sukamaju",
      "sukamaju.localhost",
      "Kecamatan Suka Maju",
      "Kabupaten Batu Bara",
      "Sumatera Utara",
      "Jl. Merdeka No. 1",
      "info@sukamaju.test",
      "021000000",
      "https://sukamaju.test",
    ],
  );

  await connection.execute(
    "INSERT INTO village_domains (village_id, domain, is_primary) VALUES (?, ?, true)",
    [desaId, "sukamaju.localhost"],
  );

  await connection.execute(
    `INSERT INTO profil_desa (village_id, visi, misi, sejarah, sambutan, koordinat)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      desaId,
      "Terwujudnya desa yang maju, mandiri, dan sejahtera.",
      "Meningkatkan pelayanan publik\nMengembangkan ekonomi lokal\nMemperkuat gotong royong",
      "Desa Suka Maju tumbuh dari semangat kebersamaan warga. Seiring waktu, desa berkembang melalui pertanian, pendidikan, dan pelayanan masyarakat.",
      "Selamat datang di website resmi Desa Suka Maju. Kami berkomitmen menghadirkan informasi yang terbuka dan pelayanan yang mudah diakses.",
      "3.1234,99.4567",
    ],
  );

  // --- Agenda: kegiatan mendatang, arsip bulan lalu, dan satu draf ---------
  const agenda = [
    [
      "Musyawarah Perencanaan Pembangunan Desa",
      7,
      "Balai Desa Suka Maju",
      "Pembahasan prioritas pembangunan desa bersama masyarakat.",
      1,
    ],
    [
      "Posyandu Balita dan Lansia",
      14,
      "Posyandu Dusun Mawar",
      "Pemeriksaan kesehatan ibu, balita, dan lansia.",
      1,
    ],
    [
      "Gotong Royong Bersih Lingkungan",
      21,
      "Dusun Mawar RW 001",
      "Kerja bakti membersihkan saluran air dan jalan lingkungan.",
      1,
    ],
    [
      "Rapat Evaluasi APBDes",
      -32,
      "Kantor Desa Suka Maju",
      "Evaluasi realisasi anggaran desa bulan sebelumnya.",
      1,
    ],
    [
      "Pelatihan UMKM Desa",
      -62,
      "Aula Desa Suka Maju",
      "Pelatihan pemasaran digital untuk pelaku UMKM desa.",
      1,
    ],
    [
      "Rapat Internal Perangkat (draf)",
      -5,
      "Kantor Desa Suka Maju",
      "Agenda draf yang tidak boleh tampil di halaman publik.",
      0,
    ],
  ];
  await connection.query(
    `INSERT INTO agenda_kegiatan (village_id, judul, mulai, selesai, lokasi, deskripsi, tayang)
     VALUES ?`,
    [
      agenda.map(([judul, offset, lokasi, deskripsi, tayang]) => {
        const tanggal = tanggalRelatif(offset);
        return [desaId, judul, tanggal, tanggal, lokasi, deskripsi, tayang];
      }),
    ],
  );

  // --- Galeri -------------------------------------------------------------
  const mediaRelatif = `${desaId}/galeri/visual-qa-cover.jpg`;
  await mkdir(fileURLToPath(new URL(`storage/media/${desaId}/galeri`, AKAR)), { recursive: true });
  await copyFile(MEDIA_SUMBER, fileURLToPath(new URL(`storage/media/${mediaRelatif}`, AKAR)));

  const albumId = await sisipkan(
    connection,
    `INSERT INTO galeri_album (village_id, nama, slug, keterangan, sampul, aktif)
     VALUES (?, ?, ?, ?, ?, true)`,
    [
      desaId,
      "Kegiatan Desa",
      "kegiatan-desa",
      "Dokumentasi kegiatan masyarakat Desa Suka Maju.",
      mediaRelatif,
    ],
  );
  await connection.query(
    `INSERT INTO galeri_foto (village_id, album_id, gambar, judul, keterangan, aktif)
     VALUES ?`,
    [
      [
        [desaId, albumId, mediaRelatif, "Kantor Desa Suka Maju", "Dokumentasi kantor desa.", 1],
        [desaId, albumId, mediaRelatif, "Musyawarah Desa", "Dokumentasi musyawarah desa.", 1],
        [desaId, albumId, mediaRelatif, "Kerja Bakti Warga", "Dokumentasi kerja bakti.", 1],
      ],
    ],
  );

  // --- Halaman statis, dokumen publik ------------------------------------
  await connection.execute(
    "INSERT INTO halaman_statis (village_id, judul, slug, isi, aktif) VALUES (?, ?, ?, ?, true)",
    [
      desaId,
      "Potensi Desa Suka Maju",
      "potensi",
      "Desa Suka Maju memiliki potensi pertanian, UMKM, dan wisata alam yang terus dikembangkan.",
    ],
  );
  await connection.execute(
    `INSERT INTO dokumen_publik (village_id, nama, slug, kategori, jenis, nomor, tahun, keterangan, aktif)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, true)`,
    [
      desaId,
      "Peraturan Desa tentang APBDes",
      "perdes-apbdes-2026",
      "peraturan_desa",
      "Peraturan Desa",
      "01 Tahun 2026",
      2026,
      "Dokumen contoh sintetis untuk pemeriksaan tampilan.",
    ],
  );

  // --- Perangkat desa -----------------------------------------------------
  const jabatan = [
    ["Kepala Desa", "kepala-desa", "Budi Santoso"],
    ["Sekretaris Desa", "sekretaris-desa", "Siti Rahmawati"],
    ["Kaur Keuangan", "kaur-keuangan", "Ahmad Fauzi"],
    ["Kasi Pemerintahan", "kasi-pemerintahan", "Rina Lestari"],
    ["Kasi Pelayanan", "kasi-pelayanan", "Dedi Saputra"],
  ];
  await connection.query("INSERT INTO jabatan_perangkat (village_id, nama, slug, urut) VALUES ?", [
    jabatan.map(([nama, slug], index) => [desaId, nama, slug, index + 1]),
  ]);
  const [barisJabatan] = await connection.query(
    "SELECT id, slug FROM jabatan_perangkat WHERE village_id = ? ORDER BY urut",
    [desaId],
  );
  const jabatanPerSlug = new Map(barisJabatan.map((baris) => [baris.slug, baris.id]));
  await connection.query(
    `INSERT INTO perangkat_desa (village_id, jabatan_id, nama, status, periode, urut) VALUES ?`,
    [
      jabatan.map(([_nama, slug, namaOrang], index) => [
        desaId,
        jabatanPerSlug.get(slug),
        namaOrang,
        "aktif",
        "2024–2030",
        index + 1,
      ]),
    ],
  );

  // --- Wilayah, keluarga, warga ------------------------------------------
  const regionId = await sisipkan(
    connection,
    "INSERT INTO regions (village_id, dusun, rw, rt, sort_order) VALUES (?, ?, ?, ?, 1)",
    [desaId, "Dusun Mawar", "001", "001"],
  );
  const keluargaId = await sisipkan(
    connection,
    "INSERT INTO families (village_id, number, address, region_id) VALUES (?, ?, ?, ?)",
    [desaId, "1207012001000001", "Dusun Mawar, RW 001, RT 001", regionId],
  );
  await connection.query(
    "INSERT INTO residents (village_id, name, gender, family_id, region_id) VALUES ?",
    [
      [
        [desaId, "Warga Contoh Satu", "male", keluargaId, regionId],
        [desaId, "Warga Contoh Dua", "female", keluargaId, regionId],
        [desaId, "Warga Contoh Tiga", "male", keluargaId, regionId],
      ],
    ],
  );

  // --- Surat, pengaduan, keuangan ----------------------------------------
  await connection.query(
    `INSERT INTO letter_types (village_id, code, name, template_body, requires_resident, is_active, sort_order)
     VALUES ?`,
    [
      [
        [
          desaId,
          "SKD",
          "Surat Keterangan Domisili",
          "<p>Surat keterangan domisili untuk warga.</p>",
          1,
          1,
          1,
        ],
        [
          desaId,
          "SKTM",
          "Surat Keterangan Tidak Mampu",
          "<p>Surat keterangan tidak mampu untuk warga.</p>",
          1,
          1,
          2,
        ],
      ],
    ],
  );
  await connection.execute(
    `INSERT INTO pengaduan (village_id, nomor_tiket, kategori, judul, isi, nama_pelapor, status, publik)
     VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
    [
      desaId,
      "VISUAL-001",
      "infrastruktur",
      "Perbaikan jalan lingkungan",
      "Mohon perbaikan jalan di lingkungan dusun.",
      "Warga Contoh",
      "ditindaklanjuti",
    ],
  );
  await connection.query(
    "INSERT IGNORE INTO keuangan_template (uuid, parent_uuid, uraian) VALUES ?",
    [
      [
        ["4", null, "PENDAPATAN"],
        ["5", null, "BELANJA"],
        ["6", null, "PEMBIAYAAN"],
        ["5.1", "5", "Penyelenggaraan Pemerintahan Desa"],
        ["5.2", "5", "Pelaksanaan Pembangunan Desa"],
        ["5.3", "5", "Pembinaan Kemasyarakatan"],
      ],
    ],
  );
  await connection.query(
    "INSERT INTO keuangan (village_id, template_uuid, tahun, anggaran, realisasi) VALUES ?",
    [
      [
        [desaId, "4", 2026, "100000000.00", "80000000.00"],
        [desaId, "5", 2026, "90000000.00", "70000000.00"],
        [desaId, "6", 2026, "10000000.00", "5000000.00"],
        [desaId, "5.1", 2026, "30000000.00", "25000000.00"],
        [desaId, "5.2", 2026, "40000000.00", "30000000.00"],
        [desaId, "5.3", 2026, "20000000.00", "15000000.00"],
      ],
    ],
  );
  await connection.query(
    "INSERT INTO keuangan_triwulan (village_id, template_uuid, tahun, tw1, tw2, tw3, tw4) VALUES ?",
    [
      [
        [desaId, "5.1", 2026, "5000000.00", "6000000.00", "7000000.00", "7000000.00"],
        [desaId, "5.2", 2026, "8000000.00", "7000000.00", "8000000.00", "7000000.00"],
        [desaId, "5.3", 2026, "4000000.00", "3000000.00", "4000000.00", "4000000.00"],
      ],
    ],
  );

  // --- GIS: layer, area (Polygon/Feature/MultiPolygon), garis, titik ------
  const layer = [
    ["Permukiman", "#2563eb"],
    ["Pertanian", "#16a34a"],
    ["Fasilitas Umum", "#f59e0b"],
  ];
  await connection.query(
    "INSERT INTO polygon (village_id, nama, color, tipe, enabled, sort_order) VALUES ?",
    [layer.map(([nama, color], index) => [desaId, nama, color, 0, 1, index + 1])],
  );
  const [barisLayer] = await connection.query(
    "SELECT id, nama FROM polygon WHERE village_id = ? ORDER BY sort_order",
    [desaId],
  );
  const layerPerNama = new Map(barisLayer.map((baris) => [baris.nama, baris.id]));

  const area = [
    [
      "Permukiman Dusun Mawar",
      layerPerNama.get("Permukiman"),
      geoJson({
        type: "Polygon",
        coordinates: [
          [
            [99.438, 3.128],
            [99.452, 3.13],
            [99.455, 3.118],
            [99.441, 3.116],
            [99.438, 3.128],
          ],
        ],
      }),
      "Permukiman utama warga desa.",
    ],
    [
      "Sawah Dusun Melati",
      layerPerNama.get("Pertanian"),
      geoJson({
        type: "Feature",
        properties: { nama: "Sawah Dusun Melati" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [99.456, 3.131],
              [99.472, 3.133],
              [99.474, 3.119],
              [99.458, 3.117],
              [99.456, 3.131],
            ],
          ],
        },
      }),
      "Lahan sawah produktif (path dibungkus Feature).",
    ],
    [
      "Fasilitas Umum",
      layerPerNama.get("Fasilitas Umum"),
      geoJson({
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [99.444, 3.112],
              [99.449, 3.112],
              [99.449, 3.108],
              [99.444, 3.108],
              [99.444, 3.112],
            ],
          ],
          [
            [
              [99.462, 3.111],
              [99.467, 3.111],
              [99.467, 3.107],
              [99.462, 3.107],
              [99.462, 3.111],
            ],
          ],
        ],
      }),
      "Balai desa dan lapangan (MultiPolygon).",
    ],
    [
      "Kebun Campuran",
      layerPerNama.get("Pertanian"),
      geoJson({
        type: "Polygon",
        coordinates: [
          [
            [99.426, 3.122],
            [99.436, 3.124],
            [99.437, 3.115],
            [99.427, 3.113],
            [99.426, 3.122],
          ],
        ],
      }),
      "Kebun campuran warga.",
    ],
  ];
  await connection.query(
    "INSERT INTO area (village_id, nama, ref_polygon, path, desk, enabled, sort_order) VALUES ?",
    [area.map(([nama, ref, path, desk], index) => [desaId, nama, ref, path, desk, 1, index + 1])],
  );

  await connection.query(
    "INSERT INTO garis (village_id, nama, path, desk, enabled, sort_order) VALUES ?",
    [
      [
        [
          desaId,
          "Jalan Desa Utama",
          geoJson({
            type: "LineString",
            coordinates: [
              [99.437, 3.121],
              [99.45, 3.121],
              [99.463, 3.122],
              [99.474, 3.121],
            ],
          }),
          "Jalan utama desa.",
          1,
          1,
        ],
        [
          desaId,
          "Jalan Lingkungan",
          geoJson({
            type: "LineString",
            coordinates: [
              [99.443, 3.114],
              [99.443, 3.119],
              [99.448, 3.119],
            ],
          }),
          "Jalan lingkungan permukiman.",
          1,
          2,
        ],
      ],
    ],
  );

  await connection.query(
    "INSERT INTO point (village_id, nama, parrent, path, enabled, sort_order) VALUES ?",
    [
      [
        [
          desaId,
          "Kantor Desa",
          layerPerNama.get("Fasilitas Umum"),
          geoJson({ type: "Point", coordinates: [99.446, 3.11] }),
          1,
          1,
        ],
        [
          desaId,
          "Balai Desa",
          layerPerNama.get("Fasilitas Umum"),
          geoJson({ type: "Point", coordinates: [99.464, 3.109] }),
          1,
          2,
        ],
        [
          desaId,
          "Pasar Desa",
          layerPerNama.get("Permukiman"),
          geoJson({ type: "Point", coordinates: [99.45, 3.124] }),
          1,
          3,
        ],
      ],
    ],
  );

  const [ringkasan] = await connection.query(
    `SELECT
       (SELECT COUNT(*) FROM area WHERE village_id = ?) AS area,
       (SELECT COUNT(*) FROM agenda_kegiatan WHERE village_id = ?) AS agenda,
       (SELECT COUNT(*) FROM galeri_foto WHERE village_id = ?) AS foto,
       (SELECT COUNT(*) FROM residents WHERE village_id = ?) AS warga`,
    [desaId, desaId, desaId, desaId],
  );

  process.stdout.write(
    `[visual-qa] Tenant "sukamaju" siap (id=${desaId}): ${ringkasan[0].area} area, ${ringkasan[0].agenda} agenda, ${ringkasan[0].foto} foto, ${ringkasan[0].warga} warga.\n`,
  );
} finally {
  await connection.end();
}
