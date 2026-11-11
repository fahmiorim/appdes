import "server-only";

import { headers } from "next/headers";

/**
 * Origin situs untuk request saat ini (mis. `https://desa-sukamaju.id`).
 *
 * Dipakai `sitemap.ts` dan `robots.ts`. Karena tenant ditentukan host, URL
 * absolut harus dibangun dari header permintaan, bukan dari env statis.
 */
export async function getRequestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return "";

  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const isLokal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = forwardedProto ?? (isLokal ? "http" : "https");

  return `${protocol}://${host}`;
}
