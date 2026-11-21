import { TwoFactorVerify } from "./two-factor-verify";
export const metadata = { title: "Verifikasi Dua Faktor" };
export default function TwoFactorPage() {
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"linear-gradient(135deg,#f8f4ff,#e9e5ff)"}}>
    <TwoFactorVerify/>
  </main>;
}
