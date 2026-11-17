import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buatPenggunaPlatformBaru,
  cabutSesiPenggunaPlatformAkun,
  daftarPenggunaPlatform,
  resetSandiPenggunaPlatform,
  ubahStatusPenggunaPlatform,
} from "./pengguna-platform-use-cases";

vi.mock("./provisioning-use-cases", () => ({ requireSuperAdmin: vi.fn() }));
vi.mock("@/features/audit/application/audit-use-cases", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("better-auth/crypto", () => ({
  hashPassword: vi.fn(async (sandi: string) => `hash:${sandi}`),
}));
vi.mock("@/features/multi-desa/infrastructure/pengguna-platform-repository", () => ({
  listPenggunaPlatform: vi.fn(),
  getPeranPlatform: vi.fn(),
  getPenggunaPlatform: vi.fn(),
  buatPenggunaPlatform: vi.fn(),
  setStatusPenggunaPlatform: vi.fn(),
  resetSandiPenggunaPlatform: vi.fn(),
  cabutSesiPenggunaPlatform: vi.fn(),
  emailDipakai: vi.fn(),
  usernameDipakai: vi.fn(),
}));

const platformUser = { id: "platform-1", villageId: null } as never;

const penggunaRepository = () =>
  import("@/features/multi-desa/infrastructure/pengguna-platform-repository");
const guard = () => import("./provisioning-use-cases");
const audit = () => import("@/features/audit/application/audit-use-cases");

const inputBaru = {
  name: "Pengelola Baru",
  email: "baru@contoh.id",
  username: "pengelola.baru",
  password: "sandi-yang-panjang",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("daftarPenggunaPlatform", () => {
  it("menolak pembacaan oleh pengguna yang bukan pengelola platform", async () => {
    vi.mocked((await guard()).requireSuperAdmin).mockRejectedValue(
      Object.assign(new Error("Hanya super admin yang boleh mengelola desa."), {
        code: "FORBIDDEN",
      }),
    );

    await expect(daftarPenggunaPlatform()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await penggunaRepository()).listPenggunaPlatform).not.toHaveBeenCalled();
  });

  it("mengembalikan daftar akun platform setelah guard lolos", async () => {
    const baris = {
      id: "u-1",
      name: "Pengelola Platform",
      email: "platform@contoh.id",
      username: "platform",
      roleName: "Super Admin",
      roleSlug: "super-admin",
      active: true,
      mustChangePin: false,
      lastLoginAt: null,
      createdAt: new Date("2026-01-01"),
      sesiAktif: 1,
    };
    vi.mocked((await guard()).requireSuperAdmin).mockResolvedValue(platformUser);
    vi.mocked((await penggunaRepository()).listPenggunaPlatform).mockResolvedValue([baris]);

    await expect(daftarPenggunaPlatform()).resolves.toEqual([baris]);
  });
});

describe("buatPenggunaPlatformBaru", () => {
  it("menolak pembuatan akun oleh non-platform tanpa menyentuh repository", async () => {
    vi.mocked((await guard()).requireSuperAdmin).mockRejectedValue(
      Object.assign(new Error("Ditolak"), { code: "FORBIDDEN" }),
    );

    await expect(buatPenggunaPlatformBaru(inputBaru)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await penggunaRepository()).buatPenggunaPlatform).not.toHaveBeenCalled();
  });

  it("menolak sandi yang lebih pendek dari 12 karakter", async () => {
    vi.mocked((await guard()).requireSuperAdmin).mockResolvedValue(platformUser);

    await expect(buatPenggunaPlatformBaru({ ...inputBaru, password: "pendek" })).rejects.toThrow();
    expect((await penggunaRepository()).buatPenggunaPlatform).not.toHaveBeenCalled();
  });

  it("menolak email yang sudah dipakai akun lain", async () => {
    vi.mocked((await guard()).requireSuperAdmin).mockResolvedValue(platformUser);
    vi.mocked((await penggunaRepository()).getPeranPlatform).mockResolvedValue({
      id: 9,
      name: "Super Admin",
    });
    vi.mocked((await penggunaRepository()).emailDipakai).mockResolvedValue(true);

    await expect(buatPenggunaPlatformBaru(inputBaru)).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await penggunaRepository()).buatPenggunaPlatform).not.toHaveBeenCalled();
  });

  it("menyimpan akun platform dengan role platform dan mencatat audit tanpa sandi", async () => {
    vi.mocked((await guard()).requireSuperAdmin).mockResolvedValue(platformUser);
    vi.mocked((await penggunaRepository()).getPeranPlatform).mockResolvedValue({
      id: 9,
      name: "Super Admin",
    });
    vi.mocked((await penggunaRepository()).emailDipakai).mockResolvedValue(false);
    vi.mocked((await penggunaRepository()).usernameDipakai).mockResolvedValue(false);
    vi.mocked((await penggunaRepository()).buatPenggunaPlatform).mockResolvedValue({
      id: "baru-1",
    });

    await expect(buatPenggunaPlatformBaru(inputBaru)).resolves.toEqual({ id: "baru-1" });

    expect((await penggunaRepository()).buatPenggunaPlatform).toHaveBeenCalledWith({
      name: inputBaru.name,
      email: inputBaru.email,
      username: inputBaru.username,
      passwordHash: `hash:${inputBaru.password}`,
      roleId: 9,
    });

    const auditCall = vi.mocked((await audit()).recordAuditEvent).mock.calls[0]?.[0];
    expect(auditCall).toMatchObject({
      villageId: null,
      actorId: "platform-1",
      resource: "users",
      resourceId: "baru-1",
    });
    expect(JSON.stringify(auditCall)).not.toContain(inputBaru.password);
  });
});

