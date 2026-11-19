import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPendudukFormData } from "@/features/penduduk/application/use-cases";
import { PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import { hasPermission } from "@/features/rbac/application/authorization";
import { verifySession } from "@/lib/dal";

import { buatPendudukAction } from "../actions";
import { FormPenduduk } from "../form-penduduk";

export const metadata: Metadata = {
  title: "Tambah Penduduk",
};

export default async function TambahPendudukPage() {
  const user = await verifySession();
  if (!hasPermission(user.permissions, PENDUDUK_RESOURCE, "update")) notFound();

  const { references } = await getPendudukFormData();

  return (
    <div className="modul-page penduduk-page">
      <Link className="penduduk-back" href="/penduduk">
        ← Kembali ke Data Penduduk
      </Link>

      <div className="page-heading">
        <div>
          <span className="eyebrow">Kependudukan</span>
          <h1>Tambah Penduduk</h1>
          <p>Catat biodata penduduk baru pada desa ini. NIK dapat dikosongkan bila belum ada.</p>
        </div>
      </div>

      <FormPenduduk aksi={buatPendudukAction} references={references} />
    </div>
  );
}
