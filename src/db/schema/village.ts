import {
  boolean,
  index,
  int,
  mysqlTable,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * `villages` — identitas desa sekaligus kunci tenant (multi-desa).
 *
 * Aplikasi berjalan mode satu-desa (satu baris), namun seluruh tabel
 * transaksional membawa `village_id` sehingga multi-desa dapat diaktifkan tanpa
 * perubahan skema.
 */
export const villages = mysqlTable("villages", {
  id: int("id").autoincrement().primaryKey(),

  name: varchar("name", { length: 100 }),
  code: varchar("code", { length: 10 }),

  /**
   * Label subdomain publik untuk wildcard `*.DESA_BASE_DOMAIN`
   * (mis. `sukamaju` → `sukamaju.desa.id`). Unik agar satu label hanya
   * menunjuk satu desa.
   */
  slug: varchar("slug", { length: 60 }).unique(),
  postalCode: varchar("postal_code", { length: 5 }),

  /** Kecamatan (sub-distrik) beserta kode wilayahnya. */
  district: varchar("district", { length: 100 }),
  districtCode: varchar("district_code", { length: 8 }),

  /** Kabupaten/kota. */
  regency: varchar("regency", { length: 100 }),
  regencyCode: varchar("regency_code", { length: 4 }),

  /** Provinsi. */
  province: varchar("province", { length: 100 }),
  provinceCode: varchar("province_code", { length: 2 }),

  logo: varchar("logo", { length: 255 }),

  /** Gambar tanda tangan Kepala Desa (jalur media publik relatif). */
  signature: varchar("signature", { length: 255 }),

  /** Gambar stempel desa (jalur media publik relatif). */
  stamp: varchar("stamp", { length: 255 }),

  /**
   * Domain publik desa (mis. `desa-sukamaju.id`). Unik agar satu host hanya
   * menunjuk satu desa. `NULL` = belum dipetakan (mode pengembangan).
   */
  domain: varchar("domain", { length: 255 }).unique(),

  /**
   * Status operasional desa. Desa nonaktif tidak dipetakan dari host mana pun
   * dan akun stafnya kehilangan akses; datanya tetap disimpan (arsip lunak).
   */
  active: boolean("active").notNull().default(true),

  /**
   * Kuota penyimpanan media dalam MB untuk desa ini. `NULL` = tanpa batas.
   * Ditegakkan saat unggah media (`simpanUnggahanMedia*`).
   */
  kuotaMediaMb: int("kuota_media_mb"),

  /** Nama kepala desa. */
  headName: varchar("head_name", { length: 100 }),
  /** NIP kepala desa. */
  headNip: varchar("head_nip", { length: 25 }),

  /** Mode penomoran surat layanan (1–4); lihat domain `penomoran.ts`. */
  penomoranSurat: tinyint("penomoran_surat").notNull().default(2),

  officeAddress: varchar("office_address", { length: 255 }),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  website: varchar("website", { length: 255 }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Village = typeof villages.$inferSelect;
export type NewVillage = typeof villages.$inferInsert;

/**
 * `village_domains` — satu desa boleh punya banyak host (domain utama + alias).
 *
 * Domain di sini adalah sumber kebenaran resolusi host. `villages.domain` tetap
 * dipertahankan sebagai cermin domain utama agar identitas desa dan form lama
 * tidak berubah. Setiap host unik lintas desa.
 */
export const villageDomains = mysqlTable(
  "village_domains",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 255 }).notNull().unique(),
    /** Domain utama yang ditampilkan sebagai identitas desa. */
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("village_domains_village_idx").on(table.villageId)],
);

export type VillageDomain = typeof villageDomains.$inferSelect;
export type NewVillageDomain = typeof villageDomains.$inferInsert;
