import { beforeEach, describe, expect, it, vi } from "vitest";

import { ambilAuditPlatform, eksporAuditPlatform } from "./audit-platform-use-cases";

vi.mock("./provisioning-use-cases", () => ({ requireSuperAdmin: vi.fn() }));
vi.mock("@/features/audit/infrastructure/audit-repository", () => ({
  listAuditLogsLintasDesa: vi.fn(),
}));

const halamanKosong = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: 25,
  pageCount: 1,
};

describe("ambilAuditPlatform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak pembacaan audit lintas desa oleh non-platform", async () => {
    const guard = await import("./provisioning-use-cases");
    const repo = await import("@/features/audit/infrastructure/audit-repository");
    vi.mocked(guard.requireSuperAdmin).mockRejectedValue(
      Object.assign(new Error("Hanya super admin yang boleh mengelola desa."), {
        code: "FORBIDDEN",
      }),
    );

    await expect(ambilAuditPlatform({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.listAuditLogsLintasDesa).not.toHaveBeenCalled();
  });

  it("menormalkan halaman dan kata kunci dari query string", async () => {
    const guard = await import("./provisioning-use-cases");
    const repo = await import("@/features/audit/infrastructure/audit-repository");
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ villageId: null } as never);
    vi.mocked(repo.listAuditLogsLintasDesa).mockResolvedValue(halamanKosong);

    await ambilAuditPlatform({ page: "3", search: "  desa.create  " });
    expect(repo.listAuditLogsLintasDesa).toHaveBeenCalledWith({
      page: 3,
      search: "desa.create",
      villageId: undefined,
      event: undefined,
      pageSize: 25,
    });
  });

  it("jatuh ke halaman 1 untuk nilai tidak valid dan membatasi panjang kata kunci", async () => {
    const guard = await import("./provisioning-use-cases");
    const repo = await import("@/features/audit/infrastructure/audit-repository");
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ villageId: null } as never);
    vi.mocked(repo.listAuditLogsLintasDesa).mockResolvedValue(halamanKosong);

    await ambilAuditPlatform({ page: "-2", search: "x".repeat(500) });
    expect(repo.listAuditLogsLintasDesa).toHaveBeenCalledWith({
      page: 1,
      search: "x".repeat(120),
      villageId: undefined,
      event: undefined,
      pageSize: 25,
    });
  });

  it("mengirim kata kunci kosong sebagai undefined", async () => {
    const guard = await import("./provisioning-use-cases");
    const repo = await import("@/features/audit/infrastructure/audit-repository");
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ villageId: null } as never);
    vi.mocked(repo.listAuditLogsLintasDesa).mockResolvedValue(halamanKosong);

    await ambilAuditPlatform({ search: "   " });
    expect(repo.listAuditLogsLintasDesa).toHaveBeenCalledWith({
      page: 1,
      search: undefined,
      villageId: undefined,
      event: undefined,
      pageSize: 25,
    });
  });

  it("meneruskan filter desa dan peristiwa yang valid", async () => {
    const guard = await import("./provisioning-use-cases");
    const repo = await import("@/features/audit/infrastructure/audit-repository");
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ villageId: null } as never);
    vi.mocked(repo.listAuditLogsLintasDesa).mockResolvedValue(halamanKosong);

    await ambilAuditPlatform({ desa: "12", event: "bantuan.create", page: "2" });

    expect(repo.listAuditLogsLintasDesa).toHaveBeenCalledWith({
      page: 2,
      search: undefined,
      villageId: 12,
      event: "bantuan.create",
      pageSize: 25,
    });
  });

  it("mengabaikan filter desa/peristiwa yang tidak valid", async () => {
    const guard = await import("./provisioning-use-cases");
    const repo = await import("@/features/audit/infrastructure/audit-repository");
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ villageId: null } as never);
    vi.mocked(repo.listAuditLogsLintasDesa).mockResolvedValue(halamanKosong);

    await ambilAuditPlatform({ desa: "1 OR 1=1", event: "../etc/passwd" });

    expect(repo.listAuditLogsLintasDesa).toHaveBeenCalledWith({
      page: 1,
      search: undefined,
      villageId: undefined,
      event: undefined,
      pageSize: 25,
    });
  });
});

describe("eksporAuditPlatform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak ekspor oleh non-platform", async () => {
    const guard = await import("./provisioning-use-cases");
    const repo = await import("@/features/audit/infrastructure/audit-repository");
    vi.mocked(guard.requireSuperAdmin).mockRejectedValue(
      Object.assign(new Error("Ditolak"), { code: "FORBIDDEN" }),
    );

    await expect(eksporAuditPlatform({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repo.listAuditLogsLintasDesa).not.toHaveBeenCalled();
  });

  it("menggabungkan seluruh halaman hasil filter", async () => {
    const guard = await import("./provisioning-use-cases");
    const repo = await import("@/features/audit/infrastructure/audit-repository");
    vi.mocked(guard.requireSuperAdmin).mockResolvedValue({ villageId: null } as never);

    const baris = (id: number) => ({
      id,
      villageId: 3,
      actorId: null,
      actorName: null,
      event: "desa.create",
      resource: "villages",
      resourceId: String(id),
      ipAddress: null,
      userAgent: null,
      details: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      villageName: "Desa Sukamaju",
    });

    vi.mocked(repo.listAuditLogsLintasDesa)
      .mockResolvedValueOnce({ rows: [baris(1)], total: 2, page: 1, pageSize: 100, pageCount: 2 })
      .mockResolvedValueOnce({ rows: [baris(2)], total: 2, page: 2, pageSize: 100, pageCount: 2 });

    const hasil = await eksporAuditPlatform({ desa: "3", event: "desa.create" });

    expect(hasil.terpotong).toBe(false);
    expect(hasil.rows.map((row) => row.id)).toEqual([1, 2]);
    expect(repo.listAuditLogsLintasDesa).toHaveBeenNthCalledWith(1, {
      page: 1,
      pageSize: 100,
      search: undefined,
      villageId: 3,
      event: "desa.create",
    });
    expect(repo.listAuditLogsLintasDesa).toHaveBeenNthCalledWith(2, {
      page: 2,
      pageSize: 100,
      search: undefined,
      villageId: 3,
      event: "desa.create",
    });
  });
});
