export * from "./kesehatan";
export * from "./pendapat";
export * from "./kontak";
/**
 * Titik kumpul definisi skema Drizzle.
 *
 * Skema dipecah per-domain di folder ini. Setiap file mengekspor tabelnya, dan
 * file ini menggabungkannya agar dapat dipakai oleh Drizzle (`db`) maupun
 * better-auth (adapter Drizzle membutuhkan referensi ke tabel `users`,
 * `sessions`, dst.).
 */

export * from "./audit";
export * from "./agenda-kegiatan";
export * from "./auth";
export * from "./mailbox-pesan";
export * from "./bantuan";
export * from "./bumindes";
export * from "./bumindes-tanahkas";
export * from "./bumindes-pembangunan";
export * from "./bumindes-sekretariat";
export * from "./content";
export * from "./family";
export * from "./family-log";
export * from "./incoming-letters";
export * from "./inventaris";
export * from "./keuangan";
export * from "./kelompok";
export * from "./letter-classifications";
export * from "./letter-dinas";
export * from "./letter-requirements";
export * from "./letter-types";
export * from "./letters";
export * from "./letter-number-archive";
export * from "./outgoing-letters";
export * from "./pembangunan";
export * from "./pengaduan";
export * from "./permohonan-surat";
export * from "./rbac";
export * from "./reference";
export * from "./region";
export * from "./resident";
export * from "./resident-mutation";
export * from "./dtks";
export * from "./election";
export * from "./rumah-tangga";
export * from "./suplemen";
export * from "./survey";
export * from "./theme";
export * from "./village";
export * from "./rentang-umur";
export * from "./api-keys";
export * from "./rate-limit";
export * from "./gis";
export * from "./idm";
export * from "./pemilihan";
export * from "./sinergi";
export * from "./registrasi-warga";
export * from "./lapak";
export * from "./kehadiran";
export * from "./analisis";
export * from "./analisis-indikator";
export * from "./tte";
export * from "./keuangan-sisa";
export * from "./arsip";
export * from "./dokumen-desa";
export * from "./pelanggan";
export * from "./anjungan";
export * from "./buku-tamu";
export * from "./media-settings";
export * from "./letter-agenda";
export * from "./komentar";
export * from "./pengunjung-log";
export * from "./bukti-pengiriman-notifikasi";
export * from "./warga-pesan";
export * from "./dokumen-warga";
export * from "./notifikasi-terkirim";
export * from "./kehadiran-izin";
export * from "./verifikasi-kontak";
export * from "./lapak-produk";
export * from "./keranjang";
export * from "./pengaturan";
export * from "./pengguna-shortcut";
export * from "./pengguna-menu-urutan";
export * from "./plugin-registry";
export * from "./login-otp";
export * from "./umpan-balik";
