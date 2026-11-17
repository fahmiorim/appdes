import "server-only";

import type { db } from "@/db";
import { menuPublik, rolePermissions, roles, modules as tabelModul, theme } from "@/db/schema";
import { TENANT_TEMPLATE } from "@/db/templates/tenant-template";
import {
  parseTemplateTenant,
  ROLE_ADMINISTRATOR,
  urutkanModulIndukDulu,
  type TemplateTenant,
} from "@/features/multi-desa/domain/template-tenant";
import { conflict } from "@/lib/errors";

/**
 * Penerapan template fondasi tenant.
 *
 * Semua penulisan terjadi di dalam transaksi provisioning yang sama; kegagalan
 * di tengah jalan membatalkan seluruh desa baru, bukan menyisakan tenant setengah
 * jadi. Id database dipetakan ulang dari slug template sehingga isi template
 * tidak bergantung pada nomor baris mana pun.
 */

type Transaksi = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Template bawaan yang sudah divalidasi skemanya. */
export function muatTemplateTenant(): TemplateTenant {
  return parseTemplateTenant(TENANT_TEMPLATE);
}

/**
 * Tulis fondasi tenant dari template.
 *
 * Mengembalikan id role administrator yang dipakai untuk akun admin desa baru.
 */
export async function tulisFondasiTenant(
  tx: Transaksi,
  villageId: number,
  template: TemplateTenant,
): Promise<{ adminRoleId: number }> {
  const roleIdPerSlug = new Map<string, number>();

  for (const role of template.roles) {
    const [baris] = await tx
      .insert(roles)
      .values({
        villageId,
        name: role.name,
        slug: role.slug,
        isSystem: role.isSystem,
      })
      .$returningId();
    if (!baris) throw conflict("Gagal membuat role dari template tenant.");
    roleIdPerSlug.set(role.slug, baris.id);
  }

  const modulIdPerSlug = new Map<string, number>();
  for (const modul of urutkanModulIndukDulu(template.modules)) {
    const parentId = modul.parentSlug === null ? 0 : (modulIdPerSlug.get(modul.parentSlug) ?? 0);
    const [baris] = await tx
      .insert(tabelModul)
      .values({
        villageId,
        slug: modul.slug,
        name: modul.name,
        url: modul.url,
        icon: modul.icon,
        isGroup: modul.isGroup,
        isHidden: modul.isHidden,
        isActive: modul.isActive,
        sortOrder: modul.sortOrder,
        parentId,
      })
      .$returningId();
    if (!baris) throw conflict("Gagal membuat modul dari template tenant.");
    modulIdPerSlug.set(modul.slug, baris.id);
  }

  for (const grant of template.akses) {
    const roleId = roleIdPerSlug.get(grant.roleSlug);
    const moduleId = modulIdPerSlug.get(grant.moduleSlug);
    if (roleId === undefined || moduleId === undefined) continue;
    await tx.insert(rolePermissions).values({ roleId, moduleId, access: grant.access });
  }

  if (template.tema) {
    await tx.insert(theme).values({
      villageId,
      slug: template.tema.slug,
      nama: template.tema.nama,
      versi: template.tema.versi,
      sumber: "bawaan",
      aktif: true,
      opsi: template.tema.opsi,
    });
  }

  if (template.menuPublik.length > 0) {
    await tx.insert(menuPublik).values(
      template.menuPublik.map((menu) => ({
        villageId,
        parentId: null,
        nama: menu.nama,
        link: menu.link,
        linkTipe: menu.linkTipe,
        aktif: menu.aktif,
        urut: menu.urut,
      })),
    );
  }

  const adminRoleId = roleIdPerSlug.get(ROLE_ADMINISTRATOR);
  if (adminRoleId === undefined) {
    throw conflict(`Template tenant tidak memiliki role ${ROLE_ADMINISTRATOR}.`);
  }

  return { adminRoleId };
}
