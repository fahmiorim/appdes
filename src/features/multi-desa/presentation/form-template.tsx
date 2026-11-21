"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import {
  KATEGORI_TEMPLATE,
  LABEL_KATEGORI_TEMPLATE,
  type KategoriTemplate,
  type TokenTemplate,
} from "@/features/multi-desa/domain/template-website";
import { createIdleActionState, type ActionState } from "@/lib/action-state";

import { GalatField } from "./dialog-bagian";
import { TemplatePreview } from "./template-preview";

export interface HasilFormTemplate {
  id: number;
  versiBaru: boolean;
}

export interface IsianTemplate {
  id?: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  version: string;
  tags: string[];
  tokens: TokenTemplate;
}

type AksiFormTemplate = (
  state: ActionState<HasilFormTemplate>,
  formData: FormData,
) => Promise<ActionState<HasilFormTemplate>>;

const AWAL: IsianTemplate = {
  name: "",
  slug: "",
  category: "umum",
  description: "",
  version: "1.0.0",
  tags: [],
  tokens: {
    primary: "#2563eb",
    secondary: "#1e40af",
    accent: "#f59e0b",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    fontHeading: "sans",
    radius: "sedang",
    style: "terang",
  },
};

export function FormTemplate({
  aksi,
  awal = AWAL,
  mode,
}: {
  aksi: AksiFormTemplate;
  awal?: IsianTemplate;
  mode: "baru" | "ubah";
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    aksi,
    createIdleActionState<HasilFormTemplate>(),
  );
  const [name, setName] = useState(awal.name);
  const [slug, setSlug] = useState(awal.slug);
  const [category, setCategory] = useState(awal.category);
  const [description, setDescription] = useState(awal.description);
  const [version, setVersion] = useState(awal.version);
  const [tags, setTags] = useState(awal.tags.join(", "));
  const [tokens, setTokens] = useState<TokenTemplate>(awal.tokens);
  const [changelog, setChangelog] = useState("");
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  useEffect(() => {
    if (state.status !== "success") return;
    if (mode === "baru") {
      router.push(`/super-admin/template/${state.data.id}`);
      return;
    }
    router.refresh();
  }, [mode, router, state]);

  function ubahToken<K extends keyof TokenTemplate>(kunci: K, nilai: TokenTemplate[K]) {
    setTokens((sebelum) => ({ ...sebelum, [kunci]: nilai }));
  }

  return (
    <form action={formAction} className="template-form">
      <input name="id" type="hidden" value={awal.id ?? ""} />

      <div className="template-form-main">
        <section className="platform-card">
          <div className="platform-card-head">
            <div>
              <h2>1. Informasi dasar</h2>
              <p>Identitas template yang tampil di katalog dan dipilih operator.</p>
            </div>
          </div>
          <div className="platform-card-body form-stack">
            <div className="platform-form-grid">
              <label className="form-field">
                <span className="form-label">Nama template</span>
                <input
                  className="form-input"
                  maxLength={100}
                  name="name"
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
                <GalatField pesan={fieldErrors.name?.[0]} />
              </label>
              <label className="form-field">
                <span className="form-label">Slug</span>
                <input
                  aria-readonly={mode === "ubah"}
                  className="form-input"
                  maxLength={50}
                  name="slug"
                  onChange={(event) => setSlug(event.target.value)}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  readOnly={mode === "ubah"}
                  required
                  value={slug}
                />
                <span className="form-help">
                  {mode === "ubah"
                    ? "Slug dikunci agar tema tenant tidak kehilangan kaitan."
                    : "Huruf kecil, angka, dan tanda hubung. Contoh: desa-modern."}
                </span>
                <GalatField pesan={fieldErrors.slug?.[0]} />
              </label>
              <label className="form-field">
                <span className="form-label">Kategori</span>
                <select
                  className="form-input"
                  name="category"
                  onChange={(event) => setCategory(event.target.value)}
                  value={category}
                >
                  {KATEGORI_TEMPLATE.map((item) => (
                    <option key={item} value={item}>
                      {LABEL_KATEGORI_TEMPLATE[item]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Versi</span>
                <input
                  className="form-input"
                  maxLength={20}
                  name="version"
                  onChange={(event) => setVersion(event.target.value)}
                  pattern="[0-9]+\.[0-9]+\.[0-9]+"
                  required
                  value={version}
                />
                <GalatField pesan={fieldErrors.version?.[0]} />
              </label>
            </div>

            <label className="form-field">
              <span className="form-label">Deskripsi</span>
              <textarea
                className="form-input"
                maxLength={600}
                name="description"
                onChange={(event) => setDescription(event.target.value)}
                required
                rows={4}
                value={description}
              />
              <span className="form-help">{description.length}/600 karakter</span>
              <GalatField pesan={fieldErrors.description?.[0]} />
            </label>

            <label className="form-field">
              <span className="form-label">Tag</span>
              <input
                className="form-input"
                maxLength={200}
                name="tags"
                onChange={(event) => setTags(event.target.value)}
                placeholder="pedesaan, hijau, layanan"
                value={tags}
              />
              <span className="form-help">Pisahkan dengan koma, maksimal enam tag.</span>
              <GalatField pesan={fieldErrors.tags?.[0]} />
            </label>

            {mode === "ubah" ? (
              <label className="form-field">
                <span className="form-label">Catatan perubahan versi</span>
                <textarea
                  className="form-input"
                  maxLength={500}
                  name="changelog"
                  onChange={(event) => setChangelog(event.target.value)}
                  placeholder="Wajib diisi bila nomor versi dinaikkan."
                  rows={2}
                  value={changelog}
                />
                <GalatField pesan={fieldErrors.changelog?.[0]} />
              </label>
            ) : null}
          </div>
        </section>

        <section className="platform-card">
          <div className="platform-card-head">
            <div>
              <h2>2. Token tampilan</h2>
              <p>Nilai ini dipakai untuk pratinjau dan menjadi metadata tema tenant.</p>
            </div>
          </div>
          <div className="platform-card-body form-stack">
            <div className="template-color-grid">
              {(
                [
                  ["primary", "Warna utama"],
                  ["secondary", "Warna sekunder"],
                  ["accent", "Warna aksen"],
                  ["background", "Latar halaman"],
                  ["surface", "Permukaan kartu"],
                  ["text", "Teks utama"],
                ] as const
              ).map(([kunci, label]) => (
                <label className="form-field" key={kunci}>
                  <span className="form-label">{label}</span>
                  <span className="template-color-field">
                    <input
                      aria-label={label}
                      onChange={(event) => ubahToken(kunci, event.target.value)}
                      type="color"
                      value={tokens[kunci]}
                    />
                    <input
                      className="form-input"
                      maxLength={7}
                      name={kunci}
                      onChange={(event) => ubahToken(kunci, event.target.value)}
                      pattern="#[0-9a-fA-F]{6}"
                      required
                      value={tokens[kunci]}
                    />
                  </span>
                  <GalatField pesan={fieldErrors[`tokens.${kunci}`]?.[0]} />
                </label>
              ))}
            </div>

            <div className="platform-form-grid">
              <label className="form-field">
                <span className="form-label">Font judul</span>
                <select
                  className="form-input"
                  name="fontHeading"
                  onChange={(event) =>
                    ubahToken("fontHeading", event.target.value as TokenTemplate["fontHeading"])
                  }
                  value={tokens.fontHeading}
                >
                  <option value="sans">Sans (modern)</option>
                  <option value="serif">Serif (klasik)</option>
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Sudut kartu</span>
                <select
                  className="form-input"
                  name="radius"
                  onChange={(event) =>
                    ubahToken("radius", event.target.value as TokenTemplate["radius"])
                  }
                  value={tokens.radius}
                >
                  <option value="kecil">Kecil</option>
                  <option value="sedang">Sedang</option>
                  <option value="besar">Besar</option>
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Nuansa</span>
                <select
                  className="form-input"
                  name="style"
                  onChange={(event) =>
                    ubahToken("style", event.target.value as TokenTemplate["style"])
                  }
                  value={tokens.style}
                >
                  <option value="terang">Terang</option>
                  <option value="gelap">Gelap</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="platform-card">
          <div className="platform-card-head">
            <div>
              <h2>3. Pratinjau dan simpan</h2>
              <p>Pratinjau komposisi, bukan tangkapan layar situs tenant.</p>
            </div>
          </div>
          <div className="platform-card-body">
            <TemplatePreview name={name || "Template baru"} tokens={tokens} />
          </div>
        </section>
      </div>

      <aside className="template-form-aside">
        <section className="platform-card">
          <div className="platform-card-head">
            <div>
              <h2>Ringkasan</h2>
              <p>Periksa kembali sebelum menyimpan.</p>
            </div>
          </div>
          <div className="platform-card-body template-summary">
            <div>
              <span>Nama</span>
              <strong>{name || "Belum diisi"}</strong>
            </div>
            <div>
              <span>Slug</span>
              <strong>{slug || "Belum diisi"}</strong>
            </div>
            <div>
              <span>Kategori</span>
              <strong>
                {LABEL_KATEGORI_TEMPLATE[category as KategoriTemplate] ?? "Belum dipilih"}
              </strong>
            </div>
            <div>
              <span>Versi</span>
              <strong>{version || "Belum diisi"}</strong>
            </div>
            <p className="form-help">
              Template baru disimpan sebagai draf. Terbitkan dari halaman detail setelah konfigurasi
              diperiksa.
            </p>
            {mode === "ubah" && state.status === "success" ? (
              <p className="alert alert-info" role="status">
                {state.message}
              </p>
            ) : null}
            {state.status === "error" ? (
              <p className="alert alert-error" role="alert">
                {state.message}
              </p>
            ) : null}
            <button className="button button-primary" disabled={pending} type="submit">
              {pending
                ? "Menyimpan..."
                : mode === "baru"
                  ? "Simpan sebagai draf"
                  : "Simpan perubahan"}
            </button>
          </div>
        </section>

        <section className="platform-card template-info-card">
          <div className="platform-card-head">
            <div>
              <h2>Batas aman</h2>
            </div>
          </div>
          <div className="platform-card-body">
            <p>
              Konsol ini tidak menerima unggahan ZIP, HTML, atau JavaScript. Template hanya
              menyimpan metadata dan token tampilan yang tervalidasi.
            </p>
            <p>
              Penerapan token ke situs publik masih mengikuti komponen aplikasi; perubahan token
              belum otomatis mengubah rendering halaman publik.
            </p>
          </div>
        </section>
      </aside>
    </form>
  );
}
