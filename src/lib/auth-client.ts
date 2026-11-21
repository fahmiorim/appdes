"use client";

import { twoFactorClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [usernameClient(), twoFactorClient({ onTwoFactorRedirect: ({ twoFactorMethods }) => { const method = twoFactorMethods.includes("totp") ? "totp" : "otp"; window.location.assign(`/two-factor?method=${method}`); } })],
});
