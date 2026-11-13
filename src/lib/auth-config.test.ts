import { describe, expect, it } from "vitest";

import { auth } from "@/lib/auth";

/**
 * Regresi AUD-007.
 *
 * Reset password harus mencabut sesi lama, dan sesi tidak boleh dipercaya dari
 * cookie cache stateless karena sesi yang sudah dihapus akan tetap dianggap
 * sah sampai cache kedaluwarsa.
 */
describe("konfigurasi sesi Better Auth", () => {
  it("mencabut seluruh sesi saat password direset", () => {
    expect(auth.options.emailAndPassword?.revokeSessionsOnPasswordReset).toBe(true);
  });

  it("tidak mengaktifkan cookie cache sesi", () => {
    expect(auth.options.session?.cookieCache?.enabled ?? false).toBe(false);
  });
});
