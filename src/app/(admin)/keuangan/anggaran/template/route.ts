import { downloadApbdesTemplateAction } from "@/features/keuangan/application/apbdes-import-use-cases";

export async function GET(_request: Request) {
  try {
    const buffer = await downloadApbdesTemplateAction();

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8",
        "Content-Disposition": 'attachment; filename="Template-APBDes.xlsx"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Gagal download template APBDes:", error);
    return new Response("Gagal download template APBDes.", { status: 500 });
  }
}
