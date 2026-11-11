import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { simpanBerkasMedia } from "@/features/publik/application/simpan-berkas-media";
import { hasPermission } from "@/features/rbac/application/authorization";
import { RESOURCES } from "@/features/rbac/domain/resources";
import {
  buatKlienBsre,
  gabungKonfigTte,
  KONFIG_TTE_DEFAULT,
  konfigTteFormSchema,
  masalahKonfigTte,
  parseKonfigTte,
  siapTte,
  tandaiTte,
  type HasilTte,
  type KonfigTte,
  type KonfigTteFormInput,
  type KonfigTteTersimpan,
} from "@/features/surat/domain/tte";
import {
  getKonfigTteTersimpan,
  simpanKonfigTteTersimpan,
} from "@/features/surat/infrastructure/tte-repository";
import { requirePermission } from "@/lib/dal";

export interface KonfigurasiTtePageData {
  tersimpan: KonfigTteTersimpan;
  efektif: KonfigTte;
  masalah: string[];
  passwordTersedia: boolean;
  canManage: boolean;
}

function envTte(): KonfigTte {
  return parseKonfigTte(process.env as Record<string, string | undefined>);
}

/** Konfigurasi efektif (desa + environment) untuk pemakaian internal. */
export async function getKonfigurasiTteEfektif(villageId: number): Promise<KonfigTte> {
  const tersimpan = await getKonfigTteTersimpan(villageId);
  return gabungKonfigTte(envTte(), tersimpan);
}

/** Data halaman `/persuratan/tte` (tanpa mengembalikan passphrase). */
export async function getKonfigurasiTtePageData(): Promise<KonfigurasiTtePageData> {
  const user = await requirePermission(RESOURCES.tte, "read");
  const villageId = await resolveVillageId(user);
  const tersimpan = (await getKonfigTteTersimpan(villageId)) ?? KONFIG_TTE_DEFAULT;
  const envConfig = envTte();
  const efektif = gabungKonfigTte(envConfig, tersimpan);

  // Validasi memakai pilihan desa apa adanya (bukan hasil `gabung` yang
  // memaksa nonaktif saat centang "aktif" belum dicentang), supaya operator
  // melihat bagian yang kurang sebelum mengaktifkan TTE.
  const untukValidasi: KonfigTte = {
    mode: tersimpan.mode,
    api: tersimpan.api,
    username: tersimpan.username,
    nik: tersimpan.nik,
    password: envConfig.password,
    ssl: tersimpan.ssl,
    timeout: tersimpan.timeout ?? envConfig.timeout,
  };
  return {
    tersimpan,
    efektif,
    masalah: masalahKonfigTte(untukValidasi),
    passwordTersedia: envConfig.password !== "",
    canManage: hasPermission(user.permissions, RESOURCES.tte, "update"),
  };
}

/** Simpan konfigurasi non-rahasia desa; passphrase tetap di environment. */
export async function simpanKonfigurasiTteData(input: KonfigTteFormInput): Promise<void> {
  const user = await requirePermission(RESOURCES.tte, "update");
  const villageId = await resolveVillageId(user);
  const parsed = konfigTteFormSchema.parse(input);

  const config: KonfigTteTersimpan = {
    provider: "bsre",
    mode: parsed.mode,
    api: parsed.api,
    username: parsed.username,
    nik: parsed.nik,
    ssl: parsed.ssl,
    aktif: parsed.aktif,
  };

  await simpanKonfigTteTersimpan(villageId, config);
  await recordAuditEvent({
    villageId,
    actorId: user.id,
    event: AUDIT_EVENTS.tteConfigUpdate,
    resource: RESOURCES.tte,
    resourceId: String(villageId),
    details: {
      mode: config.mode,
      aktif: config.aktif,
      api: config.api || null,
      nikTerisi: config.nik !== "",
    },
  });
}

/**
 * Tandatangani PDF memakai konfigurasi desa.
 *
 * Mengembalikan `HasilTte` — kegagalan provider bukan kegagalan penerbitan.
 */
export async function tandatanganiPdfTte(input: {
  villageId: number;
  suratId: number;
  nomor: string;
  pdf: Uint8Array;
  config?: KonfigTte;
}): Promise<HasilTte> {
  const config = input.config ?? (await getKonfigurasiTteEfektif(input.villageId));
  if (!siapTte(config)) {
    return {
      ok: false,
      mode: config.mode,
      alasan:
        config.mode === "bsre"
          ? `Konfigurasi BSrE belum lengkap: ${masalahKonfigTte(config).join(" ")}`
          : "TTE dinonaktifkan — surat diterbitkan tanpa tanda tangan elektronik.",
    };
  }

  return tandaiTte(
    config,
    {
      villageId: input.villageId,
      suratId: input.suratId,
      nomor: input.nomor,
      pdf: input.pdf,
    },
    buatKlienBsre(),
  );
}

/**
 * Simpan PDF hasil TTE ke penyimpanan privat (kategori `surat-tte`).
 *
 * Kategori ini sengaja tidak termasuk daftar media publik; berkas hanya
 * disajikan lewat route PDF yang memeriksa izin surat.
 */
export async function simpanBerkasTte(
  villageId: number,
  nomor: string,
  pdf: Uint8Array,
): Promise<string> {
  return simpanBerkasMedia(
    villageId,
    {
      nama: `surat-tte-${nomor}`,
      mime: "application/pdf",
      ukuran: pdf.byteLength,
      isi: pdf,
    },
    "surat-tte",
    "berkas",
  );
}
