import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  operations: [] as Array<{ type: string; table: string; values?: unknown; where?: unknown }>,
  accountAffectedRows: 1,
}));

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => state.select(...args),
    update: (table: { name: string }) => ({
      set: (values: unknown) => ({
        where: async (condition: unknown) => {
          state.operations.push({ type: "update", table: table.name, values, where: condition });
          return [{ affectedRows: table.name === "accounts" ? state.accountAffectedRows : 1 }];
        },
      }),
    }),
    transaction: (...args: unknown[]) => state.transaction(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  accounts: {
    name: "accounts",
    userId: "accounts.userId",
    providerId: "accounts.providerId",
    password: "accounts.password",
  },
  roles: { name: "roles", id: "roles.id", slug: "roles.slug" },
  sessions: { name: "sessions", userId: "sessions.userId" },
  users: {
    name: "users",
    id: "users.id",
    roleId: "users.roleId",
    villageId: "users.villageId",
    active: "users.active",
  },
  villageDomains: {},
  villages: { name: "villages" },
}));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => ({ op: "and", conditions }),
  asc: (value: unknown) => value,
  eq: (column: unknown, value: unknown) => ({ op: "eq", column, value }),
}));

const admin = { id: "admin-village-a", username: "admin-a", email: "admin@example.test" };

describe("resetAdminDesa", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.operations.length = 0;
    state.accountAffectedRows = 1;

    state.select.mockReturnValue({
      from: () => ({
        innerJoin: () => ({
          where: () => ({ limit: async () => [admin] }),
        }),
      }),
    });

    const tx = {
      update: (table: { name: string }) => ({
        set: (values: unknown) => ({
          where: async (condition: unknown) => {
            state.operations.push({ type: "update", table: table.name, values, where: condition });
            return [{ affectedRows: table.name === "accounts" ? state.accountAffectedRows : 1 }];
          },
        }),
      }),
      delete: (table: { name: string }) => ({
        where: async (condition: unknown) => {
          state.operations.push({ type: "delete", table: table.name, where: condition });
          return [{ affectedRows: 2 }];
        },
      }),
    };
    state.transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    );
  });

  it("mengganti sandi dan mencabut hanya sesi admin tersebut dalam satu transaksi", async () => {
    const { resetAdminDesa } = await import("./kelola-desa-repository");

    await expect(resetAdminDesa(7, "hash-baru")).resolves.toEqual(admin);

    expect(state.transaction).toHaveBeenCalledOnce();
    expect(state.operations.map(({ type, table }) => [type, table])).toEqual([
      ["update", "accounts"],
      ["delete", "sessions"],
      ["update", "users"],
    ]);
    expect(state.operations[0]?.where).toEqual({
      op: "and",
      conditions: [
        { op: "eq", column: "accounts.userId", value: admin.id },
        { op: "eq", column: "accounts.providerId", value: "credential" },
      ],
    });
    expect(state.operations[1]?.where).toEqual({
      op: "eq",
      column: "sessions.userId",
      value: admin.id,
    });
  });

  it("tidak mencabut sesi jika kredensial password tidak ditemukan", async () => {
    state.accountAffectedRows = 0;
    const { resetAdminDesa } = await import("./kelola-desa-repository");

    await expect(resetAdminDesa(7, "hash-baru")).rejects.toMatchObject({
      code: "CONFLICT",
    });

    expect(state.operations.map(({ type, table }) => [type, table])).toEqual([
      ["update", "accounts"],
    ]);
  });
});
