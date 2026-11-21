import { requireUser } from "@/lib/dal";
import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import { TwoFactorSetup } from "@/app/(admin)/pengaturan/pengguna/keamanan/two-factor-setup";
import { env } from "@/lib/env";

export const metadata = { title: "Keamanan Akun" };
export default async function KeamananAkunPage() {
  const user = await requireUser();
  const [account] = await db.select({ twoFactorEnabled: users.twoFactorEnabled, email: users.email }).from(users).where(eq(users.id,user.id)).limit(1);
  return <main style={{maxWidth:760,margin:"32px auto",padding:20,display:"grid",gap:16}}>
    <header><small>Profil Saya</small><h1 style={{fontSize:26,fontWeight:800}}>Keamanan Akun</h1><p>Atur autentikasi dua faktor untuk melindungi akun Anda.</p></header>
    <TwoFactorSetup enabled={account?.twoFactorEnabled ?? false} hasEmail={Boolean(account?.email)} canEmailOtp={Boolean(env.RESEND_API_KEY && env.RESEND_FROM)}/>
  </main>;
}
