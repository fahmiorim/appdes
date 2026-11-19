import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { forbidden as buatKesalahanForbidden } from "@/lib/errors";

const state = vi.hoisted(() => ({
  pastikanSuperAdmin: vi.fn(),
  daftarDesaSuperAdmin: vi.fn(),
  forbidden: vi.fn(() => {
    throw Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK;403"), {
      digest: "NEXT_HTTP_ERROR_FALLBACK;403",
    });
  }),
}));

vi.mock("next/navigation", () => ({
  forbidden: state.forbidden,
  usePathname: () => "/super-admin/domain/tambah",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("../../guard", () => ({
  pastikanSuperAdmin: state.pastikanSuperAdmin,
}));

vi.mock("@/features/multi-desa/application/provisioning-use-cases", () => ({
  daftarDesaSuperAdmin: state.daftarDesaSuperAdmin,
}));

vi.mock("../../actions", () => ({
  tambahDomainAction: vi.fn(),
  periksaDnsDomainAction: vi.fn(),
  periksaSslDomainAction: vi.fn(),
}));

describe("SuperAdminTambahDomainPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak pengguna yang bukan pengelola platform sebelum membaca data desa", async () => {
    state.pastikanSuperAdmin.mockRejectedValue(
      buatKesalahanForbidden("Hanya super admin yang boleh mendaftarkan domain."),
    );
    const { default: Page } = await import("./page");

    await expect(Page()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.daftarDesaSuperAdmin).not.toHaveBeenCalled();
  });

  it("menampilkan wizard Tambah Domain dan pilihan tenant setelah guard lolos", async () => {
    state.pastikanSuperAdmin.mockResolvedValue({ id: "platform-1", villageId: null });
    state.daftarDesaSuperAdmin.mockResolvedValue([
      {
        id: 1,
        name: "Desa Tanjung Gading",
        slug: "tanjung-gading",
        code: "1207012001",
        domain: "tanjung-gading.localhost",
        district: "Sei Suka",
        regency: "Batu Bara",
        active: true,
        kuotaMediaMb: null,
        tema: "tegar",
        temaNama: "Tegar",
        temaVersi: "1.0.0",
        pengguna: 1,
        penduduk: 10,
        jenisSurat: 0,
        createdAt: new Date("2026-01-01"),
        nonaktifSejak: null,
        purgedAt: null,
        adaEksporBerlaku: false,
      },
    ]);
    const { default: Page } = await import("./page");

    const html = renderToStaticMarkup(await Page());

    expect(state.pastikanSuperAdmin).toHaveBeenCalledOnce();
    expect(state.daftarDesaSuperAdmin).toHaveBeenCalledOnce();
    expect(html).toContain("Tambah Domain");
    expect(html).toContain("Pilih Tenant &amp; Jenis Domain");
    expect(html).toContain("Subdomain Platform");
    expect(html).toContain("Custom Domain");
    expect(html).toContain("Desa Tanjung Gading");
    expect(html).toContain("Kec. Sei Suka, Batu Bara");
    expect(html).toContain("Pratinjau Domain");
    expect(html).toContain("Alur Pendaftaran Domain");
    expect(html).toContain("Batal");
    expect(html).toContain("Selanjutnya");
    expect(html).toContain("Kembali ke daftar domain");
  });
});
