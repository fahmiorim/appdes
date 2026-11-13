import {
  boolean,
  date,
  foreignKey,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { villages } from "./village";

/**
 * Skema konten situs publik.
 *
 * Meniru perilaku OpenSID (`artikel`, `kategori`, `gambar_gallery`, `menu`,
 * `widget`, `dokumen`, `tweb_desa_pamong`) namun tata kelola datanya orisinal.
 * Seluruh tabel membawa `village_id` (kunci tenant) dan slug/situs unik
 * **per desa**, bukan global, sehingga satu basis kode dapat melayani banyak
 * desa tanpa saling menimpa.
 */

/** `profil_desa` — satu baris per desa: visi, misi, sejarah, sambutan. */
export const profilDesa = mysqlTable(
  "profil_desa",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    visi: text("visi"),
    /** Misi disimpan satu per baris agar mudah disunting dan dirender. */
    misi: text("misi"),
    sejarah: text("sejarah"),
    sambutan: text("sambutan"),
    /** Koordinat peta, mis. `-6.200000, 106.816666`. */
    koordinat: varchar("koordinat", { length: 60 }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("profil_desa_village_unique").on(table.villageId)],
);

/** `jabatan_perangkat` — daftar jabatan (Kepala Desa, Sekretaris, dst.). */
export const jabatanPerangkat = mysqlTable(
  "jabatan_perangkat",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    nama: varchar("nama", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    urut: int("urut").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("jabatan_perangkat_village_slug_unique").on(table.villageId, table.slug)],
);

/** `perangkat_desa` — aparatur desa beserta jabatannya (SOTK). */
export const perangkatDesa = mysqlTable(
  "perangkat_desa",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    jabatanId: int("jabatan_id").references(() => jabatanPerangkat.id, {
      onDelete: "set null",
    }),

    nama: varchar("nama", { length: 100 }).notNull(),
    gelarDepan: varchar("gelar_depan", { length: 100 }),
    gelarBelakang: varchar("gelar_belakang", { length: 100 }),
    nip: varchar("nip", { length: 25 }),
    nik: varchar("nik", { length: 16 }),
    /** Jenis kelamin: `male` | `female`. */
    jenisKelamin: varchar("jenis_kelamin", { length: 10 }),
    tempatLahir: varchar("tempat_lahir", { length: 100 }),
    tanggalLahir: date("tanggal_lahir", { mode: "string" }),
    /** Jalur foto relatif di penyimpanan media. */
    foto: varchar("foto", { length: 255 }),
    /** Tanda tangan (berkas gambar) untuk berkas surat. */
    tandaTangan: varchar("tanda_tangan", { length: 255 }),

    /** Jabatan ditampilkan sebagai pejabat penanda tangan? */
    penandaTangan: boolean("penanda_tangan").notNull().default(false),
    /** Status: `aktif` | `nonaktif`. */
    status: varchar("status", { length: 20 }).notNull().default("aktif"),
    /** Periode menjabat (masa jabatan). Format: "YYYY" atau "YYYY-YYYY". */
    periode: varchar("periode", { length: 20 }),
    urut: int("urut").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("perangkat_desa_village_idx").on(table.villageId),
    index("perangkat_desa_jabatan_idx").on(table.jabatanId),
  ],
);

/** `berita_kategori` — kategori berita/artikel. */
export const beritaKategori = mysqlTable(
  "berita_kategori",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    nama: varchar("nama", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    /** Kategori tampil di menu publik? */
    aktif: boolean("aktif").notNull().default(true),
    urut: int("urut").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("berita_kategori_village_slug_unique").on(table.villageId, table.slug)],
);

/**
 * `berita` — artikel/berita desa.
 *
 * `isi` menyimpan HTML yang **wajib** disanitasi sebelum disimpan dan sebelum
 * dirender (lihat `src/lib/sanitize.ts`).
 */
export const berita = mysqlTable(
  "berita",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    kategoriId: int("kategori_id").references(() => beritaKategori.id, {
      onDelete: "set null",
    }),
    penulisId: varchar("penulis_id", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),

    judul: varchar("judul", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    ringkasan: varchar("ringkasan", { length: 500 }),
    isi: text("isi").notNull(),
    /** Gambar sampul (jalur relatif media). */
    gambar: varchar("gambar", { length: 255 }),
    /** Berkas lampiran opsional (jalur relatif media). */
    dokumen: varchar("dokumen", { length: 255 }),
    /** Status: `draft` | `published`. */
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    /** Terbit pada; `null` = belum dijadwalkan. */
    terbitPada: timestamp("terbit_pada"),

    headline: boolean("headline").notNull().default(false),
    /** Berita boleh ditampilkan di slider beranda? */
    slider: boolean("slider").notNull().default(false),
    bolehKomentar: boolean("boleh_komentar").notNull().default(true),
    hit: int("hit").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("berita_village_slug_unique").on(table.villageId, table.slug),
    index("berita_village_status_idx").on(table.villageId, table.status, table.terbitPada),
    index("berita_kategori_idx").on(table.kategoriId),
  ],
);

/** `galeri_album` — album galeri foto. */
export const galeriAlbum = mysqlTable(
  "galeri_album",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    nama: varchar("nama", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 150 }).notNull(),
    keterangan: text("keterangan"),
    /** Gambar sampul album (jalur relatif media). */
    sampul: varchar("sampul", { length: 255 }),
    aktif: boolean("aktif").notNull().default(true),
    urut: int("urut").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("galeri_album_village_slug_unique").on(table.villageId, table.slug),
    uniqueIndex("galeri_album_village_id_uq").on(table.villageId, table.id),
  ],
);

