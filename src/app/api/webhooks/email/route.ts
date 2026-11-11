import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { resolveVillageByHost } from "@/features/desa/application/resolve-village";
import { terimaPesanEmailWebhook } from "@/features/notifikasi/application/mailbox-use-cases";
import { pesanEmailMasukSchema } from "@/features/notifikasi/domain/mailbox";
import { env } from "@/lib/env";
import { bacaTeksTerbatas, BodyLimitError } from "@/lib/request-body";

const BATAS_BODY = 32_768;

function tokenSah(token: string, rahasia: string): boolean {
  const tokenBytes = Buffer.from(token);
  const rahasiaBytes = Buffer.from(rahasia);
  return tokenBytes.length === rahasiaBytes.length && timingSafeEqual(tokenBytes, rahasiaBytes);
}

/** POST /api/webhooks/email — payload JSON terautentikasi; tenant ditentukan oleh Host. */
export async function POST(request: Request) {
  const tokenKonfigurasi = env.EMAIL_WEBHOOK_TOKEN;
  if (!tokenKonfigurasi) {
    return NextResponse.json({ error: "Webhook email belum dikonfigurasi." }, { status: 503 });
  }

  let rawBody: string;
  try {
    rawBody = await bacaTeksTerbatas(request, BATAS_BODY);
  } catch (error) {
    if (error instanceof BodyLimitError) {
      return NextResponse.json({ error: "Payload terlalu besar." }, { status: 413 });
    }
    return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }
  const parsed = pesanEmailMasukSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload email tidak valid." }, { status: 400 });
  }
  if (!tokenSah(parsed.data.token, tokenKonfigurasi)) {
    return NextResponse.json({ error: "Token webhook tidak valid." }, { status: 401 });
  }

  let desa;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    desa = await resolveVillageByHost(host);
  } catch {
    return NextResponse.json({ error: "Desa untuk host ini tidak ditemukan." }, { status: 404 });
  }

  const id = await terimaPesanEmailWebhook({
    villageId: desa.id,
    alamat: parsed.data.alamat,
    subjek: parsed.data.subjek,
    isi: parsed.data.isi,
    tanggal: parsed.data.tanggal,
  });

  return NextResponse.json({ id }, { status: 201 });
}
