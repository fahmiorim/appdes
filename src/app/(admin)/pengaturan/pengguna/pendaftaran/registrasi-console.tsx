"use client";

import { useState, useTransition } from "react";

import { tinjauRegistrasiWargaAction } from "./actions";

interface Row {
  id: number;
  nik: string;
  nama: string;
  noHp: string | null;
  status: string;
  catatan: string | null;
  createdAt: Date;
}

export function RegistrasiWargaConsole({ rows }: { rows: Row[] }) {
  const [hasil, setHasil] = useState<
    Record<number, { message: string; pin?: string; username?: string }>
  >({});
  const [pending, setPending] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function proses(id: number, keputusan: "setujui" | "tolak") {
    setPending(id);
    startTransition(async () => {
      try {
        const result = await tinjauRegistrasiWargaAction({ id, keputusan });
        setHasil((current) => ({
          ...current,
          [id]: {
            message: result.message,
            pin: result.credential?.pin,
            username: result.credential?.username,
          },
        }));
      } catch {
        setHasil((current) => ({
          ...current,
          [id]: { message: "Koneksi bermasalah. Muat ulang halaman sebelum mencoba kembali." },
        }));
      } finally {
        setPending(null);
      }
    });
  }

  return (
    <div className="platform-card" style={{ padding: 24 }}>
      <div className="tenant-table-scroll">
        <table className="tenant-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Nama &amp; NIK</th>
              <th>Kontak</th>
              <th>Status</th>
              <th>Catatan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const result = hasil[row.id];
              return (
                <tr key={row.id}>
                  <td>
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(row.createdAt))}
                  </td>
                  <td>
                    <strong>{row.nama}</strong>
                    <br />
                    <small>••••••••{row.nik.slice(-4)}</small>
                  </td>
                  <td>{row.noHp || "—"}</td>
                  <td>
                    <span className="status-badge">{row.status}</span>
                  </td>
                  <td>{row.catatan || "—"}</td>
                  <td>
                    {row.status === "menunggu" ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="button button-primary"
                          type="button"
                          disabled={isPending}
                          onClick={() => proses(row.id, "setujui")}
                        >
                          {pending === row.id ? "Memproses..." : "Setujui"}
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={isPending}
                          onClick={() => proses(row.id, "tolak")}
                        >
                          Tolak
                        </button>
                      </div>
                    ) : (
                      "Selesai"
                    )}
                    {result ? (
                      <div role="status" style={{ marginTop: 8, minWidth: 180 }}>
                        <p>{result.message}</p>
                        {result.pin ? (
                          <p>
                            <strong>Username:</strong> {result.username}
                            <br />
                            <strong>PIN awal:</strong> <code>{result.pin}</code>
                            <br />
                            <small>
                              PIN hanya ditampilkan pada sesi ini. Catat dan serahkan secara aman
                              kepada warga.
                            </small>
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6}>Belum ada pengajuan pendaftaran warga.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
