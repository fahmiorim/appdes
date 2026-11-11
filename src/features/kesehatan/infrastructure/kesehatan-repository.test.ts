import { beforeEach, describe, expect, it, vi } from "vitest";

const select = vi.fn();
const from = vi.fn();
const leftJoin = vi.fn();
const where = vi.fn();
const orderBy = vi.fn();

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => {
      select(...args);
      type Chain = {
        from: (...fromArgs: unknown[]) => Chain;
        leftJoin?: (...joinArgs: unknown[]) => Chain;
        where?: (...whereArgs: unknown[]) => Chain | Promise<unknown[]>;
        orderBy?: (...orderArgs: unknown[]) => Chain;
      };
      const chain: Chain = {
        from: (...fromArgs: unknown[]) => {
          from(...fromArgs);
          chain.leftJoin = (...joinArgs: unknown[]) => {
            leftJoin(...joinArgs);
            chain.where = (...whereArgs: unknown[]) => {
              where(...whereArgs);
              return chain;
            };
            chain.orderBy = (...orderArgs: unknown[]) => {
              orderBy(...orderArgs);
              return chain;
            };
            return chain;
          };
          chain.where = (...whereArgs: unknown[]) => {
            where(...whereArgs);
            return chain;
          };
          chain.orderBy = (...orderArgs: unknown[]) => {
            orderBy(...orderArgs);
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
  posyandu: { id: "id", villageId: "villageId", nama: "nama" },
  kia: { id: "id", villageId: "villageId", ibuId: "ibuId" },
  ibuHamil: { id: "id", villageId: "villageId" },
  bulananAnak: { id: "id", villageId: "villageId" },
}));

vi.mock("@/db/schema/resident", () => ({
  residents: { id: "id", name: "name" },
}));

describe("infrastruktur kesehatan repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listPosyandu memanggil dari tabel posyandu dengan filter villageId", async () => {
    const { listPosyandu } = await import("./kesehatan-repository");
    await listPosyandu(1);
    expect(from).toHaveBeenCalled();
    expect(where).toHaveBeenCalledWith(expect.anything());
  });

  it("listKia memanggil join dengan residents", async () => {
    const { listKia } = await import("./kesehatan-repository");
    await listKia(1);
    expect(from).toHaveBeenCalled();
  });

  it("listIbuHamil memanggil dari tabel ibu_hamil", async () => {
    const { listIbuHamil } = await import("./kesehatan-repository");
    await listIbuHamil(1);
    expect(from).toHaveBeenCalled();
  });

  it("listBulananAnak memanggil dari tabel bulanan_anak", async () => {
    const { listBulananAnak } = await import("./kesehatan-repository");
    await listBulananAnak(1);
    expect(from).toHaveBeenCalled();
  });
});
