"use client";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export function TwoFactorVerify({method}:{method:"totp"|"otp"}){
 const [code,setCode]=useState("");const [error,setError]=useState("");const [pending,setPending]=useState(false);const [sent,setSent]=useState(false);
 async function sendCode(){setError("");setPending(true);try{const result=await authClient.twoFactor.sendOtp({trustDevice:true});if(result.error){setError("Kode email tidak dapat dikirim. Pastikan email akun sudah aktif.");return;}setSent(true);}catch{setError("Pengiriman kode email gagal.");}finally{setPending(false);}}
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setError("");setPending(true);try{
  const result=method==="totp"
    ? await authClient.twoFactor.verifyTotp({code:code.trim(),trustDevice:true})
    : await authClient.twoFactor.verifyOtp({code:code.trim(),trustDevice:true});
  if(result.error){setError("Kode verifikasi salah atau kedaluwarsa.");return;}
  const session=await authClient.getSession();const account=session.data?.user;
  window.location.assign(account?.residentId?"/layanan-mandiri":account?.villageId===null?"/super-admin":"/beranda");
 }catch{setError("Verifikasi tidak dapat dilakukan. Coba lagi.");}finally{setPending(false);}}
 return <section style={{width:"min(100%,420px)",padding:28,borderRadius:18,background:"#fff",boxShadow:"0 18px 55px #34207820",color:"#111b3d"}}>
  <div style={{fontSize:34,color:"#7024dc"}}>◈</div><h1 style={{fontSize:24,fontWeight:800,margin:"8px 0"}}>Verifikasi Dua Faktor</h1>
  <p style={{color:"#777",fontSize:14}}>{method==="totp"?"Masukkan kode 6 digit dari aplikasi autentikator.":"Kirim kode sekali pakai ke email akun Anda, lalu masukkan kode tersebut."}</p>
  {method==="otp"?<button type="button" disabled={pending} onClick={sendCode} style={{marginTop:14,padding:10,border:"1px solid #d9cef0",borderRadius:8,background:"#faf8ff",color:"#5122ad",fontWeight:700}}>{pending?"Mengirim...":sent?"Kirim ulang kode email":"Kirim kode email"}</button>:null}
  <form onSubmit={submit} style={{display:"grid",gap:12,marginTop:20}}>
   <label style={{fontWeight:650,fontSize:13}}>Kode verifikasi<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value)} style={{display:"block",width:"100%",padding:13,marginTop:7,border:"1px solid #ddd2f4",borderRadius:9,fontSize:20,letterSpacing:8}}/></label>
   {error?<p role="alert" style={{color:"#c22",fontSize:13}}>{error}</p>:null}
   <button disabled={pending||code.length!==6||(method==="otp"&&!sent)} type="submit" style={{padding:13,border:0,borderRadius:9,background:"linear-gradient(100deg,#9d16f2,#3416ed)",color:"#fff",fontWeight:700}}>{pending?"Memverifikasi...":"Verifikasi & Masuk"}</button>
  </form>
 </section>;
}
