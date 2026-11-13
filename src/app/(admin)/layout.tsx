import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/shell/admin-sidebar";
import { AdminTopbar } from "@/components/shell/admin-topbar";
import { readableResources } from "@/features/rbac/application/authorization";
import { listModules } from "@/features/rbac/infrastructure/rbac-repository";
import { db } from "@/db";
import { villages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/dal";

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await verifySession();

  if (user.residentId !== null) {
    redirect("/layanan-mandiri");
  }

  const [village] =
    user.villageId === null
      ? []
      : await db
          .select({ name: villages.name })
          .from(villages)
          .where(eq(villages.id, user.villageId))
          .limit(1);

  const modules = await listModules(user.villageId);
  const readable = readableResources(user.permissions);
  const menuItems = modules
    .filter(
      (item) =>
        item.isActive &&
        !item.isHidden &&
        !item.isGroup &&
        Boolean(item.url) &&
        (user.permissions.isSuperadmin || readable.has(item.slug)),
    )
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) => ({
      slug: item.slug,
      name: item.name,
      url: item.url as string,
      icon: item.icon,
    }));

  return (
    <div className="admin-frame">
      <AdminSidebar items={menuItems} />
      <div className="admin-main">
        <AdminTopbar name={user.name} villageName={village?.name ?? ""} />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
