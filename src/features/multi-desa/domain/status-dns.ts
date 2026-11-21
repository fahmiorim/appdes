/**
 * Aturan status DNS untuk domain tenant.
 *
 * Modul murni: hasil resolusi dan validasi alamat diberikan oleh infrastructure.
 * Hanya alamat publik yang dianggap normal agar host internal tidak pernah
 * dianggap sehat.
 */

export type StatusDns = "normal" | "bermasalah" | "belum-diperiksa";

export const LABEL_STATUS_DNS: Readonly<Record<StatusDns, string>> = {
  normal: "Normal",
  bermasalah: "Bermasalah",
  "belum-diperiksa": "Belum diperiksa",
};

export interface DataDns {
  status: StatusDns;
  addresses: string[];
  error: string | null;
  checkedAt: Date | null;
}

export const DNS_BELUM_DIPERIKSA: DataDns = {
  status: "belum-diperiksa",
  addresses: [],
  error: null,
  checkedAt: null,
};

/** Status normal hanya bila ada alamat dan seluruhnya publik. */
export function klasifikasiDns(input: {
  addresses: readonly string[];
  semuaPublik: boolean;
  error?: string | null;
}): StatusDns {
  if (input.error) return "bermasalah";
  if (input.addresses.length === 0) return "bermasalah";
  return input.semuaPublik ? "normal" : "bermasalah";
}
