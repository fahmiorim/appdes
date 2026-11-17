"use client";

import { useActionState, useId, useMemo, useState } from "react";

import type { StatusRetensi } from "@/features/multi-desa/domain/lifecycle-tenant";
import type { HasilEkspor } from "@/features/multi-desa/infrastructure/lifecycle-tenant-repository";
import { createIdleActionState, type ActionState } from "@/lib/action-state";

/**
 * Konsol pengelolaan tenant Super Admin.
 *
 * Server Action diterima lewat prop dari halaman (bukan diimpor dari folder
 * route) agar lapisan presentation tidak bergantung pada `app/`. Setiap form
 * memakai `useActionState` sendiri sehingga kegagalan satu aksi tidak
 * mengosongkan form lain, dan pesan galat berasal dari use case di server.
 */

export interface DesaKonsolRow {
  id: number;
  name: string | null;
  slug: string | null;
  code: string | null;
  domain: string | null;
  active: boolean;
  kuotaMediaMb: number | null;
  pengguna: number;
  penduduk: number;
  jenisSurat: number;
  createdAt: Date;
  nonaktifSejak: Date | null;
  purgedAt: Date | null;
  adaEksporBerlaku: boolean;
  statusRetensi: StatusRetensi;
  hariMenujuPurge: number | null;
}

export interface DomainKonsolRow {
  id: number;
  villageId: number;
  domain: string;
  isPrimary: boolean;
}

interface AksiKonsol {
  buat: (
    state: ActionState<{ id: number }>,
    formData: FormData,
  ) => Promise<ActionState<{ id: number }>>;
  status: (
    state: ActionState<{ active: boolean }>,
    formData: FormData,
  ) => Promise<ActionState<{ active: boolean }>>;
  kuota: (
    state: ActionState<{ kuotaMediaMb: number | null }>,
    formData: FormData,
  ) => Promise<ActionState<{ kuotaMediaMb: number | null }>>;
  reset: (
    state: ActionState<{ username: string | null; email: string; sandiSementara: string }>,
    formData: FormData,
  ) => Promise<ActionState<{ username: string | null; email: string; sandiSementara: string }>>;
  ekspor: (
    state: ActionState<HasilEkspor>,
    formData: FormData,
  ) => Promise<ActionState<HasilEkspor>>;
  purge: (
    state: ActionState<{
      jumlahBarisDihapus: number;
      tabelDiproses: number;
      mediaDihapus: boolean;
    }>,
    formData: FormData,
  ) => Promise<
    ActionState<{ jumlahBarisDihapus: number; tabelDiproses: number; mediaDihapus: boolean }>
  >;
  tambahDomain: (
    state: ActionState<{ id: number }>,
    formData: FormData,
  ) => Promise<ActionState<{ id: number }>>;
  hapusDomain: (state: ActionState<null>, formData: FormData) => Promise<ActionState<null>>;
  jadikanUtama: (state: ActionState<null>, formData: FormData) => Promise<ActionState<null>>;
}

type StatusFilter = "semua" | "aktif" | "nonaktif" | "siap-purge";

const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
const angka = new Intl.NumberFormat("id-ID");

const LABEL_RETENSI: Record<StatusRetensi, string> = {
  aktif: "—",
  "masa-tenggang": "Masa tenggang",
  "siap-purge": "Siap purge",
  "sudah-purge": "Sudah di-purge",
};

