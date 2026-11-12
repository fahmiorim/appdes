import { describe, expect, it } from "vitest";

import { privateNoStore } from "@/lib/response-headers";

describe("privateNoStore", () => {
  it("menetapkan Cache-Control private, no-store tanpa mengubah respons", async () => {
    const response = new Response("data privat", { status: 200 });

    const result = privateNoStore(response);

    expect(result).toBe(response);
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(result.text()).resolves.toBe("data privat");
  });
});
