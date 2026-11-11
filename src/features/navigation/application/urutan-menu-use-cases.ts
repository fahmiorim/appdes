import "server-only";

import { requireUser, type CurrentUser } from "@/lib/dal";

import {
  normalisasiUrutanMenu,
  susunMenuPersonal,
  validasiUrutanMenu,
  type PilihanMenuUrutan,
} from "../domain/urutan-menu";
import { listUrutanMenu, simpanUrutanMenu } from "../infrastructure/urutan-menu-repository";
import type { MenuNode } from "./build-menu";
import { getMenuForUser } from "./get-menu";

export interface PreferensiSidebar {
  /** Menu tingkat atas yang sudah diurutkan sesuai preferensi pengguna. */
  menu: MenuNode[];
  /** Seluruh menu tingkat atas yang boleh dipilih. */
  pilihan: PilihanMenuUrutan[];
  /** Urutan slug yang sedang berlaku. */
  terpilih: string[];
}

/** Menu sidebar efektif: tersimpan lebih dulu, menu baru menyusul di belakang. */
export async function ambilMenuSidebar(user: CurrentUser): Promise<PreferensiSidebar> {
  const menu = await getMenuForUser(user);
  const tersimpan = normalisasiUrutanMenu(menu, await listUrutanMenu(user.id));
  const terurut = susunMenuPersonal(menu, tersimpan);

  return {
    menu: terurut,
    pilihan: menu.map((item) => ({ slug: item.slug, label: item.label })),
    terpilih: terurut.map((item) => item.slug),
  };
}

/** Varian untuk layout: hanya struktur menu yang sudah dipersonalisasi. */
export async function getMenuSidebarForUser(user: CurrentUser): Promise<MenuNode[]> {
  return (await ambilMenuSidebar(user)).menu;
}

/** Simpan urutan menu tingkat atas; daftar kosong mengembalikan ke bawaan. */
export async function simpanUrutanMenuSidebar(input: readonly string[]): Promise<string[]> {
  const user = await requireUser();
  const menu = await getMenuForUser(user);
  const slugs = validasiUrutanMenu(menu, input);

  await simpanUrutanMenu(user.id, slugs);
  return slugs;
}
