import type { CSSProperties } from "react";

import type { TokenTemplate } from "@/features/multi-desa/domain/template-website";

export function TemplateThumb({
  name,
  category,
  tokens,
}: {
  name: string;
  category: string;
  tokens: TokenTemplate;
}) {
  const gaya = {
    "--template-primary": tokens.primary,
    "--template-secondary": tokens.secondary,
    "--template-accent": tokens.accent,
    "--template-background": tokens.background,
    "--template-surface": tokens.surface,
    "--template-text": tokens.text,
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="template-thumb"
      data-font={tokens.fontHeading}
      data-radius={tokens.radius}
      data-style={tokens.style}
      style={gaya}
    >
      <div className="template-thumb-bar">
        <span />
        <span />
        <span />
        <i>{name}</i>
      </div>
      <div className="template-thumb-hero">
        <small>{category}</small>
        <strong>Desa yang tumbuh, warga yang dilayani.</strong>
        <span>Informasi dan layanan desa dalam satu tempat.</span>
      </div>
      <div className="template-thumb-strip">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

/**
 * Pratinjau komposisi template.
 *
 * Ini bukan tangkapan layar dan bukan situs tenant sebenarnya. Warna, font, dan
 * radius berasal dari token template; isi contoh hanya dipakai untuk
 * memperlihatkan hierarki tampilan.
 */
export function TemplatePreview({
  name,
  tokens,
  compact = false,
}: {
  name: string;
  tokens: TokenTemplate;
  compact?: boolean;
}) {
  const gaya = {
    "--template-primary": tokens.primary,
    "--template-secondary": tokens.secondary,
    "--template-accent": tokens.accent,
    "--template-background": tokens.background,
    "--template-surface": tokens.surface,
    "--template-text": tokens.text,
  } as CSSProperties;

  return (
    <div
      className={`template-preview${compact ? " is-compact" : ""}`}
      data-font={tokens.fontHeading}
      data-radius={tokens.radius}
      data-style={tokens.style}
      style={gaya}
    >
      <div className="template-preview-browser" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="template-preview-head">
        <span className="template-preview-brand">
          <b aria-hidden="true">◇</b>
          <span>
            <strong>Desa Contoh</strong>
            <small>Kabupaten Nusantara</small>
          </span>
        </span>
        <nav aria-label={`Pratinjau navigasi ${name}`}>
          <span>Beranda</span>
          <span>Profil</span>
          <span>Layanan</span>
          <span>Berita</span>
        </nav>
        <span className="template-preview-search" aria-hidden="true">
          ⌕
        </span>
      </div>

      <div className="template-preview-hero">
        <div>
          <small>PORTAL RESMI DESA</small>
          <strong>Desa yang tumbuh, warga yang dilayani.</strong>
          <span>Informasi, layanan, dan kabar desa dalam satu tempat.</span>
          <i>Jelajahi desa</i>
        </div>
        <div className="template-preview-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="template-preview-stats" aria-hidden="true">
        <span>
          <strong>—</strong>
          <small>Penduduk</small>
        </span>
        <span>
          <strong>—</strong>
          <small>Keluarga</small>
        </span>
        <span>
          <strong>—</strong>
          <small>Dusun</small>
        </span>
        <span>
          <strong>—</strong>
          <small>Layanan</small>
        </span>
      </div>

      {!compact ? (
        <div className="template-preview-cards" aria-hidden="true">
          <span>
            <i>▤</i>
            <strong>Layanan mandiri</strong>
            <small>Ajukan kebutuhan administrasi.</small>
          </span>
          <span>
            <i>▧</i>
            <strong>Berita desa</strong>
            <small>Kabar terbaru dari pemerintah desa.</small>
          </span>
          <span>
            <i>⌂</i>
            <strong>Profil desa</strong>
            <small>Sejarah, visi, dan potensi desa.</small>
          </span>
        </div>
      ) : null}
    </div>
  );
}
