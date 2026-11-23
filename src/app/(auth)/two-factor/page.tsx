import { TwoFactorVerify } from "./two-factor-verify";

export const metadata = { title: "Verifikasi Dua Faktor" };
export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string }>;
}) {
  const params = await searchParams;
  const method = params.method === "otp" ? "otp" : "totp";
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "linear-gradient(135deg,#f8f4ff,#e9e5ff)",
      }}
    >
      <TwoFactorVerify method={method} />
    </main>
  );
}
