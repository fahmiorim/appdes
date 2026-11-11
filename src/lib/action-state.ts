import type { z } from "zod";

import { AppError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/** Peta nama field → daftar pesan kesalahan (bentuk yang dipakai react-hook-form). */
export type FieldErrors = Record<string, string[]>;

/**
 * Bentuk state yang dikembalikan Server Action ke form.
 *
 * `idle` : belum ada aksi (state awal).
 * `success` : aksi berhasil; `data` opsional untuk keperluan UI (mis. id baru).
 * `error` : gagal dengan pesan yang aman ditampilkan, plus kesalahan per-field.
 */
export type ActionState<T = null> =
  | { readonly status: "idle" }
  | {
      readonly status: "success";
      readonly message: string;
      readonly data: T;
      readonly tone?: "warning";
    }
  | { readonly status: "error"; readonly message: string; readonly fieldErrors?: FieldErrors };

export const idleActionState: ActionState<null> = { status: "idle" };

/** Buat idle state dengan tipe data generik untuk menghindari cast `as any`. */
export function createIdleActionState<T = null>(): ActionState<T> {
  return { status: "idle" };
}

export function successState<T = null>(
  message: string,
  data: T = null as T,
  tone?: "warning",
): ActionState<T> {
  return tone ? { status: "success", message, data, tone } : { status: "success", message, data };
}

export function errorState(message: string, fieldErrors?: FieldErrors): ActionState<never> {
  return fieldErrors ? { status: "error", message, fieldErrors } : { status: "error", message };
}

/** Ubah `ZodError` menjadi peta kesalahan per-field. */
export function zodToFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return fieldErrors;
}

/**
 * Normalisasi error apa pun menjadi `ActionState` yang aman untuk klien.
 *
 * - `AppError` diteruskan pesannya (sudah aman untuk pengguna).
 * - Error tak terduga dicatat ke log dan diganti pesan generik.
 */
export function toErrorState(error: unknown): ActionState<never> {
  if (isAppError(error)) {
    return errorState(error.message, error.details as FieldErrors | undefined);
  }

  if (error instanceof Error && error.name === "ZodError") {
    const zodError = error as unknown as z.ZodError;
    return errorState("Data yang dikirim tidak valid.", zodToFieldErrors(zodError));
  }

  logger.error("Server Action gagal tanpa penanganan", { error });
  return errorState(new AppError("INTERNAL").message);
}
