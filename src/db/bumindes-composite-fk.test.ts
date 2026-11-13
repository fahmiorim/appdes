import { getTableConfig } from "drizzle-orm/mysql-core";
import { describe, expect, it } from "vitest";

import { bumindesBuku, bumindesItem } from "@/db/schema";

describe("BUMDes composite tenant foreign key schema", () => {
  it("binds each item to a book in the same village and cascades deletes", () => {
    const parent = getTableConfig(bumindesBuku);
    const child = getTableConfig(bumindesItem);
    const unique = parent.indexes.find(
      (index) => index.config.name === "bumindes_buku_village_id_uq",
    );
    const foreignKey = child.foreignKeys.find(
      (constraint) => constraint.getName() === "bumindes_item_buku_tenant_fk",
    );

    const kolomUnik = unique?.config.columns.map((column) =>
      "name" in column ? column.name : null,
    );

    expect(unique?.config.unique).toBe(true);
    expect(kolomUnik).toEqual(["village_id", "id"]);
    expect(
      child.indexes.some((index) => index.config.name === "bumindes_item_village_buku_idx"),
    ).toBe(true);
    expect(foreignKey).toBeDefined();
    expect(foreignKey?.reference().columns.map((column) => column.name)).toEqual([
      "village_id",
      "buku_id",
    ]);
    expect(foreignKey?.reference().foreignColumns.map((column) => column.name)).toEqual([
      "village_id",
      "id",
    ]);
    expect(foreignKey?.onDelete).toBe("cascade");
    expect(
      child.foreignKeys.some(
        (constraint) => constraint.getName() === "bumindes_item_buku_id_bumindes_buku_id_fk",
      ),
    ).toBe(false);
  });
});
