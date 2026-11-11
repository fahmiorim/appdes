import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";
import { isBlankSelection } from "@/lib/forms";

export const PENGGUNA_RESOURCE = RESOURCES.pengguna;

/** Username hanya boleh huruf, angka, titik, garis bawah, dan tanda hubung. */
export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

const nameField = z.string().trim().min(1, "Nama wajib diisi.").max(100, "Maksimal 100 karakter.");

const usernameField = z
  .string()
  .trim()
  .min(3, "Username minimal 3 karakter.")
  .max(100, "Maksimal 100 karakter.")
  .regex(USERNAME_PATTERN, "Gunakan huruf, angka, titik, garis bawah, atau tanda hubung.");

const emailField = z
  .string()
  .trim()
  .max(255, "Maksimal 255 karakter.")
  .optional()
  .default("")
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Format email tidak valid.",
  )
  .transform((value) => (value === "" ? null : value.toLowerCase()));

const roleIdField = z
  .string()
  .refine(
    (value) => !isBlankSelection(value) && Number.isInteger(Number(value)) && Number(value) > 0,
    "Grup akses wajib dipilih.",
  )
  .transform((value) => Number(value));

const activeField = z.boolean().optional().default(true);

/** Skema tambah pengguna — kata sandi wajib, minimal 8 karakter. */
export const penggunaCreateSchema = z.object({
  name: nameField,
  username: usernameField,
  email: emailField,
  roleId: roleIdField,
  active: activeField,
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(72, "Maksimal 72 karakter."),
});

/** Skema ubah pengguna — kata sandi opsional (kosong = tidak diubah). */
export const penggunaUpdateSchema = z.object({
  name: nameField,
  username: usernameField,
  email: emailField,
  roleId: roleIdField,
  active: activeField,
  password: z
    .string()
    .max(72, "Maksimal 72 karakter.")
    .optional()
    .default("")
    .refine((value) => value === "" || value.length >= 8, "Kata sandi minimal 8 karakter.")
    .transform((value) => (value === "" ? null : value)),
});

export type PenggunaCreateInput = z.infer<typeof penggunaCreateSchema>;
export type PenggunaUpdateInput = z.infer<typeof penggunaUpdateSchema>;

/** Email pengganti bila pengguna tidak mengisi email (login memakai username). */
export function fallbackEmail(username: string): string {
  return `${username.toLowerCase()}@desa.local`;
}

export interface PenggunaDTO {
  id: string;
  villageId: number | null;
  name: string;
  username: string;
  email: string;
  roleId: number | null;
  roleName: string | null;
  active: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface RoleOption {
  value: string;
  label: string;
}
