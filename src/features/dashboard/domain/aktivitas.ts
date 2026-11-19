import { AUDIT_EVENT_LABELS, type AuditEvent } from "@/features/audit/domain/audit";

/**
 * Penyajian ringkas feed aktivitas desa.
 *
 * Event audit disimpan sebagai string bebas, sehingga label harus diambil dari
 * peta yang sudah ada dengan fallback netral. Jangan menampilkan nama event
 * mentah ke pengguna.
 */

export type ToneAktivitas = "accent" | "info" | "netral";

export function labelAktivitas(event: string): string {
  return AUDIT_EVENT_LABELS[event as AuditEvent] ?? "Aktivitas sistem";
}

export function toneAktivitas(event: string): ToneAktivitas {
  if (event.startsWith("pengguna.") || event.startsWith("grup-akses.")) return "accent";
  if (event.startsWith("auth.") || event.startsWith("api.")) return "info";
  return "netral";
}
