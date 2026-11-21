import "server-only";

import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { ipDiblokir, pengaturanKeamanan, sessions, users } from "@/db/schema";
import { recordAuditEvent } from "@/features/audit/application/audit-use-cases";
import { AUDIT_EVENTS } from "@/features/audit/domain/audit";
import { resolveVillageId } from "@/features/desa/application/resolve-village";
import { RESOURCES } from "@/features/rbac/domain/resources";
import { requirePermission } from "@/lib/dal";
import { conflict, notFound, validationError } from "@/lib/errors";

export const securityPolicySchema=z.object({
  twoFactorRequired:z.boolean(),
  twoFactorMethod:z.enum(["email","whatsapp"]),
  sessionTimeoutMinutes:z.union([z.literal(15),z.literal(30),z.literal(60),z.literal(120)]),
  warnSessionExpiry:z.boolean(),
  autoLogout:z.boolean(),
  restrictIp:z.boolean(),
  allowedIps:z.array(z.string().trim().min(1).max(45)).max(50),
  passwordMinLength:z.union([z.literal(8),z.literal(10),z.literal(12)]),
  requireUppercase:z.boolean(),
  requireLowercase:z.boolean(),
  requireNumber:z.boolean(),
  requireSymbol:z.boolean(),
  passwordExpiryDays:z.union([z.literal(0),z.literal(30),z.literal(60),z.literal(90)]),
  preventPasswordReuse:z.union([z.literal(0),z.literal(3),z.literal(5)]),
  blockAfterFailedAttempts:z.union([z.literal(5),z.literal(10)]),
  captchaEnabled:z.boolean(),
  auditEnabled:z.boolean(),
  notifySuspicious:z.boolean(),
});
export type SecurityPolicy=z.infer<typeof securityPolicySchema>;
export const DEFAULT_SECURITY_POLICY:SecurityPolicy={
 twoFactorRequired:false,twoFactorMethod:"email",sessionTimeoutMinutes:30,warnSessionExpiry:true,autoLogout:true,
 restrictIp:false,allowedIps:[],passwordMinLength:8,requireUppercase:false,requireLowercase:false,requireNumber:false,
 requireSymbol:false,passwordExpiryDays:0,preventPasswordReuse:0,blockAfterFailedAttempts:5,captchaEnabled:true,
 auditEnabled:true,notifySuspicious:true
};
async function getPolicy(villageId:number):Promise<SecurityPolicy>{
 const [row]=await db.select({konfigurasi:pengaturanKeamanan.konfigurasi}).from(pengaturanKeamanan).where(eq(pengaturanKeamanan.villageId,villageId)).limit(1);
 if(!row)return DEFAULT_SECURITY_POLICY;
 try { const parsed=securityPolicySchema.safeParse(JSON.parse(row.konfigurasi));return parsed.success?parsed.data:DEFAULT_SECURITY_POLICY; }
 catch{return DEFAULT_SECURITY_POLICY;}
}
export async function getKeamananAdminData(){
 const user=await requirePermission(RESOURCES.pengguna,"read");
 const villageId=await resolveVillageId(user);
 const [policy,blocked,activeSessions,usersCount,otpCount,latestAudit]=await Promise.all([
  getPolicy(villageId),
  db.select({id:ipDiblokir.id,ip:ipDiblokir.alamatIp,reason:ipDiblokir.alasan,blockedAt:ipDiblokir.blockedAt}).from(ipDiblokir).where(eq(ipDiblokir.villageId,villageId)).orderBy(desc(ipDiblokir.blockedAt)).limit(100),
  db.select({value:count()}).from(sessions).innerJoin(users,eq(sessions.userId,users.id)).where(and(eq(users.villageId,villageId),eq(users.active,true))),
  db.select({value:count()}).from(users).where(eq(users.villageId,villageId)),
  db.select({value:count()}).from(users).where(and(eq(users.villageId,villageId),eq(users.otpLoginAktif,true))),
  db.select({id:users.id,name:users.name}).from(users).where(eq(users.villageId,villageId)).limit(1)
 ]);
 return {policy,blocked,activeSessions:activeSessions[0]?.value??0,totalUsers:usersCount[0]?.value??0,otpUsers:otpCount[0]?.value??0,currentUserId:user.id,canUpdate:user.permissions.some(p=>p.resource===RESOURCES.pengguna&&p.actions.includes("update"))};
}
export async function getTenantSecurityPolicy(villageId:number){return getPolicy(villageId);}
export async function simpanKeamananDesa(input:unknown){
 const parsed=securityPolicySchema.safeParse(input);if(!parsed.success)throw validationError("Pengaturan keamanan tidak valid.");
 const policy=parsed.data;
 if(policy.restrictIp&&policy.allowedIps.length===0)throw conflict("Tambahkan minimal satu IP whitelist sebelum mengaktifkan pembatasan IP.");
 const user=await requirePermission(RESOURCES.pengguna,"update");const villageId=await resolveVillageId(user);
 const [existing]=await db.select({id:pengaturanKeamanan.id}).from(pengaturanKeamanan).where(eq(pengaturanKeamanan.villageId,villageId)).limit(1);
 if(existing)await db.update(pengaturanKeamanan).set({konfigurasi:JSON.stringify(policy)}).where(eq(pengaturanKeamanan.villageId,villageId));
 else await db.insert(pengaturanKeamanan).values({villageId,konfigurasi:JSON.stringify(policy)});
 await recordAuditEvent({villageId,actorId:user.id,event:AUDIT_EVENTS.securityPolicyUpdate,resource:RESOURCES.pengguna,details:{twoFactorRequired:policy.twoFactorRequired,restrictIp:policy.restrictIp,passwordMinLength:policy.passwordMinLength}});
}
function validIp(value:string){return /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}|[0-9a-fA-F:]{3,45})$/.test(value);}
export async function blokirIpDesa(ip:string,reason:string){
 const user=await requirePermission(RESOURCES.pengguna,"update");const villageId=await resolveVillageId(user);
 const normalized=ip.trim();if(!validIp(normalized))throw validationError("Format alamat IP tidak valid.");
 try{await db.insert(ipDiblokir).values({villageId,alamatIp:normalized,alasan:reason.trim().slice(0,255)||"Diblokir administrator",blockedBy:user.id});}
 catch{throw conflict("IP sudah ada dalam daftar blokir.");}
 await recordAuditEvent({villageId,actorId:user.id,event:AUDIT_EVENTS.securityIpBlock,resource:RESOURCES.pengguna,details:{ip:normalized}});
}
export async function hapusBlokirIpDesa(id:number){
 const user=await requirePermission(RESOURCES.pengguna,"update");const villageId=await resolveVillageId(user);
 const result=await db.delete(ipDiblokir).where(and(eq(ipDiblokir.id,id),eq(ipDiblokir.villageId,villageId)));
 if(!result[0]?.affectedRows)throw notFound("IP tidak ditemukan.");
 await recordAuditEvent({villageId,actorId:user.id,event:AUDIT_EVENTS.securityIpUnblock,resource:RESOURCES.pengguna,resourceId:String(id)});
}
export function validasiPasswordDenganKebijakan(password:string,policy:SecurityPolicy):string|null{
 if(password.length<policy.passwordMinLength)return `Kata sandi minimal ${policy.passwordMinLength} karakter sesuai kebijakan desa.`;
 if(policy.requireUppercase&&!/[A-Z]/.test(password))return "Kata sandi wajib mengandung huruf besar.";
 if(policy.requireLowercase&&!/[a-z]/.test(password))return "Kata sandi wajib mengandung huruf kecil.";
 if(policy.requireNumber&&!/\d/.test(password))return "Kata sandi wajib mengandung angka.";
 if(policy.requireSymbol&&!/[^A-Za-z0-9]/.test(password))return "Kata sandi wajib mengandung simbol.";
 return null;
}
