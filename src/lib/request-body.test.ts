import { describe, expect, it } from "vitest";

import { bacaJsonTerbatas, bacaTeksTerbatas, BodyLimitError } from "@/lib/request-body";

describe("bacaTeksTerbatas", () => {
  it("membaca body yang berada di bawah batas", async () => {
    const request = new Request("https://desa.example.id", {
      method: "POST",
      body: "halo",
    });

    await expect(bacaTeksTerbatas(request, 16)).resolves.toBe("halo");
  });

  it("menolak Content-Length yang melebihi batas tanpa membaca body", async () => {
    const request = new Request("https://desa.example.id", {
      method: "POST",
      headers: { "content-length": "100" },
      body: "x",
    });

    await expect(bacaTeksTerbatas(request, 16)).rejects.toBeInstanceOf(BodyLimitError);
  });

  it("tetap menolak body chunked yang melewati batas", async () => {
    const request = new Request("https://desa.example.id", {
      method: "POST",
      body: "abcdefghijklmnop",
    });

    await expect(bacaTeksTerbatas(request, 8)).rejects.toBeInstanceOf(BodyLimitError);
  });

  it("menolak Content-Length yang bukan bilangan valid", async () => {
    const request = new Request("https://desa.example.id", {
      method: "POST",
      headers: { "content-length": "abc" },
      body: "x",
    });

    await expect(bacaTeksTerbatas(request, 16)).rejects.toThrow("Content-Length tidak valid");
  });

  it("mengurai JSON dengan batas yang sama", async () => {
    const request = new Request("https://desa.example.id", {
      method: "POST",
      body: JSON.stringify({ nama: "Desa" }),
    });

    await expect(bacaJsonTerbatas(request, 64)).resolves.toEqual({ nama: "Desa" });
  });
});
