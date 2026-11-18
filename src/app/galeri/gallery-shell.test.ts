import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GalleryShell } from "./gallery-shell";

describe("GalleryShell", () => {
  it("renders the existing gallery navigation, village identity, footer and page content", () => {
    const markup = renderToStaticMarkup(
      createElement(
        GalleryShell,
        { villageName: "Desa Contoh" },
        createElement("section", null, "Isi halaman"),
      ),
    );

    expect(markup).toContain('aria-label="Navigasi utama"');
    expect(markup).toContain("url=%2Fimages%2Flogo.png");
    expect(markup).toContain("Desa Contoh");
    expect(markup).toContain('href="/profil"');
    expect(markup).toContain('href="/berita"');
    expect(markup).toContain('href="/agenda"');
    expect(markup).toContain('href="/masuk"');
    expect(markup).toContain("Didukung FlexiDesa");
    expect(markup).toContain("Isi halaman");
  });
});
