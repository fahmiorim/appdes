import {
  boolean,
  date,
  float,
  index,
  int,
  mysqlTable,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { residents } from "./resident";
import { villages } from "./village";

export const posyandu = mysqlTable(
  "posyandu",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    nama: varchar("nama", { length: 100 }).notNull(),
    alamat: varchar("alamat", { length: 200 }),
    namaKetua: varchar("nama_ketua", { length: 100 }),
    namaBidan: varchar("nama_bidan", { length: 100 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("posyandu_village_idx").on(t.villageId)],
);

export const kia = mysqlTable(
  "kia",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    noKia: varchar("no_kia", { length: 30 }).notNull(),
    ibuId: int("ibu_id")
      .notNull()
      .references(() => residents.id),
    anakId: int("anak_id").references(() => residents.id),
    hariPerkiraanLahir: date("hari_perkiraan_lahir", { mode: "string" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("kia_village_no_uq").on(t.villageId, t.noKia),
    index("kia_village_idx").on(t.villageId),
  ],
);

export const ibuHamil = mysqlTable(
  "ibu_hamil",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    posyanduId: int("posyandu_id")
      .notNull()
      .references(() => posyandu.id),
    kiaId: int("kia_id")
      .notNull()
      .references(() => kia.id, { onDelete: "cascade" }),
    statusKehamilan: tinyint("status_kehamilan"),
    usiaKehamilan: tinyint("usia_kehamilan"),
    tanggalMelahirkan: date("tanggal_melahirkan", { mode: "string" }),
    pemeriksaanKehamilan: boolean("pemeriksaan_kehamilan").notNull().default(false),
    konsumsiPilFe: boolean("konsumsi_pil_fe").notNull().default(false),
    butirPilFe: int("butir_pil_fe"),
    pemeriksaanNifas: boolean("pemeriksaan_nifas").notNull().default(false),
    konselingGizi: boolean("konseling_gizi").notNull().default(false),
    kunjunganRumah: boolean("kunjungan_rumah").notNull().default(false),
    aksesAirBersih: boolean("akses_air_bersih").notNull().default(false),
    kepemilikanJamban: boolean("kepemilikan_jamban").notNull().default(false),
    jaminanKesehatan: boolean("jaminan_kesehatan").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("ibu_hamil_village_idx").on(t.villageId), index("ibu_hamil_kia_idx").on(t.kiaId)],
);

export const bulananAnak = mysqlTable(
  "bulanan_anak",
  {
    id: int("id").autoincrement().primaryKey(),
    villageId: int("village_id")
      .notNull()
      .references(() => villages.id, { onDelete: "cascade" }),
    posyanduId: int("posyandu_id")
      .notNull()
      .references(() => posyandu.id),
    kiaId: int("kia_id")
      .notNull()
      .references(() => kia.id, { onDelete: "cascade" }),
    statusGizi: tinyint("status_gizi").notNull(),
    umurBulan: tinyint("umur_bulan").notNull(),
    statusTikar: tinyint("status_tikar").notNull(),
    pemberianImunisasiDasar: boolean("pemberian_imunisasi_dasar").notNull().default(false),
    pemberianImunisasiCampak: boolean("pemberian_imunisasi_campak"),
    pengukuranBeratBadan: boolean("pengukuran_berat_badan").notNull().default(false),
    beratBadan: float("berat_badan"),
    pengukuranTinggiBadan: boolean("pengukuran_tinggi_badan").notNull().default(false),
    tinggiBadan: float("tinggi_badan"),
    konselingGiziAyah: boolean("konseling_gizi_ayah").notNull().default(false),
    konselingGiziIbu: boolean("konseling_gizi_ibu").notNull().default(false),
    kunjunganRumah: boolean("kunjungan_rumah").notNull().default(false),
    airBersih: boolean("air_bersih").notNull().default(false),
    kepemilikanJamban: boolean("kepemilikan_jamban").notNull().default(false),
    aktaLahir: boolean("akta_lahir").notNull().default(false),
    jaminanKesehatan: boolean("jaminan_kesehatan").notNull().default(false),
    pengasuhanPaud: boolean("pengasuhan_paud").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("bulanan_anak_village_idx").on(t.villageId),
    index("bulanan_anak_kia_idx").on(t.kiaId),
  ],
);
