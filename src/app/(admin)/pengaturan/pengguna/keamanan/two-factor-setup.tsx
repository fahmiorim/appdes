"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import styles from "./keamanan.module.css";
export function TwoFactorSetup({enabled}:{enabled:boolean}){
 const [password,setPassword]=useState("");const [uri,setUri]=useState("");const [code,setCode]=useState("");const [backup,setBackup]=useState<string[]>([]);const [error,setError]=useState("");const [busy,setBusy]=useState(false);const router=useRouter();
 async function start(){setError("");setBusy(true);try{const r=await authClient.twoFactor.enable({password,method:"totp",issuer:"FlexiDesa"});if(r.error||!r.data){setError("Tidak dapat memulai aktivasi 2FA. Periksa kata sandi.");return;}setUri(r.data.totpURI);setBackup(r.data.backupCodes??[]);}catch{setError("Aktivasi 2FA gagal.");}finally{setBusy(false);}}
 async function verify(){setError("");setBusy(true);try{const r=await authClient.twoFactor.verifyTotp({code:code.trim(),trustDevice:true});if(r.error){setError("Kode tidak benar. Periksa aplikasi autentikator.");return;}setUri("");setBackup([]);setPassword("");router.refresh();}catch{setError("Verifikasi gagal.");}finally{setBusy(false);}}
 if(enabled)return <section className={styles.card}><h2>🛡️ Autentikasi Dua Faktor (2FA)</h2><p>2FA aktif. Login akun ini memerlukan kode dari aplikasi autentikator.</p><span className={styles.enabled}>Aktif dan terverifikasi</span></section>;
 return <section className={styles.card}><h2>🛡️ Autentikasi Dua Faktor (2FA)</h2><p>Tambahkan lapisan keamanan dengan aplikasi autentikator seperti Google Authenticator atau Microsoft Authenticator.</p>
  {!uri?<div className={styles.inline}><input type="password" autoComplete="current-password" placeholder="Kata sandi akun" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" disabled={busy||!password} onClick={start}>{busy?"Memproses...":"Aktifkan 2FA"}</button></div>:<>
   <p className={styles.note}>Tambahkan akun secara manual di aplikasi autentikator menggunakan URI berikut. Simpan kode cadangan di tempat aman.</p>
   <textarea readOnly value={uri} aria-label="TOTP URI"/>
   <label>Kode 6 digit<input value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric" maxLength={6}/></label>
   <div className={styles.backup}>{backup.map(v=><code key={v}>{v}</code>)}</div>
   <button type="button" disabled={busy||code.length!==6} onClick={verify}>{busy?"Memverifikasi...":"Verifikasi & Aktifkan"}</button>
  </>}
  {error?<p role="alert" style={{color:"#b00"}}>{error}</p>:null}
 </section>;
}
