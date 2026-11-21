import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { getSecuritySettings, listBlockedIps } from "@/features/pengguna/infrastructure/keamanan-repository";
import { hapusBlokirIpAction, blokirIpAction, resetKeamananAction, simpanKeamananAction } from "../keamanan-actions";
import styles from "./keamanan.module.css";

export const metadata = { title: "Pengaturan Keamanan" };
export default async function KeamananPage() {
  const user = await requirePermission(RESOURCES.pengguna, "read");
  const villageId = await resolveVillageId(user);
  const [settings, blockedIps] = await Promise.all([getSecuritySettings(villageId), listBlockedIps(villageId)]);
  return <main className={styles.page}>
    <header><div><small>Pengaturan Desa / Manajemen Pengguna</small><h1>Pengaturan Keamanan</h1><p>Kebijakan kata sandi, sesi login, dan pembatasan akses jaringan.</p></div></header>
    <nav className={styles.tabs}><Link href="/pengaturan/pengguna">Pengguna</Link><Link href="/pengaturan/grup-akses">Peran & Hak Akses</Link><Link href="/pengaturan/pengguna/aktivitas">Aktivitas Pengguna</Link><Link aria-current="page" href="/pengaturan/pengguna/keamanan">Pengaturan Keamanan</Link></nav>
    <form action={simpanKeamananAction} className={styles.grid}>
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
        <label className={styles.check}><input type="checkbox" name="ipRestrictionEnabled" defaultChecked={settings.ipRestrictionEnabled}/> Aktifkan whitelist IP</label>
        <label>IP yang diizinkan (satu per baris)<textarea name="allowedIps" defaultValue={settings.allowedIps.join("\n")} placeholder="203.0.113.10&#10;2001:db8::1"/></label>
        <p className={styles.note}>Whitelist IP hanya mengandalkan alamat dari proxy tepercaya yang dikonfigurasi server. Pastikan IP administrator masuk daftar sebelum mengaktifkan.</p>
      </section>
      <div className={styles.actions}><button type="submit">Simpan Pengaturan</button><button formAction={resetKeamananAction} className={styles.reset} type="submit">Reset ke Default</button></div>
    </form>
    <section className={styles.card}><h2>🚫 Daftar IP Diblokir</h2><form action={blokirIpAction} className={styles.inline}><input name="ipAddress" placeholder="Alamat IP" required/><input name="reason" placeholder="Alasan pemblokiran" required/><button type="submit">Blokir IP</button></form>
      <div className={styles.list}>{blockedIps.map((ip)=><form action={hapusBlokirIpAction} key={ip.id}><input type="hidden" name="id" value={ip.id}/><span><b>{ip.ipAddress}</b><small>{ip.reason}</small></span><button type="submit">Cabut blokir</button></form>)}{blockedIps.length===0?<p>Belum ada IP yang diblokir.</p>:null}</div>
    </section>
  </main>;
}
