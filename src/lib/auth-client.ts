"use client";

import { inferAdditionalFields, twoFactorClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    // Menyelaraskan tipe `session.user` di client dengan additionalFields server
    // (mis. `villageId` dan `residentId`). Import hanya untuk tipe.
    inferAdditionalFields<typeof auth>(),
    twoFactorClient({
      onTwoFactorRedirect: ({ twoFactorMethods }) => {
        const method = (twoFactorMethods ?? []).includes("totp") ? "totp" : "otp";
        window.location.assign(`/two-factor?method=${method}`);
      },
    }),
  ],
});
