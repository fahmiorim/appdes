import { z } from "zod";

import { RESOURCES } from "@/features/rbac/domain/resources";

export const GRUP_AKSES_RESOURCE = RESOURCES.grupAkses;

export const roleFormSchema = z.object({
  name: z.string().trim().min(1, "Nama grup wajib diisi.").max(100, "Maksimal 100 karakter."),
});

export type RoleFormInput = z.infer<typeof roleFormSchema>;

export interface RoleDTO {
  id: number;
  name: string;
  description?: string | null;
  isSystem: boolean;
}

export interface ModulePermissionRow {
  moduleId: number;
  slug: string;
  name: string;
  url: string | null;
  icon: string | null;
  parentId: number | null;
  isGroup: boolean;
  isActive: boolean;
  read: boolean;
  write: boolean;
  manage: boolean;
}

export interface RoleDetail {
  role: RoleDTO;
  permissions: ModulePermissionRow[];
}
