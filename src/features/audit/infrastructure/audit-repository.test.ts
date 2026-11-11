import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
const values = vi.fn();
const select = vi.fn();
const from = vi.fn();
const leftJoin = vi.fn();
const where = vi.fn();
const orderBy = vi.fn();
const limit = vi.fn();
const offset = vi.fn();
const count = vi.fn();

vi.mock("@/db", () => ({
  db: {
    insert: (...args: unknown[]) => {
      insert(...args);
      return {
        values: (...valuesArgs: unknown[]) => {
          values(...valuesArgs);
          return Promise.resolve();
        },
      };
    },
    select: (...args: unknown[]) => {
      select(...args);
      const isCount =
        Array.isArray(args) && args[0] && typeof args[0] === "object" && "value" in args[0];
      type Chain = {
        from: (...fromArgs: unknown[]) => Chain;
        leftJoin?: (...joinArgs: unknown[]) => Chain;
        where?: (...whereArgs: unknown[]) => Chain | Promise<{ value: number }[]>;
        orderBy?: (...orderArgs: unknown[]) => Chain;
        limit?: (...limitArgs: unknown[]) => Chain;
        offset?: (...offsetArgs: unknown[]) => Promise<{ id: number; event: string }[]>;
      };
      const chain: Chain = {
        from: (...fromArgs: unknown[]) => {
          from(...fromArgs);
          chain.leftJoin = (...joinArgs: unknown[]) => {
            leftJoin(...joinArgs);
            chain.where = (...whereArgs: unknown[]) => {
              where(...whereArgs);
              if (isCount) {
                return Promise.resolve([{ value: 1 }]);
              }
              chain.orderBy = (...orderArgs: unknown[]) => {
                orderBy(...orderArgs);
                chain.limit = (...limitArgs: unknown[]) => {
                  limit(...limitArgs);
                  chain.offset = (...offsetArgs: unknown[]) => {
                    offset(...offsetArgs);
                    return Promise.resolve([{ id: 1, event: "auth.login.success" }]);
                  };
                  return chain;
                };
                return chain;
              };
              return chain;
            };
            return chain;
          };
          return chain;
        },
      };
      return chain;
    },
  },
}));

vi.mock("@/db/schema", () => ({
  auditLogs: {
    id: "id",
    villageId: "villageId",
    actorId: "actorId",
    event: "event",
    resource: "resource",
    resourceId: "resourceId",
    ipAddress: "ipAddress",
    userAgent: "userAgent",
    details: "details",
    createdAt: "createdAt",
  },
  users: {
    id: "id",
    name: "name",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  count: () => count(),
  desc: (value: unknown) => value,
  eq: (left: unknown, right: unknown) => ({ left, right }),
  like: (left: unknown, right: unknown) => ({ left, right }),
  or: (...args: unknown[]) => args,
}));

describe("infrastruktur audit repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    count.mockReturnValue("count(*)");
  });

  it("appendAuditLog menyimpan dengan nilai default null", async () => {
    const { appendAuditLog } = await import("./audit-repository");
    await appendAuditLog({
      villageId: 1,
      event: "auth.login.success",
      resource: "auth",
    });
    expect(insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith({
      villageId: 1,
      actorId: null,
      event: "auth.login.success",
      resource: "auth",
      resourceId: null,
      ipAddress: null,
      userAgent: null,
      details: null,
    });
  });

  it("listAuditLogs menerapkan filter desa dan pencarian", async () => {
    const { listAuditLogs } = await import("./audit-repository");
    const page = await listAuditLogs(5, { page: 2, pageSize: 10, search: "login" });
    expect(from).toHaveBeenCalled();
    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(10);
    expect(page.total).toBe(1);
  });
});
