export const AUDIT_EVENTS = {
  loginSuccess: "auth.login.success",
  loginFailure: "auth.login.failure",
  passwordResetRequest: "auth.password.reset.request",
  passwordResetSuccess: "auth.password.reset.success",
  databaseBackup: "database.backup",
  databaseRestore: "database.restore",
  tteConfigUpdate: "surat.tte.config",
  tteSigned: "surat.tte.signed",
  externalTteSign: "api.eksternal.tte.sign",
  externalSuratGet: "api.eksternal.surat.get",
  externalSuratCreate: "api.eksternal.surat.create",
  externalSuratVerifikasi: "api.eksternal.surat.verifikasi",
  apiKeyRevoke: "api-key.revoke",
  apiPublikAkses: "api.publik.akses",
  registrasiWargaDiajukan: "registrasi-warga.diajukan",
  registrasiWargaDisetujui: "registrasi-warga.disetujui",
  registrasiWargaDitolak: "registrasi-warga.ditolak",
  pengaturanUpdate: "pengaturan.update",
  notifikasiKirim: "notifikasi.kirim",
  pluginActivate: "plugin.aktifkan",
  pluginDeactivate: "plugin.nonaktifkan",
  pendudukCreate: "penduduk.create",
  pendudukUpdate: "penduduk.update",
  pendudukDelete: "penduduk.delete",
  keluargaCreate: "keluarga.create",
  keluargaUpdate: "keluarga.update",
  keluargaDelete: "keluarga.delete",
  inventarisSave: "inventaris.simpan",
  inventarisDelete: "inventaris.hapus",
  kelompokCreate: "kelompok.create",
  kelompokUpdate: "kelompok.update",
  kelompokDelete: "kelompok.delete",
  keuanganSave: "keuangan.simpan",
  temaActivate: "tema.aktifkan",
  suratMasukCreate: "surat-masuk.create",
  suratMasukUpdate: "surat-masuk.update",
  suratMasukDelete: "surat-masuk.delete",
  suratKeluarCreate: "surat-keluar.create",
  suratKeluarUpdate: "surat-keluar.update",
  suratKeluarDelete: "surat-keluar.delete",
  desaCreate: "desa.create",
  desaStatus: "desa.status",
  desaDomain: "desa.domain",
  desaKuota: "desa.kuota",
  desaAdminReset: "desa.admin.reset",
} as const;

export type AuditEvent = (typeof AUDIT_EVENTS)[keyof typeof AUDIT_EVENTS];

export const AUDIT_EVENT_LABELS: Record<AuditEvent, string> = {
  [AUDIT_EVENTS.loginSuccess]: "Login berhasil",
  [AUDIT_EVENTS.loginFailure]: "Login gagal",
  [AUDIT_EVENTS.passwordResetRequest]: "Permintaan reset sandi",
  [AUDIT_EVENTS.passwordResetSuccess]: "Reset sandi berhasil",
  [AUDIT_EVENTS.databaseBackup]: "Backup basis data",
  [AUDIT_EVENTS.databaseRestore]: "Restore basis data",
  [AUDIT_EVENTS.tteConfigUpdate]: "Ubah konfigurasi TTE",
  [AUDIT_EVENTS.tteSigned]: "Surat ditandatangani elektronik",
  [AUDIT_EVENTS.externalTteSign]: "Tanda tangan TTE via API eksternal",
  [AUDIT_EVENTS.externalSuratGet]: "Baca surat via API eksternal",
  [AUDIT_EVENTS.externalSuratCreate]: "Pengajuan surat via API eksternal",
  [AUDIT_EVENTS.externalSuratVerifikasi]: "Verifikasi surat via API eksternal",
  [AUDIT_EVENTS.apiKeyRevoke]: "Cabut kunci API",
  [AUDIT_EVENTS.apiPublikAkses]: "Akses API data publik",
  [AUDIT_EVENTS.registrasiWargaDiajukan]: "Pengajuan akun warga",
  [AUDIT_EVENTS.registrasiWargaDisetujui]: "Persetujuan akun warga",
  [AUDIT_EVENTS.registrasiWargaDitolak]: "Penolakan akun warga",
  [AUDIT_EVENTS.pengaturanUpdate]: "Ubah pengaturan aplikasi",
  [AUDIT_EVENTS.notifikasiKirim]: "Kirim notifikasi manual",
  [AUDIT_EVENTS.pluginActivate]: "Aktifkan plugin",
  [AUDIT_EVENTS.pluginDeactivate]: "Nonaktifkan plugin",
  [AUDIT_EVENTS.pendudukCreate]: "Tambah penduduk",
  [AUDIT_EVENTS.pendudukUpdate]: "Ubah penduduk",
  [AUDIT_EVENTS.pendudukDelete]: "Hapus penduduk",
  [AUDIT_EVENTS.keluargaCreate]: "Tambah kartu keluarga",
  [AUDIT_EVENTS.keluargaUpdate]: "Ubah kartu keluarga",
  [AUDIT_EVENTS.keluargaDelete]: "Hapus kartu keluarga",
  [AUDIT_EVENTS.inventarisSave]: "Simpan inventaris",
  [AUDIT_EVENTS.inventarisDelete]: "Hapus inventaris",
  [AUDIT_EVENTS.kelompokCreate]: "Tambah kelompok",
  [AUDIT_EVENTS.kelompokUpdate]: "Ubah kelompok",
  [AUDIT_EVENTS.kelompokDelete]: "Hapus kelompok",
  [AUDIT_EVENTS.keuanganSave]: "Simpan data keuangan",
  [AUDIT_EVENTS.temaActivate]: "Aktifkan tema",
  [AUDIT_EVENTS.suratMasukCreate]: "Tambah surat masuk",
  [AUDIT_EVENTS.suratMasukUpdate]: "Ubah surat masuk",
  [AUDIT_EVENTS.suratMasukDelete]: "Hapus surat masuk",
  [AUDIT_EVENTS.suratKeluarCreate]: "Tambah surat keluar",
  [AUDIT_EVENTS.suratKeluarUpdate]: "Ubah surat keluar",
  [AUDIT_EVENTS.suratKeluarDelete]: "Hapus surat keluar",
  [AUDIT_EVENTS.desaCreate]: "Buat desa baru",
  [AUDIT_EVENTS.desaStatus]: "Ubah status desa",
  [AUDIT_EVENTS.desaDomain]: "Ubah domain desa",
  [AUDIT_EVENTS.desaKuota]: "Ubah kuota media desa",
  [AUDIT_EVENTS.desaAdminReset]: "Reset akses admin desa",
};

export interface AuditEventInput {
  villageId: number | null;
  actorId?: string | null;
  event: AuditEvent;
  resource: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, boolean | number | string | null>;
}

/** Serialisasi detail yang aman untuk disimpan tanpa memasukkan kredensial. */
export function serializeAuditDetails(details: AuditEventInput["details"]): string | null {
  if (!details || Object.keys(details).length === 0) return null;
  return JSON.stringify(details);
}

export interface AuditLogRow {
  id: number;
  villageId: number | null;
  actorId: string | null;
  actorName: string | null;
  event: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  createdAt: Date;
}
