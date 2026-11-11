import { isIP } from "node:net";

import { env } from "@/lib/env";

/**
 * Ambil IP klien hanya dari header proxy bila instalasi memang berada di
 * belakang proxy/platform tepercaya. Tanpa konfigurasi itu, header seperti
 * `X-Forwarded-For` dapat dipalsukan oleh klien langsung.
 */
export function alamatIpDariHeader(headers: Headers, percayaProxy: boolean): string {
  if (!percayaProxy) return "tidak-diketahui";

  const kandidat = [
    headers.get("cf-connecting-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for")?.split(",")[0],
  ];

  for (const nilai of kandidat) {
    const ip = nilai?.trim();
    if (ip && isIP(ip) !== 0) return ip;
  }

  return "tidak-diketahui";
}

export function alamatIp(request: Request): string {
  return alamatIpDariHeader(request.headers, env.TRUST_PROXY);
}
