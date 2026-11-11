import { beforeEach, describe, expect, it, vi } from "vitest";

import { catatPermintaanRateLimit } from "../infrastructure/rate-limit-repository";
import { batasiPermintaan } from "./rate-limit";

vi.mock("../infrastructure/rate-limit-repository", () => ({
  catatPermintaanRateLimit: vi.fn(),
}));

describe("batasiPermintaan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(catatPermintaanRateLimit).mockResolvedValue({ jumlah: 1, resetMs: 12_000 });
  });

  it("blocks excess requests and reports the repository's next quota reset", async () => {
    vi.mocked(catatPermintaanRateLimit).mockResolvedValue({ jumlah: 4, resetMs: 1 });

    const hasil = await batasiPermintaan("uji", {
      batas: 3,
      jendelaMs: 60_000,
      sekarang: 119_999,
    });

    expect(hasil).toEqual({ dibatasi: true, sisa: 0, resetMs: 1 });
    expect(catatPermintaanRateLimit).toHaveBeenCalledWith("uji", 3, 60_000, 119_999);
  });

  it("rejects invalid quotas before touching persistent storage", async () => {
    await expect(batasiPermintaan("uji", { batas: 0, sekarang: 1 })).rejects.toThrow(
      "batas harus berupa bilangan bulat positif",
    );
    expect(catatPermintaanRateLimit).not.toHaveBeenCalled();
  });
});
