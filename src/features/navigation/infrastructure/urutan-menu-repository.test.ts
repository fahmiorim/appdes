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

vi.mock("@/db/schema/pengguna-menu-urutan", () => ({
  penggunaMenuUrutan: {
    name: "pengguna_menu_urutan",
    id: "penggunaMenuUrutan.id",
    userId: "penggunaMenuUrutan.userId",
    slug: "penggunaMenuUrutan.slug",
    urut: "penggunaMenuUrutan.urut",
  },
}));

vi.mock("drizzle-orm", () => ({
  asc: (value: unknown) => value,
  eq: (column: unknown, value: unknown) => ({ op: "eq", column, value }),
}));

describe("simpanUrutanMenu", () => {
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

  it("menghapus dan menyisipkan ulang urutan dalam satu transaksi", async () => {
    const { simpanUrutanMenu } = await import("./urutan-menu-repository");

    await simpanUrutanMenu("user-1", ["beranda", "penduduk"]);

    expect(state.transaction).toHaveBeenCalledOnce();
    expect(state.operations.map(({ type, table }) => [type, table])).toEqual([
      ["delete", "pengguna_menu_urutan"],
      ["insert", "pengguna_menu_urutan"],
    ]);
    expect(state.operations[0]?.where).toEqual({
      op: "eq",
      column: "penggunaMenuUrutan.userId",
      value: "user-1",
    });
    expect(state.operations[1]?.values).toEqual([
      { userId: "user-1", slug: "beranda", urut: 0 },
      { userId: "user-1", slug: "penduduk", urut: 1 },
    ]);
  });

  it("hanya menghapus preferensi saat daftar kosong", async () => {
    const { simpanUrutanMenu } = await import("./urutan-menu-repository");

    await simpanUrutanMenu("user-1", []);

    expect(state.transaction).toHaveBeenCalledOnce();
    expect(state.operations.map(({ type }) => type)).toEqual(["delete"]);
  });

  it("meneruskan kegagalan insert tanpa menulis di luar transaksi", async () => {
    state.gagalInsert = true;
    const { simpanUrutanMenu } = await import("./urutan-menu-repository");

    await expect(simpanUrutanMenu("user-1", ["beranda"])).rejects.toThrow("insert gagal");

    expect(state.transaction).toHaveBeenCalledOnce();
    expect(state.operations.map(({ type }) => type)).toEqual(["delete", "insert"]);
  });
});
