import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/shell/admin-sidebar";
import { AdminTopbar } from "@/components/shell/admin-topbar";
import { db } from "@/db";
import { villages } from "@/db/schema";
import { DEFAULT_RESOURCE, hasPermission } from "@/features/rbac/application/authorization";
import { verifySession } from "@/lib/dal";

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await verifySession();

  if (user.residentId !== null) {
    redirect("/layanan-mandiri");
  }

  const canReadDashboard = hasPermission(user.permissions, DEFAULT_RESOURCE, "read");
  if (!canReadDashboard) {
    redirect("/masuk");
  }

  const [village] =
    user.villageId === null
      ? []
      : await db
          .select({ name: villages.name })
          .from(villages)
          .where(eq(villages.id, user.villageId))
          .limit(1);

  return (
    <div className="admin-frame">
      <AdminSidebar canReadDashboard={canReadDashboard} />
      <div className="admin-main">
        <AdminTopbar name={user.name} villageName={village?.name ?? ""} />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
