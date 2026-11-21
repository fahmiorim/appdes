"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

import {
  KATEGORI_TEMPLATE,
  LABEL_KATEGORI_TEMPLATE,
  LABEL_STATUS_TEMPLATE,
  type KategoriTemplate,
  type StatusTemplate,
  type TokenTemplate,
} from "@/features/multi-desa/domain/template-website";

import { TemplateThumb } from "./template-preview";

export interface TemplateKatalogItem {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  version: string;
  status: StatusTemplate;
  tokens: TokenTemplate;
  tags: string[];
  jumlahTenant: number;
  jumlahTertinggal: number;
  updatedAt: Date;
}

const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });

function labelKategori(value: string): string {
  return KATEGORI_TEMPLATE.includes(value as KategoriTemplate)
    ? LABEL_KATEGORI_TEMPLATE[value as KategoriTemplate]
    : value;
}

export function KatalogTemplate({ templates }: { templates: TemplateKatalogItem[] }) {
  const [query, setQuery] = useState("");
  const [kategori, setKategori] = useState("semua");
  const [status, setStatus] = useState("semua");
  const [tampilan, setTampilan] = useState<"grid" | "list">("grid");
  const queryTertunda = useDeferredValue(query.trim().toLowerCase());

  const hasil = templates.filter((item) => {
    const cocokQuery =
      queryTertunda === "" ||
      item.name.toLowerCase().includes(queryTertunda) ||
      item.slug.includes(queryTertunda) ||
      item.tags.some((tag) => tag.toLowerCase().includes(queryTertunda));
    const cocokKategori = kategori === "semua" || item.category === kategori;
    const cocokStatus = status === "semua" || item.status === status;
    return cocokQuery && cocokKategori && cocokStatus;
  });

  return (
    <>
      <div className="template-toolbar">
        <label className="template-search">
          <span className="sr-only">Cari template</span>
          <span aria-hidden="true">⌕</span>
          <input
            className="form-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama, slug, atau tag..."
            type="search"
            value={query}
          />
        </label>
        <label>
          <span className="sr-only">Filter kategori</span>
          <select
            className="form-input"
            onChange={(event) => setKategori(event.target.value)}
            value={kategori}
          >
            <option value="semua">Semua kategori</option>
            {KATEGORI_TEMPLATE.map((item) => (
              <option key={item} value={item}>
                {LABEL_KATEGORI_TEMPLATE[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter status</span>
          <select
            className="form-input"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="semua">Semua status</option>
            {(["published", "draft", "archived"] as const).map((item) => (
              <option key={item} value={item}>
                {LABEL_STATUS_TEMPLATE[item]}
              </option>
            ))}
          </select>
        </label>
        <div aria-label="Pilih tampilan katalog" className="template-view-toggle" role="group">
          <button
            aria-pressed={tampilan === "grid"}
            className="button button-secondary"
            onClick={() => setTampilan("grid")}
            type="button"
          >
            ▦
          </button>
          <button
            aria-pressed={tampilan === "list"}
            className="button button-secondary"
            onClick={() => setTampilan("list")}
            type="button"
          >
            ☷
          </button>
        </div>
      </div>

      {hasil.length > 0 ? (
        <div className={tampilan === "grid" ? "template-catalog-grid" : "template-catalog-list"}>
          {hasil.map((item) => (
            <article className="template-card" key={item.id}>
              <TemplateThumb
                category={labelKategori(item.category)}
                name={item.name}
                tokens={item.tokens}
              />
              <div className="template-card-body">
                <div className="template-card-top">
                  <span className={`template-status is-${item.status}`}>
                    {LABEL_STATUS_TEMPLATE[item.status]}
                  </span>
                  <span className="template-version">v{item.version}</span>
                </div>
                <div>
                  <h2>
                    <Link href={`/super-admin/template/${item.id}`}>{item.name}</Link>
                  </h2>
                  <p>{item.description}</p>
                </div>
                <div className="template-tags">
                  <span>{labelKategori(item.category)}</span>
                  {item.tags.slice(0, 3).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="template-card-meta">
                  <span>
                    <strong>{item.jumlahTenant}</strong> desa
                  </span>
                  {item.jumlahTertinggal > 0 ? (
                    <span className="is-warning">{item.jumlahTertinggal} perlu pembaruan</span>
                  ) : (
                    <span>Diperbarui {tanggal.format(new Date(item.updatedAt))}</span>
                  )}
                </div>
                <div className="template-card-actions">
                  <Link
                    className="button button-secondary"
                    href={`/super-admin/template/${item.id}`}
                  >
                    Detail
                  </Link>
                  <Link
                    className="button button-secondary"
                    href={`/super-admin/template/penggunaan?template=${item.id}`}
                  >
                    Penggunaan
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="template-empty">
          <strong>Template tidak ditemukan</strong>
          <p>Ubah kata kunci atau filter, lalu coba lagi.</p>
        </div>
      )}

      <p className="template-result-count">
        Menampilkan {hasil.length} dari {templates.length} template.
      </p>
    </>
  );
}
