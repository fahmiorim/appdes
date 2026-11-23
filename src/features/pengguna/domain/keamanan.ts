import { isIP } from "node:net";
import { z } from "zod";

export const keamananSchema = z.object({
  passwordMinLength: z.coerce.number().int().min(8).max(72),
  passwordExpiryDays: z.coerce.number().int().min(0).max(3650),
  passwordReuseCount: z.coerce.number().int().min(0).max(10),
  requireUppercase: z.boolean(),
  requireLowercase: z.boolean(),
  requireNumber: z.boolean(),
  requireSymbol: z.boolean(),
  sessionTimeoutMinutes: z.coerce.number().int().min(5).max(720),
  autoLogoutInactive: z.boolean(),
  concurrentLogin: z.boolean(),
  requireTwoFactorForAllUsers: z.boolean(),
  ipRestrictionEnabled: z.boolean(),
  allowedIps: z.array(z.string().refine((ip) => isIP(ip) !== 0, "Alamat IP tidak valid.")).max(50),
});
export type KeamananInput = z.infer<typeof keamananSchema>;

export const DEFAULT_SECURITY_SETTINGS: KeamananInput = {
  passwordMinLength: 8,
  passwordExpiryDays: 90,
  passwordReuseCount: 3,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: false,
  sessionTimeoutMinutes: 30,
  autoLogoutInactive: true,
  concurrentLogin: false,
  requireTwoFactorForAllUsers: false,
  ipRestrictionEnabled: false,
  allowedIps: [],
};

export interface BlockedIpDTO {
  id: number;
  ipAddress: string;
  reason: string;
  expiresAt: Date | null;
  createdAt: Date;
}

export function validasiKataSandi(
  password: string,
  policy: Pick<
    KeamananInput,
    | "passwordMinLength"
    | "requireUppercase"
    | "requireLowercase"
    | "requireNumber"
    | "requireSymbol"
  >,
): string | null {
  if (password.length < policy.passwordMinLength)
    return `Kata sandi minimal ${policy.passwordMinLength} karakter.`;
  if (policy.requireUppercase && !/[A-Z]/.test(password))
    return "Kata sandi harus memuat huruf besar.";
  if (policy.requireLowercase && !/[a-z]/.test(password))
    return "Kata sandi harus memuat huruf kecil.";
  if (policy.requireNumber && !/[0-9]/.test(password)) return "Kata sandi harus memuat angka.";
  if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(password))
    return "Kata sandi harus memuat simbol.";
  return null;
}
