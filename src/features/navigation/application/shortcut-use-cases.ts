import "server-only";

import { requireUser, type CurrentUser } from "@/lib/dal";

import { MAKS_SHORTCUT, normalisasiShortcut, validasiShortcut } from "../domain/shortcut";
import { listShortcut, simpanShortcut } from "../infrastructure/shortcut-repository";
import type { MenuNode } from "./build-menu";
import { getMenuForUser } from "./get-menu";

export interface ShortcutItem {
  href: string;
  label: string;
}

const BERANDA = "/beranda";

/** Ratakan menu menjadi daftar tujuan yang dapat dijadikan pintasan. */
export function daftarTujuanMenu(menu: readonly MenuNode[]): ShortcutItem[] {
  const hasil: ShortcutItem[] = [];

  const telusuri = (nodes: readonly MenuNode[]) => {
    for (const node of nodes) {
      if (node.url) hasil.push({ href: node.url, label: node.label });
      telusuri(node.children);
    }
  };

  telusuri(menu);
  return hasil;
}

/**
 * Pintasan beranda efektif + seluruh tujuan yang boleh dipilih.
 *
 * Pintasan tersimpan yang menunya sudah tidak boleh dibaca dibuang; bila tidak
 * ada yang tersisa, dipakai tiga tujuan pertama dari menu.
 */
export async function ambilShortcutBeranda(
  user: CurrentUser,
): Promise<{ shortcut: ShortcutItem[]; tujuan: ShortcutItem[] }> {
  const menu = await getMenuForUser(user);
  const tujuan = daftarTujuanMenu(menu).filter((item) => item.href !== BERANDA);
  const peta = new Map(tujuan.map((item) => [item.href, item.label]));

  const tersimpan = normalisasiShortcut(await listShortcut(user.id), new Set(peta.keys()));
  const shortcut = tersimpan.map((href) => ({ href, label: peta.get(href) ?? href }));

  return {
    shortcut: shortcut.length > 0 ? shortcut.slice(0, MAKS_SHORTCUT) : tujuan.slice(0, 3),
    tujuan,
  };
}

/** Simpan pilihan pintasan; daftar kosong mengembalikan ke bawaan. */
export async function simpanShortcutBeranda(input: readonly string[]): Promise<string[]> {
  const user = await requireUser();
  const menu = await getMenuForUser(user);
  const diizinkan = new Set(daftarTujuanMenu(menu).map((item) => item.href));

  const hrefs = validasiShortcut(input, diizinkan);
  await simpanShortcut(user.id, hrefs);

  return hrefs;
}
