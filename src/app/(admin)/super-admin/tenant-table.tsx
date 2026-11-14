"use client";

import { useMemo, useState } from "react";

import type { DesaSuperAdminRow } from "@/features/multi-desa/infrastructure/provisioning-repository";

type StatusFilter = "semua" | "aktif" | "nonaktif";

const tanggal = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
const angka = new Intl.NumberFormat("id-ID");

export function TenantTable({ desa }: { desa: DesaSuperAdminRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("semua");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");

    return desa.filter((item) => {
      const matchesStatus =
        status === "semua" || (status === "aktif" ? item.active : !item.active);
      const searchable = [item.name, item.code, item.domain]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("id-ID");

      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [desa, query, status]);

  return (
    <>
      <div className="tenant-toolbar">
        <label className="tenant-search">
          <span className="sr-only">Cari nama desa, kode, atau domain</span>
          <input
            className="form-input"
            type="search"
            placeholder="Cari nama desa, kode, atau domain..."
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
          </select>
        </label>
        <span className="tenant-result-count">
          Menampilkan {angka.format(filtered.length)} dari{" "}
          {angka.format(desa.length)} desa
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
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name || "Tanpa nama"}</strong>
                    <span className="tenant-secondary">
                      Kode: {item.code || "—"}
                    </span>
                  </td>
                  <td>
                    {item.domain || (
                      <span className="tenant-secondary">Belum diatur</span>
                    )}
                  </td>
                  <td>{angka.format(item.pengguna)}</td>
                  <td>{angka.format(item.penduduk)}</td>
                  <td>{angka.format(item.jenisSurat)}</td>
                  <td>{tanggal.format(new Date(item.createdAt))}</td>
                  <td>
                    <span
                      className={
                        item.active
                          ? "tenant-status is-active"
                          : "tenant-status is-inactive"
                      }
                    >
                      <span aria-hidden="true" />
                      {item.active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="tenant-empty" colSpan={7}>
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