function Pesan({ state }: { state: ActionState<unknown> }) {
  if (state.status === "idle") return null;

  const error = state.status === "error";
  return (
    <p
      className={error ? "alert alert-error" : "alert alert-info"}
      role={error ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}

function GalatField({ pesan }: { pesan?: string }) {
  if (!pesan) return null;
  return (
    <span className="form-help" role="alert">
      {pesan}
    </span>
  );
}

function RetensiBadge({ desa }: { desa: DesaKonsolRow }) {
  const kelas =
    desa.statusRetensi === "aktif"
      ? "tenant-status is-active"
      : desa.statusRetensi === "masa-tenggang"
        ? "tenant-status is-grace"
        : desa.statusRetensi === "siap-purge"
          ? "tenant-status is-ready"
          : "tenant-status is-purged";

  const label =
    desa.statusRetensi === "masa-tenggang" && desa.hariMenujuPurge !== null
      ? `Tenggang ${angka.format(desa.hariMenujuPurge)} hari`
      : LABEL_RETENSI[desa.statusRetensi];

  return (
    <span className={kelas}>
      <span aria-hidden="true" />
      {label}
    </span>
  );
}

function FormBuatDesa({ aksi }: { aksi: AksiKonsol["buat"] }) {
  const [state, formAction, pending] = useActionState(
    aksi,
    createIdleActionState<{ id: number }>(),
  );
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="tenant-create form-stack">
      <div>
        <h2>Daftarkan desa baru</h2>
        <p className="form-help">
          Fondasi tenant (role, modul, tema, menu publik) dibuat dari template platform, bukan dari
          desa lain. Katalog surat dan data master desa tetap diisi administrator desa.
        </p>
      </div>

      <div className="tenant-create-grid">
        <label className="form-field">
          <span className="form-label">Nama desa</span>
          <input className="form-input" name="name" required minLength={3} maxLength={100} />
          <GalatField pesan={fieldErrors.name?.[0]} />
        </label>
        <label className="form-field">
          <span className="form-label">Kode desa (10 digit)</span>
          <input
            className="form-input"
            name="code"
            required
            inputMode="numeric"
            pattern="\d{10}"
            maxLength={10}
          />
          <GalatField pesan={fieldErrors.code?.[0]} />
        </label>
        <label className="form-field">
          <span className="form-label">Domain (opsional)</span>
          <input className="form-input" name="domain" placeholder="desa-sukamaju.id" />
          <GalatField pesan={fieldErrors.domain?.[0]} />
        </label>
        <label className="form-field">
          <span className="form-label">Nama administrator</span>
          <input className="form-input" name="adminName" required minLength={3} maxLength={255} />
          <GalatField pesan={fieldErrors.adminName?.[0]} />
        </label>
        <label className="form-field">
          <span className="form-label">Username administrator</span>
          <input
            className="form-input"
            name="adminUsername"
            required
            minLength={3}
            maxLength={50}
          />
          <GalatField pesan={fieldErrors.adminUsername?.[0]} />
        </label>
        <label className="form-field">
          <span className="form-label">Email administrator</span>
          <input className="form-input" name="adminEmail" type="email" required maxLength={255} />
          <GalatField pesan={fieldErrors.adminEmail?.[0]} />
        </label>
        <label className="form-field">
          <span className="form-label">Sandi awal administrator</span>
          <input
            className="form-input"
            name="adminPassword"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
          <GalatField pesan={fieldErrors.adminPassword?.[0]} />
        </label>
        <label className="form-field">
          <span className="form-label">Kuota media (MB, kosong = tanpa batas)</span>
          <input className="form-input" name="kuotaMediaMb" type="number" min={1} step={1} />
          <GalatField pesan={fieldErrors.kuotaMediaMb?.[0]} />
        </label>
      </div>

      <Pesan state={state} />
      <div className="tenant-create-actions">
        <button className="button button-primary" type="submit" disabled={pending}>
          {pending ? "Membuat..." : "Buat desa"}
        </button>
      </div>
    </form>
  );
}

function KelolaDomain({
  desa,
  domain,
  aksi,
}: {
  desa: DesaKonsolRow;
  domain: DomainKonsolRow[];
  aksi: AksiKonsol;
}) {
  const [tambahState, tambahAction, tambahPending] = useActionState(
    aksi.tambahDomain,
    createIdleActionState<{ id: number }>(),
  );
  const [hapusState, hapusAction, hapusPending] = useActionState(
    aksi.hapusDomain,
    createIdleActionState<null>(),
  );
  const [utamaState, utamaAction, utamaPending] = useActionState(
    aksi.jadikanUtama,
    createIdleActionState<null>(),
  );

  const daftar = domain
    .filter((item) => item.villageId === desa.id)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.id - b.id);
  const sudahPurge = desa.statusRetensi === "sudah-purge";

  return (
    <section className="tenant-panel-wide">
      <h4>Domain dan alias</h4>
      <p className="form-help">
        Domain utama dipakai untuk mengenali tenant dari host. Domain pertama otomatis menjadi
        utama; alias lain hanya mengarah ke desa yang sama.
      </p>

      {daftar.length === 0 ? (
        <p className="form-help">Belum ada domain terdaftar untuk desa ini.</p>
      ) : (
        <ul className="tenant-domain-list">
          {daftar.map((item) => (
            <li key={item.id} className="tenant-domain-item">
              <span className="tenant-domain-name">{item.domain}</span>
              {item.isPrimary ? (
                <span className="tenant-status is-active">
                  <span aria-hidden="true" />
                  Utama
                </span>
              ) : (
                <span className="tenant-domain-actions">
                  <form action={utamaAction}>
                    <input type="hidden" name="villageId" value={desa.id} />
                    <input type="hidden" name="domainId" value={item.id} />
                    <button
                      className="button button-secondary tenant-expand"
                      type="submit"
                      disabled={utamaPending || sudahPurge}
                    >
                      Jadikan utama
                    </button>
                  </form>
                  <form action={hapusAction}>
                    <input type="hidden" name="villageId" value={desa.id} />
                    <input type="hidden" name="domainId" value={item.id} />
                    <button
                      className="button button-secondary tenant-expand"
                      type="submit"
                      disabled={hapusPending || sudahPurge}
                    >
                      Hapus
                    </button>
                  </form>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={tambahAction} className="tenant-inline-form">
        <input type="hidden" name="villageId" value={desa.id} />
        <label className="form-field">
          <span className="form-label">Tambah domain atau alias</span>
          <input
            className="form-input"
            name="domain"
            required
            maxLength={255}
            autoComplete="off"
            placeholder="desa-sukamaju.id"
            disabled={sudahPurge}
          />
        </label>
        <button
          className="button button-secondary"
          type="submit"
          disabled={tambahPending || sudahPurge}
        >
          {tambahPending ? "Menambah..." : "Tambah domain"}
        </button>
      </form>
      <Pesan state={tambahState} />
      <Pesan state={hapusState} />
      <Pesan state={utamaState} />
    </section>
  );
}

function PanelKelola({
  desa,
  domain,
  aksi,
}: {
  desa: DesaKonsolRow;
  domain: DomainKonsolRow[];
  aksi: AksiKonsol;
}) {
  const id = useId();
  const [statusState, statusAction, statusPending] = useActionState(
    aksi.status,
    createIdleActionState<{ active: boolean }>(),
  );
  const [kuotaState, kuotaAction, kuotaPending] = useActionState(
    aksi.kuota,
    createIdleActionState<{ kuotaMediaMb: number | null }>(),
  );
  const [resetState, resetAction, resetPending] = useActionState(
    aksi.reset,
    createIdleActionState<{ username: string | null; email: string; sandiSementara: string }>(),
  );
  const [eksporState, eksporAction, eksporPending] = useActionState(
    aksi.ekspor,
    createIdleActionState<HasilEkspor>(),
  );
  const [purgeState, purgeAction, purgePending] = useActionState(
    aksi.purge,
    createIdleActionState<{
      jumlahBarisDihapus: number;
      tabelDiproses: number;
      mediaDihapus: boolean;
    }>(),
  );

  const sudahPurge = desa.statusRetensi === "sudah-purge";
  const bolehPurge = desa.statusRetensi === "siap-purge" && desa.adaEksporBerlaku;

  return (
    <div className="tenant-panel">
      <div className="tenant-panel-grid">
        <section>
          <h4>Status dan akses</h4>
          <form action={statusAction} className="tenant-inline-form">
            <input type="hidden" name="villageId" value={desa.id} />
            <input type="hidden" name="active" value={desa.active ? "false" : "true"} />
            <button
              className="button button-secondary"
              type="submit"
              disabled={statusPending || sudahPurge}
            >
              {desa.active ? "Nonaktifkan desa" : "Aktifkan desa"}
            </button>
            <span className="form-help">
              {desa.active
                ? "Menonaktifkan memulai masa tenggang retensi 90 hari."
                : desa.nonaktifSejak
                  ? `Nonaktif sejak ${tanggal.format(new Date(desa.nonaktifSejak))}.`
                  : "Desa sedang nonaktif."}
            </span>
          </form>
          <Pesan state={statusState} />

          <form action={resetAction} className="tenant-inline-form">
            <input type="hidden" name="villageId" value={desa.id} />
            <button
              className="button button-secondary"
              type="submit"
              disabled={resetPending || sudahPurge}
            >
              {resetPending ? "Mereset..." : "Reset akses admin"}
            </button>
            <span className="form-help">Sandi sementara ditampilkan sekali setelah reset.</span>
          </form>
          <Pesan state={resetState} />
          {resetState.status === "success" ? (
            <p className="tenant-secret" aria-live="polite">
              Sandi sementara untuk{" "}
              <strong>{resetState.data.username ?? resetState.data.email}</strong>:{" "}
              <code>{resetState.data.sandiSementara}</code>
            </p>
          ) : null}
        </section>

        <KelolaDomain desa={desa} domain={domain} aksi={aksi} />

        <section>
          <h4>Kuota media</h4>
          <form action={kuotaAction} className="tenant-inline-form">
            <input type="hidden" name="villageId" value={desa.id} />
            <label className="form-field" htmlFor={`${id}-kuota`}>
              <span className="form-label">Kuota (MB)</span>
              <input
                id={`${id}-kuota`}
                className="form-input"
                name="kuotaMediaMb"
                type="number"
                min={1}
                step={1}
                defaultValue={desa.kuotaMediaMb ?? ""}
                placeholder="Tanpa batas"
                disabled={sudahPurge}
              />
            </label>
            <button className="button button-secondary" type="submit" disabled={kuotaPending}>
              {kuotaPending ? "Menyimpan..." : "Simpan kuota"}
            </button>
          </form>
          <Pesan state={kuotaState} />
        </section>

        <section>
          <h4>Ekspor data</h4>
          <p className="form-help">
            Ekspor wajib dibuat sebelum purge. Berkas berlaku 30 hari dan disimpan di luar database.
          </p>
          <form action={eksporAction} className="tenant-inline-form">
            <input type="hidden" name="villageId" value={desa.id} />
            <button
              className="button button-secondary"
              type="submit"
              disabled={eksporPending || sudahPurge}
            >
              {eksporPending ? "Mengekspor..." : "Buat ekspor data"}
            </button>
          </form>
          <Pesan state={eksporState} />
          {eksporState.status === "success" ? (
            <p className="form-help">
              Berkas: <code>{eksporState.data.berkas}</code> ·{" "}
              {angka.format(eksporState.data.ukuranByte)} byte · berlaku sampai{" "}
              {tanggal.format(new Date(eksporState.data.kedaluwarsaPada))}
            </p>
          ) : null}
        </section>

        <section>
          <h4>Purge permanen</h4>
          <p className="form-help">
            Menghapus seluruh data desa dan media. Yang tersisa hanya tombstone desa/domain,
            statistik agregat, catatan ekspor, dan audit log. Tindakan ini tidak dapat dibatalkan.
          </p>
          {sudahPurge ? (
            <p className="alert alert-info" role="status">
              Data desa ini sudah di-purge
              {desa.purgedAt ? ` pada ${tanggal.format(new Date(desa.purgedAt))}` : ""}.
            </p>
          ) : bolehPurge ? (
            <form action={purgeAction} className="tenant-inline-form">
              <input type="hidden" name="villageId" value={desa.id} />
              <label className="form-field">
                <span className="form-label">Ketik slug desa: {desa.slug}</span>
                <input
                  className="form-input"
                  name="konfirmasi"
                  required
                  autoComplete="off"
                  placeholder={desa.slug ?? ""}
                />
              </label>
              <button className="button tenant-danger" type="submit" disabled={purgePending}>
                {purgePending ? "Mem-purge..." : "Purge data desa"}
              </button>
            </form>
          ) : (
            <p className="form-help">
              {!desa.active && !desa.adaEksporBerlaku
                ? "Buat ekspor data yang berlaku lebih dulu."
                : desa.active
                  ? "Nonaktifkan desa dan tunggu masa tenggang 90 hari."
                  : `Purge dapat dijalankan setelah masa tenggang selesai${
                      desa.hariMenujuPurge !== null
                        ? ` (${angka.format(desa.hariMenujuPurge)} hari lagi)`
                        : ""
                    }.`}
            </p>
          )}
          <Pesan state={purgeState} />
        </section>
      </div>
    </div>
  );
}

export function TenantConsole({
  desa,
  domain,
  aksi,
}: {
  desa: DesaKonsolRow[];
  domain: DomainKonsolRow[];
  aksi: AksiKonsol;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("semua");
  const [terbuka, setTerbuka] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");

    return desa.filter((item) => {
      const cocokStatus =
        status === "semua" ||
        (status === "aktif" && item.active && item.statusRetensi !== "sudah-purge") ||
        (status === "nonaktif" && !item.active && item.statusRetensi !== "sudah-purge") ||
        (status === "siap-purge" && item.statusRetensi === "siap-purge");
      const searchable = [item.name, item.code, item.domain, item.slug]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("id-ID");

      return cocokStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [desa, query, status]);

  return (
    <>
      <FormBuatDesa aksi={aksi.buat} />

      <div className="tenant-toolbar">
        <label className="tenant-search">
          <span className="sr-only">Cari nama desa, kode, slug, atau domain</span>
          <input
            className="form-input"
            type="search"
            placeholder="Cari nama desa, kode, slug, atau domain..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="tenant-filter">
          <span className="sr-only">Filter status desa</span>
          <select
            className="form-input"
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
          >
            <option value="semua">Semua status</option>
            <option value="aktif">Aktif</option>
            <option value="nonaktif">Nonaktif</option>
            <option value="siap-purge">Siap purge</option>
          </select>
        </label>
        <span className="tenant-result-count">
          Menampilkan {angka.format(filtered.length)} dari {angka.format(desa.length)} desa
        </span>
      </div>

      <div className="tenant-table-scroll">
        <table className="tenant-table">
          <thead>
            <tr>
              <th scope="col">Desa</th>
              <th scope="col">Domain</th>
              <th scope="col">Pengguna</th>
              <th scope="col">Penduduk</th>
              <th scope="col">Jenis surat</th>
              <th scope="col">Terdaftar</th>
              <th scope="col">Status</th>
              <th scope="col">Retensi</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <TrTenant
                  key={item.id}
                  desa={item}
                  domain={domain}
                  aksi={aksi}
                  terbuka={terbuka === item.id}
                  onToggle={() =>
                    setTerbuka((sebelumnya) => (sebelumnya === item.id ? null : item.id))
                  }
                />
              ))
            ) : (
              <tr>
                <td className="tenant-empty" colSpan={9}>
                  {desa.length === 0
                    ? "Belum ada tenant desa yang terdaftar."
                    : "Tidak ada desa yang sesuai dengan pencarian atau filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TrTenant({
  desa,
  domain,
  aksi,
  terbuka,
  onToggle,
}: {
  desa: DesaKonsolRow;
  domain: DomainKonsolRow[];
  aksi: AksiKonsol;
  terbuka: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr>
        <td>
          <strong>{desa.name || "Tanpa nama"}</strong>
          <span className="tenant-secondary">
            Kode: {desa.code || "—"}
            {desa.slug ? ` · Slug: ${desa.slug}` : ""}
          </span>
        </td>
        <td>{desa.domain || <span className="tenant-secondary">Belum diatur</span>}</td>
        <td>{angka.format(desa.pengguna)}</td>
        <td>{angka.format(desa.penduduk)}</td>
        <td>{angka.format(desa.jenisSurat)}</td>
        <td>{tanggal.format(new Date(desa.createdAt))}</td>
        <td>
          <span className={desa.active ? "tenant-status is-active" : "tenant-status is-inactive"}>
            <span aria-hidden="true" />
            {desa.active ? "Aktif" : "Nonaktif"}
          </span>
        </td>
        <td>
          <RetensiBadge desa={desa} />
        </td>
        <td>
          <button
            className="button button-secondary tenant-expand"
            type="button"
            aria-expanded={terbuka}
            onClick={onToggle}
          >
            {terbuka ? "Tutup" : "Kelola"}
          </button>
        </td>
      </tr>
      {terbuka ? (
        <tr className="tenant-panel-row">
          <td colSpan={9}>
            <PanelKelola desa={desa} domain={domain} aksi={aksi} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
