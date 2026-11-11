import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const limit = vi.fn();
  const where = vi.fn(() => ({ limit }));
  const leftJoin = vi.fn(() => ({ where }));
  const from = vi.fn(() => ({ leftJoin }));
  const select = vi.fn(() => ({ from }));
  return { select, limit, getSession: vi.fn(), compute: vi.fn() };
});

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/features/rbac/application/authorization", () => ({
  computeEffectivePermissions: mocks.compute,
  hasPermission: vi.fn(),
}));

const sesiLama = {
  user: {
    id: "u-1",
    name: "Nama Lama",
    email: "lama@contoh.test",
    username: "lama",
    image: null,
    roleId: 1,
    villageId: 7,
  },
};

const akunDb = {
  active: true,
  residentId: null,
  mustChangePin: false,
  villageActive: true,
  villageId: 9,
  roleId: 2,
};

async function muatDal() {
  vi.resetModules();
  return import("./dal");
}

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue(sesiLama);
    mocks.compute.mockResolvedValue({});
    mocks.limit.mockResolvedValue([akunDb]);
  });

  it("memakai role dan desa dari baris users, bukan nilai cookie sesi", async () => {
    const { getCurrentUser } = await muatDal();

    const user = await getCurrentUser();

    expect(user?.roleId).toBe(2);
    expect(user?.villageId).toBe(9);
    expect(mocks.compute).toHaveBeenCalledWith(2, 9);
  });

  it("mengembalikan null untuk akun nonaktif tanpa menghitung izin", async () => {
    mocks.limit.mockResolvedValue([{ ...akunDb, active: false }]);
    const { getCurrentUser } = await muatDal();

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.compute).not.toHaveBeenCalled();
  });

  it("menolak sesi yang desanya sudah diarsipkan", async () => {
    mocks.limit.mockResolvedValue([{ ...akunDb, villageActive: false }]);
    const { getCurrentUser } = await muatDal();

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("mengembalikan null tanpa sesi", async () => {
    mocks.getSession.mockResolvedValue(null);
    const { getCurrentUser } = await muatDal();

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
