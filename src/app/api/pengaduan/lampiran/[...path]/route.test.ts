import { beforeEach, describe, expect, it, vi } from "vitest";

import { bacaLampiranPengaduan } from "@/features/pengaduan/application/use-cases";
import { hasPermission } from "@/features/rbac/application/authorization";
import { requireUser } from "@/lib/dal";

import { GET } from "./route";

vi.mock("@/lib/dal", () => ({ requireUser: vi.fn() }));
vi.mock("@/features/pengaduan/application/use-cases", () => ({
  bacaLampiranPengaduan: vi.fn(),
}));
vi.mock("@/features/rbac/application/authorization", () => ({ hasPermission: vi.fn() }));
vi.mock("@/features/rbac/domain/resources", () => ({
  RESOURCES: { pengaduan: "pengaduan" },
}));

function konteks(path: string[]) {
  return { params: Promise.resolve({ path }) } as never;
}

function permintaan() {
  return new Request("http://localhost/api/pengaduan/lampiran/7/pengaduan/a.pdf");
}

describe("GET /api/pengaduan/lampiran", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(requireUser).mockResolvedValue({
      id: "u-1",
      villageId: 7,
      permissions: {},
    } as never);
    vi.mocked(bacaLampiranPengaduan).mockResolvedValue(Buffer.from("%PDF"));
  });

  it("menolak permintaan tanpa sesi", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new Error("belum masuk"));

    const respons = await GET(permintaan(), konteks(["7", "pengaduan", "a.pdf"]));

    expect(respons.status).toBe(401);
    expect(bacaLampiranPengaduan).not.toHaveBeenCalled();
  });

  it("menolak pengguna tanpa izin baca pengaduan", async () => {
    vi.mocked(hasPermission).mockReturnValueOnce(false);

    const respons = await GET(permintaan(), konteks(["7", "pengaduan", "a.pdf"]));

    expect(respons.status).toBe(403);
    expect(bacaLampiranPengaduan).not.toHaveBeenCalled();
  });

  it("tidak menyajikan lampiran desa lain meski pengguna berizin", async () => {
    const respons = await GET(permintaan(), konteks(["8", "pengaduan", "a.pdf"]));

    expect(respons.status).toBe(404);
    expect(bacaLampiranPengaduan).not.toHaveBeenCalled();
  });

  it("menyajikan lampiran desa sesi dengan cache privat", async () => {
    const respons = await GET(permintaan(), konteks(["7", "pengaduan", "a.pdf"]));

    expect(respons.status).toBe(200);
    expect(respons.headers.get("content-type")).toBe("application/pdf");
    expect(respons.headers.get("cache-control")).toBe("private, no-store");
    expect(bacaLampiranPengaduan).toHaveBeenCalledWith("7/pengaduan/a.pdf");
  });

  it("menolak path traversal sebelum membaca berkas", async () => {
    const respons = await GET(permintaan(), konteks(["7", "pengaduan", "..", "rahasia.pdf"]));

    expect(respons.status).toBe(400);
    expect(bacaLampiranPengaduan).not.toHaveBeenCalled();
  });
});
