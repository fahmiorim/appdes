import type { Metadata } from "next";
import { requirePermission } from "@/lib/dal";
import { PengaturanDesaClient } from "./settings-client";
import styles from "./pengaturan-desa.module.css";
export const metadata: Metadata = { title: "Pengaturan Desa" };
export default async function PengaturanDesaPage() {
  await requirePermission("pengaturan-desa", "read");
  return <div className={styles.shell}><PengaturanDesaClient /></div>;
}
