import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

/**
 * Endpoint better-auth (`/api/auth/*`).
 *
 * Seluruh alur autentikasi (login, logout, refresh sesi, dsb.) ditangani di sini.
 */
export const { GET, POST } = toNextJsHandler(auth);
