import type { ModuleRecord } from "@/features/rbac/infrastructure/rbac-repository";

/** Satu simpul menu (hasil penggabungan modul + izin). */
export interface MenuNode {
  id: number;
  slug: string;
  label: string;
  url: string | null;
  icon: string | null;
  sortOrder: number;
  children: MenuNode[];
}

/**
 * Bangun struktur menu bersarang dari daftar modul, hanya menyertakan modul yang
 * boleh dibaca (`allowedSlugs`), aktif, dan tidak disembunyikan.
 *
 * Simpul tanpa `url` dan tanpa anak akan dibuang agar tidak muncul grup kosong.
 * Fungsi murni (tanpa I/O) sehingga mudah diuji.
 */
export function buildMenu(
  modules: readonly ModuleRecord[],
  allowedSlugs: ReadonlySet<string>,
): MenuNode[] {
  const visible = modules.filter((modul) => modul.isActive && !modul.isHidden);

  const parentById = new Map(visible.map((modul) => [modul.id, modul.parentId ?? 0]));
  const nodeById = new Map<number, MenuNode>();

  for (const modul of visible) {
    if (!allowedSlugs.has(modul.slug)) continue;

    nodeById.set(modul.id, {
      id: modul.id,
      slug: modul.slug,
      label: modul.name,
      url: modul.url,
      icon: modul.icon,
      sortOrder: modul.sortOrder ?? 0,
      children: [],
    });
  }

  const roots: MenuNode[] = [];

  for (const node of nodeById.values()) {
    const parentId = parentById.get(node.id) ?? 0;
    const parent = parentId > 0 ? nodeById.get(parentId) : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursively = (items: MenuNode[]): void => {
    items.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "id"));
    for (const item of items) sortRecursively(item.children);
  };
  sortRecursively(roots);

  const pruneEmptyGroups = (items: MenuNode[]): MenuNode[] =>
    items
      .map((item) => ({ ...item, children: pruneEmptyGroups(item.children) }))
      .filter((item) => item.url !== null || item.children.length > 0);

  return pruneEmptyGroups(roots);
}
