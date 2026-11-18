import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicShell } from "./public-shell";

const navigation = [
  { href: "/", label: "Beranda" },
  { href: "/profil", label: "Profil Desa" },
  { href: "/berita", label: "Berita" },
  { href: "/kontak", label: "Kontak" },
];

describe("PublicShell", () => {
  it("renders the page-supplied navigation in order with the village identity and footer", () => {
    const markup = renderToStaticMarkup(
      createElement(
        PublicShell,
        {
          villageName: "Desa Contoh",
          brandLabel: "Dokumen & Informasi Publik",
          navigation,
        },
        createElement("section", null, "Isi halaman"),
      ),
    );

    expect(markup).toContain('aria-label="Navigasi utama"');
    expect(markup).toContain('src="/images/flexidesa-mark.svg"');
    expect(markup).toContain("Desa Contoh");
    expect(markup).toContain("Dokumen &amp; Informasi Publik");

    const navMarkup = markup.slice(
      markup.indexOf('aria-label="Navigasi utama"'),
      markup.indexOf('href="/masuk"'),
    );
    const positions = navigation.map((item) => navMarkup.indexOf(`href="${item.href}"`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));

    expect(markup).toContain('href="/masuk"');
    expect(markup).toContain("Didukung FlexiDesa");
    expect(markup).toContain("Isi halaman");
  });

  it("renders data-driven external links as plain anchors", () => {
    const markup = renderToStaticMarkup(
      createElement(PublicShell, {
        villageName: "Desa Contoh",
        brandLabel: "Informasi Publik",
        navigation: [
          { href: "/", label: "Beranda" },
          { href: "https://contoh.id/kanal", label: "Kanal Desa", eksternal: true },
        ],
      }),
    );

    expect(markup).toContain('href="https://contoh.id/kanal" target="_blank" rel="noreferrer"');
    expect(markup).toContain("Kanal Desa");
  });

  it("omits the brand mark for pages that do not render it today", () => {
    const markup = renderToStaticMarkup(
      createElement(PublicShell, {
        villageName: "Desa Contoh",
        brandLabel: "Transparansi Anggaran",
        navigation: [{ href: "/", label: "Beranda" }],
        showMark: false,
      }),
    );

    expect(markup).not.toContain("/images/flexidesa-mark.svg");
    expect(markup).toContain("Transparansi Anggaran");
  });
});
