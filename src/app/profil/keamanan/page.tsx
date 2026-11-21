import { requireUser } from "@/lib/dal";
import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import { TwoFactorSetup } from "@/app/(admin)/pengaturan/pengguna/keamanan/two-factor-setup";
import { env } from "@/lib/env";
import { villageSecuritySettings } from "@/db/schema/village-security";
import { PasswordChangeForm } from "./password-change-form";

export const metadata = { title: "Keamanan Akun" };
export default async function KeamananAkunPage() {
  const user = await requireUser({ allowPasswordExpired: true });
  const [account] = await db.select({ twoFactorEnabled: users.twoFactorEnabled, email: users.email, emailVerified: users.emailVerified }).from(users).where(eq(users.id,user.id)).limit(1);
  const [policy] = user.villageId ? await db.select().from(villageSecuritySettings).where(eq(villageSecuritySettings.villageId,user.villageId)).limit(1) : [undefined];
  return <main style={{maxWidth:760,margin:"32px auto",padding:20,display:"grid",gap:16}}>
    <header><small>Profil Saya</small><h1 style={{fontSize:26,fontWeight:800}}>Keamanan Akun</h1><p>Atur autentikasi dua faktor untuk melindungi akun Anda.</p></header>
    <PasswordChangeForm expired={user.passwordExpired} minLength={policy?.passwordMinLength ?? 8} requireUppercase={policy?.requireUppercase ?? true} requireLowercase={policy?.requireLowercase ?? true} requireNumber={policy?.requireNumber ?? true} requireSymbol={policy?.requireSymbol ?? false} reuseCount={policy?.passwordReuseCount ?? 3}/>
    <TwoFactorSetup required={policy?.requireTwoFactorForAllUsers ?? false} enabled={account?.twoFactorEnabled ?? false} hasEmail={Boolean(account?.email)} hasVerifiedEmail={account?.emailVerified ?? false} canEmailOtp={Boolean(env.RESEND_API_KEY && env.RESEND_FROM)}/>
  </main>;
}
