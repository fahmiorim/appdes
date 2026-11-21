import { beforeEach, describe, expect, it, vi } from "vitest";

import * as useCases from "@/features/laporan-statistik/application/laporan-statistik-use-cases";
import { forbidden } from "@/lib/errors";

import { GET } from "./route";

vi.mock("@/features/laporan-statistik/application/laporan-statistik-use-cases", () => ({
  getSavedReport: vi.fn(),
}));
vi.mock("@/features/laporan-statistik/application/export-laporan", () => ({
  exportLaporan: vi.fn(),
}));

const context = { params: Promise.resolve({ id: "41" }) };
const request = new Request("http://localhost/api/laporan-statistik/tersimpan/41/ekspor");

describe("GET /api/laporan-statistik/tersimpan/[id]/ekspor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mempertahankan status 403 saat use case menolak permission", async () => {
    vi.mocked(useCases.getSavedReport).mockRejectedValueOnce(forbidden());

    const response = await GET(request, context);

    expect(response.status).toBe(403);
  });

  it("mengembalikan 500 untuk error tak terduga", async () => {
    vi.mocked(useCases.getSavedReport).mockRejectedValueOnce(new Error("db error"));

    const response = await GET(request, context);

    expect(response.status).toBe(500);
  });
});
