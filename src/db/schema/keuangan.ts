import {
  date,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./auth";
import { villages } from "./village";

/**
 * `keuangan_template` — pohon kode rekening (chart of accounts) APBDes.
 *
 * Mengikuti struktur Siskeudes: `uuid` berupa kode bertitik (`4`, `4.1`,
 * `4.1.1`, `4.1.1.01`) dan `parent_uuid` menunjuk kode di atasnya. Kolom ini
 * global (bukan per desa) karena kode rekening baku secara nasional.
 */
export const keuanganTemplate = mysqlTable(
  "keuangan_template",
  {
    uuid: varchar("uuid", { length: 20 }).primaryKey(),
    parentUuid: varchar("parent_uuid", { length: 20 }),

    uraian: varchar("uraian", { length: 255 }).notNull(),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("keuangan_template_parent_idx").on(table.parentUuid)],
);

/**
 * `keuangan` — pagu anggaran & realisasi per rekening per tahun anggaran.
 *
 * Satu baris = satu `template_uuid` pada satu `tahun` desa. Nilai induk
 * diagregasi dari anaknya oleh aplikasi (lihat `recomputeTahun`), bukan trigger,
 * agar idempoten dan mudah diuji.
 */
export const keuangan = mysqlTable(
  "keuangan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    templateUuid: varchar("template_uuid", { length: 20 })
      .notNull()
      .references(() => keuanganTemplate.uuid, { onDelete: "restrict" }),

    tahun: int("tahun").notNull(),

    /** Pagu anggaran; `decimal(65,2)` agar aman dari overflow. */
    anggaran: decimal("anggaran", { precision: 65, scale: 2 }).notNull().default("0.00"),
    realisasi: decimal("realisasi", { precision: 65, scale: 2 }).notNull().default("0.00"),

    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("keuangan_village_tahun_uuid_unique").on(
      table.villageId,
      table.tahun,
      table.templateUuid,
    ),
    index("keuangan_village_tahun_idx").on(table.villageId, table.tahun),
  ],
);

export type KeuanganTemplate = typeof keuanganTemplate.$inferSelect;
export type NewKeuanganTemplate = typeof keuanganTemplate.$inferInsert;
export type Keuangan = typeof keuangan.$inferSelect;
export type NewKeuangan = typeof keuangan.$inferInsert;

/**
 * `keuangan_triwulan` — realisasi belanja per bidang per triwulan.
 *
 * Satu baris = satu bidang (kode `5.x`) pada satu tahun. Nilai disimpan
 * terpisah dari `keuangan.realisasi` (realisasi tahunan) agar angka triwulan
 * tidak pernah dibagi otomatis dari total tahunan.
 */
export const keuanganTriwulan = mysqlTable(
  "keuangan_triwulan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    templateUuid: varchar("template_uuid", { length: 20 })
      .notNull()
      .references(() => keuanganTemplate.uuid, { onDelete: "cascade" }),
    tahun: int("tahun").notNull(),

    tw1: decimal("tw1", { precision: 65, scale: 2 }).notNull().default("0.00"),
    tw2: decimal("tw2", { precision: 65, scale: 2 }).notNull().default("0.00"),
    tw3: decimal("tw3", { precision: 65, scale: 2 }).notNull().default("0.00"),
    tw4: decimal("tw4", { precision: 65, scale: 2 }).notNull().default("0.00"),

    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("keuangan_triwulan_village_tahun_uuid_unique").on(
      table.villageId,
      table.tahun,
      table.templateUuid,
    ),
    index("keuangan_triwulan_village_tahun_idx").on(table.villageId, table.tahun),
  ],
);

export type KeuanganTriwulan = typeof keuanganTriwulan.$inferSelect;
export type NewKeuanganTriwulan = typeof keuanganTriwulan.$inferInsert;

/**
 * `keuangan_transaksi` — catatan transaksi manual keuangan.
 *
 * Transaksi yang tidak termasuk rencana anggaran (APBDes) maupun realisasi triwulan.
 * Contoh: pengadaan darurat, tunjangan ekstrakurikuler, bantuan sosial luar program,
 * atau catatan keuangan umum. Setiap transaksi memiliki tanggal, Uraian, dan jumlah.
 * Angka total ini ikut dihitung di ringkasan laporan tapi tidak mengubah pagu anggaran.
 */
export const keuanganTransaksi = mysqlTable(
  "keuangan_transaksi",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    templateUuid: varchar("template_uuid", { length: 20 }).references(() => keuanganTemplate.uuid, {
      onDelete: "set null",
    }),
    // Null = transaksi bebas (bukan dari template); berisi uuid jika terkait template
    keterangan: varchar("keterangan", { length: 255 }).notNull(),
    jumlah: decimal("jumlah", { precision: 65, scale: 2 }).notNull().default("0.00"),
    jenis: mysqlEnum("jenis", ["pendapatan", "belanja"]).notNull(),
    tanggal: timestamp("tanggal").notNull().defaultNow(),
    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("keuangan_transaksi_village_idx").on(table.villageId),
    index("keuangan_transaksi_jenis_idx").on(table.jenis),
  ],
);

