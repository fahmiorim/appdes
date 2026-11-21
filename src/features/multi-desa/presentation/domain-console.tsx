"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { JenisDomain } from "@/features/multi-desa/domain/jenis-domain";
import {
  LABEL_STATUS_DNS,
  type DataDns,
  type StatusDns,
} from "@/features/multi-desa/domain/status-dns";
import {
  hariMenujuKedaluwarsaSsl,
  LABEL_STATUS_SSL,
  type DataSsl,
  type StatusSsl,
} from "@/features/multi-desa/domain/status-ssl";

/**
 * Daftar domain lintas desa untuk halaman **Desa & Domain → Daftar domain**.
 *
 * Semua status berasal dari cache pemeriksaan DNS/TLS nyata. Domain yang belum
 * pernah diperiksa ditandai "Belum diperiksa", bukan dianggap aktif.
 */

export interface DomainConsoleRow {
  id: number;
  villageId: number;
  villageName: string;
  villageSlug: string | null;
  villageDistrict: string | null;
  villageActive: boolean;
  domain: string;
  jenis: JenisDomain;
  isPrimary: boolean;
  createdAt: Date;
  dns: DataDns;
  ssl: DataSsl;
}

type FilterJenis = "semua" | JenisDomain;
type FilterStatus = "semua" | "aktif" | "nonaktif";
type FilterSsl = "semua" | StatusSsl;

interface NilaiFilter {
  kecamatan: string;
  jenis: FilterJenis;
  status: FilterStatus;
  ssl: FilterSsl;
}

const FILTER_AWAL: NilaiFilter = {
  kecamatan: "semua",
  jenis: "semua",
  status: "semua",
  ssl: "semua",
};

const angka = new Intl.NumberFormat("id-ID");
const tanggal = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const PILIHAN_BARIS = [10, 25, 50] as const;

