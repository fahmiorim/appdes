"use server";

import { revalidatePath } from "next/cache";

import {
  buatTemplateWebsiteBaru,
  distribusikanVersiTemplateWebsite,
  ubahStatusTemplateWebsiteData,
  ubahTemplateWebsiteData,
} from "@/features/multi-desa/application/template-website-use-cases";
import type { StatusTemplate, TokenTemplate } from "@/features/multi-desa/domain/template-website";
import { successState, toErrorState, type ActionState } from "@/lib/action-state";

/**
 * Server Action katalog template website.
 *
 * Hanya memetakan FormData ke use case. Guard Super Admin, validasi Zod, dan
 * audit tetap berada di application layer; id dari form tidak dianggap bukti
 * otorisasi.
 */

const HALAMAN = "/super-admin/template";

function tokenDari(formData: FormData): TokenTemplate {
  return {
    primary: String(formData.get("primary") ?? ""),
    secondary: String(formData.get("secondary") ?? ""),
    accent: String(formData.get("accent") ?? ""),
    background: String(formData.get("background") ?? ""),
    surface: String(formData.get("surface") ?? ""),
    text: String(formData.get("text") ?? ""),
    fontHeading: String(formData.get("fontHeading") ?? "") as TokenTemplate["fontHeading"],
    radius: String(formData.get("radius") ?? "") as TokenTemplate["radius"],
    style: String(formData.get("style") ?? "") as TokenTemplate["style"],
  };
}

function tagsDari(formData: FormData): string[] {
  return String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function buatTemplateAction(
  _state: ActionState<{ id: number; versiBaru: boolean }>,
  formData: FormData,
): Promise<ActionState<{ id: number; versiBaru: boolean }>> {
  try {
    const hasil = await buatTemplateWebsiteBaru({
      name: formData.get("name"),
      slug: formData.get("slug"),
      category: formData.get("category"),
      description: formData.get("description"),
      version: formData.get("version"),
      tags: tagsDari(formData),
      tokens: tokenDari(formData),
    });

    revalidatePath(HALAMAN);
    return successState("Template website disimpan sebagai draf.", {
      id: hasil.id,
      versiBaru: false,
    });
  } catch (error) {
    return toErrorState(error);
  }
}

export async function ubahTemplateAction(
  _state: ActionState<{ id: number; versiBaru: boolean }>,
  formData: FormData,
): Promise<ActionState<{ id: number; versiBaru: boolean }>> {
  try {
    const id = Number(formData.get("id"));
    const hasil = await ubahTemplateWebsiteData({
      id,
      name: formData.get("name"),
      category: formData.get("category"),
      description: formData.get("description"),
      version: formData.get("version"),
      tags: tagsDari(formData),
      tokens: tokenDari(formData),
      changelog: formData.get("changelog"),
    });

    revalidatePath(HALAMAN);
    revalidatePath(`/super-admin/template/${id}`);
    return successState(
      hasil.versiBaru ? "Template dan versi baru disimpan." : "Perubahan template disimpan.",
      { id, versiBaru: hasil.versiBaru },
    );
  } catch (error) {
    return toErrorState(error);
  }
}

export async function ubahStatusTemplateAction(
  _state: ActionState<{ status: StatusTemplate }>,
  formData: FormData,
): Promise<ActionState<{ status: StatusTemplate }>> {
  try {
    const hasil = await ubahStatusTemplateWebsiteData({
      id: formData.get("id"),
      status: formData.get("status"),
    });
    const id = Number(formData.get("id"));

    revalidatePath(HALAMAN);
    revalidatePath(`/super-admin/template/${id}`);
    revalidatePath("/super-admin/template/penggunaan");
    return successState(
      hasil.status === "published"
        ? "Template diterbitkan dan tersedia untuk dipakai tenant."
        : "Template diarsipkan dari pilihan aktif.",
      hasil,
    );
  } catch (error) {
    return toErrorState(error);
  }
}

export async function distribusiTemplateAction(
  _state: ActionState<{ jumlah: number }>,
  formData: FormData,
): Promise<ActionState<{ jumlah: number }>> {
  try {
    const id = Number(formData.get("id"));
    const hasil = await distribusikanVersiTemplateWebsite({
      id,
      villageIds: formData.getAll("villageIds").map((value) => String(value)),
    });

    revalidatePath(HALAMAN);
    revalidatePath(`/super-admin/template/${id}`);
    revalidatePath("/super-admin/template/penggunaan");
    return successState(`${hasil.jumlah} tenant diperbarui ke versi terbaru.`, hasil);
  } catch (error) {
    return toErrorState(error);
  }
}
