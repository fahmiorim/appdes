import { z } from "zod";

export const PENDAPAT_RESOURCE = "pendapat" as const;

export const JAWABAN_KEPUASAN = [
  { value: 1, label: "Sangat Puas" },
  { value: 2, label: "Puas" },
  { value: 3, label: "Cukup Puas" },
  { value: 4, label: "Tidak Puas" },
] as const;

export const pendapatSchema = z.object({
  id: z.number().int().positive().optional(),
  villageId: z.number().int().positive(),
  residentId: z.number().int().positive().optional().nullable(),
  sessionKey: z.string().max(64).optional().nullable(),
  pengguna: z.string().max(100).optional().or(z.literal("")),
  pilihan: z.coerce.number().int().min(1).max(4),
  ipAddress: z.string().max(45).optional().or(z.literal("")),
});

export type PendapatInput = z.infer<typeof pendapatSchema>;

export type PendapatRekapRow = {
  pilihan: number;
  label: string;
  total: number;
  percentage: number;
};

export type PendapatListRow = {
  id: number;
  villageId: number;
  residentId: number | null;
  pengguna: string | null;
  pilihan: number;
  createdAt: Date | string;
};
