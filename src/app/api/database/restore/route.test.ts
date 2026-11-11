import { beforeEach, describe, expect, it, vi } from "vitest";

import * as useCase from "@/features/database/application/database-use-cases";
import { MAX_RESTORE_BYTES } from "@/features/database/domain/database";
import * as gate from "@/features/multi-desa/application/provisioning-use-cases";
import { forbidden } from "@/lib/errors";

import { POST } from "./route";

vi.mock("@/features/database/application/database-use-cases", () => ({
  pulihkanBackupSql: vi.fn(),
}));
vi.mock("@/features/multi-desa/application/provisioning-use-cases", () => ({
  requireSuperAdmin: vi.fn(),
}));

const URL_RESTORE = "http://localhost/api/database/restore";
const BATAS = "----batas-uji";

type Bagian = { name: string; value: string } | { name: string; filename: string; isi: string };

function multipart(bagian: Bagian[]): { body: string; contentType: string; ukuran: number } {
  const potongan: string[] = [];
  for (const item of bagian) {
    potongan.push(`--${BATAS}\r\n`);
    if ("filename" in item) {
      potongan.push(
        `Content-Disposition: form-data; name="${item.name}"; filename="${item.filename}"\r\n` +
          "Content-Type: application/sql\r\n\r\n" +
          `${item.isi}\r\n`,
      );
    } else {
      potongan.push(`Content-Disposition: form-data; name="${item.name}"\r\n\r\n${item.value}\r\n`);
    }
  }
  potongan.push(`--${BATAS}--\r\n`);
  const body = potongan.join("");
  return {
    body,
    contentType: `multipart/form-data; boundary=${BATAS}`,
    ukuran: Buffer.byteLength(body),
  };
}

function permintaan(
  body: string,
  options: { contentType?: string | null; contentLength?: number | null } = {},
): Request {
  const headers: Record<string, string> = {};
  if (options.contentType !== null) {
    headers["content-type"] = options.contentType ?? `multipart/form-data; boundary=${BATAS}`;
  }
  if (options.contentLength !== null) {
    headers["content-length"] = String(options.contentLength ?? Buffer.byteLength(body));
  }
  return new Request(URL_RESTORE, { method: "POST", headers, body });
}

function berkasSah(): Bagian[] {
  return [
    { name: "konfirmasi", value: "1" },
    { name: "berkas", filename: "backup.sql", isi: "CREATE TABLE uji (id INT);" },
  ];
}

describe("POST /api/database/restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gate.requireSuperAdmin).mockResolvedValue({ id: "u-1", villageId: null } as never);
    vi.mocked(useCase.pulihkanBackupSql).mockResolvedValue(undefined);
  });

  it("menolak pemanggil tak berizin sebelum menyentuh body", async () => {
    vi.mocked(gate.requireSuperAdmin).mockRejectedValueOnce(
      forbidden("Hanya super admin yang boleh mengelola desa."),
    );
    // Tanpa content-type: bila body diproses lebih dulu, respons akan 400.
    const request = permintaan("bukan multipart", { contentType: null });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(useCase.pulihkanBackupSql).not.toHaveBeenCalled();
  });

  it("menolak Content-Length di atas batas sebelum membaca body", async () => {
    const request = permintaan("x", { contentLength: MAX_RESTORE_BYTES + 1 });

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(useCase.pulihkanBackupSql).not.toHaveBeenCalled();
  });

  it("menolak unggahan tanpa Content-Length", async () => {
    const request = permintaan("x", { contentLength: null });

    const response = await POST(request);

    expect(response.status).toBe(411);
    expect(useCase.pulihkanBackupSql).not.toHaveBeenCalled();
  });

  it("mengalirkan isi berkas multipart ke use case", async () => {
    let isi = "";
    vi.mocked(useCase.pulihkanBackupSql).mockImplementation(async (input) => {
      const potongan: Buffer[] = [];
      for await (const chunk of input.stream) potongan.push(Buffer.from(chunk as Buffer));
      isi = Buffer.concat(potongan).toString("utf8");
    });
    const { body, contentType, ukuran } = multipart(berkasSah());

    const response = await POST(permintaan(body, { contentType, contentLength: ukuran }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/pengaturan/database?restored=1");
    expect(useCase.pulihkanBackupSql).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "backup.sql", konfirmasi: true }),
    );
    expect(isi).toBe("CREATE TABLE uji (id INT);");
  });

  it("menolak berkas sebelum konfirmasi terbaca", async () => {
    const { body, contentType, ukuran } = multipart([
      { name: "berkas", filename: "backup.sql", isi: "SELECT 1;" },
    ]);

    const response = await POST(permintaan(body, { contentType, contentLength: ukuran }));

    expect(response.status).toBe(400);
    expect(useCase.pulihkanBackupSql).not.toHaveBeenCalled();
  });

  it("menolak ekstensi selain sql/sql.gz", async () => {
    const { body, contentType, ukuran } = multipart([
      { name: "konfirmasi", value: "1" },
      { name: "berkas", filename: "backup.zip", isi: "PK" },
    ]);

    const response = await POST(permintaan(body, { contentType, contentLength: ukuran }));

    expect(response.status).toBe(400);
    expect(useCase.pulihkanBackupSql).not.toHaveBeenCalled();
  });
});
