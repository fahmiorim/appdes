import "server-only";

import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { requireSuperAdmin } from "@/features/multi-desa/application/provisioning-use-cases";
import {
  bandingkanVersi,
  distribusiTemplateSchema,
  websiteTemplateInputSchema,
  websiteTemplateStatusSchema,
  websiteTemplateUpdateSchema,
  type StatusTemplate,
} from "@/features/multi-desa/domain/template-website";
import {
  buatTemplateWebsite,
  distribusikanVersiTemplate,
  getTemplateWebsite,
  listPenggunaanTemplateWebsite,
  listTemplateWebsite,
  listVersiTemplateWebsite,
  setStatusTemplateWebsite,
  slugTemplateDipakai,
  ubahTemplateWebsite,
  type PenggunaanTemplateWebsiteRow,
  type TemplateWebsiteRow,
  type VersiTemplateWebsiteRow,
} from "@/features/multi-desa/infrastructure/template-website-repository";
import { conflict, notFound } from "@/lib/errors";

/**
 * Katalog tema website platform.
 *
 * Semua fungsi memanggil `requireSuperAdmin` sebelum membaca atau menulis.
 * Katalog ini tidak mengunggah kode: template hanya menyimpan metadata dan token
 * tampilan tervalidasi. Distribusi versi dibatasi pada tenant yang benar-benar
 * memakai slug template tersebut.
 */

export interface DetailTemplateWebsite {
  template: TemplateWebsiteRow;
  versi: VersiTemplateWebsiteRow[];
  penggunaan: PenggunaanTemplateWebsiteRow[];
}

export async function daftarTemplateWebsite(): Promise<TemplateWebsiteRow[]> {
  await requireSuperAdmin();
  return listTemplateWebsite();
}

export async function ambilTemplateWebsite(id: number): Promise<DetailTemplateWebsite | null> {
  await requireSuperAdmin();
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const template = await getTemplateWebsite(id);
  if (!template) return null;

  const [versi, penggunaan] = await Promise.all([
    listVersiTemplateWebsite(template.id),
    listPenggunaanTemplateWebsite(template),
  ]);

  return { template, versi, penggunaan };
}

export async function buatTemplateWebsiteBaru(input: unknown): Promise<{ id: number }> {
  const user = await requireSuperAdmin();
  const parsed = websiteTemplateInputSchema.parse(input);

  if (await slugTemplateDipakai(parsed.slug)) {
    throw conflict("Slug template sudah digunakan.");
  }

  const hasil = await buatTemplateWebsite({
    ...parsed,
    createdBy: user.id,
  });

  await recordAuditEvent({
    villageId: null,
    actorId: user.id,
    event: AUDIT_EVENTS.websiteTemplateCreate,
    resource: "website_templates",
    resourceId: String(hasil.id),
    details: { slug: parsed.slug, version: parsed.version },
  });

  return hasil;
}

export async function ubahTemplateWebsiteData(input: unknown): Promise<{ versiBaru: boolean }> {
  const user = await requireSuperAdmin();
  const parsed = websiteTemplateUpdateSchema.parse(input);
  const sebelum = await getTemplateWebsite(parsed.id);
  if (!sebelum) throw notFound("Template website tidak ditemukan.");

  const versiBerubah = parsed.version !== sebelum.version;
  if (versiBerubah) {
    if (bandingkanVersi(parsed.version, sebelum.version) <= 0) {
      throw conflict("Versi baru harus lebih tinggi dari versi saat ini.");
    }
    if (!parsed.changelog.trim()) {
      throw conflict("Catatan perubahan wajib diisi saat menaikkan versi.");
    }
  }

  const hasil = await ubahTemplateWebsite(parsed);

  await recordAuditEvent({
    villageId: null,
    actorId: user.id,
    event: AUDIT_EVENTS.websiteTemplateUpdate,
    resource: "website_templates",
    resourceId: String(parsed.id),
    details: {
      slug: sebelum.slug,
      versiLama: sebelum.version,
      versiBaru: parsed.version,
    },
  });

  return hasil;
}

export async function ubahStatusTemplateWebsiteData(
  input: unknown,
): Promise<{ status: StatusTemplate }> {
  const user = await requireSuperAdmin();
  const parsed = websiteTemplateStatusSchema.parse(input);
  const template = await getTemplateWebsite(parsed.id);
  if (!template) throw notFound("Template website tidak ditemukan.");

  await setStatusTemplateWebsite(parsed.id, parsed.status);

  await recordAuditEvent({
    villageId: null,
    actorId: user.id,
    event: AUDIT_EVENTS.websiteTemplateStatus,
    resource: "website_templates",
    resourceId: String(parsed.id),
    details: { slug: template.slug, status: parsed.status },
  });

  return { status: parsed.status };
}

export async function distribusikanVersiTemplateWebsite(
  input: unknown,
): Promise<{ jumlah: number }> {
  const user = await requireSuperAdmin();
  const parsed = distribusiTemplateSchema.parse(input);
  const template = await getTemplateWebsite(parsed.id);
  if (!template) throw notFound("Template website tidak ditemukan.");
  if (template.status !== "published") {
    throw conflict("Hanya template terbit yang dapat didistribusikan.");
  }

  // Validasi daftar desa terhadap tenant yang benar-benar memakai template ini.
  const penggunaan = await listPenggunaanTemplateWebsite(template);
  const diizinkan = new Set(penggunaan.map((item) => item.villageId));
  const target = [...new Set(parsed.villageIds)].filter((id) => diizinkan.has(id));
  if (target.length === 0) {
    throw conflict("Tidak ada tenant terpilih yang memakai template ini.");
  }

  const jumlah = await distribusikanVersiTemplate(template, target);

  await recordAuditEvent({
    villageId: null,
    actorId: user.id,
    event: AUDIT_EVENTS.websiteTemplateDistribute,
    resource: "website_templates",
    resourceId: String(template.id),
    details: {
      slug: template.slug,
      version: template.version,
      jumlahTenant: jumlah,
    },
  });

  return { jumlah };
}
