import { beforeEach, describe, expect, it, vi } from "vitest";

import * as audit from "@/features/audit/application/audit-use-cases";
import * as dal from "@/lib/dal";

import * as repo from "../infrastructure/plugin-repository";
import { ubahStatusPlugin } from "./plugin-use-cases";

vi.mock("@/lib/dal", () => ({ requirePermission: vi.fn() }));
vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageId: vi.fn(async () => 3),
}));
vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/lib/env", () => ({
  env: { RESEND_API_KEY: "", RESEND_FROM: "" },
}));
vi.mock("../infrastructure/plugin-repository", () => ({
  listStatusPlugin: vi.fn(),
  simpanStatusPlugin: vi.fn(),
  hapusStatusPlugin: vi.fn(),
}));

describe("ubahStatusPlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dal.requirePermission).mockResolvedValue({ id: "u-1" } as never);
  });

  it("menolak aktivasi bila environment wajib belum terisi", async () => {
    await expect(ubahStatusPlugin("email-resend", true)).rejects.toThrow("RESEND_API_KEY");

    expect(repo.simpanStatusPlugin).not.toHaveBeenCalled();
    expect(audit.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("mengaktifkan WhatsApp tanpa environment karena memakai Baileys", async () => {
    const hasil = await ubahStatusPlugin("whatsapp-gateway", true);

    expect(hasil.aktif).toBe(true);
    expect(hasil.envKurang).toEqual([]);
    expect(repo.simpanStatusPlugin).toHaveBeenCalledWith(3, "whatsapp-gateway", true);
  });

  it("menonaktifkan plugin tanpa memerlukan environment", async () => {
    const hasil = await ubahStatusPlugin("whatsapp-gateway", false);

    expect(dal.requirePermission).toHaveBeenCalledWith("plugin", "delete");
    expect(repo.simpanStatusPlugin).toHaveBeenCalledWith(3, "whatsapp-gateway", false);
    expect(audit.recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "plugin.nonaktifkan", resourceId: "whatsapp-gateway" }),
    );
    expect(hasil.aktif).toBe(false);
  });

  it("menolak slug plugin yang tidak dikenal", async () => {
    await expect(ubahStatusPlugin("tidak-ada", true)).rejects.toThrow("tidak dikenal");
    expect(repo.simpanStatusPlugin).not.toHaveBeenCalled();
  });
});
