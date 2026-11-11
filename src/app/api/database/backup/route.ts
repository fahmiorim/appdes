import { unduhBackupSql } from "@/features/database/application/database-use-cases";
import { appErrorStatus, isAppError } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "sql" ? false : true;
    const result = await unduhBackupSql(format);
    return new Response(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": result.mime,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      return new Response(error.message, { status: appErrorStatus(error.code) });
    }
    console.error("Gagal membuat backup database:", error);
    return new Response("Gagal membuat backup database.", { status: 500 });
  }
}