describe("ubahStatusPenggunaPlatform", () => {
  it("menolak menonaktifkan akun yang sedang dipakai operator", async () => {
    vi.mocked((await guard()).requireSuperAdmin).mockResolvedValue(platformUser);

    await expect(
      ubahStatusPenggunaPlatform({ id: "platform-1", active: "false" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await penggunaRepository()).setStatusPenggunaPlatform).not.toHaveBeenCalled();
  });

  it("menonaktifkan akun lain lalu mencatat audit", async () => {
    vi.mocked((await guard()).requireSuperAdmin).mockResolvedValue(platformUser);
    vi.mocked((await penggunaRepository()).getPenggunaPlatform).mockResolvedValue({
      id: "u-2",
      name: "Pengelola Lama",
      email: "lama@contoh.id",
      username: "lama",
      active: true,
    });

    await expect(ubahStatusPenggunaPlatform({ id: "u-2", active: "false" })).resolves.toEqual({
      active: false,
    });

    expect((await penggunaRepository()).setStatusPenggunaPlatform).toHaveBeenCalledWith(
      "u-2",
      false,
    );
    expect((await audit()).recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "platform.user.status", resourceId: "u-2" }),
    );
  });

  it("menolak id akun yang tidak ada di tenant platform", async () => {
    vi.mocked((await guard()).requireSuperAdmin).mockResolvedValue(platformUser);
    vi.mocked((await penggunaRepository()).getPenggunaPlatform).mockResolvedValue(null);

    await expect(
      ubahStatusPenggunaPlatform({ id: "admin-desa-1", active: "true" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await penggunaRepository()).setStatusPenggunaPlatform).not.toHaveBeenCalled();
  });
});

describe("resetSandiPenggunaPlatform", () => {
  it("mengembalikan sandi sementara sekali pakai dan tidak menyimpannya di audit", async () => {
    vi.mocked((await guard()).requireSuperAdmin).mockResolvedValue(platformUser);
    vi.mocked((await penggunaRepository()).getPenggunaPlatform).mockResolvedValue({
      id: "u-2",
      name: "Pengelola Lama",
      email: "lama@contoh.id",
      username: "lama",
      active: false,
    });

    const hasil = await resetSandiPenggunaPlatform("u-2");

    expect(hasil.sandiSementara).toHaveLength(12);
    expect(hasil.email).toBe("lama@contoh.id");
    expect((await penggunaRepository()).resetSandiPenggunaPlatform).toHaveBeenCalledWith(
      "u-2",
      `hash:${hasil.sandiSementara}`,
    );
    expect(JSON.stringify(vi.mocked((await audit()).recordAuditEvent).mock.calls)).not.toContain(
      hasil.sandiSementara,
    );
  });
});

describe("cabutSesiPenggunaPlatformAkun", () => {
  it("mencabut sesi akun platform dan mengembalikan jumlahnya", async () => {
    vi.mocked((await guard()).requireSuperAdmin).mockResolvedValue(platformUser);
    vi.mocked((await penggunaRepository()).getPenggunaPlatform).mockResolvedValue({
      id: "u-2",
      name: "Pengelola Lama",
      email: "lama@contoh.id",
      username: "lama",
      active: true,
    });
    vi.mocked((await penggunaRepository()).cabutSesiPenggunaPlatform).mockResolvedValue(3);

    await expect(cabutSesiPenggunaPlatformAkun("u-2")).resolves.toEqual({ jumlah: 3 });
    expect((await audit()).recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: "platform.user.session.revoke", resourceId: "u-2" }),
    );
  });
});
