import { beforeEach, describe, expect, it, vi } from "vitest";

import * as audit from "@/features/audit/application/audit-use-cases";
import * as gate from "@/features/multi-desa/application/provisioning-use-cases";
import * as repo from "@/features/multi-desa/infrastructure/kelola-desa-repository";
import { forbidden } from "@/lib/errors";

import { getDetailDesa, resetAksesAdminDesa, ubahStatusDesa } from "./kelola-desa-use-cases";

vi.mock("@/features/multi-desa/application/provisioning-use-cases", () => ({
  requireSuperAdmin: vi.fn(),
}));
vi.mock("@/features/multi-desa/infrastructure/kelola-desa-repository", () => ({
  findAdminDesa: vi.fn(),
  getDesaKelola: vi.fn(),
  hapusDomainDesa: vi.fn(),
  jadikanDomainUtama: vi.fn(),
  listDomainDesa: vi.fn(),
  resetAdminDesa: vi.fn(),
  setKuotaMediaDesa: vi.fn(),
  setStatusDesa: vi.fn(),
  tambahDomainDesa: vi.fn(),
}));
vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));

describe("gerbang pengelola platform pada kelola desa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gate.requireSuperAdmin).mockRejectedValue(
      forbidden("Hanya super admin yang boleh mengelola desa."),
    );
  });

  it("menolak detail desa tanpa menyentuh repository", async () => {
    await expect(getDetailDesa(2)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.getDesaKelola).not.toHaveBeenCalled();
  });

  it("menolak perubahan status desa", async () => {
    await expect(ubahStatusDesa({ villageId: 2, active: false })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(repo.setStatusDesa).not.toHaveBeenCalled();
    expect(audit.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("menolak reset administrator desa tanpa membaca atau menulis akun", async () => {
    await expect(resetAksesAdminDesa(2)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.findAdminDesa).not.toHaveBeenCalled();
    expect(repo.resetAdminDesa).not.toHaveBeenCalled();
    expect(audit.recordAuditEvent).not.toHaveBeenCalled();
  });
});

describe("jalur sah kelola desa", () => {
  it("meneruskan detail desa setelah gerbang lolos", async () => {
    const desa = { id: 2, name: "Desa Uji" };
    vi.mocked(gate.requireSuperAdmin).mockResolvedValue({
      id: "u-platform",
      villageId: null,
    } as never);
    vi.mocked(repo.getDesaKelola).mockResolvedValue(desa as never);

    await expect(getDetailDesa(2)).resolves.toBe(desa);
    expect(repo.getDesaKelola).toHaveBeenCalledWith(2);
  });
});
