/**
 * Tandai respons yang berisi data privat agar tidak disimpan cache browser/proxy.
 */
export function privateNoStore<T extends Response>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
