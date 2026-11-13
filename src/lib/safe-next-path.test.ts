import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/safe-next-path";

describe("safeNextPath", () => {
  it("mempertahankan path lokal", () => {
    expect(safeNextPath("/layanan-mandiri/beranda?tab=permohonan")).toBe(
      "/layanan-mandiri/beranda?tab=permohonan",
    );
  });

  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\\\\evil.test",
    "/\t/evil.test",
    "/\n/evil.test",
    "/masuk?next=/beranda",
  ])("mengganti redirect non-lokal %s dengan beranda", (next) => {
    expect(safeNextPath(next)).toBe("/beranda");
  });

  it("menolak parameter next yang berulang", () => {
    expect(safeNextPath(["/beranda", "/evil.test"])).toBe("/beranda");
  });
});
