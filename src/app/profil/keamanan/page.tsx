import { TwoFactorSetup } from "@/app/(admin)/pengaturan/pengguna/keamanan/two-factor-setup";
import { getKeamananAkunSaya } from "@/features/pengguna/application/pengguna-use-cases";
import { requireUser } from "@/lib/dal";
import { env } from "@/lib/env";

import { PasswordChangeForm } from "./password-change-form";

export const metadata = { title: "Keamanan Akun" };
export default async function KeamananAkunPage() {
  const user = await requireUser({ allowSecurityRecovery: true });
  const { account, policy } = await getKeamananAkunSaya(user.id, user.villageId);
  return (
    <main style={{ maxWidth: 760, margin: "32px auto", padding: 20, display: "grid", gap: 16 }}>
      <header>
        <small>Profil Saya</small>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Keamanan Akun</h1>
        <p>Atur autentikasi dua faktor untuk melindungi akun Anda.</p>
      </header>
      {user.residentId === null ? (
        <PasswordChangeForm
          expired={user.passwordExpired}
          minLength={policy?.passwordMinLength ?? 8}
          requireUppercase={policy?.requireUppercase ?? true}
          requireLowercase={policy?.requireLowercase ?? true}
          requireNumber={policy?.requireNumber ?? true}
          requireSymbol={policy?.requireSymbol ?? false}
          reuseCount={policy?.passwordReuseCount ?? 3}
        />
      ) : null}
      <TwoFactorSetup
        required={Boolean(policy?.requireTwoFactorForAllUsers && user.residentId === null)}
        enabled={account?.twoFactorEnabled ?? false}
        hasEmail={Boolean(account?.email)}
        hasVerifiedEmail={account?.emailVerified ?? false}
        canEmailOtp={Boolean(env.RESEND_API_KEY && env.RESEND_FROM)}
      />
    </main>
  );
}
