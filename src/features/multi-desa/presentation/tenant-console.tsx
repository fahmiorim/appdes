"use client";

import { usePathname, useRouter } from "next/navigation";
import { useActionState, useId, useMemo, useState } from "react";

import type { StatusRetensi } from "@/features/multi-desa/domain/lifecycle-tenant";
import {
  cocokStatusTenant,
  STATUS_TENANT_FILTER,
  type StatusTenantFilter,
} from "@/features/multi-desa/domain/status-tenant-filter";
import type { HasilEkspor } from "@/features/multi-desa/infrastructure/lifecycle-tenant-repository";
import { createIdleActionState, type ActionState } from "@/lib/action-state";

import { DialogFormTenant } from "./dialog-form-tenant";

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
  district: string | null;
  active: boolean;
  kuotaMediaMb: number | null;
  tema: string | null;
  temaNama: string | null;
  temaVersi: string | null;
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

const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
const angka = new Intl.NumberFormat("id-ID");

const LABEL_RETENSI: Record<StatusRetensi, string> = {
  aktif: "—",
  "masa-tenggang": "Masa tenggang",
  "siap-purge": "Siap purge",
  "sudah-purge": "Sudah di-purge",
};

/** Nomor halaman ringkas: selalu tampilkan ujung dan sekitar halaman aktif. */
function nomorHalaman(aktif: number, total: number): (number | "elipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const nomor = [...new Set([1, total, aktif - 1, aktif, aktif + 1])]
    .filter((item) => item >= 1 && item <= total)
    .sort((a, b) => a - b);
  const hasil: (number | "elipsis")[] = [];

  for (const item of nomor) {
    const sebelumnya = hasil[hasil.length - 1];
    if (typeof sebelumnya === "number" && item - sebelumnya > 1) hasil.push("elipsis");
    hasil.push(item);
  }

  return hasil;
}

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

