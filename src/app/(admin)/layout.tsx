import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/shell/admin-sidebar";
import { AdminTopbar } from "@/components/shell/admin-topbar";
import { getNamaDesaUseCase } from "@/features/desa/application/use-cases";
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

  const villageName = user.villageId === null ? null : await getNamaDesaUseCase(user.villageId);

  return (
    <div className="admin-frame">
      <AdminSidebar canReadDashboard={canReadDashboard} />
      <div className="admin-main">
        <AdminTopbar name={user.name} villageName={villageName ?? ""} />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