/** `galeri_foto` — foto dalam album; `albumId` null = foto lepas (slider). */
export const galeriFoto = mysqlTable(
  "galeri_foto",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    albumId: int("album_id"),

    gambar: varchar("gambar", { length: 255 }).notNull(),
    judul: varchar("judul", { length: 150 }),
    keterangan: text("keterangan"),
    aktif: boolean("aktif").notNull().default(true),
    /** Ditampilkan sebagai slide beranda? */
    slider: boolean("slider").notNull().default(false),
    urut: int("urut").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("galeri_foto_village_idx").on(table.villageId),
    index("galeri_foto_album_idx").on(table.albumId),
    index("galeri_foto_village_album_idx").on(table.villageId, table.albumId),
    foreignKey({
      columns: [table.villageId, table.albumId],
      foreignColumns: [galeriAlbum.villageId, galeriAlbum.id],
      name: "galeri_foto_album_tenant_fk",
    }).onDelete("cascade"),
  ],
);

/**
 * `menu_publik` — menu navigasi situs publik.
 *
 * `parentId` null = menu tingkat atas. `linkTipe` menentukan apakah `link`
 * diperlakukan sebagai URL internal (`internal`), tautan bebas (`eksternal`),
 * atau halaman statis (`halaman`).
 */
export const menuPublik = mysqlTable(
  "menu_publik",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    parentId: int("parent_id"),

    nama: varchar("nama", { length: 50 }).notNull(),
    link: varchar("link", { length: 500 }).notNull(),
    linkTipe: varchar("link_tipe", { length: 20 }).notNull().default("internal"),
    aktif: boolean("aktif").notNull().default(true),
    urut: int("urut").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("menu_publik_village_idx").on(table.villageId, table.urut)],
);

/** `widget` — blok samping beranda/laman. */
export const widget = mysqlTable(
  "widget",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    judul: varchar("judul", { length: 100 }),
    /** `isi` hanya berlaku untuk widget jenis `teks`. */
    isi: text("isi"),
    /**
     * Jenis widget (meniru OpenSID):
     * 1 = teks bebas, 2 = galeri, 3 = statistik penduduk, 4 = media sosial,
     * 5 = dokumen, 6 = menu.
     */
    jenis: tinyint("jenis").notNull().default(1),
    /** Pengaturan JSON khusus per jenis widget. */
    pengaturan: text("pengaturan"),
    aktif: boolean("aktif").notNull().default(true),
    urut: int("urut").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("widget_village_idx").on(table.villageId, table.urut)],
);

/** `slider` — gambar sorotan di beranda. */
export const slider = mysqlTable(
  "slider",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    gambar: varchar("gambar", { length: 255 }).notNull(),
    judul: varchar("judul", { length: 150 }),
    keterangan: varchar("keterangan", { length: 500 }),
    /** Tautan yang dibuka saat slide diklik. */
    tautan: varchar("tautan", { length: 255 }),
    aktif: boolean("aktif").notNull().default(true),
    urut: int("urut").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("slider_village_idx").on(table.villageId, table.urut)],
);

/**
 * `dokumen_publik` — dokumen informasi publik & produk hukum.
 *
 * Berbeda dari `dokumen` OpenSID yang mencampur arsip internal dan publik,
 * tabel ini khusus berkas yang memang boleh diunduh warga.
 */
export const dokumenPublik = mysqlTable(
  "dokumen_publik",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    nama: varchar("nama", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    /** `informasi_publik` | `produk_hukum` | `lainnya`. */
    kategori: varchar("kategori", { length: 50 }).notNull().default("informasi_publik"),
    jenis: varchar("jenis", { length: 50 }),
    nomor: varchar("nomor", { length: 100 }),
    tahun: int("tahun"),
    /** Jalur relatif berkas di penyimpanan media. */
    berkas: varchar("berkas", { length: 255 }),
    /** Tautan luar bila berkas tidak diunggah. */
    tautan: varchar("tautan", { length: 500 }),
    keterangan: text("keterangan"),
    aktif: boolean("aktif").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("dokumen_publik_village_slug_unique").on(table.villageId, table.slug),
    index("dokumen_publik_village_kategori_idx").on(table.villageId, table.kategori),
  ],
);

/**
 * `halaman_statis` — halaman bebas (mis. "Sejarah Desa", "Syarat Layanan").
 *
 * `slug` unik per desa. `isi` HTML tersanitasi.
 */
export const halamanStatis = mysqlTable(
  "halaman_statis",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    judul: varchar("judul", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    isi: text("isi").notNull(),
    aktif: boolean("aktif").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("halaman_statis_village_slug_unique").on(table.villageId, table.slug)],
);

export type ProfilDesa = typeof profilDesa.$inferSelect;
export type JabatanPerangkat = typeof jabatanPerangkat.$inferSelect;
export type PerangkatDesa = typeof perangkatDesa.$inferSelect;
export type Berita = typeof berita.$inferSelect;
export type BeritaKategori = typeof beritaKategori.$inferSelect;
export type GaleriAlbum = typeof galeriAlbum.$inferSelect;
export type GaleriFoto = typeof galeriFoto.$inferSelect;
export type MenuPublik = typeof menuPublik.$inferSelect;
export type Widget = typeof widget.$inferSelect;
export type Slider = typeof slider.$inferSelect;
export type DokumenPublik = typeof dokumenPublik.$inferSelect;
export type HalamanStatis = typeof halamanStatis.$inferSelect;