export function DomainConsole({
  rows,
  queryAwal = "",
}: {
  rows: DomainConsoleRow[];
  queryAwal?: string;
}) {
  const [query, setQuery] = useState(queryAwal);
  const [filter, setFilter] = useState<NilaiFilter>(FILTER_AWAL);
  const [draft, setDraft] = useState<NilaiFilter>(FILTER_AWAL);
  const [halaman, setHalaman] = useState(1);
  const [perHalaman, setPerHalaman] = useState<number>(10);

  const pilihanKecamatan = useMemo(
    () =>
      [
        ...new Set(
          rows.map((item) => item.villageDistrict).filter((item): item is string => Boolean(item)),
        ),
      ].sort((a, b) => a.localeCompare(b, "id")),
    [rows],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");

    return rows.filter((item) => {
      const searchable = [
        item.villageName,
        item.villageSlug,
        item.domain,
        item.dns.addresses.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("id-ID");

      const cocokKecamatan =
        filter.kecamatan === "semua" || item.villageDistrict === filter.kecamatan;
      const cocokJenis = filter.jenis === "semua" || item.jenis === filter.jenis;
      const cocokStatus =
        filter.status === "semua" ||
        (filter.status === "aktif" ? item.villageActive : !item.villageActive);
      const cocokSsl = filter.ssl === "semua" || item.ssl.status === filter.ssl;

      return (
        cocokKecamatan &&
        cocokJenis &&
        cocokStatus &&
        cocokSsl &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [filter, query, rows]);

  const totalHalaman = Math.max(1, Math.ceil(filtered.length / perHalaman));
  const halamanAktif = Math.min(halaman, totalHalaman);
  const mulai = (halamanAktif - 1) * perHalaman;
  const terlihat = filtered.slice(mulai, mulai + perHalaman);
  const nomorAkhir = Math.min(mulai + perHalaman, filtered.length);

  function ubahFilter(aksi: () => void) {
    aksi();
    setHalaman(1);
  }

  function ubahDraft(patch: Partial<NilaiFilter>) {
    setDraft((sebelumnya) => ({ ...sebelumnya, ...patch }));
  }

  function terapkanFilter() {
    setFilter(draft);
    setHalaman(1);
  }

  const filterBerubah =
    draft.kecamatan !== filter.kecamatan ||
    draft.jenis !== filter.jenis ||
    draft.status !== filter.status ||
    draft.ssl !== filter.ssl;

  return (
    <>
      <div className="tenant-toolbar domain-toolbar">
        <label className="tenant-search tenant-search-dengan-ikon">
          <span className="sr-only">Cari nama desa, domain, atau tenant</span>
          <span aria-hidden="true" className="tenant-search-icon">
            <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="10.8" cy="10.8" r="6.4" />
              <path d="m15.6 15.6 4 4" />
            </svg>
          </span>
          <input
            className="form-input"
            type="search"
            placeholder="Cari nama desa, domain, atau tenant..."
            value={query}
            onChange={(event) => ubahFilter(() => setQuery(event.target.value))}
          />
        </label>
        <select
          aria-label="Filter kecamatan"
          className="form-input tenant-filter"
          value={draft.kecamatan}
          onChange={(event) => ubahDraft({ kecamatan: event.target.value })}
        >
          <option value="semua">Semua Kecamatan</option>
          {pilihanKecamatan.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter jenis domain"
          className="form-input tenant-filter"
          value={draft.jenis}
          onChange={(event) => ubahDraft({ jenis: event.target.value as FilterJenis })}
        >
          <option value="semua">Semua Jenis Domain</option>
          <option value="subdomain">Subdomain</option>
          <option value="custom">Custom</option>
        </select>
        <select
          aria-label="Filter status desa"
          className="form-input tenant-filter"
          value={draft.status}
          onChange={(event) => ubahDraft({ status: event.target.value as FilterStatus })}
        >
          <option value="semua">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>
        <select
          aria-label="Filter status SSL"
          className="form-input tenant-filter"
          value={draft.ssl}
          onChange={(event) => ubahDraft({ ssl: event.target.value as FilterSsl })}
        >
          <option value="semua">Semua SSL</option>
          <option value="aktif">Aktif</option>
          <option value="segera-expired">Segera expired</option>
          <option value="bermasalah">Bermasalah</option>
          <option value="belum-diperiksa">Belum diperiksa</option>
        </select>
        <button
          className={
            filterBerubah
              ? "button button-secondary domain-filter-button is-dirty"
              : "button button-secondary domain-filter-button"
          }
          onClick={terapkanFilter}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path d="M4 5h16l-6.2 7.2V20l-3.6-2v-5.8Z" />
          </svg>
          Filter
        </button>
      </div>

      <div className="tenant-table-scroll">
        <table className="tenant-table tenant-table-list domain-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Nama Desa / Tenant</th>
              <th scope="col">Alamat Domain</th>
              <th scope="col">Jenis</th>
              <th scope="col">Status DNS</th>
              <th scope="col">Status SSL</th>
              <th scope="col">Masa Berlaku SSL</th>
              <th scope="col">Domain Utama</th>
              <th scope="col">Status</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {terlihat.length > 0 ? (
              terlihat.map((item, index) => (
                <tr key={item.id}>
                  <td className="tenant-row-number">{mulai + index + 1}</td>
                  <td className="tenant-cell-name">
                    <strong>{item.villageName}</strong>
                    <span className="tenant-secondary">
                      {item.villageSlug ? `Slug: ${item.villageSlug}` : "Slug belum diisi"}
                    </span>
                  </td>
                  <td>
                    <div className="domain-host">
                      <a href={`https://${item.domain}`} rel="noreferrer" target="_blank">
                        {item.domain}
                      </a>
                      <a
                        aria-label={`Buka ${item.domain}`}
                        className="domain-open"
                        href={`https://${item.domain}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <svg
                          aria-hidden="true"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                          viewBox="0 0 24 24"
                        >
                          <path d="M14 4h6v6" />
                          <path d="M20 4 11 13" />
                          <path d="M18 14v5.2A1.8 1.8 0 0 1 16.2 21H5.8A1.8 1.8 0 0 1 4 19.2V8.8A1.8 1.8 0 0 1 5.8 7H11" />
                        </svg>
                      </a>
                    </div>
                  </td>
                  <td>
                    <span
                      className={
                        item.jenis === "subdomain"
                          ? "domain-type is-subdomain"
                          : "domain-type is-custom"
                      }
                    >
                      {item.jenis === "subdomain" ? "Subdomain" : "Custom"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`domain-check ${kelasStatusDns(item.dns.status)}`}
                      title={
                        item.dns.error ??
                        (item.dns.addresses.length > 0 ? item.dns.addresses.join(", ") : undefined)
                      }
                    >
                      <span aria-hidden="true" />
                      {LABEL_STATUS_DNS[item.dns.status]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`domain-check ${kelasStatusSsl(item.ssl.status)}`}
                      title={
                        item.ssl.error ??
                        (item.ssl.issuer ? `Issuer: ${item.ssl.issuer}` : undefined)
                      }
                    >
                      <span aria-hidden="true" />
                      {LABEL_STATUS_SSL[item.ssl.status]}
                    </span>
                  </td>
                  <td>
                    {item.ssl.validTo ? (
                      <>
                        <span>{tanggal.format(new Date(item.ssl.validTo))}</span>
                        <span className="tenant-secondary">{teksSisaHari(item.ssl.validTo)}</span>
                      </>
                    ) : (
                      <span className="tenant-secondary">
                        {item.ssl.status === "belum-diperiksa"
                          ? "Belum diperiksa"
                          : "Tidak terbaca"}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={item.isPrimary ? "domain-kind is-primary" : "domain-kind"}>
                      {item.isPrimary ? "Utama" : "Alias"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        item.villageActive ? "tenant-status is-active" : "tenant-status is-inactive"
                      }
                    >
                      <span aria-hidden="true" />
                      {item.villageActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td>
                    <Link
                      aria-label={`Detail domain ${item.domain}`}
                      className="button button-secondary tenant-row-action"
                      href={`/super-admin/domain/${item.id}`}
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
                      Kelola
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="tenant-empty" colSpan={10}>
                  {rows.length === 0
                    ? "Belum ada domain terdaftar."
                    : "Tidak ada domain yang sesuai dengan pencarian atau filter."}
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
              {filtered.length > 1
                ? `Menampilkan ${angka.format(mulai + 1)}–${angka.format(nomorAkhir)} dari ${angka.format(filtered.length)} domain`
                : `Menampilkan ${angka.format(filtered.length)} dari ${angka.format(rows.length)} domain`}
            </span>
            <span className="sr-only">
              Halaman {angka.format(halamanAktif)} dari {angka.format(totalHalaman)}
            </span>
          </div>
          <div className="tenant-pagination-pages">
            <button
              aria-label="Halaman sebelumnya"
              className="tenant-page-button"
              disabled={halamanAktif === 1}
              onClick={() => setHalaman((sebelumnya) => Math.max(1, sebelumnya - 1))}
              type="button"
            >
              ‹
            </button>
            {nomorHalaman(halamanAktif, totalHalaman).map((nomor, index, daftar) => {
              const sebelumnya = daftar[index - 1];
              return (
                <span className="tenant-page-slot" key={nomor}>
                  {sebelumnya && nomor - sebelumnya > 1 ? (
                    <span className="tenant-page-ellipsis">…</span>
                  ) : null}
                  <button
                    aria-current={nomor === halamanAktif ? "page" : undefined}
                    className="tenant-page-button"
                    onClick={() => setHalaman(nomor)}
                    type="button"
                  >
                    {angka.format(nomor)}
                  </button>
                </span>
              );
            })}
            <button
              aria-label="Halaman berikutnya"
              className="tenant-page-button"
              disabled={halamanAktif === totalHalaman}
              onClick={() => setHalaman((sebelumnya) => Math.min(totalHalaman, sebelumnya + 1))}
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
              onChange={(event) => ubahFilter(() => setPerHalaman(Number(event.target.value)))}
            >
              {PILIHAN_BARIS.map((jumlah) => (
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

function kelasStatusDns(status: StatusDns): string {
  if (status === "normal") return "is-ok";
  if (status === "bermasalah") return "is-bad";
  return "is-unchecked";
}

function kelasStatusSsl(status: StatusSsl): string {
  if (status === "aktif") return "is-ok";
  if (status === "segera-expired") return "is-warn";
  if (status === "bermasalah") return "is-bad";
  return "is-unchecked";
}

function teksSisaHari(validTo: Date): string {
  const hari = hariMenujuKedaluwarsaSsl(new Date(validTo));
  if (hari === null) return "";
  if (hari < 0) return "Sudah kedaluwarsa";
  if (hari === 0) return "Hari ini";
  return `${angka.format(hari)} hari`;
}

/** Nomor halaman yang ditampilkan: awal, akhir, dan sekitar halaman aktif. */
function nomorHalaman(aktif: number, total: number): number[] {
  const nomor = new Set([1, total, aktif - 1, aktif, aktif + 1]);
  return [...nomor].filter((item) => item >= 1 && item <= total).sort((a, b) => a - b);
}
