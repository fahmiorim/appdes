"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import styles from "./keamanan.module.css";

export function TwoFactorSetup({enabled,hasEmail,hasVerifiedEmail,canEmailOtp}:{enabled:boolean;hasEmail:boolean;hasVerifiedEmail:boolean;canEmailOtp:boolean}){
 const [password,setPassword]=useState("");const [method,setMethod]=useState<"totp"|"otp">("totp");const [uri,setUri]=useState("");const [secret,setSecret]=useState("");const [code,setCode]=useState("");const [backup,setBackup]=useState<string[]>([]);const [qrData,setQrData]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);const router=useRouter();
 async function start(){setError("");setBusy(true);try{
  const result=await authClient.twoFactor.enable({password,method,issuer:"FlexiDesa"});
  if(result.error||!result.data){setError("Tidak dapat memulai aktivasi 2FA. Periksa kata sandi dan konfigurasi email.");return;}
  if(result.data.method==="otp"){setPassword("");router.refresh();return;}
  setUri(result.data.totpURI);try{setSecret(new URL(result.data.totpURI).searchParams.get("secret")??"");}catch{setSecret("");}setBackup(result.data.backupCodes??[]);
 }catch{setError("Aktivasi 2FA gagal.");}finally{setBusy(false);}}
 async function verify(){setError("");setBusy(true);try{
  const result=await authClient.twoFactor.verifyTotp({code:code.trim(),trustDevice:true});
  if(result.error){setError("Kode tidak benar. Periksa aplikasi autentikator.");return;}
  setUri("");setSecret("");setBackup([]);setPassword("");router.refresh();
 }catch{setError("Verifikasi gagal.");}finally{setBusy(false);}}
 if(enabled)return <section className={styles.card}><h2>🛡️ Autentikasi Dua Faktor (2FA)</h2><p>2FA aktif. Login akun ini memerlukan kode dari metode verifikasi yang telah didaftarkan.</p><span className={styles.enabled}>Aktif dan terverifikasi</span></section>;
 return <section className={styles.card}><h2>🛡️ Autentikasi Dua Faktor (2FA)</h2><p>Tambahkan lapisan keamanan dengan kode email atau aplikasi autentikator.</p>
  {!uri?<div className={styles.setupForm}>
   <label>Metode verifikasi<select value={method} onChange={e=>setMethod(e.target.value as "totp"|"otp")}><option value="totp">Aplikasi autentikator (TOTP)</option><option value="otp" disabled={!hasEmail||!hasVerifiedEmail||!canEmailOtp}>Kode sekali pakai melalui email{!hasEmail?" (email akun belum tersedia)":!hasVerifiedEmail?" (email belum diverifikasi)":!canEmailOtp?" (layanan email belum dikonfigurasi)":""}</option></select></label>
   <label>Kata sandi akun<input type="password" autoComplete="current-password" placeholder="Kata sandi akun" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button type="button" disabled={busy||!password} onClick={start}>{busy?"Memproses...":"Aktifkan 2FA"}</button>
  </div>:<>
   <p className={styles.note}>Tambahkan akun secara manual di aplikasi autentikator menggunakan URI berikut. Simpan kode cadangan di tempat aman.</p>
   <textarea readOnly value={uri} aria-label="TOTP URI"/><p>Kunci manual: <code>{secret}</code></p>
   <label>Kode 6 digit<input value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric" maxLength={6}/></label>
   <div className={styles.backup}>{backup.map(v=><code key={v}>{v}</code>)}</div><button type="button" className={styles.copyCodes} onClick={()=>navigator.clipboard.writeText(backup.join("\n"))}>Salin kode cadangan</button>
   <button type="button" disabled={busy||code.length!==6} onClick={verify}>{busy?"Memverifikasi...":"Verifikasi & Aktifkan"}</button>
  </>}
  {error?<p role="alert" style={{color:"#b00"}}>{error}</p>:null}
 </section>;
}
