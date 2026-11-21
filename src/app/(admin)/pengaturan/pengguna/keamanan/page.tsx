import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { getSecuritySettings, listBlockedIps } from "@/features/pengguna/infrastructure/keamanan-repository";
import { hapusBlokirIpAction, blokirIpAction, resetKeamananAction, simpanKeamananAction } from "../keamanan-actions";
import styles from "./keamanan.module.css";
import { TwoFactorSetup } from "./two-factor-setup";
import { db } from "@/db";
import { users } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import { hasPermission } from "@/features/rbac/application/authorization";
import { env } from "@/lib/env";

export const metadata = { title: "Pengaturan Keamanan" };
export default async function KeamananPage() {
  const user = await requirePermission(RESOURCES.pengguna, "read");
  const villageId = await resolveVillageId(user);
  const canCreate = hasPermission(user.permissions, RESOURCES.pengguna, "create");
  const canManage = hasPermission(user.permissions, RESOURCES.pengguna, "update");
  const canDelete = hasPermission(user.permissions, RESOURCES.pengguna, "delete");
  const [settings, blockedIps, account] = await Promise.all([getSecuritySettings(villageId), listBlockedIps(villageId), db.select({twoFactorEnabled:users.twoFactorEnabled,email:users.email,emailVerified:users.emailVerified}).from(users).where(eq(users.id,user.id)).limit(1)]);
  return <main className={styles.page}>
    <header><div><small>Pengaturan Desa / Manajemen Pengguna</small><h1>Pengaturan Keamanan</h1><p>Kebijakan kata sandi, sesi login, dan pembatasan akses jaringan.</p><Link href="/profil/keamanan">Kelola 2FA akun sendiri →</Link></div></header>
    <nav className={styles.tabs}><Link href="/pengaturan/pengguna">Pengguna</Link><Link href="/pengaturan/grup-akses">Peran & Hak Akses</Link>{hasPermission(user.permissions,RESOURCES.auditLog,"read")?<Link href="/pengaturan/pengguna/aktivitas">Aktivitas Pengguna</Link>:null}<Link aria-current="page" href="/pengaturan/pengguna/keamanan">Pengaturan Keamanan</Link></nav>
    <TwoFactorSetup required={settings.requireTwoFactorForAllUsers} enabled={account[0]?.twoFactorEnabled ?? false} hasEmail={Boolean(account[0]?.email)} hasVerifiedEmail={account[0]?.emailVerified ?? false} canEmailOtp={Boolean(env.RESEND_API_KEY && env.RESEND_FROM)}/>
    {canManage ? <form action={simpanKeamananAction} className={styles.grid}>
      <section className={styles.card}><h2>🔐 Kebijakan Password</h2>
        <label>Minimal panjang password<input type="number" min="8" max="72" name="passwordMinLength" defaultValue={settings.passwordMinLength}/></label>
        <label className={styles.check}><input type="checkbox" name="requireUppercase" defaultChecked={settings.requireUppercase}/> Wajib huruf besar (A–Z)</label>
        <label className={styles.check}><input type="checkbox" name="requireLowercase" defaultChecked={settings.requireLowercase}/> Wajib huruf kecil (a–z)</label>
        <label className={styles.check}><input type="checkbox" name="requireNumber" defaultChecked={settings.requireNumber}/> Wajib angka (0–9)</label>
        <label className={styles.check}><input type="checkbox" name="requireSymbol" defaultChecked={settings.requireSymbol}/> Wajib simbol</label>
      </section>
      <section className={styles.card}><h2>🖥️ Pengaturan Sesi & Akses</h2>
        <label>Durasi sesi tidak aktif (menit)<input type="number" min="5" max="720" name="sessionTimeoutMinutes" defaultValue={settings.sessionTimeoutMinutes}/></label>
        <label className={styles.check}><input type="checkbox" name="autoLogoutInactive" defaultChecked={settings.autoLogoutInactive}/> Logout otomatis setelah tidak aktif</label>
        <label className={styles.check}><input type="checkbox" name="concurrentLogin" defaultChecked={settings.concurrentLogin}/> Batasi satu sesi per akun</label>
        <label className={styles.check}><input type="checkbox" name="requireTwoFactorForAllUsers" defaultChecked={settings.requireTwoFactorForAllUsers}/> Wajibkan 2FA untuk seluruh akun staf desa</label><p className={styles.note}>Pastikan seluruh akun staf sudah mengaktifkan dan memverifikasi 2FA sebelum kebijakan diwajibkan. Akun yang belum mendaftar tidak dapat login setelah kebijakan aktif.</p>
        <label className={styles.check}><input type="checkbox" name="ipRestrictionEnabled" defaultChecked={settings.ipRestrictionEnabled}/> Aktifkan whitelist IP</label>
        <label>IP yang diizinkan (satu per baris)<textarea name="allowedIps" defaultValue={settings.allowedIps.join("\n")} placeholder="203.0.113.10&#10;2001:db8::1"/></label>
        <p className={styles.note}>Whitelist IP hanya mengandalkan alamat dari proxy tepercaya yang dikonfigurasi server. Pastikan IP administrator masuk daftar sebelum mengaktifkan. Percobaan login juga dibatasi 5 kali per menit per IP oleh server.</p>
      </section>
      <div className={styles.actions}><button type="submit">Simpan Pengaturan</button><button formAction={resetKeamananAction} className={styles.reset} type="submit">Reset ke Default</button></div>
    </form> : <section className={styles.card}><p>Anda memiliki akses baca. Minta administrator desa untuk mengubah kebijakan keamanan.</p></section>}
    <section className={styles.card}><h2>🚫 Daftar IP Diblokir</h2>{canCreate ? <form action={blokirIpAction} className={styles.inline}><input name="ipAddress" placeholder="Alamat IP" required/><input name="reason" placeholder="Alasan pemblokiran" required/><button type="submit">Blokir IP</button></form> : null}
      <div className={styles.list}>{blockedIps.map((ip)=><form action={hapusBlokirIpAction} key={ip.id}><input type="hidden" name="id" value={ip.id}/><span><b>{ip.ipAddress}</b><small>{ip.reason}</small></span>{canDelete ? <button type="submit">Cabut blokir</button> : null}</form>)}{blockedIps.length===0?<p>Belum ada IP yang diblokir.</p>:null}</div>
    </section>
  </main>;
}
