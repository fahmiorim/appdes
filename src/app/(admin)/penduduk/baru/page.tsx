import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import { getPendudukFormData } from "@/features/penduduk/application/use-cases";
import { PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import { hasPermission } from "@/features/rbac/application/authorization";
import { verifySession } from "@/lib/dal";

import { buatPendudukAction } from "../actions";
import { FormPenduduk } from "../form-penduduk";

export const metadata: Metadata = {
  title: "Tambah Penduduk",
};

export default async function TambahPendudukPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await verifySession();
  if (!hasPermission(user.permissions, PENDUDUK_RESOURCE, "update")) notFound();

  const params = await searchParams;
  const familyRaw = typeof params.familyId === "string" ? Number(params.familyId) : null;
  const familyId =
    familyRaw !== null && Number.isInteger(familyRaw) && familyRaw > 0 ? familyRaw : null;
  const { references } = await getPendudukFormData();
  if (familyId !== null && !references.families.some((item) => item.id === familyId)) notFound();

  return (
    <div className="modul-page penduduk-page data-kependudukan-page">
      <DataKependudukanNav active="/penduduk" />
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

      <FormPenduduk aksi={buatPendudukAction} familyId={familyId} references={references} />
    </div>
  );
}
