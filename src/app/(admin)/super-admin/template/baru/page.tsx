import type { Metadata } from "next";

import { FormTemplate } from "@/features/multi-desa/presentation/form-template";
import { PlatformPageHeader } from "@/features/multi-desa/presentation/platform-ui";

import { pastikanSuperAdmin } from "../../guard";
import { buatTemplateAction } from "../actions";

export const metadata: Metadata = {
  title: "Tambah Template",
  robots: { index: false, follow: false },
};

export default async function SuperAdminTambahTemplatePage() {
  await pastikanSuperAdmin();

  return (
    <>
      <PlatformPageHeader
        backHref="/super-admin/template"
        backLabel="Kembali ke katalog template"
        path="/super-admin/template/baru"
      />
      <FormTemplate aksi={buatTemplateAction} mode="baru" />
    </>
  );
}
