import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { resolveVillageByHost } from "@/features/desa/application/resolve-village";
import { terimaPesanEmailWebhook } from "@/features/notifikasi/application/mailbox-use-cases";
import { pesanEmailMasukSchema } from "@/features/notifikasi/domain/mailbox";
import { batasiPermintaan } from "@/features/rate-limit/application/rate-limit";
import { env } from "@/lib/env";
import { BodyLimitError, bacaTeksTerbatas } from "@/lib/request-body";

const BATAS_BODY = 32_768;
const TOLERANSI_WAKTU_DETIK = 300;
const JENDELA_REPLAY_MS = 10 * 60_000;

function signatureSah(
  rawBody: string,
  timestamp: string,
  eventId: string,
  signature: string,
): boolean {
  if (!/^\d{10}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(signature)) return false;

  const waktu = Number(timestamp);
  const sekarang = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(waktu) || Math.abs(sekarang - waktu) > TOLERANSI_WAKTU_DETIK) {
    return false;
  }

  const expected = createHmac("sha256", env.EMAIL_WEBHOOK_TOKEN!)
    .update(`${timestamp}.${eventId}.${rawBody}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** POST /api/webhooks/email — HMAC bertimestamp; tenant hanya dari Host yang diterima server. */
export async function POST(request: Request) {
  const secret = env.EMAIL_WEBHOOK_TOKEN;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook email belum dikonfigurasi." },
      { status: 503 },
    );
  }

  const timestamp = request.headers.get("x-email-webhook-timestamp") ?? "";
  const eventId = request.headers.get("x-email-webhook-id") ?? "";
  const signature = request.headers.get("x-email-webhook-signature") ?? "";
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(eventId)) {
    return NextResponse.json({ error: "Identitas event webhook tidak valid." }, { status: 401 });
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

  if (!signatureSah(rawBody, timestamp, eventId, signature)) {
    return NextResponse.json(
      { error: "Signature webhook tidak valid atau kedaluwarsa." },
      { status: 401 },
    );
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

  // Penyimpanan rate-limit bersama memakai transaksi + row lock MySQL, sehingga
  // event ID yang sama hanya dapat diproses sekali lintas instance aplikasi.
  const replay = await batasiPermintaan(`email-webhook-event:${eventId}`, {
    batas: 1,
    jendelaMs: JENDELA_REPLAY_MS,
  });
  if (replay.dibatasi) {
    return NextResponse.json({ error: "Event webhook sudah pernah diproses." }, { status: 409 });
  }

  let desa;
  try {
    // X-Forwarded-Host tidak dipercaya sebagai sumber tenant: header tersebut
    // dapat dikirim klien kecuali proxy tepercaya menghapus dan menimpanya.
    desa = await resolveVillageByHost(request.headers.get("host"));
  } catch {
    return NextResponse.json(
      { error: "Desa untuk host ini tidak ditemukan." },
      { status: 404 },
    );
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
