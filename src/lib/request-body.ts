/** Kesalahan saat body melewati batas yang diizinkan. */
export class BodyLimitError extends Error {
  constructor(maxBytes: number) {
    super(`Body melebihi batas ${maxBytes} byte.`);
    this.name = "BodyLimitError";
  }
}

function periksaContentLength(request: Request, maxBytes: number): void {
  const header = request.headers.get("content-length");
  if (header === null) return;

  const length = Number(header);
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new Error("Content-Length tidak valid.");
  }
  if (length > maxBytes) {
    throw new BodyLimitError(maxBytes);
  }
}

/**
 * Baca body sebagai byte dengan batas ukuran.
 *
 * `Content-Length` diperiksa lebih dulu, lalu stream tetap dihitung ulang agar
 * body chunked atau header yang tidak jujur tidak bisa melewati batas.
 */
export async function bacaBytesTerbatas(request: Request, maxBytes: number): Promise<ArrayBuffer> {
  periksaContentLength(request, maxBytes);

  if (!request.body) return new ArrayBuffer(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new BodyLimitError(maxBytes);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const gabungan = new ArrayBuffer(total);
  const tampilan = new Uint8Array(gabungan);
  let offset = 0;
  for (const chunk of chunks) {
    tampilan.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return gabungan;
}

/** Baca body sebagai teks dengan batas byte. */
export async function bacaTeksTerbatas(request: Request, maxBytes: number): Promise<string> {
  return new TextDecoder().decode(await bacaBytesTerbatas(request, maxBytes));
}

/** Baca dan parse JSON dengan batas byte yang sama. */
export async function bacaJsonTerbatas<T = unknown>(
  request: Request,
  maxBytes: number,
): Promise<T> {
  const teks = await bacaTeksTerbatas(request, maxBytes);
  return JSON.parse(teks) as T;
}
