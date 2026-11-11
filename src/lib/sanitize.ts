import sanitizeHtml from "sanitize-html";

/**
 * Sanitasi HTML konten (berita, halaman statis, widget).
 *
 * Konten editor warga/operator diperlakukan **tidak terpercaya**: dibersihkan
 * saat disimpan (di action) **dan** saat dirender (di halaman publik). Dua
 * lapis ini penting karena data lama atau impor bisa saja belum tersanitasi.
 *
 * Kebijakan: hanya tag formatting & struktur dasar yang diizinkan; seluruh
 * atribut `on*`, `style`, `srcdoc`, serta URI `javascript:`/`data:` dibuang.
 * Gambar hanya boleh memakai URL dari skema http/https (termasuk media lokal
 * yang disajikan route `/api/publik/media/...`).
 */

const IZIN_TAG = [
  "p",
  "br",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "sub",
  "sup",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "div",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "img",
  "a",
  "code",
  "pre",
];

export interface OpsiSanitasi {
  /** Bolehkan tag gambar? Nonaktifkan bila konten tidak butuh gambar. */
  gambar?: boolean;
}

/** Bersihkan HTML dari skrip, event handler, dan URI berbahaya. */
export function sanitasiHtml(html: string, opsi: OpsiSanitasi = {}): string {
  const izinTag = opsi.gambar === false ? IZIN_TAG.filter((tag) => tag !== "img") : IZIN_TAG;

  return sanitizeHtml(html, {
    allowedTags: izinTag,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
      "*": [],
    },
    // Hanya skema aman yang diizinkan pada tautan & gambar.
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["http", "https"],
      a: ["http", "https", "mailto", "tel"],
    },
    // Buang tag tak dikenal beserta isinya untuk script/style (agar kode
    // tidak bocor sebagai teks), tetapi pertahankan isi tag inline lain.
    disallowedTagsMode: "discard",
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}

/** Bersihkan HTML menjadi teks polos (untuk ringkasan/meta description). */
export function teksPolos(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, " ").trim();
}
