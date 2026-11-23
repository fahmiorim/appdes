import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PublicSiteFooter, PublicSiteHeader } from "./public-site-layout";

// Header membaca menu tenant; unit test tidak membuka koneksi database.
vi.mock("@/features/publik/application/website-admin", () => ({
  muatMenuPublik: vi.fn(async () => []),
  muatTemaPublik: vi.fn(async () => null),
}));

const desa = {
  id: 7,
  namaDesa: "Desa Contoh",
  namaKecamatan: "Sei Balai",
  namaKabupaten: "Batu Bara",
  namaPropinsi: "Sumatera Utara",
  logo: null,
  alamatKantor: "Jl. Desa No. 1",
  telepon: "08123456789",
  emailDesa: "desa@example.id",
};

describe("public shared site layout", () => {
  it("renders the shared public navigation and active page", async () => {
    // Header adalah komponen server asinkron; render hasilnya secara langsung
    // agar test tetap memeriksa markup, bukan penjadwalan Suspense React.
    const markup = renderToStaticMarkup(
      await PublicSiteHeader({
        desa,
        location: "Sei Balai, Batu Bara, Sumatera Utara",
        logoUrl: null,
        activePath: "/",
      }),
    );

    expect(markup).toContain("Sistem Informasi Desa");
    expect(markup).toContain("Desa Contoh");
    expect(markup).toContain('aria-label="Navigasi utama"');
    expect(markup).toContain('href="/profil"');
    expect(markup).toContain('href="/layanan/surat"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('href="/masuk"');
  });

  it("renders the village identity, contact channels, and shared footer navigation", async () => {
    // Footer juga komponen server asinkron (membaca tema publik tenant).
    const markup = renderToStaticMarkup(
      await PublicSiteFooter({
        desa,
        location: "Sei Balai, Batu Bara, Sumatera Utara",
        logoUrl: null,
      }),
    );

    expect(markup).toContain("Kontak Desa");
    expect(markup).toContain("Jl. Desa No. 1");
    expect(markup).toContain('href="tel:08123456789"');
    expect(markup).toContain('href="mailto:desa@example.id"');
    expect(markup).toContain("Transparan");
  });
});
