import { describe, expect, it, vi } from "vitest";

import { resolveVillageByHost } from "@/features/desa/application/resolve-village";
import { terimaPesanEmailWebhook } from "@/features/notifikasi/application/mailbox-use-cases";

import { POST } from "./route";

vi.mock("@/lib/env", () => ({ env: { EMAIL_WEBHOOK_TOKEN: "a".repeat(32) } }));
vi.mock("@/features/desa/application/resolve-village", () => ({
  resolveVillageByHost: vi.fn(),
}));
vi.mock("@/features/notifikasi/application/mailbox-use-cases", () => ({
  terimaPesanEmailWebhook: vi.fn(),
}));

const token = "a".repeat(32);
const pesan = {
  token,
  alamat: "warga@example.test",
  subjek: "Informasi",
  isi: "Mohon informasi layanan desa.",
  villageId: 999,
};

function request(body: unknown, host = "desa.example.test") {
  return new Request("https://desa.example.test/api/webhooks/email", {
    method: "POST",
    headers: { host, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/email", () => {
  it("rejects an invalid token without storing the payload", async () => {
    const response = await POST(request({ ...pesan, token: "wrong" }));

    expect(response.status).toBe(401);
    expect(terimaPesanEmailWebhook).not.toHaveBeenCalled();
  });

  it("resolves the tenant from Host and stores a valid message", async () => {
    vi.mocked(resolveVillageByHost).mockResolvedValue({ id: 17 } as never);
    vi.mocked(terimaPesanEmailWebhook).mockResolvedValue(42);

    const response = await POST(request(pesan));

    expect(response.status).toBe(201);
    expect(terimaPesanEmailWebhook).toHaveBeenCalledWith({
      villageId: 17,
      alamat: "warga@example.test",
      subjek: "Informasi",
      isi: "Mohon informasi layanan desa.",
      tanggal: undefined,
    });
  });
});
