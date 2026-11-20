import type { Metadata } from "next";
import Link from "next/link";
import { DataKependudukanNav } from "@/app/(admin)/data-kependudukan-nav";
import { notFound } from "next/navigation";

import { getPendudukFormData } from "@/features/penduduk/application/use-cases";
import { PENDUDUK_RESOURCE } from "@/features/penduduk/domain/penduduk";
import { hasPermission } from "@/features/rbac/application/authorization";
import { verifySession } from "@/lib/dal";

import { ubahPendudukAction } from "../../actions";
import { FormPenduduk } from "../../form-penduduk";

export const metadata: Metadata = {
  title: "Ubah Data Penduduk",
};

export default async function UbahPendudukPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nomor = Number(id);

  if (!Number.isInteger(nomor) || nomor <= 0) notFound();

  const user = await verifySession();
  if (!hasPermission(user.permissions, PENDUDUK_RESOURCE, "update")) notFound();

  const { references, penduduk } = await getPendudukFormData(nomor);
  if (!penduduk) notFound();

  return (
    <div className="modul-page penduduk-page data-kependudukan-page">
      <DataKependudukanNav active="/penduduk" />
      <Link className="penduduk-back" href={`/penduduk/${penduduk.id}`}>
        ← Kembali ke Detail Penduduk
      </Link>

      <div className="page-heading">
        <div>
          <span className="eyebrow">Kependudukan</span>
          <h1>Ubah Data Penduduk</h1>
          <p>Perbarui biodata {penduduk.name}. Perubahan dicatat pada audit trail desa ini.</p>
        </div>
      </div>

      <FormPenduduk aksi={ubahPendudukAction} penduduk={penduduk} references={references} />
    </div>
  );
}
