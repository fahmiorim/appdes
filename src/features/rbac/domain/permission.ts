export type Action = "read" | "create" | "update" | "delete";
export interface ModuleActions {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export const ACCESS_LEVELS = ["read", "write", "manage"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export const ACCESS_RANK: Readonly<Record<AccessLevel, number>> = {
  read: 1,
  write: 2,
  manage: 3,
};

const REQUIRED_LEVEL: Readonly<Record<Action, AccessLevel>> = {
  read: "read",
  create: "write",
  update: "write",
  delete: "manage",
};

function rank(level: AccessLevel | null | undefined): number {
  return level ? ACCESS_RANK[level] : 0;
}
function widest(a: AccessLevel | null, b: AccessLevel | null): AccessLevel | null {
  return rank(a) >= rank(b) ? a : b;
}
export interface ModuleNode {
  id: number;
  parentId: number | null;
  slug: string;
}
export function applyParentInheritance(
  modules: readonly ModuleNode[],
  levelById: ReadonlyMap<number, AccessLevel>,
): Map<string, AccessLevel> {
  const childrenByParent = new Map<number, number[]>();
  for (const modul of modules) {
    const parentId = modul.parentId ?? 0;
    if (parentId > 0) {
      const siblings = childrenByParent.get(parentId) ?? [];
      siblings.push(modul.id);
      childrenByParent.set(parentId, siblings);
    }
  }
  const effective = new Map<string, AccessLevel>();
  for (const modul of modules) {
    const own = levelById.get(modul.id) ?? null;
    const children = childrenByParent.get(modul.id) ?? [];
    const childReadable = children.some((childId) => levelById.has(childId));
    const level = childReadable ? widest(own, "read") : own;
    if (level) effective.set(modul.slug, level);
  }
  return effective;
}
export function levelAllows(level: AccessLevel | null | undefined, action: Action): boolean {
  if (!level) return false;
  return ACCESS_RANK[level as AccessLevel] >= ACCESS_RANK[REQUIRED_LEVEL[action]];
}
export function levelToActions(level: AccessLevel | null | undefined): Action[] {
  const actions: Action[] = [];
  if (!level) return actions;
  if (levelAllows(level, "read")) actions.push("read");
  if (levelAllows(level, "create")) actions.push("create");
  if (levelAllows(level, "update")) actions.push("update");
  if (levelAllows(level, "delete")) actions.push("delete");
  return actions;
}
export interface CrudPermissions {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}
export function toCrudPermissions(level: AccessLevel | null | undefined): CrudPermissions {
  if (!level) return { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
  return {
    canRead: ACCESS_RANK[level as AccessLevel] >= ACCESS_RANK.read,
    canCreate: ACCESS_RANK[level as AccessLevel] >= ACCESS_RANK.write,
    canUpdate: ACCESS_RANK[level as AccessLevel] >= ACCESS_RANK.write,
    canDelete: ACCESS_RANK[level as AccessLevel] >= ACCESS_RANK.manage,
  };
}
export function fromCrudPermissions(perms: CrudPermissions): AccessLevel | null {
  if (perms.canDelete) return "manage";
  if (perms.canCreate || perms.canUpdate) return "write";
  if (perms.canRead) return "read";
  return null;
}