function KelolaDomain({
  desa,
  domain,
  aksi,
}: {
  desa: DesaKonsolRow;
  domain: DomainKonsolRow[];
  aksi: AksiKonsol;
}) {
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
        Domain utama dipakai untuk mengenali tenant dari host dan tidak dapat dihapus langsung.
        Untuk menggantinya: tambahkan domain baru, klik <strong>Ganti domain utama</strong> pada
        domain tersebut, lalu hapus domain lama yang sudah menjadi alias. Alias lain hanya mengarah
        ke desa yang sama.
      </p>

      {daftar.length === 0 ? (
        <p className="form-help">Belum ada domain terdaftar untuk desa ini.</p>
      ) : (
        <ul className="tenant-domain-list">
          {daftar.map((item) => (
            <li key={item.id} className="tenant-domain-item">
              <span className="tenant-domain-name">{item.domain}</span>
              {item.isPrimary ? (
                <span className="tenant-domain-actions">
                  <span className="tenant-status is-active">
                    <span aria-hidden="true" />
                    Utama
                  </span>
                  <span className="form-help">Host aktif desa ini</span>
                </span>
              ) : (
                <span className="tenant-domain-actions">
                  <form action={utamaAction}>
                    <input type="hidden" name="villageId" value={desa.id} />
                    <input type="hidden" name="domainId" value={item.id} />
                    <button
                      aria-label={`Ganti domain utama ke ${item.domain}`}
                      className="button button-secondary tenant-expand"
                      type="submit"
                      disabled={utamaPending || sudahPurge}
                    >
                      Ganti domain utama
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

      {daftar.length === 1 && !sudahPurge ? (
        <p className="form-help">
          Desa ini baru memiliki satu domain. Tambahkan domain pengganti lebih dulu untuk bisa
          memindahkan status utama tanpa menghapus domain yang sekarang.
        </p>
      ) : null}

      <div className="tenant-panel-actions">
        <DialogFormTenant
          aksi={aksi.tambahDomain}
          deskripsi="Domain baru langsung mengarah ke desa ini. Domain pertama otomatis menjadi utama."
          judul="Tambah domain atau alias"
          labelPending="Menambah..."
          labelPemicu="Tambah domain"
          labelSubmit="Tambah domain"
          nonaktif={sudahPurge}
          stateAwal={createIdleActionState<{ id: number }>()}
        >
          <input type="hidden" name="villageId" value={desa.id} />
          <label className="form-field">
            <span className="form-label">Domain atau alias</span>
            <input
              className="form-input"
              name="domain"
              required
              maxLength={255}
              autoComplete="off"
              placeholder="desa-sukamaju.id"
            />
          </label>
        </DialogFormTenant>
        <span className="form-help">
          {sudahPurge
            ? "Data desa sudah di-purge; domain hanya dapat dibaca."
            : "Gunakan host tanpa protokol, misalnya desa-sukamaju.id."}
        </span>
      </div>
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
  const [resetState, resetAction, resetPending] = useActionState(
    aksi.reset,
    createIdleActionState<{ username: string | null; email: string; sandiSementara: string }>(),
  );
  const [eksporState, eksporAction, eksporPending] = useActionState(
    aksi.ekspor,
    createIdleActionState<HasilEkspor>(),
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
          <div className="tenant-panel-actions">
            <DialogFormTenant
              aksi={aksi.kuota}
              deskripsi="Batas penyimpanan media desa. Kosongkan untuk tanpa batas."
              judul="Kuota media"
              labelPending="Menyimpan..."
              labelPemicu="Ubah kuota"
              labelSubmit="Simpan kuota"
              nonaktif={sudahPurge}
              stateAwal={createIdleActionState<{ kuotaMediaMb: number | null }>()}
            >
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
                />
              </label>
            </DialogFormTenant>
            <span className="form-help">
              {desa.kuotaMediaMb === null
                ? "Saat ini tanpa batas."
                : `Saat ini ${angka.format(desa.kuotaMediaMb)} MB.`}
            </span>
          </div>
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
            <DialogFormTenant
              aksi={aksi.purge}
              deskripsi={
                <>
                  Data desa, pengguna, penduduk, dan media akan dihapus permanen. Tindakan ini tidak
                  dapat dibatalkan.
                </>
              }
              judul="Purge data desa"
              kelasPemicu="button tenant-danger"
              kelasSubmit="button tenant-danger"
              labelPending="Mem-purge..."
              labelPemicu="Purge data desa"
              labelSubmit="Purge permanen"
              pesanSukses={(data) => (
                <p className="form-help">
                  {angka.format(data.jumlahBarisDihapus)} baris pada{" "}
                  {angka.format(data.tabelDiproses)} tabel dihapus.
                  {data.mediaDihapus
                    ? " Media desa juga dihapus."
                    : " Tidak ada media yang perlu dihapus."}
                </p>
              )}
              tutupSetelahSukses={false}
              stateAwal={createIdleActionState<{
                jumlahBarisDihapus: number;
                tabelDiproses: number;
                mediaDihapus: boolean;
              }>()}
            >
              <input type="hidden" name="villageId" value={desa.id} />
              <label className="form-field">
                <span className="form-label">Ketik slug desa: {desa.slug ?? "—"}</span>
                <input
                  className="form-input"
                  name="konfirmasi"
                  required
                  autoComplete="off"
                  placeholder={desa.slug ?? ""}
                />
              </label>
            </DialogFormTenant>
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
        </section>
      </div>
    </div>
  );
}

const TAB_STATUS: readonly { nilai: StatusTenantFilter; label: string }[] = [
  { nilai: "semua", label: "Semua tenant" },
  { nilai: "aktif", label: "Aktif" },
  { nilai: "nonaktif", label: "Nonaktif" },
  { nilai: "siap-purge", label: "Siap purge" },
];

export function TenantConsole({
  desa,
  domain,
  statusAwal,
  queryAwal = "",
  aksi,
}: {
  desa: DesaKonsolRow[];
  domain: DomainKonsolRow[];
  /** Nilai awal dari query param; halaman memberi `key={statusAwal}` agar URL menang. */
  statusAwal: StatusTenantFilter;
  /** Kata kunci awal dari pencarian top bar (`?q=`). */
  queryAwal?: string;
  aksi: AksiKonsol;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(queryAwal);
  const [status, setStatus] = useState<StatusTenantFilter>(statusAwal);
  const [kecamatan, setKecamatan] = useState("semua");
  const [tema, setTema] = useState("semua");
  const [perHalaman, setPerHalaman] = useState(10);
  const [halaman, setHalaman] = useState(1);
  const [terbuka, setTerbuka] = useState<number | null>(null);

  const pilihStatus = (nilai: StatusTenantFilter) => {
    setStatus(nilai);
    setHalaman(1);
    // Simpan filter di URL agar bisa dibagikan dan tahan refresh. Kata kunci
    // dari top bar dipertahankan supaya tab tidak diam-diam menghapusnya.
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (nilai !== "semua") params.set("status", nilai);
    const suffix = params.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
  };

  const jumlahStatus = useMemo(() => {
    return Object.fromEntries(
      STATUS_TENANT_FILTER.map((nilai) => [
        nilai,
        desa.filter((item) => cocokStatusTenant(item, nilai)).length,
      ]),
    ) as Record<StatusTenantFilter, number>;
  }, [desa]);

  const opsiKecamatan = useMemo(() => {
    const unik = desa
      .map((item) => item.district?.trim())
      .filter((item): item is string => Boolean(item));
    return [...new Set(unik)].sort((a, b) => a.localeCompare(b, "id-ID"));
  }, [desa]);

  const opsiTema = useMemo(() => {
    const label = new Map<string, string>();
    for (const item of desa) {
      const slug = item.tema?.trim();
      if (!slug) continue;
      const nama = item.temaNama?.trim() || slug;
      label.set(slug, item.temaVersi ? `${nama} v${item.temaVersi}` : nama);
    }
    return [...label.entries()].sort((a, b) => a[1].localeCompare(b[1], "id-ID"));
  }, [desa]);

  const adaTanpaKecamatan = desa.some((item) => !item.district?.trim());
  const adaTanpaTema = desa.some((item) => !item.tema?.trim());

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");

    return desa.filter((item) => {
      const searchable = [
        item.name,
        item.code,
        item.domain,
        item.slug,
        item.district,
        item.temaNama,
        item.tema,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("id-ID");

      const cocokKecamatan =
        kecamatan === "semua" ||
        (kecamatan === "__tanpa__" ? !item.district?.trim() : item.district?.trim() === kecamatan);
      const cocokTema =
        tema === "semua" ||
        (tema === "__tanpa__" ? !item.tema?.trim() : item.tema?.trim() === tema);

      return (
        cocokKecamatan &&
        cocokTema &&
        cocokStatusTenant(item, status) &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [desa, kecamatan, query, status, tema]);

  const totalHalaman = Math.max(1, Math.ceil(filtered.length / perHalaman));
  const halamanAktif = Math.min(halaman, totalHalaman);
  const mulai = (halamanAktif - 1) * perHalaman;
  const terlihat = filtered.slice(mulai, mulai + perHalaman);
  const nomorAkhir = Math.min(mulai + perHalaman, filtered.length);

  return (
    <>
      <div className="tenant-tabs-row">
        <div aria-label="Filter status desa" className="platform-tabs" role="group">
          {TAB_STATUS.map((tab) => (
            <button
              aria-pressed={status === tab.nilai}
              className="platform-tab"
              key={tab.nilai}
              onClick={() => pilihStatus(tab.nilai)}
              type="button"
            >
              {tab.label}
              <span className="platform-tab-count">{angka.format(jumlahStatus[tab.nilai])}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="tenant-toolbar">
        <label className="tenant-search tenant-search-dengan-ikon">
          <span className="sr-only">Cari nama desa, kode, slug, domain, atau kecamatan</span>
          <span aria-hidden="true" className="tenant-search-icon">
            <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="10.8" cy="10.8" r="6.4" />
              <path d="m15.6 15.6 4 4" />
            </svg>
          </span>
          <input
            className="form-input"
            type="search"
            placeholder="Cari desa, domain, atau kode..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setHalaman(1);
            }}
          />
        </label>
        <select
          aria-label="Filter kecamatan"
          className="form-input tenant-filter"
          value={kecamatan}
          onChange={(event) => {
            setKecamatan(event.target.value);
            setHalaman(1);
          }}
        >
          <option value="semua">Semua kecamatan</option>
          {opsiKecamatan.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
          {adaTanpaKecamatan ? <option value="__tanpa__">Belum diisi</option> : null}
        </select>
        <select
          aria-label="Filter tema"
          className="form-input tenant-filter"
          value={tema}
          onChange={(event) => {
            setTema(event.target.value);
            setHalaman(1);
          }}
        >
          <option value="semua">Semua tema</option>
          {opsiTema.map(([slug, label]) => (
            <option key={slug} value={slug}>
              {label}
            </option>
          ))}
          {adaTanpaTema ? <option value="__tanpa__">Belum memilih tema</option> : null}
        </select>
      </div>

      <div className="tenant-table-scroll">
        <table className="tenant-table tenant-table-list">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Desa</th>
              <th scope="col">Domain</th>
              <th scope="col">Kecamatan</th>
              <th scope="col">Tema</th>
              <th scope="col">Pengguna</th>
              <th scope="col">Kuota media</th>
              <th scope="col">Terdaftar</th>
              <th scope="col">Status</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {terlihat.length > 0 ? (
              terlihat.map((item, index) => (
                <TrTenant
                  key={item.id}
                  nomor={mulai + index + 1}
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
                <td className="tenant-empty" colSpan={10}>
                  {desa.length === 0
                    ? "Belum ada tenant desa yang terdaftar."
                    : "Tidak ada desa yang sesuai dengan pencarian atau filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 ? (
        <div className="tenant-pagination">
          <div className="tenant-pagination-summary">
            <span>
              {totalHalaman > 1
                ? `Menampilkan ${angka.format(mulai + 1)}–${angka.format(nomorAkhir)} dari ${angka.format(filtered.length)} desa`
                : `Menampilkan ${angka.format(filtered.length)} dari ${angka.format(desa.length)} desa`}
            </span>
            <span className="sr-only">
              Halaman {angka.format(halamanAktif)} dari {angka.format(totalHalaman)}
            </span>
          </div>
          <div
            aria-label="Navigasi halaman tenant"
            className="tenant-pagination-pages"
            role="group"
          >
            <button
              aria-label="Halaman sebelumnya"
              className="tenant-page-button"
              disabled={halamanAktif <= 1}
              onClick={() => setHalaman(halamanAktif - 1)}
              type="button"
            >
              ‹
            </button>
            {nomorHalaman(halamanAktif, totalHalaman).map((item, index) =>
              item === "elipsis" ? (
                <span className="tenant-page-ellipsis" key={`elipsis-${index}`}>
                  …
                </span>
              ) : (
                <button
                  aria-current={item === halamanAktif ? "page" : undefined}
                  aria-label={`Halaman ${item}`}
                  className="tenant-page-button"
                  key={item}
                  onClick={() => setHalaman(item)}
                  type="button"
                >
                  {item}
                </button>
              ),
            )}
            <button
              aria-label="Halaman berikutnya"
              className="tenant-page-button"
              disabled={halamanAktif >= totalHalaman}
              onClick={() => setHalaman(halamanAktif + 1)}
              type="button"
            >
              ›
            </button>
          </div>
          <label className="tenant-page-size">
            <span className="sr-only">Baris per halaman</span>
            <select
              className="form-input"
              value={perHalaman}
              onChange={(event) => {
                setPerHalaman(Number(event.target.value));
                setHalaman(1);
              }}
            >
              {[10, 25, 50].map((jumlah) => (
                <option key={jumlah} value={jumlah}>
                  {jumlah} / halaman
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </>
  );
}

function TrTenant({
  nomor,
  desa,
  domain,
  aksi,
  terbuka,
  onToggle,
}: {
  nomor: number;
  desa: DesaKonsolRow;
  domain: DomainKonsolRow[];
  aksi: AksiKonsol;
  terbuka: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr>
        <td className="tenant-row-number">{nomor}</td>
        <td className="tenant-cell-name">
          <strong>{desa.name || "Tanpa nama"}</strong>
          <span className="tenant-secondary">
            Kode: {desa.code || "—"}
            {desa.slug ? ` · ${desa.slug}` : ""}
          </span>
        </td>
        <td>{desa.domain || <span className="tenant-secondary">Belum diatur</span>}</td>
        <td>{desa.district || <span className="tenant-secondary">Belum diisi</span>}</td>
        <td>
          {desa.temaNama || desa.tema ? (
            <>
              <span>{desa.temaNama || desa.tema}</span>
              <span className="tenant-secondary">
                {desa.tema}
                {desa.temaVersi ? ` · v${desa.temaVersi}` : ""}
              </span>
            </>
          ) : (
            <span className="tenant-secondary">Belum memilih</span>
          )}
        </td>
        <td>{angka.format(desa.pengguna)}</td>
        <td>
          {desa.kuotaMediaMb === null ? (
            <span className="tenant-secondary">Tanpa batas</span>
          ) : (
            `${angka.format(desa.kuotaMediaMb)} MB`
          )}
        </td>
        <td>{tanggal.format(new Date(desa.createdAt))}</td>
        <td>
          <span className={desa.active ? "tenant-status is-active" : "tenant-status is-inactive"}>
            <span aria-hidden="true" />
            {desa.active ? "Aktif" : "Nonaktif"}
          </span>
          {desa.statusRetensi !== "aktif" ? (
            <span className="tenant-secondary tenant-status-note">
              <RetensiBadge desa={desa} />
            </span>
          ) : null}
        </td>
        <td>
          <button
            aria-expanded={terbuka}
            aria-label={`${terbuka ? "Tutup" : "Kelola"} ${desa.name || "tenant"}`}
            className="button button-secondary tenant-expand tenant-row-action"
            onClick={onToggle}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path d="M2.5 12s3.6-6 9.5-6 9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="2.8" />
            </svg>
            {terbuka ? "Tutup" : "Kelola"}
          </button>
        </td>
      </tr>
      {terbuka ? (
        <tr className="tenant-panel-row">
          <td colSpan={10}>
            <PanelKelola desa={desa} domain={domain} aksi={aksi} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
