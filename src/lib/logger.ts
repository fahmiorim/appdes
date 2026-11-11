/**
 * Logger minimalis dengan antarmuka stabil.
 *
 * Sengaja tidak memakai dependensi eksternal; di produksi output berupa JSON
 * satu baris agar mudah diagregasi, di pengembangan output lebih ramah dibaca.
 * Jika nanti butuh integrasi (mis. OpenTelemetry), cukup ganti implementasi di
 * satu tempat ini.
 */
type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const isProduction = process.env.NODE_ENV === "production";
const minWeight = isProduction ? LEVEL_WEIGHT.info : LEVEL_WEIGHT.debug;

const MAX_CAUSE_DEPTH = 5;

/**
 * Ubah `Error` menjadi objek biasa.
 *
 * Rantai `Error.cause` ikut diserialisasi: pustaka seperti Drizzle membungkus
 * galat driver ("Failed query: …") dan menaruh penyebab sebenarnya di `cause`.
 * Tanpa ini, penyebab asli (mis. galat MySQL) hilang dari log.
 */
function serializeError(error: Error, depth = 0): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  // Properti tambahan khas galat driver (mysql2: code/errno/sqlState/sqlMessage).
  const details = error as Error & Record<string, unknown>;
  for (const key of ["code", "errno", "sqlState", "sqlMessage", "detail"] as const) {
    if (details[key] !== undefined) serialized[key] = details[key];
  }

  if (error.cause !== undefined && depth < MAX_CAUSE_DEPTH) {
    serialized.cause =
      error.cause instanceof Error ? serializeError(error.cause, depth + 1) : error.cause;
  }

  return serialized;
}

/** Ubah `Error` (dan nilai lain) menjadi konteks yang aman diserialisasi. */
function normalizeContext(context: LogContext): LogContext {
  const normalized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    normalized[key] = value instanceof Error ? serializeError(value) : value;
  }

  return normalized;
}

function emit(level: LogLevel, message: string, context: LogContext = {}): void {
  if (LEVEL_WEIGHT[level] < minWeight) return;

  const payload = {
    level,
    time: new Date().toISOString(),
    message,
    ...normalizeContext(context),
  };

  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  if (isProduction) {
    sink(JSON.stringify(payload));
  } else {
    const { level: _level, time: _time, message: _message, ...rest } = payload;
    sink(`[${level}] ${message}`, Object.keys(rest).length > 0 ? rest : "");
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
