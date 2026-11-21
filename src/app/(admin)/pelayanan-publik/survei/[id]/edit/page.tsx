import { notFound } from "next/navigation";
import { getSurveiEditorData } from "@/features/pelayanan/application/survei-use-cases";
import { SurveiForm } from "../../survei-form";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const row = await getSurveiEditorData(id);
  return <SurveiForm row={row}/>;
}
