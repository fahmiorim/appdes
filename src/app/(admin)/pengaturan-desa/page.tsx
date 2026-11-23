import type { Metadata } from "next";

import { requirePermission } from "@/lib/dal";

import styles from "./pengaturan-desa.module.css";
import { PengaturanDesaClient } from "./settings-client";

export const metadata: Metadata = { title: "Pengaturan Desa" };
export default async function PengaturanDesaPage() {
  await requirePermission("pengaturan-desa", "read");
  return (
    <div className={styles.shell}>
      <PengaturanDesaClient />
    </div>
  );
}
