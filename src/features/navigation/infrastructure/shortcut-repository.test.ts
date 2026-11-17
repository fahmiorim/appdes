import { beforeEach, describe, expect, it, vi } from "vitest";

type Operasi = { type: "delete" | "insert"; table: string; values?: unknown; where?: unknown };

const state = vi.hoisted(() => ({
  transaction: vi.fn(),
  gagalInsert: false,
  operations: [] as Operasi[],
}));

vi.mock("@/db", () => ({
  db: { transaction: (...args: unknown[]) => state.transaction(...args) },
}));

vi.mock("@/db/schema/pengguna-shortcut", () => ({
  penggunaShortcut: {
    name: "pengguna_shortcut",
    id: "penggunaShortcut.id",
    userId: "penggunaShortcut.userId",
    href: "penggunaShortcut.href",
    urut: "penggunaShortcut.urut",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => ({ op: "and", conditions }),
  asc: (value: unknown) => value,
  eq: (column: unknown, value: unknown) => ({ op: "eq", column, value }),
}));

describe("simpanShortcut", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.gagalInsert = false;
    state.operations.length = 0;

    const tx = {
      delete: (table: { name: string }) => ({
        where: async (where: unknown) => {
          state.operations.push({ type: "delete", table: table.name, where });
        },
      }),
      insert: (table: { name: string }) => ({
        values: async (values: unknown) => {
          state.operations.push({ type: "insert", table: table.name, values });
          if (state.gagalInsert) throw new Error("insert gagal");
        },
      }),
    };

    state.transaction.mockImplementation(async (callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    );
  });

  it("menghapus dan menyisipkan ulang pintasan dalam satu transaksi", async () => {
    const { simpanShortcut } = await import("./shortcut-repository");

    await simpanShortcut("user-1", ["/penduduk", "/surat"]);

    expect(state.transaction).toHaveBeenCalledOnce();
    expect(state.operations.map(({ type, table }) => [type, table])).toEqual([
      ["delete", "pengguna_shortcut"],
      ["insert", "pengguna_shortcut"],
    ]);
    expect(state.operations[0]?.where).toEqual({
      op: "eq",
      column: "penggunaShortcut.userId",
      value: "user-1",
    });
    expect(state.operations[1]?.values).toEqual([
      { userId: "user-1", href: "/penduduk", urut: 0 },
      { userId: "user-1", href: "/surat", urut: 1 },
    ]);
  });

  it("hanya menghapus pintasan saat daftar kosong", async () => {
    const { simpanShortcut } = await import("./shortcut-repository");

    await simpanShortcut("user-1", []);

    expect(state.transaction).toHaveBeenCalledOnce();
    expect(state.operations.map(({ type }) => type)).toEqual(["delete"]);
  });

  it("meneruskan kegagalan insert tanpa menulis di luar transaksi", async () => {
    state.gagalInsert = true;
    const { simpanShortcut } = await import("./shortcut-repository");

    await expect(simpanShortcut("user-1", ["/penduduk"])).rejects.toThrow("insert gagal");

    expect(state.transaction).toHaveBeenCalledOnce();
    expect(state.operations.map(({ type }) => type)).toEqual(["delete", "insert"]);
  });
});