/**
 * `keuangan_laporan` — arsip dokumen laporan APBDes per semester (Lapis D).
 *
 * Mengikuti `laporan_sinkronisasi` pada sistem rujukan: dokumen diunggah
 * manual oleh operator lalu dicatat tanggal penyerahannya.
 * Angka laporan **tidak** diturunkan dari tabel ini.
 */
export const keuanganLaporan = mysqlTable(
  "keuangan_laporan",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),

    /** `laporan_apbdes` atau `laporan_penduduk`. */
    tipe: varchar("tipe", { length: 40 }).notNull(),
    judul: varchar("judul", { length: 255 }).notNull(),
    tahun: int("tahun").notNull(),
    /** `1` = Januari–Juni, `2` = Juli–Desember. */
    semester: int("semester").notNull(),

    /** Nama berkas asli yang diunggah operator (untuk ditampilkan & diunduh). */
    namaFile: varchar("nama_file", { length: 255 }).notNull(),
    /** Jalur berkas di disk relatif terhadap `storage/keuangan-laporan`. */
    jalurFile: varchar("jalur_file", { length: 255 }).notNull(),
    ukuranFile: int("ukuran_file").notNull().default(0),

    /** Tanggal dokumen diserahkan; kosong berarti belum diserahkan. */
    diserahkanPada: timestamp("diserahkan_pada"),

    createdBy: varchar("created_by", { length: 36 }).references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("keuangan_laporan_village_tahun_semester_unique").on(
      table.villageId,
      table.tipe,
      table.tahun,
      table.semester,
    ),
    index("keuangan_laporan_village_tahun_idx").on(table.villageId, table.tahun),
  ],
);

export type KeuanganLaporan = typeof keuanganLaporan.$inferSelect;
export type NewKeuanganLaporan = typeof keuanganLaporan.$inferInsert;

/**
 * `keuangan_jurnal` — buku jurnal pembukuan kas desa (satu baris = satu mutasi).
 *
 * Debet menambah kas, kredit menguranginya. `sumber` membedakan entri manual
 * (`manual`) dari entri yang dibangkitkan modul lain, dan `referensi` menyimpan
 * kunci baris asal agar tidak terjadi pencatatan ganda.
 *
 * Bentuk kolom mengikuti migrasi `0064_create_keuangan_pembukuan_tables`:
 * `village_id` **tanpa** foreign key, dan `created_by` menyimpan nama pengguna
 * (`varchar(100)`), bukan `users.id`. Jangan menambahkan relasi di sini tanpa
 * migrasi baru — bila tidak, `db:push` akan mencoba mengubah tabel.
 */
export const keuanganJurnal = mysqlTable(
  "keuangan_jurnal",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull(),
    tahun: int("tahun").notNull(),
    tanggal: date("tanggal", { mode: "string" }).notNull(),
    kodeRekening: varchar("kode_rekening", { length: 50 }).notNull(),
    uraian: text("uraian").notNull(),

    debet: decimal("debet", { precision: 19, scale: 2 }).notNull().default("0.00"),
    kredit: decimal("kredit", { precision: 19, scale: 2 }).notNull().default("0.00"),

    /** `manual` untuk entri operator, atau slug modul asal. */
    sumber: varchar("sumber", { length: 20 }).notNull().default("manual"),
    referensi: varchar("referensi", { length: 255 }),

    createdBy: varchar("created_by", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_keuangan_jurnal_village_tahun").on(table.villageId, table.tahun),
    index("idx_keuangan_jurnal_tanggal").on(table.tanggal),
  ],
);

export type KeuanganJurnal = typeof keuanganJurnal.$inferSelect;
export type NewKeuanganJurnal = typeof keuanganJurnal.$inferInsert;

/**
 * `keuangan_saldo_bank` — saldo awal kas di bank per rekening per tahun.
 *
 * Satu baris = satu rekening bank pada satu tahun anggaran, sehingga
 * kombinasi (`village_id`, `tahun`, `rekening_bank`) unik. Sama seperti
 * `keuangan_jurnal`, kolom `village_id` tidak memakai foreign key karena
 * mengikuti migrasi `0064`.
 */
export const keuanganSaldoBank = mysqlTable(
  "keuangan_saldo_bank",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id").notNull(),
    tahun: int("tahun").notNull(),
    rekeningBank: varchar("rekening_bank", { length: 50 }).notNull(),
    namaBank: varchar("nama_bank", { length: 100 }).notNull(),
    saldoAwal: decimal("saldo_awal", { precision: 19, scale: 2 }).notNull().default("0.00"),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("unique_saldo_bank").on(table.villageId, table.tahun, table.rekeningBank),
  ],
);

export type KeuanganSaldoBank = typeof keuanganSaldoBank.$inferSelect;
export type NewKeuanganSaldoBank = typeof keuanganSaldoBank.$inferInsert;
