import { beforeEach, describe, expect, it, vi } from "vitest";

import * as useCase from "@/features/database/application/database-use-cases";
import { forbidden } from "@/lib/errors";

import { GET } from "./route";

vi.mock("@/features/database/application/database-use-cases", () => ({
  unduhBackupSql: vi.fn(),
}));

function permintaan(format = "gz"): Request {
  return new Request(`http://localhost/api/database/backup?format=${format}`);
}

describe("GET /api/database/backup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak administrator desa dengan status 403", async () => {
    vi.mocked(useCase.unduhBackupSql).mockRejectedValueOnce(
      forbidden("Hanya super admin yang boleh mengelola desa."),
    );

    const response = await GET(permintaan());

    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toContain("Hanya super admin");
  });

  it("mengirim dump sebagai lampiran untuk pengelola platform", async () => {
    vi.mocked(useCase.unduhBackupSql).mockResolvedValueOnce({
      buffer: Buffer.from("isi-dump"),
      filename: "backup.sql.gz",
      mime: "application/gzip",
    });

    const response = await GET(permintaan("sql"));

    expect(useCase.unduhBackupSql).toHaveBeenCalledWith(false);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/gzip");
    expect(response.headers.get("content-disposition")).toContain("backup.sql.gz");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.text()).resolves.toBe("isi-dump");
  });

  it("mengembalikan 500 untuk kegagalan tak terduga", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(useCase.unduhBackupSql).mockRejectedValueOnce(new Error("mysqldump gagal"));

    const response = await GET(permintaan());

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe("Gagal membuat backup database.");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
