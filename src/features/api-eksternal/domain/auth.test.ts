import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { hash } from "@/features/api-eksternal/domain/api-key";

import { authenticateApiKey } from "./auth";

vi.mock("@/db", () => ({
  db: {
    query: { apiKeys: { findFirst: vi.fn() } },
    update: vi.fn(),
  },
}));

const KEY = "SID_0123456789abcdef";

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    villageId: 2,
    name: "Mitra",
    hashedKey: hash(KEY).toString("hex"),
    prefix: "SID_",
    rateLimit: 100,
    active: true,
    expiresAt: null,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("authenticateApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    } as never);
  });

  it("menolak kunci yang sudah kedaluwarsa", async () => {
    vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce(
      record({ expiresAt: new Date(Date.now() - 60_000) }) as never,
    );

    await expect(authenticateApiKey(KEY)).resolves.toEqual({
      ok: false,
      status: 401,
      message: "Kunci API sudah kedaluwarsa.",
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("menerima kunci aktif dan mencatat pemakaian terakhir", async () => {
    vi.mocked(db.query.apiKeys.findFirst).mockResolvedValueOnce(record() as never);

    const hasil = await authenticateApiKey(KEY);

    expect(hasil.ok).toBe(true);
    expect(db.update).toHaveBeenCalled();
  });
});
