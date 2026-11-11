import { describe, expect, it } from "vitest";

import {
  AppError,
  appErrorStatus,
  conflict,
  forbidden,
  isAppError,
  notFound,
  unauthenticated,
  validationError,
  type AppErrorCode,
} from "@/lib/errors";

describe("AppError", () => {
  it("memakai pesan bawaan bila pesan tidak diberikan", () => {
    expect(new AppError("NOT_FOUND").message).toBe("Data yang diminta tidak ditemukan.");
  });

  it("memakai pesan kustom bila diberikan", () => {
    expect(new AppError("FORBIDDEN", "Tidak boleh.").message).toBe("Tidak boleh.");
  });

  it("menyimpan kode, detail, dan cause", () => {
    const cause = new Error("asli");
    const error = new AppError("VALIDATION", undefined, { cause, details: { nis: ["salah"] } });

    expect(error.code).toBe("VALIDATION");
    expect(error.cause).toBe(cause);
    expect(error.details).toEqual({ nis: ["salah"] });
    expect(error.name).toBe("AppError");
  });

  it("dikenali oleh isAppError", () => {
    expect(isAppError(new AppError("INTERNAL"))).toBe(true);
    expect(isAppError(new Error("biasa"))).toBe(false);
    expect(isAppError("bukan error")).toBe(false);
  });
});

describe("appErrorStatus", () => {
  const expected: Readonly<Record<AppErrorCode, number>> = {
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    VALIDATION: 422,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    INTERNAL: 500,
  };

  it.each(Object.entries(expected))("memetakan %s ke %i", (code, status) => {
    expect(appErrorStatus(code as AppErrorCode)).toBe(status);
  });
});

describe("pabrik kesalahan", () => {
  it("membuat kesalahan dengan kode yang tepat", () => {
    expect(unauthenticated().code).toBe("UNAUTHENTICATED");
    expect(forbidden().code).toBe("FORBIDDEN");
    expect(notFound().code).toBe("NOT_FOUND");
    expect(conflict().code).toBe("CONFLICT");
    expect(validationError("Gagal").code).toBe("VALIDATION");
  });

  it("meneruskan pesan kustom", () => {
    expect(notFound("Wilayah tidak ada.").message).toBe("Wilayah tidak ada.");
  });
});
